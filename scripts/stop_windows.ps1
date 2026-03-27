$ErrorActionPreference = "Stop"
Set-Location "$PSScriptRoot\.."

Write-Host "Stopping BTP..."
docker compose down
Write-Host "BTP stopped. Data volumes preserved."
