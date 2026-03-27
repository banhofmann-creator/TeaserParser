"""BTP (Ban's TeaserParser) — FastAPI application."""

from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="BTP - Ban's TeaserParser")

STATIC_DIR = Path(__file__).parent.parent / "static"


@app.get("/api/health")
async def health():
    return {"status": "ok"}


# Serve frontend static files (Next.js export) if the directory exists
if STATIC_DIR.is_dir():
    app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")
