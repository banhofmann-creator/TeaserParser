# BTP (Ban's TeaserParser) — Review Log

## Project Status Summary (for context recovery)

**Phases 1-13 are COMPLETE. Phase 14 (E2E Tests & Polish) remains.**

### Backend (Phases 1-7) — COMPLETE
- FastAPI app at `backend/app/main.py` with 7 routers, 21 endpoints (added `/api/config/powerbi`)
- PostgreSQL schema (7 tables), connection pool, seed data (admin/demo users)
- Session auth with bcrypt (`pwdlib`), role-based access (admin/user)
- Document upload → docling parsing → LiteLLM structured extraction → Nominatim geocoding → opportunity creation
- Opportunities CRUD with filtering, assignment, status management
- Votes (toggle), comments, progress notes (permission-gated)
- AI chat with mock mode, action execution (update_status, assign, update_fields)
- All endpoints tested against live PostgreSQL

### Frontend (Phases 8-12) — COMPLETE
- Next.js static export, Tailwind v4, dark terminal aesthetic
- 22 components + 3 hooks + types + API layer (see file list below)
- Build: clean, 0 errors, 113 kB first load JS

### Docker & Integration (Phase 13) — COMPLETE
- Dockerfile finalized with system deps, `--no-cache` for heavy docling deps
- docker-compose.yml with restart policies, PostgreSQL exposed on 5432 for PowerBI
- Start/stop scripts auto-generate SESSION_SECRET, wait for health, open browser
- `.env` created with `LLM_MOCK=true` for testing
- Added missing `/api/config/powerbi` endpoint

### What remains:
- **Phase 14**: Playwright E2E tests, error/empty/loading states polish, edge cases

---

## 2026-04-01 — Phase 13 Review: Integration & Docker

### Verification Results

| Test | Result | Evidence |
|------|--------|----------|
| Docker build | PASS | Multi-stage build: Node frontend (39s) + Python backend with 142 packages (225s). Image built successfully. |
| Containers start | PASS | PostgreSQL healthy, app started, both ports exposed (8000, 5432) |
| `GET /api/health` | PASS | `{"status":"ok"}` |
| Frontend serves at `/` | PASS | HTTP 200, `<title>BTP - Ban's TeaserParser</title>` |
| Login (demo) | PASS | `{"id":2,"username":"demo","display_name":"Demo User","role":"user"}` |
| Login (admin) | PASS | `{"id":1,"username":"admin","display_name":"Admin","role":"admin"}` |
| `GET /api/auth/me` | PASS | Returns correct user from session |
| Upload + parse (mock) | PASS | Document saved, opportunity created with all 16 fields, geocoded (29.78, -96.15) |
| `GET /api/opportunities` | PASS | Returns array with vote_score, vote_count |
| `GET /api/opportunities/1` | PASS | Full detail with documents array |
| Upvote | PASS | `{"action":"voted","vote":1,"vote_score":1}` |
| Add comment | PASS | Comment with user info and timestamp |
| Assign (admin) | PASS | `{"ok":true,"assigned_to":2}` |
| Progress note (assigned user) | PASS | Note created with user info |
| Chat greeting | PASS | Personalized: "Hello Demo User!" |
| Chat recommendations | PASS | Portfolio analysis response |
| Chat archive action | PASS | Status changed to cancelled, verified via GET |
| Chat history | PASS | 6 messages (3 user + 3 assistant), actions included |
| `GET /api/config/powerbi` | PASS | `{"embed_url":null}` (no URL configured) |
| Document download | PASS | HTTP 200, 40961 bytes (matches upload size) |
| Volume persistence | PASS | `docker compose restart` → login → opportunity still exists, document still downloadable |

### Files Modified

| File | Change |
|------|--------|
| `Dockerfile` | Added `libpq5` system dep, copied `.python-version`, added `--no-cache` to `uv sync` for smaller image |
| `docker-compose.yml` | Added `restart: unless-stopped` to both services, exposed PostgreSQL port 5432 for PowerBI DirectQuery |
| `backend/app/main.py` | Added `GET /api/config/powerbi` endpoint returning embed URL from settings |
| `scripts/start_mac.sh` | Auto-generates `SESSION_SECRET`, waits for health check, opens browser, shows login info |
| `scripts/start_windows.ps1` | Same improvements as mac script (PowerShell equivalent) |
| `scripts/stop_mac.sh` | Added hint about `docker compose down -v` to remove data |
| `scripts/stop_windows.ps1` | Same improvement |
| `.env` | Created with `LLM_MOCK=true` for testing without API key |

