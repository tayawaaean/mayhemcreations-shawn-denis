# 📚 API Documentation - Mayhem Creations Backend

This document provides comprehensive information about the API documentation system implemented for the Mayhem Creations e-commerce platform.

## 🚀 Quick Start

### Access Documentation
- **Swagger UI**: http://localhost:5001/api-docs
- **OpenAPI Spec**: http://localhost:5001/api-docs.json
- **Health Check**: http://localhost:5001/health

### Start Server with Documentation
```bash
cd backend
npm run dev
```

## 📋 Documentation Features

### ✅ **Implemented Features**
- **JSDoc Comments**: Comprehensive API documentation in code
- **OpenAPI 3.0**: Auto-generated specification from JSDoc
- **Swagger UI**: Interactive documentation interface
- **Schema Definitions**: Reusable request/response schemas
- **Examples**: Real-world usage examples
- **Error Documentation**: Complete error handling documentation
- **Authentication Flow**: Session-based auth documentation
- **Rate Limiting**: API limits and throttling information
- **Validation Rules**: Input validation documentation

### 🎯 **Documentation Coverage**
- **Authentication Endpoints**: Login, register, logout, profile, refresh
- **Health Endpoints**: Server and service health checks
- **Error Responses**: Standardized error format
- **Request/Response Schemas**: Type-safe API contracts
- **Security**: Session-based authentication flow

## 🛠️ **Documentation Structure**

```
src/docs/
├── swagger.ts              # Main Swagger configuration
├── schemas/
│   ├── authSchemas.ts      # Authentication schemas
│   ├── userSchemas.ts      # User management schemas
│   ├── productSchemas.ts   # Product catalog schemas
│   ├── orderSchemas.ts     # Order management schemas
│   └── commonSchemas.ts    # Common response schemas
├── examples/
│   ├── authExamples.ts     # Authentication examples
│   ├── userExamples.ts     # User management examples
│   └── productExamples.ts  # Product catalog examples
└── templates/
    ├── apiTemplate.ts      # API endpoint template
    └── schemaTemplate.ts   # Schema definition template
```

## 📖 **API Endpoints Documentation**

### **Authentication Endpoints**

#### **POST /api/v1/auth/register**
- **Description**: Register a new user account
- **Request Body**: User registration data
- **Response**: User creation confirmation
- **Status Codes**: 201, 400, 409, 500

#### **POST /api/v1/auth/login**
- **Description**: Authenticate user and create session
- **Request Body**: Email and password
- **Response**: User data and session information
- **Status Codes**: 200, 400, 401, 500

#### **POST /api/v1/auth/logout**
- **Description**: Logout user and destroy session
- **Authentication**: Required (session cookie)
- **Response**: Logout confirmation
- **Status Codes**: 200, 401, 500

#### **GET /api/v1/auth/profile**
- **Description**: Get current user profile
- **Authentication**: Required (session cookie)
- **Response**: User profile with role and permissions
- **Status Codes**: 200, 401, 500

#### **POST /api/v1/auth/refresh**
- **Description**: Refresh user session
- **Authentication**: Required (session cookie)
- **Response**: New refresh token
- **Status Codes**: 200, 401, 500

#### **GET /api/v1/auth/health**
- **Description**: Auth service health check
- **Response**: Service status
- **Status Codes**: 200

### **System Endpoints**

#### **GET /health**
- **Description**: Server health check
- **Response**: Server status and environment info
- **Status Codes**: 200

## 🔧 **Documentation Commands**

### **Available Scripts**
```bash
# Generate documentation
npm run docs:generate

# Serve documentation (info)
npm run docs:serve

# Validate OpenAPI spec
npm run docs:validate

# Export OpenAPI spec
npm run docs:export
```

### **Development Workflow**
1. **Add JSDoc comments** to new endpoints
2. **Define schemas** in `/docs/schemas/`
3. **Add examples** in `/docs/examples/`
4. **Test documentation** with Swagger UI
5. **Validate spec** with `npm run docs:validate`

## 📝 **Writing Documentation**

