import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { getEmailService } from '../services/emailService';
import { ChatWebhookPayload, UserProfile } from '../types';
import Joi from 'joi';

// Validation schema for webhook payload
const webhookSchema = Joi.object({
  event: Joi.string().valid(
    'chat_message', 'chat_connected', 'chat_disconnected', 'conversation_summary', 'unread_messages', 'new_customer',
    'order_confirmed', 'shipping_confirmed', 'delivered', 'refund_confirmed', 'payment_receipt', 'review_request',
    'newsletter', 'account_update'
  ).required(),
  data: Joi.object({
    messageId: Joi.string().optional(),
    text: Joi.string().allow(null).optional(),
    sender: Joi.string().valid('user', 'admin').optional(),
    customerId: Joi.string().optional(),
    type: Joi.string().valid('text', 'image', 'file').optional(),
    attachment: Joi.any().optional(),
    name: Joi.string().allow(null).optional(),
    email: Joi.string().email().allow(null).optional(),
    timestamp: Joi.string().isoDate().required(),
    // Fields for chat events
    customerEmail: Joi.string().email().allow(null).optional(),
    customerName: Joi.string().optional(),
    isGuest: Joi.boolean().optional(),
    messages: Joi.array().optional(),
    unreadCount: Joi.number().optional(),
    lastMessage: Joi.string().optional(),
    // Fields for order events
    orderId: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
    orderNumber: Joi.string().optional(),
    orderItems: Joi.array().optional(),
    orderTotal: Joi.number().optional(),
    subtotal: Joi.number().optional(),
    tax: Joi.number().optional(),
    shippingCost: Joi.number().optional(),
    shippingAddress: Joi.object().optional(),
    billingAddress: Joi.object().optional(),
    // Fields for shipping events
    shippingInfo: Joi.object().optional(),
    deliveryDate: Joi.string().optional(),
    estimatedDeliveryDate: Joi.string().optional(),
    // Fields for payment/refund events
    paymentInfo: Joi.object().optional(),
    refundInfo: Joi.object().optional(),
    // Fields for review requests
    reviewUrl: Joi.string().uri().optional(),
    // Fields for newsletter
    recipientEmail: Joi.string().email().optional(),
    recipientName: Joi.string().optional(),
    newsletterTitle: Joi.string().optional(),
    newsletterContent: Joi.string().optional(),
    unsubscribeUrl: Joi.string().uri().optional(),
    // Fields for account updates
    updateType: Joi.string().optional(),
    updateDetails: Joi.string().optional(),
    actionRequired: Joi.boolean().optional(),
    actionUrl: Joi.string().uri().optional()
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
      case 'conversation_summary':
        await handleConversationSummary(payload.data as any);
        break;
      case 'unread_messages':
        await handleUnreadMessages(payload.data as any);
        break;
      case 'new_customer':
        await handleNewCustomer(payload.data as any);
        break;
      case 'order_confirmed':
        await handleOrderConfirmed(payload.data as any);
        break;
      case 'shipping_confirmed':
        await handleShippingConfirmed(payload.data as any);
        break;
      case 'delivered':
        await handleDelivered(payload.data as any);
        break;
      case 'refund_confirmed':
        await handleRefundConfirmed(payload.data as any);
        break;
      case 'payment_receipt':
        await handlePaymentReceipt(payload.data as any);
        break;
      case 'review_request':
        await handleReviewRequest(payload.data as any);
        break;
      case 'newsletter':
        await handleNewsletter(payload.data as any);
        break;
      case 'account_update':
        await handleAccountUpdate(payload.data as any);
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
 * Handle conversation summary event
 */
async function handleConversationSummary(data: any): Promise<void> {
  const { customerId, customerEmail, customerName, isGuest, messages } = data;
  
  logger.info(`📧 Sending conversation summary for customer ${customerId}`);
  
  try {
    const profile: UserProfile = {
      id: customerId,
      firstName: customerName?.split(' ')[0] || null,
      lastName: customerName?.split(' ').slice(1).join(' ') || null,
      email: customerEmail,
      isGuest: isGuest || false
    };

    await getEmailService().sendConversationSummary(profile, messages);
    logger.info(`✅ Conversation summary sent to ${customerEmail}`);
  } catch (error) {
    logger.error(`❌ Error sending conversation summary for ${customerId}:`, error);
  }
}

/**
 * Handle unread messages event
 */
async function handleUnreadMessages(data: any): Promise<void> {
  const { customerId, customerName, customerEmail, isGuest, unreadCount, lastMessage } = data;
  
  logger.info(`📧 Sending unread messages notification for customer ${customerId}`);
  
  try {
    await getEmailService().sendUnreadMessagesNotification(
      customerName,
      customerEmail,
      unreadCount,
      lastMessage,
      isGuest || false
    );
    logger.info(`✅ Unread messages notification sent for ${customerName}`);
  } catch (error) {
    logger.error(`❌ Error sending unread messages notification for ${customerId}:`, error);
  }
}

/**
 * Handle new customer event (when admin is offline)
 */
async function handleNewCustomer(data: any): Promise<void> {
  const { customerId, customerName, customerEmail, isGuest } = data;
  
  logger.info(`📧 Sending new customer notification for ${customerId}`);
  
  try {
    await getEmailService().sendNewCustomerNotification(
      customerName,
      customerEmail,
      isGuest || false
    );
    logger.info(`✅ New customer notification sent for ${customerId}`);
  } catch (error) {
    logger.error(`❌ Error sending new customer notification for ${customerId}:`, error);
  }
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
 * Handle order confirmed event
 * Sends order confirmation email to customer
 */
async function handleOrderConfirmed(data: any): Promise<void> {
  logger.info(`📧 Sending order confirmation email for order ${data.orderNumber}`);
  
  try {
    await getEmailService().sendOrderConfirmation({
      customerName: data.customerName,
      customerEmail: data.customerEmail || data.email,
      orderNumber: data.orderNumber,
      orderId: data.orderId,
      orderItems: data.orderItems || [],
      subtotal: data.subtotal || 0,
      tax: data.tax || 0,
      shippingCost: data.shippingCost || 0,
      orderTotal: data.orderTotal || 0,
      shippingAddress: data.shippingAddress,
      billingAddress: data.billingAddress,
      estimatedDeliveryDate: data.estimatedDeliveryDate
    });
    logger.info(`✅ Order confirmation email sent for order ${data.orderNumber}`);
  } catch (error) {
    logger.error(`❌ Error sending order confirmation email for order ${data.orderNumber}:`, error);
  }
}

/**
 * Handle shipping confirmed event
 * Sends shipping confirmation email with tracking information
 */
async function handleShippingConfirmed(data: any): Promise<void> {
  logger.info(`📧 Sending shipping confirmation email for order ${data.orderNumber}`);
  
  try {
    await getEmailService().sendShippingConfirmation({
      customerName: data.customerName,
      customerEmail: data.customerEmail || data.email,
      orderNumber: data.orderNumber,
      orderId: data.orderId,
      shippingInfo: data.shippingInfo,
      orderItems: data.orderItems || [],
      shippingAddress: data.shippingAddress
    });
    logger.info(`✅ Shipping confirmation email sent for order ${data.orderNumber}`);
  } catch (error) {
    logger.error(`❌ Error sending shipping confirmation email for order ${data.orderNumber}:`, error);
  }
}

/**
 * Handle delivered event
 * Sends delivery notification and prompts for review
 */
async function handleDelivered(data: any): Promise<void> {
  logger.info(`📧 Sending delivery notification email for order ${data.orderNumber}`);
  
  try {
    await getEmailService().sendDeliveryNotification({
      customerName: data.customerName,
      customerEmail: data.customerEmail || data.email,
      orderNumber: data.orderNumber,
      orderId: data.orderId,
      deliveryDate: data.deliveryDate || new Date().toISOString(),
      orderItems: data.orderItems || []
    });
    logger.info(`✅ Delivery notification email sent for order ${data.orderNumber}`);
  } catch (error) {
    logger.error(`❌ Error sending delivery notification email for order ${data.orderNumber}:`, error);
  }
}

/**
 * Handle refund confirmed event
 * Sends refund confirmation email to customer
 */
async function handleRefundConfirmed(data: any): Promise<void> {
  logger.info(`📧 Sending refund confirmation email for order ${data.orderNumber}`);
  
  try {
    await getEmailService().sendRefundConfirmation({
      customerName: data.customerName,
      customerEmail: data.customerEmail || data.email,
      orderNumber: data.orderNumber,
      orderId: data.orderId,
      refundInfo: data.refundInfo
    });
    logger.info(`✅ Refund confirmation email sent for order ${data.orderNumber}`);
  } catch (error) {
    logger.error(`❌ Error sending refund confirmation email for order ${data.orderNumber}:`, error);
  }
}

/**
 * Handle payment receipt event
 * Sends payment receipt email to customer
 */
async function handlePaymentReceipt(data: any): Promise<void> {
  logger.info(`📧 Sending payment receipt email for order ${data.orderNumber}`);
  
  try {
    await getEmailService().sendPaymentReceipt({
      customerName: data.customerName,
      customerEmail: data.customerEmail || data.email,
      orderNumber: data.orderNumber,
      orderId: data.orderId,
      paymentInfo: data.paymentInfo,
      orderTotal: data.orderTotal || data.paymentInfo?.paidAmount || 0
    });
    logger.info(`✅ Payment receipt email sent for order ${data.orderNumber}`);
  } catch (error) {
    logger.error(`❌ Error sending payment receipt email for order ${data.orderNumber}:`, error);
  }
}

/**
 * Handle review request event
 * Sends review request email after successful delivery
 */
async function handleReviewRequest(data: any): Promise<void> {
  logger.info(`📧 Sending review request email for order ${data.orderNumber}`);
  
  try {
    await getEmailService().sendReviewRequest({
      customerName: data.customerName,
      customerEmail: data.customerEmail || data.email,
      orderNumber: data.orderNumber,
      orderId: data.orderId,
      orderItems: data.orderItems || [],
      reviewUrl: data.reviewUrl
    });
    logger.info(`✅ Review request email sent for order ${data.orderNumber}`);
  } catch (error) {
    logger.error(`❌ Error sending review request email for order ${data.orderNumber}:`, error);
  }
}

/**
 * Handle newsletter event
 * Sends marketing/newsletter email to subscriber
 */
async function handleNewsletter(data: any): Promise<void> {
  logger.info(`📧 Sending newsletter: ${data.newsletterTitle}`);
  
  try {
    await getEmailService().sendNewsletter({
      recipientEmail: data.recipientEmail || data.customerEmail || data.email,
      recipientName: data.recipientName || data.customerName || 'Valued Customer',
      newsletterTitle: data.newsletterTitle,
      newsletterContent: data.newsletterContent,
      unsubscribeUrl: data.unsubscribeUrl
    });
    logger.info(`✅ Newsletter sent: ${data.newsletterTitle}`);
  } catch (error) {
    logger.error(`❌ Error sending newsletter:`, error);
  }
}

/**
 * Handle account update event
 * Sends account update notification email
 */
async function handleAccountUpdate(data: any): Promise<void> {
  logger.info(`📧 Sending account update notification: ${data.updateType}`);
  
  try {
    await getEmailService().sendAccountUpdateNotification({
      customerName: data.customerName,
      customerEmail: data.customerEmail || data.email,
      updateType: data.updateType,
      updateDetails: data.updateDetails,
      actionRequired: data.actionRequired || false,
      actionUrl: data.actionUrl
    });
    logger.info(`✅ Account update notification sent: ${data.updateType}`);
  } catch (error) {
    logger.error(`❌ Error sending account update notification:`, error);
  }
}

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