### Design Decisions

- **PostgreSQL port exposed (5432)**: Enables PowerBI Desktop to connect directly via DirectQuery or Import mode without needing an on-premises data gateway for local dev.
- **`restart: unless-stopped`**: Containers auto-restart on crash or host reboot, but respect manual `docker compose down`.
- **`--no-cache` on `uv sync`**: docling pulls ~200MB of torch/transformers. `--no-cache` avoids keeping a second copy in the uv cache layer, reducing image size.
- **`libpq5` system dep**: Required at runtime by psycopg binary. Without it, the container would fail on import with a missing `libpq.so`.
- **Health check wait in scripts**: Start scripts poll `/api/health` for up to 60 seconds before declaring success. Prevents the user from opening a browser to a 502.
- **Auto-generated SESSION_SECRET**: Addresses the Phase 1 review note. New `.env` files get a random 32-byte hex secret automatically.

### Notes

- Docker image is large due to docling's dependencies (torch, transformers, nvidia CUDA libs — 142 packages). `--no-cache` on `uv sync` helps avoid doubling the size.
- Mock mode (`LLM_MOCK=true`) fully tested end-to-end. For production use with real LLM, user must set `OPENROUTER_API_KEY` and `LLM_MOCK=false`.
- Nominatim geocoding for "100 Main Street, Austin, TX, US" returns coordinates ~50mi east of downtown Austin. Acceptable for mock data; real teasers with full addresses will be more accurate.

---

## 2026-03-28 — Phases 9-12 Review: Frontend Components

### Build Verification

| Test | Result | Evidence |
|------|--------|----------|
| TypeScript compilation | PASS | `npm run build` — 0 errors, 0 warnings |
| Static export | PASS | `out/index.html` + all chunks generated |
| Dependencies installed | PASS | `react-leaflet`, `leaflet`, `@types/leaflet` added |
| All 22 components exist | PASS | Verified via `find` |

### Phase 9: Map View (3 files)

| File | Purpose |
|------|---------|
| `src/components/map/OpportunityMap.tsx` | Leaflet map with dark CARTO tiles, colored divIcon markers by status, red pulse on new/unassigned, auto-fitBounds |
| `src/components/map/OpportunityPopup.tsx` | Popup: property name, price, type, status, votes, cap rate, "View Details" button |
| `src/components/map/MapWrapper.tsx` | Next.js `dynamic()` with `ssr: false` — required for Leaflet + SSG |

### Phase 10: Opportunity Table & Detail (5 files)

| File | Purpose |
|------|---------|
| `src/components/opportunities/OpportunityTable.tsx` | Sortable table (click headers), status/property_type filter dropdowns, colored status dots, red pulse on new/unassigned, row click → onSelect |
| `src/components/opportunities/OpportunityDetail.tsx` | Full detail with 4 tabs (Details, Documents, Comments, Progress), field grid, VoteButtons in header, back navigation |
| `src/components/opportunities/VoteButtons.tsx` | Up/down vote with highlighted active state, score display |
| `src/components/opportunities/CommentSection.tsx` | Comment list with timestamps + add comment form |
| `src/components/opportunities/ProgressSection.tsx` | Progress notes list + add note form (permission-gated) |

### Phase 11: Documents & Upload (3 files)

| File | Purpose |
|------|---------|
| `src/components/documents/UploadZone.tsx` | Drag-and-drop + file picker, upload progress, parsed opportunity summary on success |
| `src/components/documents/FileManager.tsx` | Document table with type icons, filter by opportunity, download links |
| `src/components/documents/DocumentList.tsx` | Compact document list for OpportunityDetail embed |

### Phase 12: Dashboard & Chat (4 files + 1 hook)

