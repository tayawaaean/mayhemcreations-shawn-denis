import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import 'express-async-errors';

// Import configurations
import { sessionConfig } from './config/session';
import { securityHeaders, generalRateLimit, sanitizeInput } from './config/security';

// Import routes
import authRoute from './routes/authRoute';
import userRoute from './routes/userRoute';

// Import middlewares
import { errorHandler, notFound } from './middlewares/errorHandler';

// Import Swagger documentation
import { setupSwagger } from './docs/swagger';

// Import logger
import { logger } from './utils/logger';

// Create Express app
const app = express();

// Trust proxy (for rate limiting and IP detection)
app.set('trust proxy', 1);

// Security middleware
app.use(securityHeaders);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true, // Allow cookies to be sent
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser middleware
app.use(cookieParser());

// Session middleware
app.use(sessionConfig);

// Input sanitization
app.use(sanitizeInput);

// Rate limiting
app.use(generalRateLimit);

// Request logging
app.use((req, res, next) => {
  logger.http(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  next();
});

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Server health check
 *     description: Check if the server is running and healthy
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Server is running
 *                     environment:
 *                       type: string
 *                       example: development
 *             examples:
 *               success:
 *                 summary: Server healthy
 *                 value:
 *                   success: true
 *                   message: Server is running
 *                   timestamp: '2025-09-10T17:30:00.000Z'
 *                   environment: development
 */
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Setup Swagger documentation
setupSwagger(app);

// API routes
app.use('/api/v1/auth', authRoute);
app.use('/api/v1/users', userRoute);

// 404 handler
app.use(notFound);

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
