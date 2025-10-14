import app from './app';
import { logger } from './utils/logger';
import { verifyEmailConfig } from './config/email';

const PORT = process.env.PORT || 5002;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Start server function
const startServer = async (): Promise<void> => {
  try {
    // Verify email configuration
    const emailConfigValid = await verifyEmailConfig();
    if (!emailConfigValid) {
      logger.error('❌ Email configuration is invalid. Please check your SMTP settings.');
      process.exit(1);
    }

    // Start the server
    app.listen(PORT, () => {
      logger.info(`🚀 Chat Email Service running on port ${PORT} in ${NODE_ENV} mode`);
      logger.info(`📊 Health check: http://localhost:${PORT}/health`);
      logger.info(`📨 Webhook endpoint: http://localhost:${PORT}/webhook/chat`);
      logger.info(`📧 Email notifications enabled`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
