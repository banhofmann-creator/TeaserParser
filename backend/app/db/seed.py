"""Seed default users (admin + demo)."""

from pwdlib import PasswordHash
from pwdlib.hashers.bcrypt import BcryptHasher

from app.db.connection import get_conn

hasher = PasswordHash((BcryptHasher(),))


def seed_users() -> None:
    """Insert default admin and demo users if they don't exist."""
    defaults = [
        ("admin", "Admin", hasher.hash("admin"), "admin"),
        ("demo", "Demo User", hasher.hash("demo"), "user"),
    ]

    with get_conn() as conn:
        for username, display_name, hashed_pw, role in defaults:
            conn.execute(
                """
                INSERT INTO users (username, display_name, hashed_password, role)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (username) DO NOTHING
                """,
                (username, display_name, hashed_pw, role),
            )
        conn.commit()