| File | Purpose |
|------|---------|
| `src/components/dashboard/PowerBIDashboard.tsx` | Iframe embed if URL configured, setup placeholder if not |
| `src/components/chat/ChatPanel.tsx` | Right sidebar: message list, auto-scroll, loading/empty states |
| `src/components/chat/ChatMessage.tsx` | User (right, blue) / assistant (left, dark) bubbles, action badges |
| `src/components/chat/ChatInput.tsx` | Text input, Enter-to-send, loading state |
| `src/hooks/useChat.ts` | History loading, optimistic send, messages state |

### Hooks Created

| File | Purpose |
|------|---------|
| `src/hooks/useOpportunities.ts` | Fetch/filter opportunities, refetch, loading/error |
| `src/hooks/useChat.ts` | Chat history, send message, messages state |

### AppShell Wiring

All views wired into `AppShell.tsx`:
- **Map** → MapWrapper with real opportunities data
- **Table** → OpportunityTable with selection → OpportunityDetail
- **Dashboard** → PowerBIDashboard
- **Documents** → FileManager
- **Upload** → UploadZone
- **Chat panel** → ChatPanel (always visible in right sidebar)
- Map popup "View Details" navigates to table detail view

### Complete Frontend File Tree

```
frontend/src/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── auth/LoginForm.tsx
│   ├── chat/ChatInput.tsx, ChatMessage.tsx, ChatPanel.tsx
│   ├── dashboard/PowerBIDashboard.tsx
│   ├── documents/DocumentList.tsx, FileManager.tsx, UploadZone.tsx
│   ├── layout/AppShell.tsx, Header.tsx, Sidebar.tsx
│   ├── map/MapWrapper.tsx, OpportunityMap.tsx, OpportunityPopup.tsx
│   └── opportunities/CommentSection.tsx, OpportunityDetail.tsx,
│       OpportunityTable.tsx, ProgressSection.tsx, VoteButtons.tsx
├── hooks/useAuth.ts, useChat.ts, useOpportunities.ts
├── lib/api.ts
└── types/index.ts
```

---

## 2026-03-28 — Phase 8 Review: Frontend Shell, Auth & Navigation

### Verification Results

| Test | Result | Evidence |
|------|--------|----------|
| TypeScript compilation | PASS | `npm run build` — zero errors |
| Static export | PASS | `out/index.html` generated, 2 routes exported |
| All files created | PASS | 10 files across types, lib, hooks, components, app |

### Files Created

| File | Purpose |
|------|---------|
| `frontend/src/types/index.ts` | Shared TS types: User, Opportunity, Document, Comment, ProgressNote, VoteResponse, ChatMessage, ChatResponse, ViewId |
| `frontend/src/lib/api.ts` | Typed fetch wrappers for all 20 API endpoints, ApiError class |
| `frontend/src/hooks/useAuth.ts` | AuthContext + AuthProvider + useAuth() hook — checks /api/auth/me on mount |
| `frontend/src/components/auth/LoginForm.tsx` | Dark-themed login form with purple submit button, error display |
| `frontend/src/components/layout/Header.tsx` | 48px top bar: "BTP" in blue, user info, logout |
| `frontend/src/components/layout/Sidebar.tsx` | 200px left nav: Map, Table, Dashboard, Documents, Upload — active state with blue highlight |
| `frontend/src/components/layout/AppShell.tsx` | Full layout: Header + Sidebar + main content + collapsible chat panel slot (320px) |
| `frontend/src/app/page.tsx` | Auth gate: LoginForm if unauthenticated, AppShell if logged in |
| `frontend/src/app/layout.tsx` | Updated with antialiased class |
| `frontend/src/app/globals.css` | Custom scrollbar, pulse-red animation, Tailwind v4 import |

### Design Decisions

- **Inline Tailwind colors**: All plan colors used as `bg-[#0d1117]` etc. — no Tailwind config customization needed with v4.
- **View state in AppShell**: Sidebar sets active view, AppShell renders placeholder content per view. Real components plugged in during Phases 9-12.
- **Chat panel collapsible**: 320px right sidebar with toggle. Always accessible regardless of active view.
- **Auth gate at page level**: Single page app — page.tsx checks auth and renders either login or shell. No router needed for static export.

---

## 2026-03-28 — Phase 7 Review: AI Chat

### Verification Results

