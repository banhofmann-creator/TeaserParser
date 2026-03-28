"""Progress notes routes for assigned opportunities."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth.dependencies import get_current_user
from app.db.connection import get_conn

router = APIRouter(prefix="/api/opportunities", tags=["progress"])


class ProgressNoteRequest(BaseModel):
    note: str


def _check_can_add_progress(opp_id: int, user: dict) -> None:
    """Verify opportunity exists and user is assigned or admin."""
    with get_conn() as conn:
        row = conn.execute(
            "SELECT assigned_to FROM opportunities WHERE id = %s", (opp_id,)
        ).fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    if user["role"] != "admin" and row[0] != user["id"]:
        raise HTTPException(
            status_code=403,
            detail="Only the assigned user or an admin can add progress notes",
        )


@router.get("/{opp_id}/progress")
async def get_progress_notes(opp_id: int, user: dict = Depends(get_current_user)):
    with get_conn() as conn:
        exists = conn.execute("SELECT id FROM opportunities WHERE id = %s", (opp_id,)).fetchone()
        if exists is None:
            raise HTTPException(status_code=404, detail="Opportunity not found")

        rows = conn.execute(
            """
            SELECT p.id, p.note, p.created_at, p.user_id, u.username, u.display_name
            FROM progress_notes p
            JOIN users u ON u.id = p.user_id
            WHERE p.opportunity_id = %s
            ORDER BY p.created_at DESC
            """,
            (opp_id,),
        ).fetchall()

    return [
        {
            "id": r[0],
            "note": r[1],
            "created_at": r[2].isoformat(),
            "user_id": r[3],
            "username": r[4],
            "display_name": r[5],
        }
        for r in rows
    ]


@router.post("/{opp_id}/progress")
async def add_progress_note(
    opp_id: int,
    body: ProgressNoteRequest,
    user: dict = Depends(get_current_user),
):
    if not body.note.strip():
        raise HTTPException(status_code=400, detail="Note cannot be empty")

    _check_can_add_progress(opp_id, user)

    with get_conn() as conn:
        row = conn.execute(
            """
            INSERT INTO progress_notes (opportunity_id, user_id, note)
            VALUES (%s, %s, %s)
            RETURNING id, created_at
            """,
            (opp_id, user["id"], body.note.strip()),
        ).fetchone()
        conn.commit()

    return {
        "id": row[0],
        "note": body.note.strip(),
        "created_at": row[1].isoformat(),
        "user_id": user["id"],
        "username": user["username"],
        "display_name": user["display_name"],
    }
