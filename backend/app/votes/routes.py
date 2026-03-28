"""Vote and comment routes for opportunities."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth.dependencies import get_current_user
from app.db.connection import get_conn

router = APIRouter(prefix="/api/opportunities", tags=["votes & comments"])


def _check_opportunity_exists(opp_id: int) -> None:
    with get_conn() as conn:
        row = conn.execute("SELECT id FROM opportunities WHERE id = %s", (opp_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Opportunity not found")


class VoteRequest(BaseModel):
    vote: int  # 1 (up) or -1 (down)


@router.post("/{opp_id}/vote")
async def cast_vote(opp_id: int, body: VoteRequest, user: dict = Depends(get_current_user)):
    if body.vote not in (1, -1):
        raise HTTPException(status_code=400, detail="Vote must be 1 or -1")

    _check_opportunity_exists(opp_id)

    with get_conn() as conn:
        # Check existing vote
        existing = conn.execute(
            "SELECT id, vote FROM votes WHERE opportunity_id = %s AND user_id = %s",
            (opp_id, user["id"]),
        ).fetchone()

        if existing is None:
            # New vote
            conn.execute(
                "INSERT INTO votes (opportunity_id, user_id, vote) VALUES (%s, %s, %s)",
                (opp_id, user["id"], body.vote),
            )
            action = "voted"
        elif existing[1] == body.vote:
            # Same vote again → toggle off (remove)
            conn.execute("DELETE FROM votes WHERE id = %s", (existing[0],))
            action = "removed"
        else:
            # Different vote → flip
            conn.execute("UPDATE votes SET vote = %s WHERE id = %s", (body.vote, existing[0]))
            action = "changed"

        # Get current score
        score_row = conn.execute(
            "SELECT COALESCE(SUM(vote), 0) FROM votes WHERE opportunity_id = %s",
            (opp_id,),
        ).fetchone()
        conn.commit()

    return {"action": action, "vote": body.vote if action != "removed" else None, "vote_score": int(score_row[0])}


class CommentRequest(BaseModel):
    content: str


@router.get("/{opp_id}/comments")
async def get_comments(opp_id: int, user: dict = Depends(get_current_user)):
    _check_opportunity_exists(opp_id)

    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT c.id, c.content, c.created_at, c.user_id, u.username, u.display_name
            FROM comments c
            JOIN users u ON u.id = c.user_id
            WHERE c.opportunity_id = %s
            ORDER BY c.created_at ASC
            """,
            (opp_id,),
        ).fetchall()

    return [
        {
            "id": r[0],
            "content": r[1],
            "created_at": r[2].isoformat(),
            "user_id": r[3],
            "username": r[4],
            "display_name": r[5],
        }
        for r in rows
    ]


@router.post("/{opp_id}/comments")
async def add_comment(opp_id: int, body: CommentRequest, user: dict = Depends(get_current_user)):
    if not body.content.strip():
        raise HTTPException(status_code=400, detail="Comment cannot be empty")

    _check_opportunity_exists(opp_id)

    with get_conn() as conn:
        row = conn.execute(
            """
            INSERT INTO comments (opportunity_id, user_id, content)
            VALUES (%s, %s, %s)
            RETURNING id, created_at
            """,
            (opp_id, user["id"], body.content.strip()),
        ).fetchone()
        conn.commit()

    return {
        "id": row[0],
        "content": body.content.strip(),
        "created_at": row[1].isoformat(),
        "user_id": user["id"],
        "username": user["username"],
        "display_name": user["display_name"],
    }
