"""Auth dependencies for FastAPI route protection."""

from typing import Any

from fastapi import HTTPException, Request


async def get_current_user(request: Request) -> dict[str, Any]:
    """Return the current authenticated user or raise 401."""
    user_id = request.session.get("user_id")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    from app.db.connection import get_conn

    with get_conn() as conn:
        row = conn.execute(
            "SELECT id, username, display_name, role FROM users WHERE id = %s",
            (user_id,),
        ).fetchone()

    if row is None:
        request.session.clear()
        raise HTTPException(status_code=401, detail="User not found")

    return {
        "id": row[0],
        "username": row[1],
        "display_name": row[2],
        "role": row[3],
    }


def require_role(role: str):
    """Return a dependency that checks the user has the given role."""

    async def _check(request: Request) -> dict[str, Any]:
        user = await get_current_user(request)
        if user["role"] != role:
            raise HTTPException(
                status_code=403,
                detail=f"Requires role: {role}",
            )
        return user

    return _check
