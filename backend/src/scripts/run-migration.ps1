# PowerShell script to run database migration for shipping fields
# Run this from the backend directory

Write-Host "Running shipping fields migration..." -ForegroundColor Cyan

# Read database connection from .env file
$envFile = Join-Path $PSScriptRoot "..\..\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^DB_NAME=(.+)$') {
            $dbName = $matches[1]
        }
        if ($_ -match '^DB_USER=(.+)$') {
            $dbUser = $matches[1]
        }
        if ($_ -match '^DB_HOST=(.+)$') {
            $dbHost = $matches[1]
        }
        if ($_ -match '^DB_PORT=(.+)$') {
            $dbPort = $matches[1]
        }
    }
}

# Default values if not found in .env
if (-not $dbName) { $dbName = "mayhem_creations" }
if (-not $dbUser) { $dbUser = "postgres" }
if (-not $dbHost) { $dbHost = "localhost" }
if (-not $dbPort) { $dbPort = "5432" }

Write-Host "Database: $dbName" -ForegroundColor Yellow
Write-Host "User: $dbUser" -ForegroundColor Yellow
Write-Host "Host: $dbHost" -ForegroundColor Yellow

# Run migration
$migrationFile = Join-Path $PSScriptRoot "add-shipping-fields.sql"

try {
    $env:PGPASSWORD = Read-Host "Enter database password" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($env:PGPASSWORD)
    $password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    $env:PGPASSWORD = $password
    
    Write-Host "`nExecuting migration..." -ForegroundColor Cyan
    psql -U $dbUser -h $dbHost -p $dbPort -d $dbName -f $migrationFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nMigration completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "`nMigration failed with error code: $LASTEXITCODE" -ForegroundColor Red
    }
} catch {
    Write-Host "`nError running migration: $_" -ForegroundColor Red
} finally {
    $env:PGPASSWORD = $null
}

Write-Host "`nPress any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

