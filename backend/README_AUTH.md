# 🔐 Authentication Feature - Mayhem Creations Backend

This document describes the authentication system implemented for the Mayhem Creations e-commerce platform.

## 🏗️ Architecture Overview

The authentication system uses **MariaDB sessions** instead of JWT tokens, providing better security and easier session management.

### Key Components

- **Session-based Authentication**: Uses `express-session` with MariaDB store
- **Role-Based Access Control (RBAC)**: Flexible permission system
- **Password Security**: bcrypt hashing with salt rounds
- **Account Lockout**: Protection against brute force attacks
- **Input Validation**: Comprehensive validation using express-validator
- **Rate Limiting**: Protection against abuse

## 📁 Project Structure

```
src/
├── config/
│   ├── database.ts          # MariaDB connection configuration
│   ├── session.ts           # Session store configuration
│   └── security.ts          # Security middleware configuration
├── controllers/
│   └── authController.ts    # Authentication logic
├── middlewares/
│   ├── auth.ts              # Authentication & authorization middleware
│   └── errorHandler.ts      # Error handling middleware
├── models/
│   ├── userModel.ts         # User model with security features
│   ├── roleModel.ts         # Role and permissions model
│   └── index.ts             # Model associations and exports
├── routes/
│   └── authRoute.ts         # Authentication routes
├── services/
│   └── sessionService.ts    # Session management service
├── utils/
│   └── logger.ts            # Winston logger configuration
├── app.ts                   # Express app configuration
└── server.ts                # Server startup
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MariaDB 10.3+
- npm or yarn

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp env.example .env
   ```
   
   Update the `.env` file with your database credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=mayhem_creations
   DB_USER=root
   DB_PASSWORD=your_password
   SESSION_SECRET=your_super_secret_session_key
   FRONTEND_URL=http://localhost:3000
   ```

3. **Start the server:**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm run build
   npm start
   ```

## 🔑 API Endpoints

### Authentication Routes (`/api/v1/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | Register new user | No |
| POST | `/login` | User login | No |
| POST | `/logout` | User logout | Yes |
| GET | `/profile` | Get user profile | Yes |
| POST | `/refresh` | Refresh session | Yes |
| GET | `/health` | Health check | No |

### Request/Response Examples

#### Register User
```bash
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "dateOfBirth": "1990-01-01"
}
```

#### Login
```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

#### Get Profile
```bash
GET /api/v1/auth/profile
Cookie: mayhem.sid=session_id_here
```

## 🛡️ Security Features

### Password Security
- Minimum 8 characters
- Must contain uppercase, lowercase, number, and special character
- bcrypt hashing with 12 salt rounds
- Password reset functionality (ready for implementation)

### Account Protection
- Account lockout after 5 failed login attempts
- 2-hour lockout duration
- Automatic unlock after successful login

### Session Security
- HttpOnly cookies (XSS protection)
- Secure flag for HTTPS
- SameSite=strict (CSRF protection)
- Session rotation on privilege changes
- 24-hour session expiration

### Rate Limiting
- Auth endpoints: 5 requests per 15 minutes
- General endpoints: 100 requests per 15 minutes
- Brute force protection with exponential backoff

## 👥 User Roles & Permissions

### Default Roles
- **super_admin**: Full system access
- **admin**: User and content management
- **moderator**: Content moderation
- **customer**: Basic user access
- **seller**: Product management

### Permission System
Permissions are stored as arrays in the database and checked via middleware:

```typescript
// Example permission checks
app.get('/admin/users', authorize('users:read'), getUsers);
app.post('/admin/products', authorize('products:write'), createProduct);
```

## 🔧 Configuration

### Database Configuration
The system uses MariaDB with connection pooling:
- Max connections: 20
- Min connections: 5
- Connection timeout: 30 seconds
- Idle timeout: 10 seconds

### Session Configuration
- Store: MariaDB sessions table
- Expiration: 24 hours
- Cleanup interval: 15 minutes
- Cookie name: `mayhem.sid`

## 📊 Monitoring & Logging

### Logging
- Winston logger with multiple transports
- Console output in development
- File logging for errors and combined logs
- Structured logging with context

### Health Checks
- Database connection status
- Session store status
- Server uptime and memory usage

## 🧪 Testing

Run tests with:
```bash
npm test
npm run test:watch
npm run test:coverage
```

## 🚀 Next Steps

The authentication system is now ready! Next features to implement:

1. **Email Verification**: Send verification emails
2. **Password Reset**: Forgot password functionality
3. **Two-Factor Authentication**: TOTP support
4. **Social Login**: OAuth integration
5. **User Management**: Admin user management endpoints

## 📝 Notes

- All passwords are hashed before storage
- Sessions are stored in MariaDB for persistence
- The system is designed to be stateless at the application level
- All API responses follow a consistent format
- Error handling is centralized and comprehensive