### **JSDoc Format for Endpoints**
```typescript
/**
 * @swagger
 * /api/v1/endpoint:
 *   method:
 *     tags: [TagName]
 *     summary: Brief description
 *     description: Detailed description
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SchemaName'
 *     responses:
 *       200:
 *         description: Success response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ResponseSchema'
 */
```

### **Schema Definitions**
```typescript
/**
 * @swagger
 * components:
 *   schemas:
 *     SchemaName:
 *       type: object
 *       properties:
 *         field:
 *           type: string
 *           example: value
 */
```

## 🎨 **Swagger UI Customization**

### **Features**
- **Custom Styling**: Branded appearance
- **Interactive Testing**: Try API endpoints directly
- **Schema Validation**: Real-time request validation
- **Example Requests**: Pre-filled request examples
- **Error Documentation**: Complete error response examples

### **Access Points**
- **Main UI**: http://localhost:5001/api-docs
- **Raw Spec**: http://localhost:5001/api-docs.json
- **Health Check**: http://localhost:5001/health

## 🔐 **Authentication in Documentation**

### **Session-Based Auth**
- **Type**: Session cookie authentication
- **Cookie Name**: `connect.sid`
- **Security**: HTTP-only, secure, same-site
- **Flow**: Login → Session creation → Cookie storage

### **Testing Authenticated Endpoints**
1. **Login** via `/api/v1/auth/login`
2. **Copy session cookie** from response
3. **Use cookie** in subsequent requests
4. **Test authenticated endpoints** in Swagger UI

## 📊 **Documentation Metrics**

### **Current Coverage**
- **Endpoints Documented**: 6/6 (100%)
- **Schemas Defined**: 15+ schemas
- **Examples Provided**: 20+ examples
- **Error Cases**: All documented
- **Authentication Flow**: Complete

### **Quality Standards**
- ✅ **JSDoc Comments**: All endpoints documented
- ✅ **OpenAPI 3.0**: Full specification compliance
- ✅ **Schema Validation**: Type-safe contracts
- ✅ **Example Requests**: Real-world examples
- ✅ **Error Documentation**: Complete error handling
- ✅ **Interactive Testing**: Swagger UI integration

## 🚀 **Next Steps**

### **Planned Enhancements**
1. **Product API Documentation** - Product catalog endpoints
2. **Order API Documentation** - Order management endpoints
3. **Payment API Documentation** - Payment processing endpoints
4. **Admin API Documentation** - Administrative endpoints
5. **Webhook Documentation** - External webhook endpoints

### **Advanced Features**
1. **API Versioning** - Multiple API versions
2. **Rate Limiting Documentation** - API limits per endpoint
3. **Webhook Documentation** - External integrations
4. **Testing Integration** - Automated testing from docs
5. **Performance Metrics** - API performance documentation

## 🐛 **Troubleshooting**

### **Common Issues**
1. **Swagger UI not loading**: Check server is running on port 5001
2. **Schema errors**: Validate JSDoc syntax
3. **Missing endpoints**: Ensure JSDoc comments are properly formatted
4. **Authentication issues**: Check session cookie configuration

### **Debug Commands**
```bash
# Check server status
curl http://localhost:5001/health

# Validate OpenAPI spec
npm run docs:validate

# Test specific endpoint
curl -X POST http://localhost:5001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password"}'
```

## 📚 **Resources**

### **Documentation Tools**
- **Swagger JSDoc**: https://github.com/Surnet/swagger-jsdoc
- **Swagger UI Express**: https://github.com/scottie1984/swagger-ui-express
- **OpenAPI Specification**: https://swagger.io/specification/

### **Best Practices**
- **Keep documentation up-to-date** with code changes
- **Use descriptive examples** for better understanding
- **Document all error cases** for complete coverage
- **Test documentation** regularly with Swagger UI
- **Follow OpenAPI 3.0 standards** for consistency

---

**Happy Documenting! 📚✨**

For questions or issues with the documentation system, please refer to the development team or create an issue in the project repository.
