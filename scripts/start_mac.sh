#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
    echo "No .env file found. Copying from .env.example..."
    cp .env.example .env
    echo "Please edit .env with your settings, then run this script again."
    exit 1
fi

echo "Starting BTP (Ban's TeaserParser)..."
docker compose up --build -d
echo ""
echo "BTP is running at http://localhost:8000"