| Test | Result | Evidence |
|------|--------|----------|
| Greeting | PASS | "Hello Demo User! I'm BTP..." — personalized with display_name |
| Recommendation query | PASS | Returns portfolio analysis with no actions |
| Archive action ("Archive opportunity #1") | PASS | Action executed: status changed to "cancelled", verified via GET |
| Assign action ("Assign #1 to me") | PASS | Action executed: assigned_to=2, verified via GET |
| Generic question | PASS | Returns helpful capabilities summary |
| Chat history | PASS | Returns messages in chronological order, both user and assistant |
| History includes action results | PASS | Assistant messages have `actions` field with execution details |
| Empty message | PASS | HTTP 400, "Message cannot be empty" |
| Chat without auth | PASS | HTTP 401 |
| Conversation context | PASS | History loaded (last 20 messages) and sent to LLM for context |

### Files Created

| File | Purpose |
|------|---------|
| `backend/app/chat/__init__.py` | Package init |
| `backend/app/chat/prompts.py` | System prompt template + `build_opportunity_context()` — builds portfolio summary from DB for LLM context |
| `backend/app/chat/llm.py` | `ChatResponse` Pydantic model (message + actions), LiteLLM structured output call |
| `backend/app/chat/mock.py` | Keyword-based mock responses: greeting, archive, assign, status change, recommendations, generic fallback |
| `backend/app/chat/routes.py` | POST `/api/chat` (history → LLM → execute actions → persist), GET `/api/chat/history` (last 50 messages) |

### Files Modified

| File | Change |
|------|--------|
| `backend/app/main.py` | Added `chat_router` import and include |

### Design Decisions

- **Action execution in backend**: LLM returns actions as structured JSON, backend executes them with validation. Prevents prompt injection from modifying arbitrary DB fields — only whitelisted fields/actions allowed.
- **Action allowlist**: `update_fields` only permits the 16 opportunity data fields. `status`, `assigned_to`, and table-structural columns are protected.
- **Conversation history**: Last 20 messages loaded for LLM context. Sufficient for continuity without excessive token usage.
- **Portfolio context in system prompt**: All opportunities (up to 50) with key metrics are injected into the system prompt so the LLM can reference specific data.
- **Mock mode**: Keyword-based (`archive`, `assign`, `top/best/recommend`, `hello`) with ID extraction via regex. Deterministic for testing.
- **Messages persisted separately**: User and assistant messages stored as individual rows with timestamps. Actions stored as JSONB on assistant messages.

### Backend API Complete

With Phase 7, all planned backend API endpoints are implemented:
- Auth (3 endpoints)
- Documents (4 endpoints)
- Opportunities (5 endpoints)
- Votes & Comments (3 endpoints)
- Progress Notes (2 endpoints)
- Chat (2 endpoints)
- System (1 endpoint)

**Total: 20 endpoints across 7 modules.** Ready for frontend development (Phases 8-12).

---

## 2026-03-28 — Phase 6 Review: Votes, Comments & Progress

### Verification Results

| Test | Result | Evidence |
|------|--------|----------|
| Upvote opportunity | PASS | `{"action":"voted","vote":1,"vote_score":1}` |
| Toggle vote off (same vote again) | PASS | `{"action":"removed","vote":null,"vote_score":0}` |
| Two users vote (demo up, admin down) | PASS | vote_score=0, vote_count=2 in detail |
| Invalid vote value | PASS | HTTP 400, "Vote must be 1 or -1" |
| Vote on non-existent opportunity | PASS | HTTP 404 |
| Add comment | PASS | Returns comment with id, content, user info, timestamp |
| List comments (2 users) | PASS | Ordered by created_at ASC, includes username + display_name |
| Empty comment | PASS | HTTP 400, "Comment cannot be empty" |
| Progress note as unassigned user | PASS | HTTP 403, "Only the assigned user or an admin can add progress notes" |
| Progress note as assigned user | PASS | HTTP 200, note created with user info |
| Progress note as admin | PASS | Admin can add notes to any opportunity |
| List progress notes | PASS | Ordered by created_at DESC (newest first), includes user info |
| Vote score in opportunity detail | PASS | `vote_score` and `vote_count` aggregate correctly |
| Comments on non-existent opportunity | PASS | HTTP 404 |

### Files Created

