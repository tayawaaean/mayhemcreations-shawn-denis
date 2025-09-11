import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

/**
 * Swagger Configuration for Mayhem Creations API
 * Generates OpenAPI 3.0 documentation from JSDoc comments
 */

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Mayhem Creations API',
      version: '1.0.0',
      description: `
        # Mayhem Creations E-commerce API
        
        A comprehensive e-commerce API built with Express.js, TypeScript, and MariaDB.
        
        ## Features
        - 🔐 **Authentication & Authorization** - Session-based auth with RBAC
        - 👥 **User Management** - Complete user lifecycle management
        - 🛍️ **Product Catalog** - Advanced product management and search
        - 🛒 **Shopping Cart** - Persistent cart with real-time sync
        - 📦 **Order Management** - Complete order processing workflow
        - 💳 **Payment Processing** - Secure payment gateway integration
        - ⭐ **Reviews & Ratings** - Product review system
        - 📊 **Analytics** - Business intelligence and reporting
        - 🔍 **Advanced Search** - Elasticsearch-powered search
        - 📱 **Real-time Features** - WebSocket integration
        
        ## Authentication
        This API uses session-based authentication with MariaDB session storage.
        Include session cookies in your requests for authenticated endpoints.
        
        ## Rate Limiting
        API requests are rate-limited to prevent abuse. See individual endpoint documentation for specific limits.
        
        ## Error Handling
        All errors follow a consistent format with appropriate HTTP status codes.
      `,
      contact: {
        name: 'Mayhem Creations Support',
        email: 'support@mayhemcreation.com',
        url: 'https://mayhemcreation.com/support'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5001',
        description: 'Development server'
      },
      {
        url: 'https://api.mayhemcreation.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        sessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'connect.sid',
          description: 'Session cookie for authentication'
        },
        csrfToken: {
          type: 'apiKey',
          in: 'header',
          name: 'X-CSRF-Token',
          description: 'CSRF token for security'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Error message'
            },
            errors: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ValidationError'
              }
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2025-09-10T17:30:00.000Z'
            }
          }
        },
        ValidationError: {
          type: 'object',
          properties: {
            msg: {
              type: 'string',
              example: 'Validation error message'
            },
            param: {
              type: 'string',
              example: 'email'
            },
            location: {
              type: 'string',
              example: 'body'
            }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Operation successful'
            },
            data: {
              type: 'object',
              description: 'Response data (varies by endpoint)'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2025-09-10T17:30:00.000Z'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com'
            },
            firstName: {
              type: 'string',
              example: 'John'
            },
            lastName: {
              type: 'string',
              example: 'Doe'
            },
            phone: {
              type: 'string',
              example: '+15551234567'
            },
            dateOfBirth: {
              type: 'string',
              format: 'date',
              example: '1990-01-01'
            },
            isEmailVerified: {
              type: 'boolean',
              example: true
            },
            isPhoneVerified: {
              type: 'boolean',
              example: false
            },
            isActive: {
              type: 'boolean',
              example: true
            },
            lastLoginAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-09-10T17:30:00.000Z'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-09-10T17:30:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-09-10T17:30:00.000Z'
            }
          }
        },
        Role: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            name: {
              type: 'string',
              example: 'customer'
            },
            displayName: {
              type: 'string',
              example: 'Customer'
            },
            description: {
              type: 'string',
              example: 'Standard customer with basic shopping permissions'
            },
            permissions: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['products:read', 'orders:read']
            },
            isActive: {
              type: 'boolean',
              example: true
            },
            isSystem: {
              type: 'boolean',
              example: true
            }
          }
        },
        Session: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              example: 'sess_1234567890abcdef'
            },
            userId: {
              type: 'integer',
              example: 1
            },
            loginTime: {
              type: 'string',
              format: 'date-time',
              example: '2025-09-10T17:30:00.000Z'
            },
            lastActivity: {
              type: 'string',
              format: 'date-time',
              example: '2025-09-10T17:30:00.000Z'
            },
            expiresAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-09-11T17:30:00.000Z'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Health',
        description: 'Health check endpoints'
      },
      {
        name: 'Authentication',
        description: 'User authentication and session management'
      },
      {
        name: 'Users',
        description: 'User management and profiles'
      },
      {
        name: 'Products',
        description: 'Product catalog and management'
      },
      {
        name: 'Cart',
        description: 'Shopping cart operations'
      },
      {
        name: 'Orders',
        description: 'Order processing and management'
      },
      {
        name: 'Payments',
        description: 'Payment processing'
      },
      {
        name: 'Reviews',
        description: 'Product reviews and ratings'
      },
      {
        name: 'Search',
        description: 'Product search and filtering'
      },
      {
        name: 'Admin',
        description: 'Administrative operations'
      },
      {
        name: 'Analytics',
        description: 'Business analytics and reporting'
      }
    ]
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/models/*.ts',
    './src/docs/schemas/*.ts'
  ]
};

const specs = swaggerJsdoc(options);

/**
 * Setup Swagger UI for the Express app
 * @param app - Express application instance
 */
export const setupSwagger = (app: Express): void => {
  // Swagger UI options
  const swaggerUiOptions = {
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info .title { color: #1f2937; }
      .swagger-ui .scheme-container { background: #f9fafb; padding: 20px; border-radius: 8px; }
    `,
    customSiteTitle: 'Mayhem Creations API Documentation',
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      tryItOutEnabled: true
    }
  };

  // Serve Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));
  
  // Serve raw OpenAPI spec
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
};

export default specs;
