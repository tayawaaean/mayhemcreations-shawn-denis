import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express, Request, Response, NextFunction } from 'express';
import { sessionAuthenticate, requireRole } from '../middlewares/auth';

/**
 * Swagger Configuration for Mayhem Creation API
 * Generates OpenAPI 3.0 documentation from JSDoc comments
 */

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Mayhem Creation API',
      version: '1.0.0',
      description: `
        # Mayhem Creation E-commerce API
        
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
        name: 'Mayhem Creation Support',
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
        description: 'Payment processing and payment gateway integration'
      },
      {
        name: 'Webhooks',
        description: 'Webhook endpoints for payment gateways and external services'
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
      },
      {
        name: 'Refunds',
        description: 'Refund request management'
      },
      {
        name: 'Contact',
        description: 'Contact form submissions'
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
 * Swagger authentication middleware
 * Requires admin or seller role to access API documentation
 * Protected in all environments (production and development)
 */
const swaggerAuthMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Require authentication and admin/seller role in all environments
  try {
    // First check session authentication
    await new Promise<void>((resolve, reject) => {
      sessionAuthenticate(req, res, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    // Then check role authorization
    await new Promise<void>((resolve, reject) => {
      requireRole(['admin', 'seller'])(req, res, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    // If both checks pass, proceed
    next();
  } catch (error: any) {
    // Check if user is authenticated but lacks required role
    const user = (req as any).user;
    const isAuthenticated = !!user;
    const hasPermission = user && (user.role === 'admin' || user.role === 'seller');

    if (isAuthenticated && !hasPermission) {
      // User is logged in but doesn't have admin/seller role
      res.status(403).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Access Denied - API Documentation</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: #fff;
            }
            .container {
              text-align: center;
              padding: 2rem;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 10px;
              backdrop-filter: blur(10px);
              box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
              max-width: 500px;
            }
            h1 { margin-top: 0; }
            p { opacity: 0.9; margin-bottom: 1rem; }
            .code {
              background: rgba(0, 0, 0, 0.3);
              padding: 0.5rem 1rem;
              border-radius: 5px;
              font-family: monospace;
              display: inline-block;
              margin-top: 1rem;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🔒 Access Denied</h1>
            <p>API documentation is restricted to administrators and sellers only.</p>
            <p>Please log in with an admin or seller account to access the documentation.</p>
            <div class="code">403 Forbidden</div>
          </div>
        </body>
        </html>
      `);
    } else {
      // User is not authenticated
      res.status(401).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Required - API Documentation</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: #fff;
            }
            .container {
              text-align: center;
              padding: 2rem;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 10px;
              backdrop-filter: blur(10px);
              box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
              max-width: 500px;
            }
            h1 { margin-top: 0; }
            p { opacity: 0.9; }
            .code {
              background: rgba(0, 0, 0, 0.3);
              padding: 0.5rem 1rem;
              border-radius: 5px;
              font-family: monospace;
              display: inline-block;
              margin-top: 1rem;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🔐 Authentication Required</h1>
            <p>Please log in to access the API documentation.</p>
            <div class="code">401 Unauthorized</div>
          </div>
        </body>
        </html>
      `);
    }
  }
};

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
      .swagger-ui .info .title::after { content: " (Protected)"; color: #ef4444; font-size: 0.8em; margin-left: 10px; }
    `,
    customSiteTitle: 'Mayhem Creation API Documentation',
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

  // Protect Swagger routes with authentication in all environments
  // Apply authentication middleware before serving Swagger UI
  // Note: This middleware must be applied BEFORE swaggerUi.serve
  app.use('/api-docs', swaggerAuthMiddleware);
  app.get('/api-docs.json', swaggerAuthMiddleware);

  // Serve Swagger UI (middleware runs in order, so auth runs first)
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));
  
  // Serve raw OpenAPI spec
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
};

export default specs;
