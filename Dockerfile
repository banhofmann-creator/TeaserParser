# Stage 1: Build frontend
FROM node:20-slim AS frontend-build
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python backend + static files
FROM python:3.12-slim AS runtime
WORKDIR /app

# Install system dependencies needed by psycopg and docling
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:0.7 /uv /uvx /bin/

# Install backend dependencies (--no-cache keeps image smaller with heavy deps like docling/torch)
COPY backend/pyproject.toml backend/uv.lock backend/.python-version ./
RUN uv sync --frozen --no-dev --no-install-project --no-cache

# Copy backend code
COPY backend/app/ ./app/

# Copy frontend build output
COPY --from=frontend-build /build/out ./static/

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
