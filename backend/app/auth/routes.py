"""Authentication routes: login, logout, me."""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from pwdlib import PasswordHash
from pwdlib.hashers.bcrypt import BcryptHasher

from app.auth.dependencies import get_current_user
from app.db.connection import get_conn

router = APIRouter(prefix="/api/auth", tags=["auth"])

hasher = PasswordHash((BcryptHasher(),))


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/login")
async def login(body: LoginRequest, request: Request):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id, username, display_name, hashed_password, role FROM users WHERE username = %s",
            (body.username,),
        ).fetchone()

    if row is None or not hasher.verify(body.password, row[3]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    request.session["user_id"] = row[0]
    return {
        "id": row[0],
        "username": row[1],
        "display_name": row[2],
        "role": row[4],
    }


@router.post("/logout")
async def logout(request: Request):
    request.session.clear()
    return {"ok": True}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return user
