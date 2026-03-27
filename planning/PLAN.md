# Ban's TeaserParser — AI supported Document parser

## Project Specification

## 1. Vision

BTP (Ban's TeaserParser) is a visually stunning AI-powered support App, that let's users upload real estate opportunities, and integrates an LLM chat assistant to parse and analyze these opoortunities and executes summaries in a standardized table to create overview and database of all provided opportunities. The dashboard output should be provided as a connector to a PowerBI dashboard that shall be integrated in the app. It also should be functional to give access to all documents that have been uploaded, connected to the datasets created by the parsing.

It is built entirely by Coding Agents demonstrating how orchestrated AI agents can produce a production-quality full-stack application. Agents interact through files in `planning/`.

## 2. User Experience

### First Launch

The user runs a single Docker command (or a provided start script). A browser opens to `http://localhost:8000`. No login, no signup. They immediately see:

- The latest state of the table and dashboard
- An file manager to access documents
- A dark, data-rich terminal aesthetic
- An AI chat panel ready to assist

### What the User Can Do

- **Interact with map** — all opportunites should be integrated in a map that is scroll and zoomable. 
- **Upload new opportunities** — upload new documents to the data and filebase
- **Click an opportunity** Clicking on a marker on the map shall give more information to the opportunity at that location on the map
- **Up or Down-vote an opportunity** — vote on an opportunity and able to provide comments
- **Monitor their portfolio** — Opportunites that have been assigned to the user shall be organized in a user specific table that is editable with progress reports. Opportunites not assigned to the user shall only be visible but not editable
- **Chat with the AI assistant** — ask about the portfolio, get analysis, and have the AI execute changes to the database
- **Manage the portfolio** — archive assigned opportunites manually or via the AI chat

### Visual Design

- **Dark theme**: backgrounds around `#0d1117` or `#1a1a2e`, muted gray borders, no pure black
- **New and unassigned Opportunities Flash**: red background highlight on unassigned or newly added (last 7 days) 
- **Assigned opportunity indicator**: a small colored dot (blue = active, yellow = inactive, red = completed/cancelled) 
- **Professional, data-dense layout**: inspired by Bloomberg/trading terminals — every pixel earns its place
- **Responsive but desktop-first**: optimized for wide screens, functional on tablet

### Color Scheme
- Accent Yellow: `#ecad0a`
- Blue Primary: `#209dd7`
- Purple Secondary: `#753991` (submit buttons)
- Profit Green: `#00c853`
- Loss Red: `#ff1744`

## 3. Architecture Overview

### Docker Compose, Two Containers

```
┌──────────────────────────────────────────────────────────┐
│  Docker Compose                                          │
│                                                          │
│  ┌────────────────────────────────────────┐              │
│  │  App Container (port 8000)             │              │
│  │  FastAPI (Python/uv)                   │              │
│  │  ├── /api/*          REST endpoints    │              │
│  │  ├── /api/upload     File upload       │              │
│  │  └── /*              Static files      │              │
│  │       (Next.js export)                 │              │
│  │                                        │              │
│  │  Volume: /app/uploads (documents)      │              │
│  └────────────────────────────────────────┘              │
│                                                          │
│  ┌────────────────────────────────────────┐              │
│  │  PostgreSQL Container (port 5432)      │              │
│  │  Volume: /var/lib/postgresql/data      │              │
│  └────────────────────────────────────────┘              │
└──────────────────────────────────────────────────────────┘
```

- **Frontend**: Next.js with TypeScript, built as a static export (`output: 'export'`), served by FastAPI as static files
- **Backend**: FastAPI (Python), managed as a `uv` project
- **Database**: PostgreSQL for multi-user concurrency, full-text search, and PowerBI connectivity
- **File storage**: Docker volume at `/app/uploads/` for uploaded documents
- **AI integration**: LiteLLM → OpenRouter (Cerebras for fast inference), with structured outputs for document parsing and chat
- **Map**: Leaflet + OpenStreetMap (free, no API key)
- **Geocoding**: Nominatim (free, 1 req/sec rate limit)
- **Dashboard**: PowerBI embedded via iframe (PowerBI reads from PostgreSQL)

### Why These Choices

| Decision | Rationale |
|---|---|
| PostgreSQL over SQLite | Multi-user auth, concurrent writes, full-text search, PowerBI DirectQuery support |
| Docker Compose | Two services (app + postgres); still a single `docker compose up` command |
| Static Next.js export | Single origin, no CORS issues, simple deployment |
| Leaflet + OpenStreetMap | Free, no API key, good enough for plotting property locations |
| Nominatim geocoding | Free, no signup, perfect for occasional address-to-coordinates lookups |
| PowerBI iframe | Simplest integration; PowerBI reads from PostgreSQL directly |
| Session auth over JWT | Simpler for single-instance Docker app; no token refresh logic |
| `docling` for parsing | Handles PDF, DOCX, XLSX, images in one library; outputs Markdown for LLM consumption |
| uv for Python | Fast, modern Python project management; reproducible lockfile |

---

## 4. Directory Structure

```
teaser-parser/
├── frontend/                    # Next.js TypeScript project (static export)
├── backend/                     # FastAPI uv project (Python)
│   └── app/                     # Application code
├── planning/                    # Project documentation
│   ├── PLAN.md                  # This document
│   └── REVIEW.md                # Review log and decisions
├── scripts/
│   ├── start_mac.sh             # Launch Docker Compose (macOS/Linux)
│   ├── stop_mac.sh              # Stop Docker Compose
│   ├── start_windows.ps1        # Launch Docker Compose (Windows)
│   └── stop_windows.ps1         # Stop Docker Compose
├── test/                        # Playwright E2E tests
├── uploads/                     # Volume mount target for uploaded documents
│   └── .gitkeep
├── docker-compose.yml           # App + PostgreSQL
├── Dockerfile                   # Multi-stage build (Node → Python)
├── .env                         # Environment variables (gitignored)
├── .env.example                 # Template with all env vars documented
└── .gitignore
```

### Key Boundaries

- **`frontend/`** is a self-contained Next.js project. Talks to backend via `/api/*` endpoints.
- **`backend/`** is a self-contained uv project with its own `pyproject.toml`. Owns all server logic: auth, document parsing, opportunities CRUD, chat, file serving.
- **`uploads/`** at the top level is the runtime volume mount point. Documents stored as `{uuid}.{ext}`. Original filenames tracked in the database.
- **`planning/`** contains project documentation.

---

## 5. Environment Variables

```bash
# Required: OpenRouter API key for LLM (document parsing + chat)
OPENROUTER_API_KEY=your-openrouter-api-key-here

# Required: Session secret for cookie signing (generate with: python -c "import os; print(os.urandom(32).hex())")
SESSION_SECRET=change-me-to-a-random-string

# PostgreSQL connection (Docker Compose sets these automatically)
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=teaserparser
POSTGRES_USER=teaserparser
POSTGRES_PASSWORD=teaserparser

# Optional: Set to "true" for deterministic mock LLM responses (testing)
LLM_MOCK=false

# Optional: PowerBI embed URL (configured after publishing a report)
POWERBI_EMBED_URL=

# Optional: Upload directory path (defaults to /app/uploads in Docker)
UPLOAD_DIR=
```

---

## 6. Document Parsing Pipeline

### How It Works

```
User uploads file(s)
        │
        ▼
Backend saves to /app/uploads/{uuid}.{ext}
        │
        ▼
docling extracts text/markdown from document
(handles PDF, DOCX, XLSX, JPG, PNG)
        │
        ▼
Extracted text sent to LLM with structured output schema
        │
        ▼
LLM returns structured JSON with real estate fields
        │
        ▼
Backend geocodes address via Nominatim → lat/lng
        │
        ▼
Opportunity record inserted into PostgreSQL
Document record linked to opportunity
        │
        ▼
Parsed opportunity returned to frontend
```

### Document Processing Libraries

| File Type | Library | Output |
|-----------|---------|--------|
| PDF (native text) | `docling` | Markdown with tables |
| PDF (scanned) | `docling` (OCR mode) or vision LLM | Markdown or direct extraction |
| DOCX | `docling` | Markdown |
| XLSX | `docling` + `openpyxl` fallback | Markdown tables / cell data |
| Images (JPG, PNG) | Vision LLM (send image directly) | Structured JSON |

`docling` (IBM, open-source, MIT) is the primary parser. It handles all common formats, has AI-powered layout analysis, and outputs Markdown optimized for LLM consumption.

### Extracted Fields (Structured Output Schema)

The LLM extracts these fields from each document:

| Field | Type | Description |
|-------|------|-------------|
| `property_name` | string | Name of the property or project |
| `address` | string | Street address |
| `city` | string | City |
| `state` | string | State/province |
| `country` | string | Country |
| `asking_price` | float | Asking price / sale price |
| `property_type` | string | office, retail, industrial, residential, mixed-use, land |
| `size_sqft` | float | Total area in square feet |
| `year_built` | int | Year constructed |
| `cap_rate` | float | Capitalization rate (%) |
| `noi` | float | Net operating income |
| `occupancy_rate` | float | Current occupancy (%) |
| `rent_roll_summary` | string | Brief summary of rent roll |
| `debt_terms` | string | Existing debt / financing terms |
| `irr_projection` | float | Projected internal rate of return (%) |
| `seller_info` | string | Seller / broker information |

All fields are optional (nullable) — the LLM extracts what it can find. Missing fields are stored as null.

---

## 7. Database

### PostgreSQL Schema

**users** — User accounts
- `id` SERIAL PRIMARY KEY
- `username` TEXT UNIQUE NOT NULL
- `display_name` TEXT
- `hashed_password` TEXT NOT NULL
- `role` TEXT NOT NULL DEFAULT `'user'` (`'admin'` or `'user'`)
- `created_at` TIMESTAMPTZ DEFAULT NOW()

**opportunities** — Parsed real estate opportunities
- `id` SERIAL PRIMARY KEY
- `property_name` TEXT
- `address` TEXT
- `city` TEXT
- `state` TEXT
- `country` TEXT
- `latitude` DOUBLE PRECISION
- `longitude` DOUBLE PRECISION
- `asking_price` NUMERIC
- `property_type` TEXT
- `size_sqft` NUMERIC
- `year_built` INTEGER
- `cap_rate` NUMERIC
- `noi` NUMERIC
- `occupancy_rate` NUMERIC
- `rent_roll_summary` TEXT
- `debt_terms` TEXT
- `irr_projection` NUMERIC
- `seller_info` TEXT
- `status` TEXT DEFAULT `'new'` (`'new'`, `'active'`, `'inactive'`, `'completed'`, `'cancelled'`)
- `assigned_to` INTEGER REFERENCES users(id) — nullable
- `created_at` TIMESTAMPTZ DEFAULT NOW()
- `updated_at` TIMESTAMPTZ DEFAULT NOW()

**documents** — Uploaded files linked to opportunities
- `id` SERIAL PRIMARY KEY
- `opportunity_id` INTEGER REFERENCES opportunities(id) ON DELETE CASCADE
- `stored_filename` TEXT NOT NULL — `{uuid}.{ext}` on disk
- `original_filename` TEXT NOT NULL
- `file_type` TEXT — pdf, docx, xlsx, jpg, png
- `file_size` INTEGER
- `uploaded_by` INTEGER REFERENCES users(id)
- `uploaded_at` TIMESTAMPTZ DEFAULT NOW()

**votes** — Up/down votes on opportunities
- `id` SERIAL PRIMARY KEY
- `opportunity_id` INTEGER REFERENCES opportunities(id) ON DELETE CASCADE
- `user_id` INTEGER REFERENCES users(id)
- `vote` SMALLINT — `1` (up) or `-1` (down)
- `created_at` TIMESTAMPTZ DEFAULT NOW()
- UNIQUE constraint on `(opportunity_id, user_id)`

**comments** — Comments on opportunities
- `id` SERIAL PRIMARY KEY
- `opportunity_id` INTEGER REFERENCES opportunities(id) ON DELETE CASCADE
- `user_id` INTEGER REFERENCES users(id)
- `content` TEXT NOT NULL
- `created_at` TIMESTAMPTZ DEFAULT NOW()

**progress_notes** — Progress reports on assigned opportunities
- `id` SERIAL PRIMARY KEY
- `opportunity_id` INTEGER REFERENCES opportunities(id) ON DELETE CASCADE
- `user_id` INTEGER REFERENCES users(id)
- `note` TEXT NOT NULL
- `created_at` TIMESTAMPTZ DEFAULT NOW()

**chat_messages** — Conversation history with LLM
- `id` SERIAL PRIMARY KEY
- `user_id` INTEGER REFERENCES users(id)
- `role` TEXT — `'user'` or `'assistant'`
- `content` TEXT
- `actions` JSONB — database changes executed (null for user messages)
- `created_at` TIMESTAMPTZ DEFAULT NOW()

### Seed Data

- One admin user: `username="admin"`, `role="admin"`, password set via env var or default `"admin"`
- One regular user: `username="demo"`, `role="user"`, password `"demo"`

---

## 8. API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login with `{username, password}`, sets session cookie |
| POST | `/api/auth/logout` | Clear session |
| GET | `/api/auth/me` | Get current user info (username, role) |

### Opportunities
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/opportunities` | List all opportunities (filterable by status, assigned_to, property_type) |
| GET | `/api/opportunities/{id}` | Get opportunity details with vote count and documents |
| PUT | `/api/opportunities/{id}` | Update opportunity fields (assigned user or admin only) |
| PATCH | `/api/opportunities/{id}/assign` | Assign opportunity to a user (admin only) |
| PATCH | `/api/opportunities/{id}/status` | Change opportunity status |

### Documents
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/documents/upload` | Upload file(s), triggers parsing pipeline. Returns parsed opportunity. |
| GET | `/api/documents` | List all documents (filterable by opportunity_id) |
| GET | `/api/documents/{id}` | Get document metadata |
| GET | `/api/documents/{id}/download` | Download original file |

### Votes & Comments
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/opportunities/{id}/vote` | Cast vote: `{vote: 1}` or `{vote: -1}`. Toggles if already voted same. |
| GET | `/api/opportunities/{id}/comments` | Get comments for an opportunity |
| POST | `/api/opportunities/{id}/comments` | Add comment: `{content}` |

### Progress Notes
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/opportunities/{id}/progress` | Get progress notes |
| POST | `/api/opportunities/{id}/progress` | Add note (assigned user or admin only): `{note}` |

### Chat
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chat` | Send message: `{message}`. Returns AI response + executed actions. |
| GET | `/api/chat/history` | Get last 50 chat messages for current user |

### System
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/config/powerbi` | Returns PowerBI embed URL (if configured) |

### Error Response Format

```json
{
  "error": "Not authorized",
  "detail": "Only the assigned user or an admin can edit this opportunity"
}
```

| Status Code | Usage |
|-------------|-------|
| 400 | Validation errors (bad file type, missing fields) |
| 401 | Not authenticated |
| 403 | Insufficient permissions |
| 404 | Resource not found |
| 413 | File too large |
| 500 | Internal server errors |

---

## 9. Authentication

### Session-Based Auth

- **Library**: `pwdlib[bcrypt]` for password hashing (replaces deprecated `passlib`)
- **Sessions**: Starlette's built-in `SessionMiddleware` — signed cookie, no Redis/DB needed
- **No JWT** — simpler for single-instance Docker app

### Roles

| Role | Permissions |
|------|------------|
| `admin` | All actions: CRUD all opportunities, assign users, manage users |
| `user` | View all opportunities, edit only assigned ones, upload documents, vote, comment, chat |

### Flow

1. User POSTs `/api/auth/login` with username + password
2. Backend verifies password via `pwdlib` bcrypt hash
3. On success, sets `request.session["user_id"]` — Starlette signs and sets cookie
4. All subsequent requests include cookie; `get_current_user` dependency reads session
5. Protected routes use `Depends(get_current_user)` or `Depends(require_role("admin"))`

---

## 10. LLM Integration

### Model & Provider

- **Model**: `openrouter/openai/gpt-oss-120b` (117B MoE, ~3k tok/sec on Cerebras)
- **Library**: LiteLLM
- **Structured outputs**: Use `extra_body` workaround (LiteLLM strips `response_format` for OpenRouter):

```python
response = litellm.completion(
    model="openrouter/openai/gpt-oss-120b",
    messages=messages,
    extra_body={
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": "opportunity_extraction",
                "strict": True,
                "schema": OpportunityExtraction.model_json_schema(),
            }
        }
    },
)
```

### Two LLM Use Cases

**1. Document Parsing** — Extract structured real estate fields from document text. System prompt instructs the LLM to identify and extract the fields defined in Section 6. Input: extracted markdown from docling. Output: `OpportunityExtraction` Pydantic model.

**2. Chat Assistant** — Conversational AI that can query the database, analyze opportunities, and execute changes. System prompt defines BTP as a real estate analysis assistant. Structured output includes a message plus optional database actions:

```json
{
  "message": "I've archived the Elm Street property and assigned Oak Tower to you.",
  "actions": [
    {"action": "update_status", "opportunity_id": 5, "status": "cancelled"},
    {"action": "assign", "opportunity_id": 12, "assigned_to": "demo"}
  ]
}
```

### LLM Mock Mode

When `LLM_MOCK=true`, returns deterministic mock responses. Enables:
- Development without an API key
- Fast, reproducible E2E tests
- CI/CD pipelines

---

## 11. Frontend Design

### Layout

```
┌────────────────────────────────────────────────────────┬──────────────┐
│  Header: BTP | [user] | [logout]                       │              │
├──────────────┬─────────────────────────────────────────┤              │
│              │                                         │    Chat      │
│  Sidebar     │     Map (Leaflet + OpenStreetMap)       │    Panel     │
│  - Dashboard │                                         │   (sidebar)  │
│  - Map       │     ─── or ───                          │              │
│  - Table     │                                         │              │
│  - Documents │     Opportunity Table                   │              │
│  - Upload    │     (sortable, filterable)              │              │
│              │                                         │              │
│              │     ─── or ───                          │              │
│              │                                         │              │
│              │     PowerBI Dashboard (iframe)          │              │
│              │                                         │              │
│              │     ─── or ───                          │              │
│              │                                         │              │
│              │     File Manager                        │              │
│              │                                         │              │
├──────────────┴─────────────────────────────────────────┤              │
│  Status bar / notifications                            │              │
└────────────────────────────────────────────────────────┴──────────────┘
```

The sidebar navigates between main content views (map, table, dashboard, documents, upload). The chat panel is always accessible on the right.

### Map View

- Leaflet + OpenStreetMap tiles (free, no API key)
- Markers for each opportunity with geocoded lat/lng
- Click marker → popup with opportunity summary (name, price, type, status)
- Click popup "Details" → opens opportunity detail panel
- Markers colored by status (blue = active, yellow = inactive, red = completed/cancelled)
- New/unassigned opportunities highlighted with red pulse animation

### Opportunity Table

- Sortable by any column (name, city, price, cap rate, status, date added)
- Filterable by status, property type, assigned user
- Rows colored: new/unassigned opportunities flash red background
- Status dot indicator per row (blue/yellow/red)
- Click row → detail view with all fields, documents, votes, comments, progress notes
- Editable fields for assigned opportunities (inline edit or modal)

### Technical Notes

- Use `react-leaflet` v5 (React 19) or v4 (React 18) — must use `dynamic(() => import(...), { ssr: false })` for Next.js compatibility
- Leaflet CSS imported in the client component
- Marker icons copied to `public/` directory
- Tailwind CSS for styling with dark theme
- All API calls to same origin (`/api/*`) — no CORS
- File upload via `FormData` + `fetch`

### State Management

- **Auth state**: React context (`AuthProvider`) — current user, login/logout functions
- **Opportunities**: Fetched via REST, re-fetched after mutations. No real-time streaming.
- **Chat state**: Local component state, loaded from backend on mount.
- No external state library — React context + hooks is sufficient.

---

## 12. PowerBI Integration

### Approach: Embedded iframe

PowerBI reads from the same PostgreSQL database. A report author creates dashboards in PowerBI Desktop, publishes to PowerBI Service, and the embed URL is configured in the app.

### Setup Steps (Manual, Done Once)

1. Install PowerBI Desktop
2. Connect to PostgreSQL (direct connection or via On-premises Data Gateway)
3. Design dashboard (opportunity overview, property type breakdown, geographic distribution, pipeline status)
4. Publish to PowerBI Service
5. Use "Publish to Web" to generate a public embed URL (for non-sensitive data)
6. Set `POWERBI_EMBED_URL` in `.env`

### Frontend Component

```tsx
<iframe
  title="BTP Dashboard"
  src={powerbiEmbedUrl}
  width="100%"
  height="600"
  frameBorder="0"
  allowFullScreen
/>
```

If `POWERBI_EMBED_URL` is not configured, the dashboard view shows a placeholder with setup instructions.

### Alternative: Open-Source Dashboards

If PowerBI is not available, Apache Superset or Metabase can be added as a third Docker container, connecting to the same PostgreSQL. Both support iframe embedding and are free.

---

## 13. Docker & Deployment

### Docker Compose

```yaml
services:
  app:
    build: .
    ports:
      - "8000:8000"
    env_file: .env
    volumes:
      - uploads:/app/uploads
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: teaserparser
      POSTGRES_USER: teaserparser
      POSTGRES_PASSWORD: teaserparser
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U teaserparser"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  uploads:
  pgdata:
```

### Multi-Stage Dockerfile

```
Stage 1: Node 20 slim
  - Copy frontend/
  - npm install && npm run build (produces static export)

Stage 2: Python 3.12 slim
  - Install uv
  - Copy backend/
  - uv sync (install Python dependencies)
  - Copy frontend build output into static/ directory
  - Expose port 8000
  - CMD: uvicorn serving FastAPI app
```

### Start/Stop Scripts

Wrap `docker compose up --build` and `docker compose down`. Idempotent, safe to run multiple times.

---

## 14. Testing Strategy

### Unit Tests (backend — pytest)

- Document parsing: docling output → LLM extraction → correct structured data
- Auth: login/logout, session handling, role-based access
- Opportunities: CRUD, assignment, status transitions
- Votes: toggle behavior, one vote per user per opportunity
- Chat: structured output parsing, action execution

### Frontend Tests (React Testing Library)

- Auth flow: login form, session persistence, logout
- Map: markers render at correct positions
- Table: sorting, filtering, row click
- Upload: file selection, progress, success/error states

### E2E Tests (Playwright)

- Login → see opportunities table
- Upload a PDF → opportunity appears in table and on map
- Click map marker → popup shows details
- Vote on opportunity → vote count updates
- Chat "archive opportunity X" → status changes
- File manager → download original document

---

## 15. Validated Technical Stack

Research conducted March 2026. All libraries verified as available and compatible.

### Backend (Python)

| Dependency | Purpose |
|------------|---------|
| `fastapi` | Web framework |
| `uvicorn` | ASGI server |
| `psycopg[binary,pool]` | PostgreSQL driver with connection pooling |
| `pwdlib[bcrypt]` | Password hashing (replaces deprecated passlib) |
| `litellm` | LLM provider abstraction |
| `docling` | Unified document parser (PDF, DOCX, XLSX, images → Markdown) |
| `pymupdf4llm` | PDF-specific fast extraction (fallback) |
| `openpyxl` | XLSX cell-level access (fallback) |
| `httpx` | HTTP client for Nominatim geocoding |
| `pydantic` | Request/response validation, structured output schemas |
| `python-dotenv` | Load `.env` file |
| `python-multipart` | File upload support |
| `pytest` | Unit testing |

### Frontend (TypeScript)

| Dependency | Purpose |
|------------|---------|
| `next` | React framework, static export |
| `react` / `react-dom` | UI library |
| `typescript` | Type safety |
| `tailwindcss` | Styling |
| `react-leaflet` + `leaflet` | Interactive map |
| `@types/leaflet` | Leaflet TypeScript types |

### External Services

| Service | Usage | Cost |
|---------|-------|------|
| OpenRouter (Cerebras) | LLM for parsing + chat | Pay-per-token (free tier available) |
| Nominatim / OpenStreetMap | Geocoding + map tiles | Free (1 req/sec limit) |
| PowerBI Service | Dashboard embed | Pro license ~$10/mo (optional) |

---

## 16. Backend Module Structure

```
backend/
├── pyproject.toml
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI app, lifespan, static file serving
│   ├── config.py                # Pydantic BaseSettings from env vars
│   ├── db/
│   │   ├── __init__.py
│   │   ├── connection.py        # PostgreSQL connection pool (psycopg_pool)
│   │   ├── schema.sql           # CREATE TABLE statements
│   │   └── seed.py              # Default admin + demo users
│   ├── auth/
│   │   ├── __init__.py
│   │   ├── routes.py            # POST /login, /logout, GET /me
│   │   └── dependencies.py     # get_current_user, require_role
│   ├── opportunities/
│   │   ├── __init__.py
│   │   └── routes.py            # CRUD, assign, status change
│   ├── documents/
│   │   ├── __init__.py
│   │   ├── routes.py            # Upload, list, download
│   │   ├── parser.py            # docling extraction → LLM structured output
│   │   └── geocoder.py          # Nominatim address → lat/lng
│   ├── votes/
│   │   ├── __init__.py
│   │   └── routes.py            # Vote, comments
│   ├── progress/
│   │   ├── __init__.py
│   │   └── routes.py            # Progress notes CRUD
│   └── chat/
│       ├── __init__.py
│       ├── routes.py            # POST /chat, GET /history
│       ├── llm.py               # LiteLLM call with extra_body workaround
│       ├── prompts.py           # System prompt, opportunity context builder
│       └── mock.py              # Deterministic mock responses
```

---

## 17. Frontend Architecture

```
frontend/
├── package.json
├── next.config.js               # output: 'export'
├── tailwind.config.ts           # Dark theme
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout, AuthProvider, dark theme
│   │   └── page.tsx             # Main page, sidebar navigation
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx      # Navigation: map, table, dashboard, docs, upload
│   │   │   └── AppShell.tsx     # Layout wrapper
│   │   ├── auth/
│   │   │   └── LoginForm.tsx
│   │   ├── map/
│   │   │   ├── OpportunityMap.tsx     # Leaflet map ("use client", dynamic import)
│   │   │   └── OpportunityPopup.tsx   # Marker popup with summary
│   │   ├── opportunities/
│   │   │   ├── OpportunityTable.tsx   # Sortable, filterable table
│   │   │   ├── OpportunityDetail.tsx  # Full detail view with tabs
│   │   │   ├── OpportunityForm.tsx    # Edit form (assigned users)
│   │   │   └── VoteButtons.tsx        # Up/down vote
│   │   ├── documents/
│   │   │   ├── FileManager.tsx        # Document browser
│   │   │   ├── UploadZone.tsx         # Drag-and-drop file upload
│   │   │   └── DocumentList.tsx       # Documents per opportunity
│   │   ├── dashboard/
│   │   │   └── PowerBIDashboard.tsx   # iframe embed (or placeholder)
│   │   └── chat/
│   │       ├── ChatPanel.tsx          # Collapsible sidebar
│   │       ├── ChatMessage.tsx        # Message bubble
│   │       └── ChatInput.tsx          # Text input + send
│   ├── hooks/
│   │   ├── useAuth.ts                 # Auth context + login/logout
│   │   ├── useOpportunities.ts        # Fetch, filter, mutate opportunities
│   │   └── useChat.ts                 # Chat messages + send
│   ├── lib/
│   │   └── api.ts                     # Typed fetch wrappers for /api/*
│   └── types/
│       └── index.ts                   # Shared TS types
```

---

## 18. Implementation Roadmap

Solo sequential build. Each phase produces a testable increment.

### Phase 1: Project Scaffolding

**Goal**: Both projects init'd, Docker Compose runs, health check works.

- [ ] Init backend uv project: `backend/pyproject.toml` with FastAPI + uvicorn + psycopg deps
- [ ] Create `backend/app/main.py` with minimal FastAPI app + `GET /api/health`
- [ ] Init frontend Next.js project with TypeScript + Tailwind, `output: 'export'`
- [ ] Create `docker-compose.yml` with app + PostgreSQL containers
- [ ] Create multi-stage `Dockerfile` (Node build → Python serve)
- [ ] Create `.env.example`, `.gitignore`, `uploads/.gitkeep`
- [ ] Create start/stop scripts
- [ ] **Verify**: `docker compose up --build`, health check returns 200, frontend serves

### Phase 2: Database & Auth

**Goal**: PostgreSQL schema initialized, users can log in/out.

- [ ] `app/config.py`: Pydantic BaseSettings for all env vars
- [ ] `app/db/schema.sql`: all CREATE TABLE statements from Section 7
- [ ] `app/db/connection.py`: PostgreSQL connection pool, schema init on startup
- [ ] `app/db/seed.py`: seed admin + demo users
- [ ] `app/auth/routes.py`: login, logout, me endpoints
- [ ] `app/auth/dependencies.py`: `get_current_user`, `require_role` dependencies
- [ ] Add `SessionMiddleware` to FastAPI app
- [ ] **Verify**: login as admin, get `/api/auth/me`, logout, confirm 401 on protected routes

### Phase 3: Document Upload & Storage

**Goal**: Files upload and persist, metadata stored in DB.

- [ ] `app/documents/routes.py`: POST upload (multipart form), GET list, GET download
- [ ] File saved to `/app/uploads/{uuid}.{ext}`, metadata in `documents` table
- [ ] Validate file types (PDF, DOCX, XLSX, JPG, PNG) and size limit (50MB)
- [ ] **Verify**: upload a PDF via curl, download it back, list documents

### Phase 4: Parsing Pipeline

**Goal**: Upload a document → AI extracts structured data → opportunity created with geocoded location.

- [ ] `app/documents/parser.py`: docling extraction → markdown, then LLM structured output
- [ ] Pydantic `OpportunityExtraction` model matching Section 6 fields
- [ ] LLM call with `extra_body` workaround for structured outputs
- [ ] `app/documents/geocoder.py`: Nominatim lookup (address → lat/lng), with caching
- [ ] Wire parsing into upload route: upload → parse → geocode → insert opportunity → link document
- [ ] Mock parser mode for `LLM_MOCK=true`
- [ ] **Verify**: upload a real estate PDF, confirm opportunity appears in DB with extracted fields and lat/lng

### Phase 5: Opportunities API

**Goal**: Full CRUD for opportunities with filtering, assignment, and status management.

- [ ] `app/opportunities/routes.py`: GET list (with filters), GET detail, PUT update, PATCH assign, PATCH status
- [ ] Filter params: `status`, `assigned_to`, `property_type`, `city`
- [ ] Permission checks: only assigned user or admin can edit
- [ ] **Verify**: list opportunities, filter by status, assign to demo user, update fields as demo user

### Phase 6: Votes, Comments & Progress

**Goal**: Social features and progress tracking working.

- [ ] `app/votes/routes.py`: POST vote (toggle), GET comments, POST comment
- [ ] `app/progress/routes.py`: GET notes, POST note (assigned user or admin only)
- [ ] Vote count returned with opportunity detail
- [ ] **Verify**: vote on opportunity, add comment, add progress note, verify in detail response

### Phase 7: AI Chat

**Goal**: Chat assistant can answer questions and modify database.

- [ ] `app/chat/prompts.py`: system prompt with opportunity context builder
- [ ] `app/chat/llm.py`: LiteLLM call, structured output with message + actions
- [ ] `app/chat/mock.py`: keyword-based deterministic responses
- [ ] `app/chat/routes.py`: POST chat (load context → call LLM → execute actions → persist → respond)
- [ ] Actions: `update_status`, `assign`, `update_fields` on opportunities
- [ ] **Verify**: chat "archive opportunity 1" → status changes, chat "what are the top opportunities?" → analysis response

### Phase 8: Frontend — Shell, Auth & Navigation

**Goal**: Dark themed app shell with login, sidebar navigation, auth context.

- [ ] Tailwind config with dark theme colors
- [ ] `AuthProvider` context: login/logout, persist auth state
- [ ] `LoginForm.tsx`: username/password form
- [ ] `AppShell.tsx`: layout with sidebar + main content area + chat panel slot
- [ ] `Sidebar.tsx`: navigation between views (map, table, dashboard, documents, upload)
- [ ] `Header.tsx`: app name, current user, logout button
- [ ] **Verify**: login as demo, see shell with sidebar, navigate between placeholder views

### Phase 9: Frontend — Map View

**Goal**: Interactive map with opportunity markers and popups.

- [ ] `OpportunityMap.tsx`: Leaflet + OpenStreetMap, dynamic import with `ssr: false`
- [ ] Markers for each opportunity at geocoded position
- [ ] Marker color by status (blue/yellow/red)
- [ ] `OpportunityPopup.tsx`: popup on click with summary (name, price, type, status)
- [ ] New/unassigned opportunities with red pulse CSS animation
- [ ] **Verify**: map renders, markers at correct locations, click shows popup

### Phase 10: Frontend — Opportunity Table & Detail

**Goal**: Sortable, filterable table with detail view and editing.

- [ ] `OpportunityTable.tsx`: table with sort/filter controls
- [ ] Row status dot indicator, red flash for new/unassigned
- [ ] Click row → `OpportunityDetail.tsx` with all fields, documents list, votes, comments, progress
- [ ] `OpportunityForm.tsx`: inline edit for assigned opportunities
- [ ] `VoteButtons.tsx`: up/down vote with count
- [ ] Comment form and progress note form
- [ ] **Verify**: sort by price, filter by status, click row for detail, edit assigned opportunity

### Phase 11: Frontend — Documents & Upload

**Goal**: File manager and upload interface.

- [ ] `UploadZone.tsx`: drag-and-drop area + file picker, shows upload progress
- [ ] Upload triggers parsing → shows parsed opportunity summary on completion
- [ ] `FileManager.tsx`: browse all documents, filter by opportunity
- [ ] `DocumentList.tsx`: documents tab in opportunity detail
- [ ] Download links for original files
- [ ] **Verify**: upload PDF via drag-and-drop, see parsed opportunity, browse in file manager, download

### Phase 12: Frontend — Dashboard & Chat

**Goal**: PowerBI embed and AI chat panel.

- [ ] `PowerBIDashboard.tsx`: iframe embed if `POWERBI_EMBED_URL` configured, placeholder if not
- [ ] `ChatPanel.tsx`: collapsible right sidebar, always accessible
- [ ] `ChatMessage.tsx`: user/assistant bubbles, inline action confirmations
- [ ] `ChatInput.tsx`: text input, enter to send, loading state
- [ ] `useChat.ts`: load history, send message, handle response with actions
- [ ] After chat action → refresh relevant data (opportunities, etc.)
- [ ] **Verify**: send chat message, get response, actions execute, dashboard iframe loads if URL configured

### Phase 13: Integration & Docker

**Goal**: Full end-to-end flow works from clean Docker Compose.

- [ ] Finalize Dockerfile and docker-compose.yml
- [ ] Test from clean state: `docker compose down -v && docker compose up --build`
- [ ] Test: login → upload document → see parsed opportunity in table + map → vote → comment → chat → dashboard
- [ ] Test volume persistence: restart containers, data survives
- [ ] Test mock mode: `LLM_MOCK=true` works end-to-end
- [ ] Test start/stop scripts

### Phase 14: E2E Tests & Polish

**Goal**: Automated tests, polished UI.

- [ ] Playwright setup in `test/`
- [ ] E2E tests for key flows (login, upload, parse, map, table, vote, chat)
- [ ] Error states: upload failures, parse failures, network errors
- [ ] Empty states: no opportunities yet, no documents, no comments
- [ ] Loading states: upload progress, parsing spinner, chat thinking indicator
- [ ] Edge cases: duplicate uploads, large files, unsupported formats
- [ ] Responsive: verify layout at common desktop resolutions