$ErrorActionPreference = "Stop"
Set-Location "$PSScriptRoot\.."

if (-not (Test-Path ".env")) {
    Write-Host "No .env file found. Copying from .env.example..."
    Copy-Item ".env.example" ".env"
    Write-Host "Please edit .env with your settings, then run this script again."
    exit 1
}

Write-Host "Starting BTP (Ban's TeaserParser)..."
docker compose up --build -d
Write-Host ""
Write-Host "BTP is running at http://localhost:8000"