| File | Purpose |
|------|---------|
| `backend/app/votes/__init__.py` | Package init |
| `backend/app/votes/routes.py` | POST vote (toggle: new/remove/flip), GET comments, POST comment — with user info in responses |
| `backend/app/progress/__init__.py` | Package init |
| `backend/app/progress/routes.py` | GET progress notes, POST progress note (assigned user or admin only) |

### Files Modified

| File | Change |
|------|--------|
| `backend/app/main.py` | Added `votes_router` and `progress_router` imports and includes |

### Design Decisions

- **Vote toggle**: Same vote twice removes it, different vote flips it. Returns current `vote_score` so frontend can update immediately.
- **Comments ordered ASC, progress notes DESC**: Comments read chronologically (conversation); progress notes show latest first (status updates).
- **User info in responses**: Comments and progress notes include `username` and `display_name` via JOIN — avoids frontend needing a separate user lookup.
- **Shared opportunity existence check**: Both votes and comments routes use `_check_opportunity_exists()` to return 404 before attempting writes.

---

## 2026-03-28 — Phase 5 Review: Opportunities API

### Verification Results

| Test | Result | Evidence |
|------|--------|----------|
| `GET /api/opportunities` (list) | PASS | Returns array with vote_score, vote_count, all opportunity fields |
| `GET /api/opportunities/1` (detail) | PASS | Returns full opportunity with documents array, vote_score, vote_count |
| Filter by `status=new` | PASS | Returns only opportunities with status "new" |
| Filter by `city=Austin` | PASS | Case-insensitive city filter works |
| `PUT` edit as unassigned user | PASS | HTTP 403, "Only the assigned user or an admin can edit this opportunity" |
| `PATCH /assign` as admin | PASS | HTTP 200, `{"ok":true,"assigned_to":2}` |
| `PUT` edit as assigned user | PASS | HTTP 200, `{"ok":true,"updated_fields":["asking_price"]}` |
| `PATCH /status` valid | PASS | HTTP 200, `{"ok":true,"status":"active"}` |
| `PATCH /status` invalid | PASS | HTTP 400, lists valid statuses |
| `PATCH /assign` as non-admin | PASS | HTTP 403, "Requires role: admin" |
| `GET /opportunities/999` | PASS | HTTP 404, "Opportunity not found" |
| Final state verification | PASS | asking_price updated to 13M, status=active, assigned_to=2, documents array present |

### Files Created

| File | Purpose |
|------|---------|
| `backend/app/opportunities/__init__.py` | Package init |
| `backend/app/opportunities/routes.py` | List (filterable by status/assigned_to/property_type/city), detail (with documents + vote aggregates), PUT update (permission-checked), PATCH assign (admin only), PATCH status (validated against allowed set) |

### Files Modified

| File | Change |
|------|--------|
| `backend/app/main.py` | Added `opportunities_router` import and include |

### Design Decisions

- **Vote aggregation via subquery**: Used a subquery join (`LEFT JOIN (SELECT ... FROM votes GROUP BY ...)`) instead of `GROUP BY o.id` on the main query. Avoids potential issues with PostgreSQL GROUP BY and is clearer about intent.
- **Dynamic UPDATE**: `PUT` endpoint only updates fields present in the request body (`exclude_none=True`). Prevents accidentally nulling fields.
- **Permission model**: Admin can edit any opportunity. Regular users can only edit opportunities assigned to them. Assignment itself is admin-only.
- **Status validation**: Whitelist of valid statuses (`new`, `active`, `inactive`, `completed`, `cancelled`) checked before update.
- **Filters are AND-combined**: Multiple query params narrow results (e.g., `?status=active&city=Austin`).

---

## 2026-03-28 — Phase 4 Review: Parsing Pipeline

### Verification Results

| Test | Result | Evidence |
|------|--------|----------|
| Upload with `parse=true` (mock) | PASS | Opportunity created with all 16 extracted fields, document linked |
| Mock extraction fields | PASS | All fields populated: property_name, address, city, state, country, asking_price, property_type, size_sqft, year_built, cap_rate, noi, occupancy_rate, rent_roll_summary, debt_terms, irr_projection, seller_info |
| Nominatim geocoding | PASS | "100 Main Street, Austin, TX, US" → (29.781872, -96.152206) — real coordinates |
| Opportunity → document link | PASS | Document `opportunity_id` matches created opportunity `id` |
| Upload with `parse=false` | PASS | Document saved, no opportunity created, `opportunity_id` is null |
| Response structure | PASS | Returns `{document: {...}, opportunity: {...}}` when parsed, `{document: {...}}` when not |
| Parse failure resilience | PASS | Design: document is always saved even if parsing throws an exception |

