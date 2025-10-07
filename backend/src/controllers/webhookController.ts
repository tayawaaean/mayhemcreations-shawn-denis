/**
 * Webhook Controller
 * Handles Stripe webhook events
 */

import { Request, Response, NextFunction } from 'express';
import { verifyWebhookSignature } from '../services/stripeService';
import { logger } from '../utils/logger';
import { StripeWebhookEventType } from '../types/stripeWebhookEvents';
import { isSupportedEventType, getEventCategory, isCriticalEvent } from '../utils/webhookEventValidator';

/**
 * Handle Stripe Webhook Events
 * @route POST /api/v1/payments/webhook
 * @access Public (Stripe only)
 */
export const handleStripeWebhook = async (
  req: any, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    const payload = req.rawBody; // Use rawBody instead of parsed body

    if (!signature) {
      res.status(400).json({
        success: false,
        message: 'Missing Stripe signature',
        code: 'MISSING_SIGNATURE',
      });
      return;
    }

    // Verify webhook signature
    let event;
    try {
      event = verifyWebhookSignature(payload, signature);
    } catch (error: any) {
      logger.error('Webhook signature verification failed:', error);
      res.status(400).json({
        success: false,
        message: 'Invalid signature',
        code: 'INVALID_SIGNATURE',
      });
      return;
    }

    // Validate and log event
    const eventType = event.type as string;
    const eventCategory = getEventCategory(eventType);
    const isCritical = isCriticalEvent(eventType);
    
    logger.info(`Processing webhook event: ${eventType}`, {
      category: eventCategory,
      critical: isCritical,
      eventId: event.id,
    });

    // Handle the event
    if (!isSupportedEventType(eventType)) {
      logger.warn(`Unsupported event type: ${eventType}`);
      res.status(200).json({ received: true, message: 'Event type not supported' });
      return;
    }

    switch (eventType as StripeWebhookEventType) {
      case 'payment_intent.created':
        await handlePaymentIntentCreated(event.data.object);
        break;
      
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;
      
      case 'charge.succeeded':
        await handleChargeSucceeded(event.data.object);
        break;
      
      case 'charge.updated':
        await handleChargeUpdated(event.data.object);
        break;
      
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      
      case 'checkout.session.expired':
        await handleCheckoutSessionExpired(event.data.object);
        break;
      
      case 'customer.created':
        await handleCustomerCreated(event.data.object);
        break;
      
      case 'customer.updated':
        await handleCustomerUpdated(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;
      
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      
      case 'charge.dispute.created':
        await handleDisputeCreated(event.data.object);
        break;
      
      case 'charge.refund.created':
        await handleRefundCreated(event.data.object);
        break;
      
      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logger.error('Webhook processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Handle successful payment intent
 */
const handlePaymentIntentSucceeded = async (paymentIntent: any) => {
  try {
    logger.info('Payment succeeded', {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      customerId: paymentIntent.customer,
    });

    // Extract userId from metadata
    const userId = paymentIntent.metadata?.userId;
    if (!userId) {
      logger.warn('No userId found in payment intent metadata', {
        paymentIntentId: paymentIntent.id,
        metadata: paymentIntent.metadata,
      });
      return;
    }

    // Update order status to approved
    const { sequelize } = await import('../config/database');
    
    // Find the most recent order review for this user that's in pending-payment status
    const [orderResult] = await sequelize.query(`
      SELECT id, user_id, status, total 
      FROM order_reviews 
      WHERE user_id = ? AND status = 'pending-payment'
      ORDER BY created_at DESC 
      LIMIT 1
    `, {
      replacements: [userId]
    });

    if (Array.isArray(orderResult) && orderResult.length > 0) {
      const order = orderResult[0] as any;
      
      // Update order status to approved-processing (payment completed, ready for design processing)
      await sequelize.query(`
        UPDATE order_reviews 
        SET status = 'approved-processing',
            reviewed_at = NOW(),
            updated_at = NOW()
        WHERE id = ?
      `, {
        replacements: [order.id]
      });

      logger.info('Order status updated to approved-processing after payment success', {
        orderId: order.id,
        userId: userId,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount / 100,
      });

      // Emit WebSocket event for real-time updates
      try {
        const { getWebSocketService } = await import('../services/websocketService');
        const webSocketService = getWebSocketService();
        if (webSocketService) {
          webSocketService.emitOrderStatusChange(order.id, {
            userId: parseInt(userId),
            status: 'approved-processing',
            originalStatus: 'pending-payment',
            reviewedAt: new Date().toISOString(),
            paymentIntentId: paymentIntent.id
          });
        }
      } catch (wsError) {
        logger.error('Error emitting WebSocket event:', wsError);
      }

      console.log('✅ Payment successful and order approved for processing:', {
        orderId: order.id,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
      });
    } else {
      logger.warn('No pending-payment order found for user after payment success', {
        userId: userId,
        paymentIntentId: paymentIntent.id,
      });
    }

  } catch (error: any) {
    logger.error('Error handling payment success:', error);
  }
};

/**
 * Handle failed payment intent
 */
const handlePaymentIntentFailed = async (paymentIntent: any) => {
  try {
    logger.info('Payment failed', {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      lastPaymentError: paymentIntent.last_payment_error,
    });

    // TODO: Add your business logic here
    // - Update order status to failed
    // - Send failure notification
    // - Log the failure reason
    
    console.log('❌ Payment failed:', {
      id: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      error: paymentIntent.last_payment_error?.message,
    });

  } catch (error: any) {
    logger.error('Error handling payment failure:', error);
  }
};

/**
 * Handle completed checkout session
 */
const handleCheckoutSessionCompleted = async (session: any) => {
  try {
    logger.info('Checkout session completed', {
      sessionId: session.id,
      paymentStatus: session.payment_status,
      amountTotal: session.amount_total,
      currency: session.currency,
      customerEmail: session.customer_details?.email,
    });

    // Extract userId from metadata
    const userId = session.metadata?.userId;
    if (!userId) {
      logger.warn('No userId found in checkout session metadata', {
        sessionId: session.id,
        metadata: session.metadata,
      });
      return;
    }

    // Update order status to approved
    const { sequelize } = await import('../config/database');
    
    // Find the most recent order review for this user that's in pending-payment status
    const [orderResult] = await sequelize.query(`
      SELECT id, user_id, status, total 
      FROM order_reviews 
      WHERE user_id = ? AND status = 'pending-payment'
      ORDER BY created_at DESC 
      LIMIT 1
    `, {
      replacements: [userId]
    });

    if (Array.isArray(orderResult) && orderResult.length > 0) {
      const order = orderResult[0] as any;
      
      // Update order status to approved-processing (payment completed, ready for design processing)
      await sequelize.query(`
        UPDATE order_reviews 
        SET status = 'approved-processing',
            reviewed_at = NOW(),
            updated_at = NOW()
        WHERE id = ?
      `, {
        replacements: [order.id]
      });

      logger.info('Order status updated to approved-processing after checkout completion', {
        orderId: order.id,
        userId: userId,
        sessionId: session.id,
        amount: session.amount_total / 100,
      });

      // Emit WebSocket event for real-time updates
      try {
        const { getWebSocketService } = await import('../services/websocketService');
        const webSocketService = getWebSocketService();
        if (webSocketService) {
          webSocketService.emitOrderStatusChange(order.id, {
            userId: parseInt(userId),
            status: 'approved-processing',
            originalStatus: 'pending-payment',
            reviewedAt: new Date().toISOString(),
            sessionId: session.id
          });
        }
      } catch (wsError) {
        logger.error('Error emitting WebSocket event:', wsError);
      }

      console.log('✅ Checkout completed and order approved for processing:', {
        orderId: order.id,
        sessionId: session.id,
        amount: session.amount_total / 100,
        currency: session.currency,
        email: session.customer_details?.email,
      });
    } else {
      logger.warn('No pending-payment order found for user after checkout completion', {
        userId: userId,
        sessionId: session.id,
      });
    }

  } catch (error: any) {
    logger.error('Error handling checkout completion:', error);
  }
};

/**
 * Handle expired checkout session
 */
const handleCheckoutSessionExpired = async (session: any) => {
  try {
    logger.info('Checkout session expired', {
      sessionId: session.id,
      expiresAt: session.expires_at,
    });

    // TODO: Add your business logic here
    // - Clean up any temporary data
    // - Send reminder email
    // - Log the expiration
    
    console.log('⏰ Checkout expired:', {
      sessionId: session.id,
    });

  } catch (error: any) {
    logger.error('Error handling checkout expiration:', error);
  }
};

/**
 * Handle payment intent creation
 */
const handlePaymentIntentCreated = async (paymentIntent: any) => {
  try {
    logger.info('PaymentIntent created', {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
    });

    // TODO: Future features to implement
    // - Log payment initiation for analytics
    // - Update order status to 'pending'
    // - Send confirmation email to customer
    // - Update inventory (reserve items)
    // - Create payment tracking record
    
    console.log('🔄 Payment initiated:', {
      id: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
    });

  } catch (error: any) {
    logger.error('Error handling payment intent creation:', error);
  }
};

/**
 * Handle successful charge
 */
const handleChargeSucceeded = async (charge: any) => {
  try {
    logger.info('Charge succeeded', {
      chargeId: charge.id,
      amount: charge.amount,
      currency: charge.currency,
      status: charge.status,
    });

    // TODO: Future features to implement
    // - Log successful charge for analytics
    // - Update payment records
    // - Trigger fulfillment process
    // - Update customer payment history
    
    console.log('💳 Charge successful:', {
      id: charge.id,
      amount: charge.amount / 100,
      currency: charge.currency,
      status: charge.status,
    });

  } catch (error: any) {
    logger.error('Error handling charge success:', error);
  }
};

/**
 * Handle charge updates
 */
const handleChargeUpdated = async (charge: any) => {
  try {
    logger.info('Charge updated', {
      chargeId: charge.id,
      status: charge.status,
      amount: charge.amount,
    });

    // TODO: Future features to implement
    // - Handle charge status changes
    // - Update order status based on charge status
    // - Handle disputes, refunds, etc.
    // - Update payment records
    
    console.log('🔄 Charge updated:', {
      id: charge.id,
      status: charge.status,
      amount: charge.amount / 100,
    });

  } catch (error: any) {
    logger.error('Error handling charge update:', error);
  }
};

/**
 * Handle customer creation
 */
const handleCustomerCreated = async (customer: any) => {
  try {
    logger.info('Customer created', {
      customerId: customer.id,
      email: customer.email,
      name: customer.name,
    });

    // TODO: Future features to implement
    // - Sync customer data to your database
    // - Send welcome email
    // - Set up customer preferences
    // - Create customer profile
    // - Add to marketing lists
    
    console.log('👤 Customer created:', {
      id: customer.id,
      email: customer.email,
      name: customer.name,
    });

  } catch (error: any) {
    logger.error('Error handling customer creation:', error);
  }
};

/**
 * Handle customer updates
 */
const handleCustomerUpdated = async (customer: any) => {
  try {
    logger.info('Customer updated', {
      customerId: customer.id,
      email: customer.email,
    });

    // TODO: Future features to implement
    // - Update customer data in your database
    // - Sync customer preferences
    // - Update marketing lists
    // - Log customer changes
    
    console.log('👤 Customer updated:', {
      id: customer.id,
      email: customer.email,
    });

  } catch (error: any) {
    logger.error('Error handling customer update:', error);
  }
};

/**
 * Handle successful invoice payment
 */
const handleInvoicePaymentSucceeded = async (invoice: any) => {
  try {
    logger.info('Invoice payment succeeded', {
      invoiceId: invoice.id,
      amount: invoice.amount_paid,
      currency: invoice.currency,
    });

    // TODO: Future features to implement
    // - Handle subscription payments
    // - Update subscription status
    // - Send payment confirmation
    // - Process recurring billing
    // - Update customer subscription records
    
    console.log('📄 Invoice paid:', {
      id: invoice.id,
      amount: invoice.amount_paid / 100,
      currency: invoice.currency,
    });

  } catch (error: any) {
    logger.error('Error handling invoice payment success:', error);
  }
};

/**
 * Handle failed invoice payment
 */
const handleInvoicePaymentFailed = async (invoice: any) => {
  try {
    logger.info('Invoice payment failed', {
      invoiceId: invoice.id,
      amount: invoice.amount_due,
      currency: invoice.currency,
    });

    // TODO: Future features to implement
    // - Handle failed subscription payments
    // - Update subscription status
    // - Send payment failure notification
    // - Implement retry logic
    // - Handle subscription suspension
    
    console.log('❌ Invoice payment failed:', {
      id: invoice.id,
      amount: invoice.amount_due / 100,
      currency: invoice.currency,
    });

  } catch (error: any) {
    logger.error('Error handling invoice payment failure:', error);
  }
};

/**
 * Handle subscription creation
 */
const handleSubscriptionCreated = async (subscription: any) => {
  try {
    logger.info('Subscription created', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status,
    });

    // TODO: Future features to implement
    // - Set up subscription in your system
    // - Send subscription confirmation
    // - Schedule recurring billing
    // - Create subscription records
    // - Set up customer access
    
    console.log('🔄 Subscription created:', {
      id: subscription.id,
      customer: subscription.customer,
      status: subscription.status,
    });

  } catch (error: any) {
    logger.error('Error handling subscription creation:', error);
  }
};

/**
 * Handle subscription updates
 */
const handleSubscriptionUpdated = async (subscription: any) => {
  try {
    logger.info('Subscription updated', {
      subscriptionId: subscription.id,
      status: subscription.status,
    });

    // TODO: Future features to implement
    // - Update subscription details
    // - Handle plan changes
    // - Update billing cycle
    // - Sync subscription status
    // - Handle proration
    
    console.log('🔄 Subscription updated:', {
      id: subscription.id,
      status: subscription.status,
    });

  } catch (error: any) {
    logger.error('Error handling subscription update:', error);
  }
};

/**
 * Handle subscription deletion
 */
const handleSubscriptionDeleted = async (subscription: any) => {
  try {
    logger.info('Subscription deleted', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
    });

    // TODO: Future features to implement
    // - Cancel subscription in your system
    // - Send cancellation confirmation
    // - Handle data retention
    // - Update customer access
    // - Process final billing
    
    console.log('🗑️ Subscription deleted:', {
      id: subscription.id,
      customer: subscription.customer,
    });

  } catch (error: any) {
    logger.error('Error handling subscription deletion:', error);
  }
};

/**
 * Handle dispute creation
 */
const handleDisputeCreated = async (dispute: any) => {
  try {
    logger.warn('Dispute created', {
      disputeId: dispute.id,
      reason: dispute.reason,
      amount: dispute.amount,
      chargeId: dispute.charge,
    });

    // TODO: Future features to implement
    // - Handle chargeback/dispute
    // - Notify admin team
    // - Gather evidence
    // - Update order status
    // - Create dispute tracking record
    // - Send dispute notification
    
    console.log('⚠️ Dispute created:', {
      id: dispute.id,
      reason: dispute.reason,
      amount: dispute.amount / 100,
      charge: dispute.charge,
    });

  } catch (error: any) {
    logger.error('Error handling dispute creation:', error);
  }
};

/**
 * Handle refund creation
 */
const handleRefundCreated = async (refund: any) => {
  try {
    logger.info('Refund created', {
      refundId: refund.id,
      amount: refund.amount,
      reason: refund.reason,
      chargeId: refund.charge,
    });

    // TODO: Future features to implement
    // - Process refund in your system
    // - Update order status
    // - Restore inventory
    // - Send refund confirmation
    // - Update customer records
    // - Handle partial refunds
    
    console.log('💰 Refund created:', {
      id: refund.id,
      amount: refund.amount / 100,
      reason: refund.reason,
      charge: refund.charge,
    });

  } catch (error: any) {
    logger.error('Error handling refund creation:', error);
  }
};
