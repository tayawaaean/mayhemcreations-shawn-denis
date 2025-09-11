# Mayhem Creations Backend API

This is the backend API for the Mayhem Creations e-commerce platform, built with Express.js, TypeScript, and Sequelize with MariaDB session management.

## 🚀 Implemented Features

### Authentication & Security
- **Session-based Authentication**: MariaDB session store with express-session
- **Role-Based Access Control (RBAC)**: Multi-role system (super_admin, admin, moderator, customer, seller)
- **Password Security**: bcrypt hashing with 12 salt rounds and complexity validation
- **Account Protection**: Brute force protection with account lockout (5 attempts, 2-hour lockout)
- **Session Security**: HttpOnly cookies, secure flags, SameSite protection
- **Rate Limiting**: Auth endpoints (5 req/15min), general endpoints (100 req/15min)
- **Input Validation**: Comprehensive validation using express-validator
- **Security Headers**: Helmet configuration for XSS, CSRF, and other attacks

### Core Framework & Database
- **Express.js with TypeScript**: Type-safe backend development
- **MariaDB with Sequelize ORM**: Relational database with connection pooling
- **Session Management**: Database-backed sessions with automatic cleanup
- **Error Handling**: Centralized error handling with structured logging
- **API Documentation**: Swagger/OpenAPI 3.0 with comprehensive examples

### API Endpoints
- **Authentication Routes**: `/api/v1/auth/*`
  - `POST /register` - User registration with validation
  - `POST /login` - User login with role validation
  - `POST /logout` - Session termination
  - `GET /profile` - User profile retrieval
  - `POST /refresh` - Session refresh
  - `GET /health` - System health check

### Security Features
- **Password Requirements**: 8+ chars, uppercase, lowercase, number, special character
- **Session Rotation**: Automatic session refresh on privilege changes
- **Token Management**: Database-stored access/refresh tokens
- **Cross-Role Protection**: Prevents unauthorized role access
- **Audit Logging**: Comprehensive security event logging

## Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp env.example .env
```

3. Update the `.env` file with your configuration values.

4. Build the project:
```bash
npm run build
```

5. Start the development server:
```bash
npm run dev
```

## Available Scripts

- `npm start` - Start the production server
- `npm run dev` - Start the development server with hot reload
- `npm run build` - Build the TypeScript project
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically

## Project Structure

```
src/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── middleware/      # Custom middleware
├── models/          # Sequelize models
├── routes/          # API routes
├── services/        # Business logic services
├── utils/           # Utility functions
├── types/           # TypeScript type definitions
└── tests/           # Test files
```

## Environment Variables

See `env.example` for all required environment variables.

## 🔄 Authentication Flows

### User Registration Flow
1. **Input Validation**: Email format, password complexity, required fields
2. **Duplicate Check**: Verify email doesn't exist in database
3. **Password Hashing**: bcrypt with 12 salt rounds
4. **Role Assignment**: Default customer role with appropriate permissions
5. **Database Storage**: User record with hashed password and role
6. **Response**: Success confirmation with user details (password excluded)

### User Login Flow
1. **Input Validation**: Email format and password presence
2. **Rate Limiting**: 5 attempts per 15 minutes per IP
3. **User Lookup**: Find user by email with role information
4. **Account Status Check**: Verify account is active and not locked
5. **Password Verification**: bcrypt comparison with stored hash
6. **Failed Attempt Tracking**: Increment counter, lock account after 5 failures
7. **Session Creation**: Generate session with database tokens
8. **Response**: Session cookie and user profile data

### Session Management Flow
1. **Session Creation**: Store session data in MariaDB with expiration
2. **Token Generation**: Access token (15min) and refresh token (7 days)
3. **Database Storage**: Session record with user association
4. **Cookie Setting**: HttpOnly, secure, SameSite cookies
5. **Activity Tracking**: Update last activity on each request
6. **Automatic Cleanup**: Expired sessions removed via scheduled job

### Role-Based Access Control Flow
1. **Role Validation**: Check user role against required permissions
2. **Permission Mapping**: Map roles to specific API access rights
3. **Cross-Role Protection**: Prevent role escalation attacks
4. **Middleware Enforcement**: Apply authorization on protected routes
5. **Audit Logging**: Log all access attempts and role changes

## API Documentation

The API documentation is available at `/api/docs` when the server is running. It includes:
- Complete endpoint specifications with examples
- Request/response schemas
- Authentication requirements
- Error code documentation
- Interactive testing interface

## Testing

Run the test suite:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

MIT
