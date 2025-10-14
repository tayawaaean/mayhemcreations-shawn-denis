import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { getEmailService } from '../services/emailService';
import { ChatWebhookPayload, UserProfile } from '../types';
import Joi from 'joi';

// Validation schema for webhook payload
const webhookSchema = Joi.object({
  event: Joi.string().valid('chat_message', 'chat_connected', 'chat_disconnected').required(),
  data: Joi.object({
    messageId: Joi.string().optional(),
    text: Joi.string().allow(null).optional(),
    sender: Joi.string().valid('user', 'admin').optional(),
    customerId: Joi.string().required(),
    type: Joi.string().valid('text', 'image', 'file').optional(),
    attachment: Joi.any().optional(),
    name: Joi.string().allow(null).optional(),
    email: Joi.string().email().allow(null).optional(),
    timestamp: Joi.string().isoDate().required()
  }).required()
});

/**
 * Handle chat webhook from main backend
 * This endpoint receives chat events and sends appropriate email notifications
 */
export const handleChatWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate webhook secret for security
    const webhookSecret = req.headers['x-webhook-secret'];
    const expectedSecret = process.env.MAIN_BACKEND_WEBHOOK_SECRET;
    
    if (expectedSecret && webhookSecret !== expectedSecret) {
      logger.warn('❌ Invalid webhook secret provided');
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    // Validate request body
    const { error, value } = webhookSchema.validate(req.body);
    if (error) {
      logger.warn('❌ Invalid webhook payload:', error.details);
      res.status(400).json({
        success: false,
        message: 'Invalid payload',
        error: error.details[0].message
      });
      return;
    }

    const payload: ChatWebhookPayload = value;
    logger.info(`📨 Received webhook: ${payload.event} for customer ${payload.data.customerId}`);

    // Process different event types
    switch (payload.event) {
      case 'chat_message':
        await handleChatMessage(payload.data as any);
        break;
      case 'chat_connected':
        await handleChatConnected(payload.data as any);
        break;
      case 'chat_disconnected':
        await handleChatDisconnected(payload.data as any);
        break;
      default:
        logger.warn(`⚠️ Unknown event type: ${payload.event}`);
    }

    res.json({
      success: true,
      message: 'Webhook processed successfully'
    });

  } catch (error) {
    logger.error('❌ Error processing webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * Handle chat message event
 */
async function handleChatMessage(data: any): Promise<void> {
  const { sender, customerId, text, name, email } = data;
  
  // Create user profile
  const profile: UserProfile = {
    id: customerId,
    firstName: name?.split(' ')[0] || null,
    lastName: name?.split(' ').slice(1).join(' ') || null,
    email: email || null,
    isGuest: customerId.startsWith('guest_')
  };

  // Only process text messages for email notifications
  if (!text || text.trim().length === 0) {
    logger.info(`📧 Skipping email notification for non-text message from ${customerId}`);
    return;
  }

  try {
    if (sender === 'user') {
      // Customer sent a message - notify admin
      logger.info(`📧 Sending admin notification for message from ${profile.isGuest ? 'guest' : 'customer'} ${customerId}`);
      await getEmailService().sendAdminNotification(profile, text);
    } else if (sender === 'admin') {
      // Admin sent a message - notify customer (if not guest and has email)
      logger.info(`📧 Sending customer notification for admin message to ${customerId}`);
      await getEmailService().sendCustomerNotification(profile, text);
    }
  } catch (error) {
    logger.error(`❌ Error sending email notification for message from ${customerId}:`, error);
  }
}

/**
 * Handle chat connected event
 */
async function handleChatConnected(data: any): Promise<void> {
  const { customerId, name, email } = data;
  
  logger.info(`🔌 Customer ${customerId} connected to chat`);
  
  // We could send a notification here if needed, but for now just log
  // This could be useful for admin notifications about customer availability
}

/**
 * Handle chat disconnected event
 */
async function handleChatDisconnected(data: any): Promise<void> {
  const { customerId } = data;
  
  logger.info(`🔌 Customer ${customerId} disconnected from chat`);
  
  // We could send a notification here if needed, but for now just log
  // This could be useful for admin notifications about customer leaving
}

/**
 * Health check endpoint
 */
export const healthCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    // Test email configuration
    const emailConfigValid = await testEmailConfiguration();
    
    res.json({
      success: true,
      message: 'Chat Email Service is running',
      timestamp: new Date().toISOString(),
      services: {
        email: emailConfigValid ? 'healthy' : 'unhealthy'
      }
    });
  } catch (error) {
    logger.error('❌ Health check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Service unhealthy',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * Test email configuration
 */
async function testEmailConfiguration(): Promise<boolean> {
  try {
    // Try to create a test email (without sending)
    const testProfile: UserProfile = {
      id: 'test',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      isGuest: false
    };
    
    // This will test the email service configuration
    await getEmailService().sendCustomerNotification(testProfile, 'This is a test message');
    return true;
  } catch (error) {
    logger.error('❌ Email configuration test failed:', error);
    return false;
  }
}
