"""Document upload, listing, and download routes."""

import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse

from app.auth.dependencies import get_current_user
from app.config import settings
from app.db.connection import get_conn
from app.documents.geocoder import geocode
from app.documents.parser import parse_document

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/documents", tags=["documents"])

ALLOWED_EXTENSIONS = {"pdf", "docx", "xlsx", "jpg", "jpeg", "png"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


def _get_upload_dir() -> Path:
    p = Path(settings.upload_dir)
    p.mkdir(parents=True, exist_ok=True)
    return p


def _validate_file(file: UploadFile) -> str:
    """Validate file type and return the extension."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '.{ext}' not allowed. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )
    return ext


@router.post("/upload")
async def upload_document(
    file: UploadFile,
    parse: bool = Query(default=True, description="Whether to run AI parsing pipeline"),
    user: dict = Depends(get_current_user),
):
    ext = _validate_file(file)

    # Read file content and check size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds 50 MB limit")

    # Save to disk
    stored_name = f"{uuid.uuid4()}.{ext}"
    upload_path = _get_upload_dir() / stored_name
    upload_path.write_bytes(content)

    opportunity_id = None
    opportunity_data = None

    if parse:
        # Run parsing pipeline: extract → LLM → geocode → insert opportunity
        try:
            extraction = parse_document(upload_path)
            extracted = extraction.model_dump(exclude_none=True)

            # Geocode the address
            lat, lng = None, None
            if extraction.address:
                coords = geocode(
                    extraction.address,
                    extraction.city,
                    extraction.state,
                    extraction.country,
                )
                if coords:
                    lat, lng = coords

            # Insert opportunity into DB
            with get_conn() as conn:
                opp_row = conn.execute(
                    """
                    INSERT INTO opportunities (
                        property_name, address, city, state, country,
                        latitude, longitude, asking_price, property_type,
                        size_sqft, year_built, cap_rate, noi, occupancy_rate,
                        rent_roll_summary, debt_terms, irr_projection, seller_info
                    ) VALUES (
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s,
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s
                    )
                    RETURNING id
                    """,
                    (
                        extraction.property_name, extraction.address, extraction.city,
                        extraction.state, extraction.country,
                        lat, lng, extraction.asking_price, extraction.property_type,
                        extraction.size_sqft, extraction.year_built, extraction.cap_rate,
                        extraction.noi, extraction.occupancy_rate,
                        extraction.rent_roll_summary, extraction.debt_terms,
                        extraction.irr_projection, extraction.seller_info,
                    ),
                ).fetchone()
                conn.commit()
                opportunity_id = opp_row[0]

            opportunity_data = {
                "id": opportunity_id,
                "latitude": lat,
                "longitude": lng,
                **extracted,
            }
            logger.info("Created opportunity #%d from %s", opportunity_id, file.filename)

        except Exception:
            logger.exception("Parsing failed for %s — document saved but no opportunity created", file.filename)
            # Document is still saved even if parsing fails

    # Insert document metadata (linked to opportunity if parsing succeeded)
    with get_conn() as conn:
        doc_row = conn.execute(
            """
            INSERT INTO documents (opportunity_id, stored_filename, original_filename, file_type, file_size, uploaded_by)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, opportunity_id, stored_filename, original_filename, file_type, file_size, uploaded_by, uploaded_at
            """,
            (opportunity_id, stored_name, file.filename, ext, len(content), user["id"]),
        ).fetchone()
        conn.commit()

    result = {
        "document": {
            "id": doc_row[0],
            "opportunity_id": doc_row[1],
            "stored_filename": doc_row[2],
            "original_filename": doc_row[3],
            "file_type": doc_row[4],
            "file_size": doc_row[5],
            "uploaded_by": doc_row[6],
            "uploaded_at": doc_row[7].isoformat(),
        },
    }
    if opportunity_data:
        result["opportunity"] = opportunity_data

    return result


@router.get("")
async def list_documents(
    opportunity_id: int | None = None,
    user: dict = Depends(get_current_user),
):
    with get_conn() as conn:
        if opportunity_id is not None:
            rows = conn.execute(
                """
                SELECT id, opportunity_id, stored_filename, original_filename, file_type, file_size, uploaded_by, uploaded_at
                FROM documents WHERE opportunity_id = %s ORDER BY uploaded_at DESC
                """,
                (opportunity_id,),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT id, opportunity_id, stored_filename, original_filename, file_type, file_size, uploaded_by, uploaded_at
                FROM documents ORDER BY uploaded_at DESC
                """
            ).fetchall()

    return [
        {
            "id": r[0],
            "opportunity_id": r[1],
            "stored_filename": r[2],
            "original_filename": r[3],
            "file_type": r[4],
            "file_size": r[5],
            "uploaded_by": r[6],
            "uploaded_at": r[7].isoformat(),
        }
        for r in rows
    ]


@router.get("/{doc_id}")
async def get_document(doc_id: int, user: dict = Depends(get_current_user)):
    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT id, opportunity_id, stored_filename, original_filename, file_type, file_size, uploaded_by, uploaded_at
            FROM documents WHERE id = %s
            """,
            (doc_id,),
        ).fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="Document not found")

    return {
        "id": row[0],
        "opportunity_id": row[1],
        "stored_filename": row[2],
        "original_filename": row[3],
        "file_type": row[4],
        "file_size": row[5],
        "uploaded_by": row[6],
        "uploaded_at": row[7].isoformat(),
    }


MEDIA_TYPES = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
}


@router.get("/{doc_id}/download")
async def download_document(doc_id: int, user: dict = Depends(get_current_user)):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT stored_filename, original_filename, file_type FROM documents WHERE id = %s",
            (doc_id,),
        ).fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="Document not found")

    stored_filename, original_filename, file_type = row
    file_path = _get_upload_dir() / stored_filename

    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        path=str(file_path),
        filename=original_filename,
        media_type=MEDIA_TYPES.get(file_type, "application/octet-stream"),
    )
