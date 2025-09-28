/**
 * Webhook Event Handlers Registry
 * Centralized registry for all Stripe webhook event handlers
 */

import { logger } from '../utils/logger';

export interface WebhookEventHandler {
  (data: any): Promise<void>;
}

export class WebhookEventRegistry {
  private handlers: Map<string, WebhookEventHandler> = new Map();

  /**
   * Register a handler for a specific event type
   */
  register(eventType: string, handler: WebhookEventHandler): void {
    this.handlers.set(eventType, handler);
    logger.info(`Registered webhook handler for: ${eventType}`);
  }

  /**
   * Get handler for a specific event type
   */
  getHandler(eventType: string): WebhookEventHandler | undefined {
    return this.handlers.get(eventType);
  }

  /**
   * Check if handler exists for event type
   */
  hasHandler(eventType: string): boolean {
    return this.handlers.has(eventType);
  }

  /**
   * Get all registered event types
   */
  getRegisteredEventTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Execute handler for event type
   */
  async executeHandler(eventType: string, data: any): Promise<void> {
    const handler = this.getHandler(eventType);
    if (handler) {
      try {
        await handler(data);
        logger.info(`Successfully executed handler for: ${eventType}`);
      } catch (error: any) {
        logger.error(`Error executing handler for ${eventType}:`, error);
        throw error;
      }
    } else {
      logger.warn(`No handler registered for event type: ${eventType}`);
    }
  }
}

// Create singleton instance
export const webhookEventRegistry = new WebhookEventRegistry();

// =============================================================================
// EVENT HANDLER IMPLEMENTATIONS
// =============================================================================

/**
 * Payment Intent Created Handler
 */
export const handlePaymentIntentCreated = async (paymentIntent: any): Promise<void> => {
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
};

/**
 * Payment Intent Succeeded Handler
 */
export const handlePaymentIntentSucceeded = async (paymentIntent: any): Promise<void> => {
  logger.info('PaymentIntent succeeded', {
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    customerId: paymentIntent.customer,
  });

  // TODO: Future features to implement
  // - Update order status in database
  // - Send confirmation email
  // - Update inventory
  // - Create order record
  
  console.log('✅ Payment successful:', {
    id: paymentIntent.id,
    amount: paymentIntent.amount / 100,
    currency: paymentIntent.currency,
  });
};

/**
 * Payment Intent Failed Handler
 */
export const handlePaymentIntentFailed = async (paymentIntent: any): Promise<void> => {
  logger.info('PaymentIntent failed', {
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    lastPaymentError: paymentIntent.last_payment_error,
  });

  // TODO: Future features to implement
  // - Update order status to failed
  // - Send failure notification
  // - Log the failure reason
  
  console.log('❌ Payment failed:', {
    id: paymentIntent.id,
    amount: paymentIntent.amount / 100,
    currency: paymentIntent.currency,
    error: paymentIntent.last_payment_error?.message,
  });
};

/**
 * Charge Succeeded Handler
 */
export const handleChargeSucceeded = async (charge: any): Promise<void> => {
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
};

/**
 * Charge Updated Handler
 */
export const handleChargeUpdated = async (charge: any): Promise<void> => {
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
};

/**
 * Checkout Session Completed Handler
 */
export const handleCheckoutSessionCompleted = async (session: any): Promise<void> => {
  logger.info('Checkout session completed', {
    sessionId: session.id,
    paymentStatus: session.payment_status,
    amountTotal: session.amount_total,
    currency: session.currency,
    customerEmail: session.customer_details?.email,
  });

  // TODO: Future features to implement
  // - Create order from session data
  // - Send order confirmation email
  // - Update inventory
  // - Process the order
  
  console.log('✅ Checkout completed:', {
    sessionId: session.id,
    amount: session.amount_total / 100,
    currency: session.currency,
    email: session.customer_details?.email,
  });
};

/**
 * Checkout Session Expired Handler
 */
export const handleCheckoutSessionExpired = async (session: any): Promise<void> => {
  logger.info('Checkout session expired', {
    sessionId: session.id,
    expiresAt: session.expires_at,
  });

  // TODO: Future features to implement
  // - Clean up any temporary data
  // - Send reminder email
  // - Log the expiration
  
  console.log('⏰ Checkout expired:', {
    sessionId: session.id,
  });
};

// =============================================================================
// REGISTER ALL HANDLERS
// =============================================================================

// Register all event handlers
webhookEventRegistry.register('payment_intent.created', handlePaymentIntentCreated);
webhookEventRegistry.register('payment_intent.succeeded', handlePaymentIntentSucceeded);
webhookEventRegistry.register('payment_intent.payment_failed', handlePaymentIntentFailed);
webhookEventRegistry.register('charge.succeeded', handleChargeSucceeded);
webhookEventRegistry.register('charge.updated', handleChargeUpdated);
webhookEventRegistry.register('checkout.session.completed', handleCheckoutSessionCompleted);
webhookEventRegistry.register('checkout.session.expired', handleCheckoutSessionExpired);

// Log registered handlers
logger.info(`Webhook event registry initialized with ${webhookEventRegistry.getRegisteredEventTypes().length} handlers`);
