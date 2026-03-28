"""BTP (Ban's TeaserParser) — FastAPI application."""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from app.auth.routes import router as auth_router
from app.chat.routes import router as chat_router
from app.documents.routes import router as documents_router
from app.opportunities.routes import router as opportunities_router
from app.progress.routes import router as progress_router
from app.votes.routes import router as votes_router
from app.config import settings
from app.db.connection import close_db, init_db
from app.db.seed import seed_users

STATIC_DIR = Path(__file__).parent.parent / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    seed_users()
    yield
    await close_db()


app = FastAPI(title="BTP - Ban's TeaserParser", lifespan=lifespan)

app.add_middleware(
    SessionMiddleware,
    secret_key=settings.session_secret,
    session_cookie="btp_session",
    same_site="lax",
    https_only=False,
)

app.include_router(auth_router)
app.include_router(documents_router)
app.include_router(opportunities_router)
app.include_router(votes_router)
app.include_router(progress_router)
app.include_router(chat_router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


# Serve frontend static files (Next.js export) if the directory exists
if STATIC_DIR.is_dir():
    app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")
