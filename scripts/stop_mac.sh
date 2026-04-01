#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/.."

echo "Stopping BTP..."
docker compose down
echo "BTP stopped. Data volumes preserved."
echo "To remove all data: docker compose down -v"
