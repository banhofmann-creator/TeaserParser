"""Opportunities CRUD routes: list, detail, update, assign, status."""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.auth.dependencies import get_current_user, require_role
from app.db.connection import get_conn

router = APIRouter(prefix="/api/opportunities", tags=["opportunities"])

VALID_STATUSES = {"new", "active", "inactive", "completed", "cancelled"}

# Column names for SELECT queries
OPP_COLUMNS = (
    "id, property_name, address, city, state, country, latitude, longitude, "
    "asking_price, property_type, size_sqft, year_built, cap_rate, noi, "
    "occupancy_rate, rent_roll_summary, debt_terms, irr_projection, seller_info, "
    "status, assigned_to, created_at, updated_at"
)

OPP_FIELDS = [
    "id", "property_name", "address", "city", "state", "country", "latitude", "longitude",
    "asking_price", "property_type", "size_sqft", "year_built", "cap_rate", "noi",
    "occupancy_rate", "rent_roll_summary", "debt_terms", "irr_projection", "seller_info",
    "status", "assigned_to", "created_at", "updated_at",
]


def _row_to_dict(row) -> dict:
    d = dict(zip(OPP_FIELDS, row))
    # Serialize numeric and datetime types
    for key in ("asking_price", "size_sqft", "cap_rate", "noi", "occupancy_rate", "irr_projection"):
        if d[key] is not None:
            d[key] = float(d[key])
    for key in ("created_at", "updated_at"):
        if d[key] is not None:
            d[key] = d[key].isoformat()
    return d


@router.get("")
async def list_opportunities(
    status: str | None = None,
    assigned_to: int | None = None,
    property_type: str | None = None,
    city: str | None = None,
    user: dict = Depends(get_current_user),
):
    conditions = []
    params = []

    if status is not None:
        conditions.append("o.status = %s")
        params.append(status)
    if assigned_to is not None:
        conditions.append("o.assigned_to = %s")
        params.append(assigned_to)
    if property_type is not None:
        conditions.append("o.property_type = %s")
        params.append(property_type)
    if city is not None:
        conditions.append("LOWER(o.city) = LOWER(%s)")
        params.append(city)

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    query = f"""
        SELECT o.{', o.'.join(OPP_FIELDS)},
               COALESCE(vs.vote_score, 0) AS vote_score,
               COALESCE(vs.vote_count, 0) AS vote_count
        FROM opportunities o
        LEFT JOIN (
            SELECT opportunity_id,
                   SUM(vote) AS vote_score,
                   COUNT(*) AS vote_count
            FROM votes GROUP BY opportunity_id
        ) vs ON vs.opportunity_id = o.id
        {where}
        ORDER BY o.created_at DESC
    """

    with get_conn() as conn:
        rows = conn.execute(query, params).fetchall()

    results = []
    for row in rows:
        d = _row_to_dict(row[:len(OPP_FIELDS)])
        d["vote_score"] = int(row[len(OPP_FIELDS)])
        d["vote_count"] = int(row[len(OPP_FIELDS) + 1])
        results.append(d)

    return results


@router.get("/{opp_id}")
async def get_opportunity(opp_id: int, user: dict = Depends(get_current_user)):
    with get_conn() as conn:
        row = conn.execute(
            f"""
            SELECT o.{', o.'.join(OPP_FIELDS)},
                   COALESCE(vs.vote_score, 0) AS vote_score,
                   COALESCE(vs.vote_count, 0) AS vote_count
            FROM opportunities o
            LEFT JOIN (
                SELECT opportunity_id,
                       SUM(vote) AS vote_score,
                       COUNT(*) AS vote_count
                FROM votes WHERE opportunity_id = %s GROUP BY opportunity_id
            ) vs ON vs.opportunity_id = o.id
            WHERE o.id = %s
            """,
            (opp_id, opp_id),
        ).fetchone()

        if row is None:
            raise HTTPException(status_code=404, detail="Opportunity not found")

        # Fetch linked documents
        docs = conn.execute(
            """
            SELECT id, stored_filename, original_filename, file_type, file_size, uploaded_by, uploaded_at
            FROM documents WHERE opportunity_id = %s ORDER BY uploaded_at DESC
            """,
            (opp_id,),
        ).fetchall()

    d = _row_to_dict(row[:len(OPP_FIELDS)])
    d["vote_score"] = int(row[len(OPP_FIELDS)])
    d["vote_count"] = int(row[len(OPP_FIELDS) + 1])
    d["documents"] = [
        {
            "id": doc[0],
            "stored_filename": doc[1],
            "original_filename": doc[2],
            "file_type": doc[3],
            "file_size": doc[4],
            "uploaded_by": doc[5],
            "uploaded_at": doc[6].isoformat(),
        }
        for doc in docs
    ]
    return d


class OpportunityUpdate(BaseModel):
    property_name: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = None
    asking_price: float | None = None
    property_type: str | None = None
    size_sqft: float | None = None
    year_built: int | None = None
    cap_rate: float | None = None
    noi: float | None = None
    occupancy_rate: float | None = None
    rent_roll_summary: str | None = None
    debt_terms: str | None = None
    irr_projection: float | None = None
    seller_info: str | None = None


@router.put("/{opp_id}")
async def update_opportunity(
    opp_id: int,
    body: OpportunityUpdate,
    user: dict = Depends(get_current_user),
):
    # Check opportunity exists and user has permission
    with get_conn() as conn:
        opp = conn.execute(
            "SELECT assigned_to FROM opportunities WHERE id = %s", (opp_id,)
        ).fetchone()

    if opp is None:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    if user["role"] != "admin" and opp[0] != user["id"]:
        raise HTTPException(
            status_code=403,
            detail="Only the assigned user or an admin can edit this opportunity",
        )

    # Build dynamic UPDATE from provided fields
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    set_clauses = [f"{k} = %s" for k in updates]
    set_clauses.append("updated_at = NOW()")
    values = list(updates.values()) + [opp_id]

    with get_conn() as conn:
        conn.execute(
            f"UPDATE opportunities SET {', '.join(set_clauses)} WHERE id = %s",
            values,
        )
        conn.commit()

    return {"ok": True, "updated_fields": list(updates.keys())}


class AssignRequest(BaseModel):
    assigned_to: int | None


@router.patch("/{opp_id}/assign")
async def assign_opportunity(
    opp_id: int,
    body: AssignRequest,
    user: dict = Depends(require_role("admin")),
):
    with get_conn() as conn:
        result = conn.execute(
            "UPDATE opportunities SET assigned_to = %s, updated_at = NOW() WHERE id = %s RETURNING id",
            (body.assigned_to, opp_id),
        ).fetchone()
        conn.commit()

    if result is None:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    return {"ok": True, "assigned_to": body.assigned_to}


class StatusRequest(BaseModel):
    status: str


@router.patch("/{opp_id}/status")
async def change_status(
    opp_id: int,
    body: StatusRequest,
    user: dict = Depends(get_current_user),
):
    if body.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(sorted(VALID_STATUSES))}",
        )

    with get_conn() as conn:
        result = conn.execute(
            "UPDATE opportunities SET status = %s, updated_at = NOW() WHERE id = %s RETURNING id",
            (body.status, opp_id),
        ).fetchone()
        conn.commit()

    if result is None:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    return {"ok": True, "status": body.status}
