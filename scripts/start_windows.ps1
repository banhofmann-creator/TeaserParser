$ErrorActionPreference = "Stop"
Set-Location "$PSScriptRoot\.."

if (-not (Test-Path ".env")) {
    Write-Host "No .env file found. Copying from .env.example..."
    Copy-Item ".env.example" ".env"

    # Auto-generate a random SESSION_SECRET
    $secret = -join ((1..32) | ForEach-Object { "{0:x2}" -f (Get-Random -Minimum 0 -Maximum 256) })
    (Get-Content ".env") -replace "SESSION_SECRET=change-me-to-a-random-string", "SESSION_SECRET=$secret" | Set-Content ".env"
    Write-Host "Generated SESSION_SECRET in .env"
    Write-Host "Edit .env to set OPENROUTER_API_KEY (or set LLM_MOCK=true for testing)."
}

Write-Host "Starting BTP (Ban's TeaserParser)..."
docker compose up --build -d

Write-Host ""
Write-Host "Waiting for services to be healthy..."
$timeout = 60
$elapsed = 0
do {
    Start-Sleep -Seconds 2
    $elapsed += 2
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/api/health" -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) { break }
    } catch {}
    if ($elapsed -ge $timeout) {
        Write-Host "Timeout waiting for app to start. Check logs with: docker compose logs"
        exit 1
    }
} while ($true)

Write-Host ""
Write-Host "BTP is running at http://localhost:8000"
Write-Host "  Login: admin/admin or demo/demo"
Write-Host "  Logs:  docker compose logs -f"

Start-Process "http://localhost:8000"
