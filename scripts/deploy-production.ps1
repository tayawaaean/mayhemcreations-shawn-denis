# Production Deployment Script for Mayhem Creations (Windows PowerShell)
# This script automates the deployment process using PM2

param(
    [Parameter(Position=0)]
    [ValidateSet("deploy", "rollback", "status", "logs", "restart", "stop", "start")]
    [string]$Action = "deploy"
)

# Configuration
$AppName = "mayhemcreations"
$BackendDir = ".\backend"
$ServicesDir = ".\services"
$FrontendDir = ".\frontend"
$LogDir = ".\logs"
$Pm2Config = "ecosystem.config.yaml"

# Functions
function Write-Log {
    param([string]$Message)
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
    exit 1
}

# Check if PM2 is installed
function Test-PM2 {
    try {
        $null = Get-Command pm2 -ErrorAction Stop
        Write-Success "PM2 is installed"
    }
    catch {
        Write-Error "PM2 is not installed. Please install it with: npm install -g pm2"
    }
}

# Check if Node.js version is compatible
function Test-NodeVersion {
    $nodeVersion = (node -v).Substring(1).Split('.')[0]
    if ([int]$nodeVersion -lt 18) {
        Write-Error "Node.js version 18 or higher is required. Current version: $(node -v)"
    }
    Write-Success "Node.js version is compatible: $(node -v)"
}

# Create necessary directories
function New-Directories {
    Write-Log "Creating necessary directories..."
    New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
    New-Item -ItemType Directory -Force -Path "$BackendDir\logs" | Out-Null
    New-Item -ItemType Directory -Force -Path "$ServicesDir\logs" | Out-Null
    Write-Success "Directories created"
}

# Install dependencies
function Install-Dependencies {
    Write-Log "Installing production dependencies..."
    
    # Backend dependencies
    Set-Location $BackendDir
    npm ci --production --silent
    Write-Success "Backend dependencies installed"
    
    # Services dependencies
    Set-Location "..\$ServicesDir"
    npm ci --production --silent
    Write-Success "Services dependencies installed"
    
    Set-Location ..
}

# Build applications
function Build-Applications {
    Write-Log "Building applications..."
    
    # Build backend
    Set-Location $BackendDir
    npm run build
    Write-Success "Backend built successfully"
    
    # Build services
    Set-Location "..\$ServicesDir"
    npm run build
    Write-Success "Services built successfully"
    
    Set-Location ..
}

# Check environment files
function Test-Environment {
    Write-Log "Checking environment files..."
    
    if (-not (Test-Path "$BackendDir\.env")) {
        Write-Warning "Backend .env file not found. Please create it before deployment."
    } else {
        Write-Success "Backend .env file found"
    }
    
    if (-not (Test-Path "$ServicesDir\.env")) {
        Write-Warning "Services .env file not found. Please create it before deployment."
    } else {
        Write-Success "Services .env file found"
    }
}

# Stop existing PM2 processes
function Stop-Existing {
    Write-Log "Stopping existing PM2 processes..."
    try {
        pm2 stop all 2>$null
        pm2 delete all 2>$null
    } catch {
        # Ignore errors if no processes are running
    }
    Write-Success "Existing processes stopped"
}

# Start applications with PM2
function Start-Applications {
    Write-Log "Starting applications with PM2..."
    
    if (Test-Path $Pm2Config) {
        pm2 start $Pm2Config --env production
        Write-Success "Applications started with PM2"
    } else {
        Write-Error "PM2 configuration file not found: $Pm2Config"
    }
}

# Save PM2 configuration
function Save-PM2Config {
    Write-Log "Saving PM2 configuration..."
    pm2 save
    Write-Success "PM2 configuration saved"
}

# Health check
function Test-Health {
    Write-Log "Performing health checks..."
    
    # Wait for applications to start
    Start-Sleep -Seconds 10
    
    # Check backend
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5001/api/health" -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Success "Backend health check passed"
        } else {
            Write-Warning "Backend health check failed"
        }
    } catch {
        Write-Warning "Backend health check failed"
    }
    
    # Check email service
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5002/health" -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Success "Email service health check passed"
        } else {
            Write-Warning "Email service health check failed"
        }
    } catch {
        Write-Warning "Email service health check failed"
    }
}

# Show status
function Show-Status {
    Write-Log "Current PM2 status:"
    pm2 list
    pm2 logs --lines 10
}

# Main deployment function
function Deploy {
    Write-Log "Starting production deployment for $AppName..."
    
    Test-PM2
    Test-NodeVersion
    New-Directories
    Test-Environment
    Install-Dependencies
    Build-Applications
    Stop-Existing
    Start-Applications
    Save-PM2Config
    Test-Health
    Show-Status
    
    Write-Success "Deployment completed successfully!"
    Write-Log "Applications are running. Check status with: pm2 list"
    Write-Log "View logs with: pm2 logs"
    Write-Log "Monitor with: pm2 monit"
}

# Rollback function
function Rollback {
    Write-Log "Rolling back deployment..."
    pm2 stop all
    pm2 delete all
    Write-Success "Rollback completed"
}

# Main script execution
switch ($Action) {
    "deploy" {
        Deploy
    }
    "rollback" {
        Rollback
    }
    "status" {
        pm2 list
    }
    "logs" {
        pm2 logs
    }
    "restart" {
        pm2 restart all
    }
    "stop" {
        pm2 stop all
    }
    "start" {
        pm2 start all
    }
    default {
        Write-Host "Usage: .\deploy-production.ps1 [deploy|rollback|status|logs|restart|stop|start]"
        Write-Host ""
        Write-Host "Commands:"
        Write-Host "  deploy   - Deploy the application (default)"
        Write-Host "  rollback - Rollback the deployment"
        Write-Host "  status   - Show PM2 status"
        Write-Host "  logs     - Show PM2 logs"
        Write-Host "  restart  - Restart all applications"
        Write-Host "  stop     - Stop all applications"
        Write-Host "  start    - Start all applications"
        exit 1
    }
}
