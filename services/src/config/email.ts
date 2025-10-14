import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

// Email configuration interface
export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

// Get email configuration from environment variables
export const getEmailConfig = (): EmailConfig => {
  const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || ''
    }
  };

  // Validate required configuration
  if (!config.auth.user || !config.auth.pass) {
    throw new Error('SMTP credentials are required. Please set SMTP_USER and SMTP_PASS environment variables.');
  }

  return config;
};

// Create nodemailer transporter
export const createEmailTransporter = () => {
  try {
    const config = getEmailConfig();
    
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
      // Additional options for better reliability
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 20000,
      rateLimit: 5
    });

    logger.info(`📧 Email transporter created for ${config.host}:${config.port}`);
    return transporter;
  } catch (error) {
    logger.error('Failed to create email transporter:', error);
    throw error;
  }
};

// Verify email configuration
export const verifyEmailConfig = async (): Promise<boolean> => {
  try {
    const transporter = createEmailTransporter();
    await transporter.verify();
    logger.info('✅ Email configuration verified successfully');
    return true;
  } catch (error) {
    logger.error('❌ Email configuration verification failed:', error);
    return false;
  }
};
