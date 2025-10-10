import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import 'express-async-errors';
import { logger } from './utils/logger';
import { createServer } from 'http';

// Create Express app
const app = express();

// Basic middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Server running without database sync'
  });
});

// Basic API status endpoint
app.get('/api/v1/status', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'API running in minimal mode',
    timestamp: new Date().toISOString()
  });
});

// Environment variables are loaded via --env-file flag

const PORT = process.env.PORT || 5001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Start server function without database sync
const startServer = async (): Promise<void> => {
  try {
    logger.info('🚀 Starting minimal server without database sync...');

    // Create HTTP server
    const server = createServer(app);
    
    // Start the server
    server.listen(PORT, () => {
      logger.info(`🚀 Minimal server running on port ${PORT} in ${NODE_ENV} mode`);
      logger.info(`📊 Health check: http://localhost:${PORT}/health`);
      logger.info(`🔧 Database sync disabled to prevent index issues`);
      logger.info(`💡 Use this server to clean indexes before starting full server`);
    });
  } catch (error) {
    logger.error('Failed to start minimal server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle SIGTERM signal
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

// Handle SIGINT signal (Ctrl+C)
process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();