### Files Created

| File | Purpose |
|------|---------|
| `backend/app/documents/parser.py` | `OpportunityExtraction` Pydantic model (16 nullable fields), docling text extraction, LiteLLM structured output call with `extra_body` workaround, `_mock_extraction()` for `LLM_MOCK=true` |
| `backend/app/documents/geocoder.py` | Nominatim geocoding with in-memory cache and 1 req/sec rate limiting |

### Files Modified

| File | Change |
|------|--------|
| `backend/app/documents/routes.py` | Upload route now runs parse → geocode → insert opportunity → link document. Added `parse` query param (default `true`). Response structure changed to `{document, opportunity}` |
| `backend/pyproject.toml` | Added `docling>=2.31.0`, `httpx>=0.28.0`, `litellm>=1.67.0` |
| `backend/uv.lock` | Regenerated (heavy deps: torch, transformers, etc. from docling) |

### Design Decisions

- **`parse` query param**: Allows uploading documents without triggering the pipeline (useful for attaching additional docs to existing opportunities later).
- **Geocoding is best-effort**: If Nominatim fails, opportunity is still created with `null` lat/lng — map just won't show it until coordinates are added.
- **Mock mode returns fixed Austin, TX data**: Deterministic for testing. Real parsing uses docling → LiteLLM → OpenRouter.
- **docling imports deferred**: `DocumentConverter` imported inside function to avoid heavy import at startup (torch, transformers).
- **Resilient upload**: Document file is always persisted to disk/DB even if parsing or geocoding fails — no data loss.

### Notes

- `docling` pulls in heavy dependencies (~200MB: torch, transformers, scipy, opencv). Docker image size will increase significantly. Consider `--no-cache-dir` in Dockerfile pip install.
- Nominatim geocoding matched "100 Main Street, Austin, TX, US" to a location in Texas but not downtown Austin (lat 29.78 is ~50 miles east). For production, a paid geocoder or more specific addresses would improve accuracy.
- LLM real mode not tested yet (requires `OPENROUTER_API_KEY`). Mock mode fully verified.

---

## 2026-03-28 — Phase 3 Review: Document Upload & Storage

### Verification Results

| Test | Result | Evidence |
|------|--------|----------|
| `POST /api/documents/upload` (PDF) | PASS | HTTP 200, returns metadata with UUID stored filename, file_size, uploaded_at |
| `POST /api/documents/upload` (PNG) | PASS | HTTP 200, second document stored correctly |
| `POST /api/documents/upload` (.exe) | PASS | HTTP 400, `"File type '.exe' not allowed. Allowed: docx, jpeg, jpg, pdf, png, xlsx"` |
| `GET /api/documents` (list all) | PASS | HTTP 200, returns array of 2 documents ordered by uploaded_at DESC |
| `GET /api/documents/1` (metadata) | PASS | HTTP 200, correct metadata for uploaded PDF |
| `GET /api/documents/1/download` | PASS | HTTP 200, file content matches original upload exactly |
| `GET /api/documents/999` (not found) | PASS | HTTP 404, `"Document not found"` |
| `POST /api/documents/upload` (no auth) | PASS | HTTP 401, `"Not authenticated"` |
| File on disk | PASS | Stored as `{uuid}.pdf` in upload directory |

### Files Created

| File | Purpose |
|------|---------|
| `backend/app/documents/__init__.py` | Package init |
| `backend/app/documents/routes.py` | Upload (multipart), list (filterable by opportunity_id), get metadata, download with correct media types |

### Files Modified

| File | Change |
|------|--------|
| `backend/app/main.py` | Added `documents_router` import and `app.include_router(documents_router)` |

### Design Decisions

