# BTP (Ban's TeaserParser) — Review Log

## 2026-03-26 — Plan Written for New Project

### Project Pivot
Project changed from FinAlly (trading workstation) to BTP (real estate teaser parser). Entirely new plan written from scratch.

### Research Conducted
- **Document parsing**: `docling` (IBM, MIT) as unified parser for PDF/DOCX/XLSX/images → Markdown for LLM. `pymupdf4llm` as PDF-specific fallback. Vision LLM for scanned images.
- **Maps**: `react-leaflet` v5.0.0 + Leaflet + OpenStreetMap tiles. Nominatim for free geocoding (no API key, 1 req/sec).
- **Auth**: `pwdlib[bcrypt]` + Starlette `SessionMiddleware`. No JWT. `passlib` is dead (broken on Python 3.13+).
- **LLM**: `openrouter/openai/gpt-oss-120b` confirmed on OpenRouter. Structured outputs via LiteLLM `extra_body` workaround.
- **PowerBI**: "Publish to Web" iframe is simplest. PowerBI reads from PostgreSQL via gateway/DirectQuery. Apache Superset/Metabase as free alternatives.
- **PostgreSQL**: `psycopg[binary,pool]` v3 for driver + connection pooling.

### Decisions Made
- **Stack**: FastAPI + PostgreSQL + Next.js static export + Docker Compose
- **Auth**: Simple multi-user, session-based, two roles (admin/user)
- **Maps**: Leaflet + OpenStreetMap + Nominatim (all free)
- **Parsing**: docling → LLM structured output → Nominatim geocoding
- **PowerBI**: Embedded iframe, configured via env var
- **Package managers**: uv (Python), npm (frontend)
- **Dev workflow**: Docker-only
- **Build model**: Solo sequential

### Plan Structure (18 sections)
- Sections 1-2: User's vision and UX spec
- Sections 3-5: Architecture, directory structure, env vars
- Section 6: Document parsing pipeline
- Section 7: PostgreSQL database schema
- Sections 8-10: API endpoints, auth, LLM integration
- Sections 11-12: Frontend design, PowerBI integration
- Sections 13-14: Docker deployment, testing strategy
- Sections 15-17: Validated tech stack, backend modules, frontend architecture
- Section 18: 14-phase implementation roadmap

### Open Questions (non-blocking)
- Exact Nominatim geocoding reliability for international addresses — may need fallback
- docling OCR quality on scanned real estate teasers — test during Phase 4
- PowerBI "Publish to Web" availability depends on tenant admin settings
- File size limit for uploads — set to 50MB initially, adjustable
