#!/bin/bash

# Mayhem Creations Auth API Test Script
# Make sure the server is running on port 5001

BASE_URL="http://localhost:5001"
COOKIE_FILE="cookies.txt"

echo "🧪 Testing Mayhem Creations Auth API"
echo "======================================"

# Test 1: Health Check
echo "1. Testing Server Health..."
curl -s -X GET "$BASE_URL/health" | jq .
echo ""

# Test 2: Auth Health Check
echo "2. Testing Auth Service Health..."
curl -s -X GET "$BASE_URL/api/v1/auth/health" | jq .
echo ""

# Test 3: Register User
echo "3. Testing User Registration..."
curl -s -X POST "$BASE_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "firstName": "Test",
    "lastName": "User",
    "phone": "+1234567890",
    "dateOfBirth": "1990-01-01"
  }' | jq .
echo ""

# Test 4: Login User
echo "4. Testing User Login..."
curl -s -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }' \
  -c "$COOKIE_FILE" | jq .
echo ""

# Test 5: Get Profile (with session)
echo "5. Testing Get Profile (authenticated)..."
curl -s -X GET "$BASE_URL/api/v1/auth/profile" \
  -b "$COOKIE_FILE" | jq .
echo ""

# Test 6: Get Profile (without session)
echo "6. Testing Get Profile (unauthenticated)..."
curl -s -X GET "$BASE_URL/api/v1/auth/profile" | jq .
echo ""

# Test 7: Refresh Session
echo "7. Testing Session Refresh..."
curl -s -X POST "$BASE_URL/api/v1/auth/refresh" \
  -b "$COOKIE_FILE" | jq .
echo ""

# Test 8: Logout User
echo "8. Testing User Logout..."
curl -s -X POST "$BASE_URL/api/v1/auth/logout" \
  -b "$COOKIE_FILE" | jq .
echo ""

# Test 9: Try to get profile after logout
echo "9. Testing Get Profile after logout..."
curl -s -X GET "$BASE_URL/api/v1/auth/profile" \
  -b "$COOKIE_FILE" | jq .
echo ""

# Cleanup
rm -f "$COOKIE_FILE"

echo "✅ API Testing Complete!"
echo "Check the responses above for any errors."
