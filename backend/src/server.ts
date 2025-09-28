import app from './app';
import { testDatabaseConnection, syncDatabase, sequelize } from './models';
import { logger } from './utils/logger';
import { initializeWebSocket } from './services/websocketService';
import { createServer } from 'http';

// Environment variables are loaded via --env-file flag

const PORT = process.env.PORT || 5001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Start server function
const startServer = async (): Promise<void> => {
  try {
    // Test database connection
    await testDatabaseConnection();

    // Sync database (create tables if they don't exist)
    // In production, you should use migrations instead
    if (NODE_ENV === 'development') {
      // Use alter to modify existing table structure
      await sequelize.sync({ alter: true });
      logger.info('Database synchronized with table alterations');
    }

    // Create HTTP server
    const server = createServer(app);
    
    // Initialize WebSocket service
    initializeWebSocket(server);
    
    // Start the server
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT} in ${NODE_ENV} mode`);
      logger.info(`📊 Health check: http://localhost:${PORT}/health`);
      logger.info(`🔐 Auth API: http://localhost:${PORT}/api/v1/auth`);
      logger.info(`🔌 WebSocket server ready for real-time updates`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
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
