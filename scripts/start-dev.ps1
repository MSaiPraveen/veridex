# Veridex Development Startup Script
# This script starts all required services for development

param(
    [switch]$SkipInfra,
    [switch]$FrontendOnly
)

$ErrorActionPreference = "Continue"
$root = $PSScriptRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Veridex Development Environment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if a port is in use
function Test-Port {
    param([int]$Port)
    $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    return $null -ne $connection
}

# Function to wait for a service to be ready
function Wait-ForService {
    param([string]$Url, [string]$Name, [int]$MaxAttempts = 30)
    
    Write-Host "  Waiting for $Name..." -NoNewline
    for ($i = 0; $i -lt $MaxAttempts; $i++) {
        try {
            $response = Invoke-WebRequest -Uri $Url -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 404) {
                Write-Host " Ready!" -ForegroundColor Green
                return $true
            }
        } catch {
            # Service not ready yet
        }
        Start-Sleep -Seconds 1
        Write-Host "." -NoNewline
    }
    Write-Host " Timeout" -ForegroundColor Yellow
    return $false
}

# Step 1: Check prerequisites
Write-Host "[1/5] Checking prerequisites..." -ForegroundColor Yellow

# Check Node.js
$nodeVersion = node --version 2>$null
if ($nodeVersion) {
    Write-Host "  Node.js: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "  Node.js: NOT FOUND" -ForegroundColor Red
    exit 1
}

# Check Docker
$dockerRunning = docker info 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Docker: Running" -ForegroundColor Green
} else {
    Write-Host "  Docker: NOT RUNNING" -ForegroundColor Red
    Write-Host "  Please start Docker Desktop and try again." -ForegroundColor Yellow
    exit 1
}

# Step 2: Create .env files if missing
Write-Host ""
Write-Host "[2/5] Setting up environment files..." -ForegroundColor Yellow

$services = @(
    "auth-service",
    "api-gateway",
    "user-org-service",
    "product-service",
    "document-service",
    "compliance-service",
    "notification-service",
    "audit-log-service"
)

foreach ($service in $services) {
    $envPath = Join-Path $root "apps\$service\.env"
    $examplePath = Join-Path $root "apps\$service\.env.example"
    
    if (-not (Test-Path $envPath)) {
        if (Test-Path $examplePath) {
            Copy-Item $examplePath $envPath
            Write-Host "  Created .env for $service" -ForegroundColor Green
        }
    } else {
        Write-Host "  $service .env exists" -ForegroundColor Gray
    }
}

# Step 3: Start Infrastructure
if (-not $SkipInfra -and -not $FrontendOnly) {
    Write-Host ""
    Write-Host "[3/5] Starting infrastructure (Docker)..." -ForegroundColor Yellow
    
    Push-Location (Join-Path $root "infra\docker-compose")
    
    # Start Kafka
    Write-Host "  Starting Kafka..." -ForegroundColor Cyan
    docker compose -f kafka.yml up -d 2>$null
    
    # Start Redis
    Write-Host "  Starting Redis..." -ForegroundColor Cyan
    docker compose -f services.yml up redis -d 2>$null
    
    Pop-Location
    
    # Wait for Kafka to be ready
    Start-Sleep -Seconds 5
    Write-Host "  Infrastructure started" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "[3/5] Skipping infrastructure..." -ForegroundColor Gray
}

# Step 4: Build shared packages
Write-Host ""
Write-Host "[4/5] Building shared packages..." -ForegroundColor Yellow
Push-Location $root
npm run build:packages 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Packages built successfully" -ForegroundColor Green
} else {
    Write-Host "  Package build had warnings (continuing...)" -ForegroundColor Yellow
}
Pop-Location

# Step 5: Start services
Write-Host ""
Write-Host "[5/5] Starting services..." -ForegroundColor Yellow

if ($FrontendOnly) {
    Write-Host "  Starting frontend only..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; npm run dev:frontend"
} else {
    # Start backend services in new terminals
    $backendServices = @(
        @{Name="Auth"; Script="dev:auth"; Port=3001},
        @{Name="User/Org"; Script="dev:user"; Port=3003},
        @{Name="Product"; Script="dev:product"; Port=3004},
        @{Name="Document"; Script="dev:document"; Port=3005},
        @{Name="Compliance"; Script="dev:compliance"; Port=3006},
        @{Name="Audit"; Script="dev:audit"; Port=3008},
        @{Name="Gateway"; Script="dev:gateway"; Port=3000}
    )
    
    foreach ($svc in $backendServices) {
        Write-Host "  Starting $($svc.Name) Service..." -ForegroundColor Cyan
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; Write-Host 'Starting $($svc.Name) Service on port $($svc.Port)' -ForegroundColor Green; npm run $($svc.Script)"
        Start-Sleep -Milliseconds 500
    }
    
    # Wait a bit for services to start
    Write-Host ""
    Write-Host "  Waiting for services to initialize..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    # Start frontend
    Write-Host "  Starting Frontend..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; Write-Host 'Starting Frontend on port 3000' -ForegroundColor Green; npm run dev:frontend"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Startup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Services:" -ForegroundColor White
Write-Host "    Frontend:    http://localhost:3000" -ForegroundColor Gray
Write-Host "    API Gateway: http://localhost:3000" -ForegroundColor Gray
Write-Host "    Auth:        http://localhost:3001" -ForegroundColor Gray
Write-Host ""
Write-Host "  To stop all services:" -ForegroundColor Yellow
Write-Host "    Close all terminal windows or run: Get-Process node | Stop-Process" -ForegroundColor Gray
Write-Host ""
