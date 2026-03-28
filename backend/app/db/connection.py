"""PostgreSQL connection pool and schema initialization."""

from pathlib import Path

import psycopg_pool

from app.config import settings

pool: psycopg_pool.ConnectionPool | None = None

SCHEMA_SQL = (Path(__file__).parent / "schema.sql").read_text()


async def init_db() -> None:
    """Create connection pool and initialize schema."""
    global pool
    pool = psycopg_pool.ConnectionPool(
        conninfo=settings.database_url,
        min_size=2,
        max_size=10,
    )
    pool.open()

    with pool.connection() as conn:
        conn.execute(SCHEMA_SQL)
        conn.commit()


async def close_db() -> None:
    """Close the connection pool."""
    global pool
    if pool is not None:
        pool.close()
        pool = None


def get_conn():
    """Get a connection from the pool (use as context manager)."""
    if pool is None:
        raise RuntimeError("Database pool not initialized")
    return pool.connection()
