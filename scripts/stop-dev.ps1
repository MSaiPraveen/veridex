# Veridex Development Stop Script
# This script stops all development services

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Stopping Veridex Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Stop Node processes
Write-Host "Stopping Node.js processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "  Node processes stopped" -ForegroundColor Green

# Optionally stop Docker containers
$stopDocker = Read-Host "Stop Docker containers (Kafka, Redis)? (y/N)"
if ($stopDocker -eq "y" -or $stopDocker -eq "Y") {
    Write-Host ""
    Write-Host "Stopping Docker containers..." -ForegroundColor Yellow
    
    $root = $PSScriptRoot
    Push-Location (Join-Path $root "infra\docker-compose")
    
    docker compose -f kafka.yml down 2>$null
    docker compose -f services.yml down 2>$null
    
    Pop-Location
    
    Write-Host "  Docker containers stopped" -ForegroundColor Green
}

Write-Host ""
Write-Host "All services stopped!" -ForegroundColor Green
Write-Host ""
