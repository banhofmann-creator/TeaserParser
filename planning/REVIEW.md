# BTP (Ban's TeaserParser) — Review Log

## 2026-03-27 — Phase 1 Review & Fixes

### Verification Results

| Test | Result | Evidence |
|------|--------|----------|
| All 27 Phase 1 files exist | PASS | `ls -la` confirms all files present |
| Backend health endpoint | PASS | `curl /api/health` → HTTP 200, `{"status":"ok"}` |
| Backend non-existent route | PASS | `curl /api/nonexistent` → HTTP 404 |
| Frontend `npm run build` | PASS | Exit code 0, `out/index.html` generated |
| Static file serving | PASS | Backend serves `out/` at `/` (HTTP 200) alongside `/api/health` |
| Docker Compose build | NOT TESTED | Docker Desktop not running on this machine |

### Issues Found and Fixed

**CRITICAL (fixed)**
- `requires-python = ">=3.14"` in pyproject.toml vs `python:3.12-slim` in Dockerfile — Docker build would fail because uv refuses to install when Python version constraint isn't met. **Fix**: changed to `">=3.12"`, updated `.python-version`, regenerated `uv.lock`.

**MEDIUM (fixed)**
- No `.dockerignore` — build context would include `.git/`, `node_modules/`, `.venv/`, etc. **Fix**: created `.dockerignore`.
- `uv` pinned to `:latest` in Dockerfile — non-reproducible. **Fix**: pinned to `ghcr.io/astral-sh/uv:0.7`.
- `uv sync` without `--no-install-project` — could fail trying to install the project package before source code is copied. **Fix**: added `--no-install-project` flag.
- PostgreSQL password hardcoded in `docker-compose.yml` — credentials wouldn't sync with `.env`. **Fix**: changed postgres service to use `env_file: .env`.

### Issues Noted (not fixed, low severity)

- Plan Section 17 says `next.config.js` but we use `next.config.ts` — this is a positive deviation (TypeScript config is better). No fix needed.
- No Tailwind theme config with plan's color palette as reusable tokens — colors used as inline values. Will become tech debt if not addressed by Phase 8.
- Start scripts don't auto-generate a random `SESSION_SECRET` — user must manually edit `.env`.
- `test/` directory not yet created — planned for Phase 14, not needed now.

### Files Changed in This Review

| File | Change |
|------|--------|
| `backend/pyproject.toml` | `requires-python` → `">=3.12"` |
| `backend/.python-version` | `3.14` → `3.12` |
| `backend/uv.lock` | Regenerated for Python 3.12 |
| `Dockerfile` | Pinned uv to `0.7`, added `--no-install-project` |
| `docker-compose.yml` | PostgreSQL uses `env_file: .env` instead of hardcoded values |
| `.dockerignore` | New file |

---

## 2026-03-26 — Plan Written for New Project

### Project Pivot
Project changed from FinAlly (trading workstation) to BTP (real estate teaser parser). Entirely new plan written from scratch.

### Research Conducted
- **Document parsing**: `docling` (IBM, MIT) as unified parser for PDF/DOCX/XLSX/images -> Markdown for LLM. `pymupdf4llm` as PDF-specific fallback. Vision LLM for scanned images.
- **Maps**: `react-leaflet` v5.0.0 + Leaflet + OpenStreetMap tiles. Nominatim for free geocoding (no API key, 1 req/sec).
- **Auth**: `pwdlib[bcrypt]` + Starlette `SessionMiddleware`. No JWT. `passlib` is dead (broken on Python 3.13+).
- **LLM**: `openrouter/openai/gpt-oss-120b` confirmed on OpenRouter. Structured outputs via LiteLLM `extra_body` workaround.
- **PowerBI**: "Publish to Web" iframe is simplest. PowerBI reads from PostgreSQL via gateway/DirectQuery. Apache Superset/Metabase as free alternatives.
- **PostgreSQL**: `psycopg[binary,pool]` v3 for driver + connection pooling.

### Decisions Made
- **Stack**: FastAPI + PostgreSQL + Next.js static export + Docker Compose
- **Auth**: Simple multi-user, session-based, two roles (admin/user)
- **Maps**: Leaflet + OpenStreetMap + Nominatim (all free)
- **Parsing**: docling -> LLM structured output -> Nominatim geocoding
- **PowerBI**: Embedded iframe, configured via env var
- **Package managers**: uv (Python), npm (frontend)
- **Dev workflow**: Docker-only
- **Build model**: Solo sequential

### Open Questions (non-blocking)
- Exact Nominatim geocoding reliability for international addresses — may need fallback
- docling OCR quality on scanned real estate teasers — test during Phase 4
- PowerBI "Publish to Web" availability depends on tenant admin settings
- File size limit for uploads — set to 50MB initially, adjustable
