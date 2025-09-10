# Mayhem Creations Auth API Test Script (PowerShell)
# Make sure the server is running on port 5001

$BaseUrl = "http://localhost:5001"

Write-Host "🧪 Testing Mayhem Creations Auth API" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green

# Test 1: Health Check
Write-Host "1. Testing Server Health..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/health" -Method GET
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Auth Health Check
Write-Host "2. Testing Auth Service Health..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/api/v1/auth/health" -Method GET
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: Register User
Write-Host "3. Testing User Registration..." -ForegroundColor Yellow
$registerData = @{
    email = "test@example.com"
    password = "TestPass123!"
    firstName = "Test"
    lastName = "User"
    phone = "+1234567890"
    dateOfBirth = "1990-01-01"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/api/v1/auth/register" -Method POST -Body $registerData -ContentType "application/json"
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: Login User
Write-Host "4. Testing User Login..." -ForegroundColor Yellow
$loginData = @{
    email = "test@example.com"
    password = "TestPass123!"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/api/v1/auth/login" -Method POST -Body $loginData -ContentType "application/json" -SessionVariable session
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 5: Get Profile (with session)
Write-Host "5. Testing Get Profile (authenticated)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/api/v1/auth/profile" -Method GET -WebSession $session
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 6: Get Profile (without session)
Write-Host "6. Testing Get Profile (unauthenticated)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/api/v1/auth/profile" -Method GET
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 7: Refresh Session
Write-Host "7. Testing Session Refresh..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/api/v1/auth/refresh" -Method POST -WebSession $session
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 8: Logout User
Write-Host "8. Testing User Logout..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/api/v1/auth/logout" -Method POST -WebSession $session
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 9: Try to get profile after logout
Write-Host "9. Testing Get Profile after logout..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/api/v1/auth/profile" -Method GET -WebSession $session
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "✅ API Testing Complete!" -ForegroundColor Green
Write-Host "Check the responses above for any errors." -ForegroundColor Cyan
