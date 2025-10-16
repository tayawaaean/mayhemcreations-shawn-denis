# Shipping Integration Verification Script
# Run this from the backend directory to verify everything is set up correctly

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Shipping Integration Verification" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$allGood = $true

# Check 1: Database connection
Write-Host "1. Checking database connection..." -ForegroundColor Yellow
$envFile = ".\.env"
if (Test-Path $envFile) {
    Write-Host "   ✅ .env file found" -ForegroundColor Green
    
    # Read database config
    $envContent = Get-Content $envFile
    $dbName = ($envContent | Select-String "DB_NAME=(.+)" | ForEach-Object { $_.Matches.Groups[1].Value })
    $dbUser = ($envContent | Select-String "DB_USER=(.+)" | ForEach-Object { $_.Matches.Groups[1].Value })
    
    if ($dbName) {
        Write-Host "   Database: $dbName" -ForegroundColor Gray
    } else {
        Write-Host "   ⚠️  DB_NAME not found in .env" -ForegroundColor Yellow
        $allGood = $false
    }
} else {
    Write-Host "   ❌ .env file not found" -ForegroundColor Red
    $allGood = $false
}

# Check 2: Migration file exists
Write-Host "`n2. Checking migration file..." -ForegroundColor Yellow
$migrationFile = ".\src\scripts\add-shipping-fields.sql"
if (Test-Path $migrationFile) {
    Write-Host "   ✅ Migration file exists" -ForegroundColor Green
    Write-Host "   Path: $migrationFile" -ForegroundColor Gray
} else {
    Write-Host "   ❌ Migration file not found" -ForegroundColor Red
    $allGood = $false
}

# Check 3: Controller updated
Write-Host "`n3. Checking controller updates..." -ForegroundColor Yellow
$controllerFile = ".\src\controllers\orderReviewController.ts"
if (Test-Path $controllerFile) {
    $content = Get-Content $controllerFile -Raw
    if ($content -match "shippingAddress" -and $content -match "shippingMethod") {
        Write-Host "   ✅ Controller has shipping fields" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Controller missing shipping fields" -ForegroundColor Red
        $allGood = $false
    }
} else {
    Write-Host "   ❌ Controller file not found" -ForegroundColor Red
    $allGood = $false
}

# Check 4: ShipEngine configuration
Write-Host "`n4. Checking ShipEngine configuration..." -ForegroundColor Yellow
if (Test-Path $envFile) {
    $shipEngineKey = ($envContent | Select-String "SHIPENGINE_API_KEY=(.+)" | ForEach-Object { $_.Matches.Groups[1].Value })
    
    if ($shipEngineKey -and $shipEngineKey -ne "your_key_here") {
        Write-Host "   ✅ ShipEngine API key configured" -ForegroundColor Green
        Write-Host "   Key: $($shipEngineKey.Substring(0, 10))..." -ForegroundColor Gray
    } else {
        Write-Host "   ⚠️  ShipEngine API key not configured" -ForegroundColor Yellow
        Write-Host "   Set SHIPENGINE_API_KEY in .env file" -ForegroundColor Gray
        # Not a critical error - fallback rates will work
    }
} else {
    Write-Host "   ❌ Cannot check - .env not found" -ForegroundColor Red
}

# Check 5: Dependencies installed
Write-Host "`n5. Checking dependencies..." -ForegroundColor Yellow
if (Test-Path ".\node_modules") {
    Write-Host "   ✅ node_modules exists" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  node_modules not found - run 'npm install'" -ForegroundColor Yellow
    $allGood = $false
}

# Check 6: TypeScript compiled
Write-Host "`n6. Checking TypeScript compilation..." -ForegroundColor Yellow
if (Test-Path ".\dist") {
    Write-Host "   ✅ dist folder exists" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  dist folder not found - may need to run 'npm run build'" -ForegroundColor Yellow
}

# Final Summary
Write-Host "`n========================================" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "  ✅ All Checks Passed!" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Cyan
    Write-Host "Next steps:" -ForegroundColor White
    Write-Host "1. Run the database migration:" -ForegroundColor White
    Write-Host "   psql -U $dbUser -d $dbName -f src/scripts/add-shipping-fields.sql`n" -ForegroundColor Gray
    Write-Host "2. Start the backend server:" -ForegroundColor White
    Write-Host "   npm run dev`n" -ForegroundColor Gray
    Write-Host "3. Test the flow as described in SHIPPING_INTEGRATION_TEST_GUIDE.md" -ForegroundColor White
} else {
    Write-Host "  ⚠️  Some Issues Found" -ForegroundColor Yellow
    Write-Host "========================================`n" -ForegroundColor Cyan
    Write-Host "Please fix the issues above before testing." -ForegroundColor Yellow
}

Write-Host "`nFor detailed testing instructions, see:" -ForegroundColor Cyan
Write-Host "- SHIPPING_INTEGRATION_TEST_GUIDE.md" -ForegroundColor White
Write-Host "- IMPLEMENTATION_COMPLETE.md`n" -ForegroundColor White

