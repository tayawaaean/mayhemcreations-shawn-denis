# 🧪 API Testing Guide - Mayhem Creations Auth API

## 📋 Overview

This guide provides comprehensive testing instructions for the Mayhem Creations authentication API running on **port 5001**.

## 🚀 Quick Start

### 1. Start the Server
```bash
cd backend
npm run dev
```

### 2. Test Health Endpoint
```bash
curl http://localhost:5001/health
```

## 📡 API Endpoints

### **Base URL**: `http://localhost:5001`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/health` | Server health check | No |
| GET | `/api/v1/auth/health` | Auth service health | No |
| POST | `/api/v1/auth/register` | Register new user | No |
| POST | `/api/v1/auth/login` | User login | No |
| GET | `/api/v1/auth/profile` | Get user profile | Yes |
| POST | `/api/v1/auth/refresh` | Refresh session | Yes |
| POST | `/api/v1/auth/logout` | User logout | Yes |

## 🧪 Testing Scenarios

### 1. **Health Check Tests**

#### ✅ Server Health
```bash
curl -X GET http://localhost:5001/health
```
**Expected Response:**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2025-09-10T13:30:00.000Z",
  "environment": "development"
}
```

#### ✅ Auth Service Health
```bash
curl -X GET http://localhost:5001/api/v1/auth/health
```
**Expected Response:**
```json
{
  "success": true,
  "message": "Auth service is running",
  "timestamp": "2025-09-10T13:30:00.000Z"
}
```

### 2. **User Registration Tests**

#### ✅ Valid Registration
```bash
curl -X POST http://localhost:5001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "firstName": "Test",
    "lastName": "User",
    "phone": "+1234567890",
    "dateOfBirth": "1990-01-01"
  }'
```
**Expected Response:**
```json
{
  "success": true,
  "message": "User registered successfully. Please check your email for verification.",
  "data": {
    "userId": 1,
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User",
    "isEmailVerified": false
  }
}
```

#### ❌ Invalid Registration Data
```bash
curl -X POST http://localhost:5001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "password": "123",
    "firstName": "",
    "lastName": "A"
  }'
```
**Expected Response:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "msg": "Please provide a valid email address",
      "param": "email",
      "location": "body"
    }
  ]
}
```

#### ❌ Duplicate Email
```bash
curl -X POST http://localhost:5001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```
**Expected Response:**
```json
{
  "success": false,
  "message": "User with this email already exists"
}
```

### 3. **User Login Tests**

#### ✅ Valid Login
```bash
curl -X POST http://localhost:5001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }' \
  -c cookies.txt
```
**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "email": "test@example.com",
      "firstName": "Test",
      "lastName": "User",
      "role": "customer",
      "permissions": ["products:read", "orders:read"],
      "isEmailVerified": false
    },
    "sessionId": "session_id_here"
  }
}
```

#### ❌ Invalid Credentials
```bash
curl -X POST http://localhost:5001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "WrongPassword123!"
  }'
```
**Expected Response:**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

### 4. **Authenticated Endpoints Tests**

#### ✅ Get User Profile (with session)
```bash
curl -X GET http://localhost:5001/api/v1/auth/profile \
  -b cookies.txt
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "test@example.com",
      "firstName": "Test",
      "lastName": "User",
      "phone": "+1234567890",
      "dateOfBirth": "1990-01-01",
      "role": "customer",
      "permissions": ["products:read", "orders:read"],
      "isEmailVerified": false,
      "isPhoneVerified": false,
      "lastLoginAt": "2025-09-10T13:30:00.000Z",
      "createdAt": "2025-09-10T13:30:00.000Z"
    }
  }
}
```

#### ❌ Get User Profile (without session)
```bash
curl -X GET http://localhost:5001/api/v1/auth/profile
```
**Expected Response:**
```json
{
  "success": false,
  "message": "Not authenticated"
}
```

#### ✅ Refresh Session
```bash
curl -X POST http://localhost:5001/api/v1/auth/refresh \
  -b cookies.txt
```
**Expected Response:**
```json
{
  "success": true,
  "message": "Session refreshed successfully",
  "data": {
    "refreshToken": "new_refresh_token_here"
  }
}
```

#### ✅ Logout User
```bash
curl -X POST http://localhost:5001/api/v1/auth/logout \
  -b cookies.txt
```
**Expected Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

## 🔧 Postman Collection

### Import Collection
1. Open Postman
2. Click "Import"
3. Select the file: `backend/postman/Mayhem_Creations_Auth_API.postman_collection.json`
4. The collection will be imported with all test cases

### Collection Features
- **Environment Variables**: Base URL and session cookies
- **Auto Cookie Management**: Automatically extracts and uses session cookies
- **Test Cases**: All positive and negative test scenarios
- **Pre-request Scripts**: Automatic cookie handling

## 🐛 Common Issues & Solutions

### Issue: "Unable to connect to the remote server"
**Solution**: Make sure the server is running on port 5001
```bash
cd backend
npm run dev
```

### Issue: "Not authenticated" errors
**Solution**: Make sure you're logged in first and using session cookies
```bash
# First login to get session cookie
curl -X POST http://localhost:5001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "TestPass123!"}' \
  -c cookies.txt

# Then use the cookie for authenticated requests
curl -X GET http://localhost:5001/api/v1/auth/profile -b cookies.txt
```

### Issue: Database connection errors
**Solution**: Check your MariaDB is running and credentials in `.env` file

## 📊 Expected Database Tables

After successful testing, you should see these tables in your MariaDB database:

- **`roles`**: User roles and permissions
- **`users`**: User accounts and profiles
- **`sessions`**: Active user sessions (if using MariaDB session store)

## 🎯 Testing Checklist

- [ ] Server health check
- [ ] Auth service health check
- [ ] User registration (valid data)
- [ ] User registration (invalid data)
- [ ] User registration (duplicate email)
- [ ] User login (valid credentials)
- [ ] User login (invalid credentials)
- [ ] Get profile (authenticated)
- [ ] Get profile (unauthenticated)
- [ ] Refresh session
- [ ] Logout user
- [ ] Database tables created
- [ ] Session management working

## 🚀 Next Steps

Once authentication is working, you can proceed with:
1. **Product Management API**
2. **Order Processing API**
3. **Payment Integration**
4. **Admin Panel APIs**

Happy Testing! 🎉