- **File storage**: `{uuid}.{ext}` naming avoids collisions and path traversal. Original filename preserved in DB only.
- **Size validation**: File fully read into memory then checked against 50 MB limit. Acceptable for this scale; streaming validation would be needed for very large files.
- **Upload directory**: Created lazily via `mkdir(parents=True, exist_ok=True)` on first use — works in both Docker and local dev.
- **Media types**: Explicit mapping for all allowed types ensures correct `Content-Type` on download.
- **`opportunity_id` optional on upload**: Documents can be uploaded without linking to an opportunity (linking happens in Phase 4 when parsing creates the opportunity).

---

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

## 2026-03-28 — Phase 2 Review: Database & Auth

### Verification Results

| Test | Result | Evidence |
|------|--------|----------|
| Config loads from env | PASS | `Settings.database_url` returns correct connection string |
| All modules import cleanly | PASS | `python -c "from app.main import app"` — no errors |
| Routes registered | PASS | login, logout, me, health all in `app.routes` |
| `GET /api/health` | PASS | HTTP 200, `{"status":"ok"}` |
| `GET /api/auth/me` (no session) | PASS | HTTP 401, `{"detail":"Not authenticated"}` |
| `POST /api/auth/login` (demo) | PASS | HTTP 200, `{"id":2,"username":"demo","display_name":"Demo User","role":"user"}` |
| `GET /api/auth/me` (with session) | PASS | HTTP 200, correct user returned |
| `POST /api/auth/login` (admin) | PASS | HTTP 200, `{"id":1,"username":"admin","display_name":"Admin","role":"admin"}` |
| `POST /api/auth/logout` | PASS | HTTP 200, session cleared |
| `GET /api/auth/me` (after logout) | PASS | HTTP 401, session no longer valid |
| `POST /api/auth/login` (bad password) | PASS | HTTP 401, `{"detail":"Invalid credentials"}` |
| Schema init (7 tables) | PASS | All CREATE TABLE statements executed on startup |
| Seed users (admin + demo) | PASS | Both users created with bcrypt-hashed passwords, ON CONFLICT DO NOTHING for idempotency |
| Docker Compose full build | NOT TESTED | Tested against standalone PostgreSQL container |

### Files Created

| File | Purpose |
|------|---------|
| `backend/app/config.py` | Pydantic BaseSettings — all env vars with defaults |
| `backend/app/db/__init__.py` | Package init |
| `backend/app/db/schema.sql` | 7 tables: users, opportunities, documents, votes, comments, progress_notes, chat_messages |
| `backend/app/db/connection.py` | psycopg ConnectionPool (min=2, max=10), schema init on startup, `get_conn()` helper |
| `backend/app/db/seed.py` | Seed admin + demo users with bcrypt hashes, idempotent via ON CONFLICT |
| `backend/app/auth/__init__.py` | Package init |
| `backend/app/auth/dependencies.py` | `get_current_user` (session → user dict), `require_role(role)` factory |
| `backend/app/auth/routes.py` | POST `/api/auth/login`, POST `/api/auth/logout`, GET `/api/auth/me` |

### Files Modified

| File | Change |
|------|--------|
| `backend/app/main.py` | Added lifespan (init_db + seed), SessionMiddleware, auth router |
| `backend/pyproject.toml` | Added `pwdlib[bcrypt]>=0.2.1`, `itsdangerous>=2.2.0` |
| `backend/uv.lock` | Regenerated with new dependencies |

### Design Decisions

- **Synchronous psycopg pool**: Used `psycopg_pool.ConnectionPool` (sync) rather than `AsyncConnectionPool`. FastAPI handles concurrency at the ASGI level; sync DB calls in async routes are acceptable for this scale and avoids async-everywhere complexity.
- **Session cookie name**: `btp_session` — distinct, avoids collisions with other apps on localhost.
- **`same_site="lax"`, `https_only=False`**: Appropriate for local Docker development. Should be tightened for production deployment.
- **`require_role` as factory**: Returns a dependency callable — clean pattern for role-based route protection without decorators.

### Issues Noted (not fixed, low severity)

- No rate limiting on login endpoint — acceptable for internal/Docker use, would need limiting if exposed publicly.
- `SESSION_SECRET` still defaults to a static string — users must change it via `.env`. Start scripts could auto-generate this (noted in Phase 1 review as well).

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
