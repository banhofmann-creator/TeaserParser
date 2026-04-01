#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
    echo "No .env file found. Copying from .env.example..."
    cp .env.example .env

    # Auto-generate a random SESSION_SECRET
    SECRET=$(python3 -c "import os; print(os.urandom(32).hex())" 2>/dev/null || openssl rand -hex 32)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/SESSION_SECRET=change-me-to-a-random-string/SESSION_SECRET=$SECRET/" .env
    else
        sed -i "s/SESSION_SECRET=change-me-to-a-random-string/SESSION_SECRET=$SECRET/" .env
    fi
    echo "Generated SESSION_SECRET in .env"
    echo "Edit .env to set OPENROUTER_API_KEY (or set LLM_MOCK=true for testing)."
fi

echo "Starting BTP (Ban's TeaserParser)..."
docker compose up --build -d

echo ""
echo "Waiting for services to be healthy..."
timeout=60
elapsed=0
while ! docker compose exec -T app curl -sf http://localhost:8000/api/health > /dev/null 2>&1; do
    sleep 2
    elapsed=$((elapsed + 2))
    if [ $elapsed -ge $timeout ]; then
        echo "Timeout waiting for app to start. Check logs with: docker compose logs"
        exit 1
    fi
done

echo ""
echo "BTP is running at http://localhost:8000"
echo "  Login: admin/admin or demo/demo"
echo "  Logs:  docker compose logs -f"

# Open browser if possible
if command -v open &> /dev/null; then
    open http://localhost:8000
elif command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:8000
fi
