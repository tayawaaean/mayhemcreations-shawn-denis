/**
 * Webhook Controller
 * Handles Stripe webhook events
 */

import { Request, Response, NextFunction } from 'express';
import { verifyWebhookSignature } from '../services/stripeService';
import { logger } from '../utils/logger';
import { StripeWebhookEventType } from '../types/stripeWebhookEvents';
import { isSupportedEventType, getEventCategory, isCriticalEvent } from '../utils/webhookEventValidator';
import { EmailNotificationService } from '../services/emailNotificationService';

/**
 * @swagger
 * /api/v1/webhooks/stripe:
 *   post:
 *     tags: [Webhooks]
 *     summary: Stripe webhook endpoint
 *     description: Receives and processes webhook events from Stripe. This endpoint verifies webhook signatures and handles payment events like payment completion, failures, and refunds.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 description: Stripe event ID
 *                 example: evt_1234567890
 *               type:
 *                 type: string
 *                 example: payment_intent.succeeded
 *                 description: Type of webhook event
 *               data:
 *                 type: object
 *                 description: Event data containing the Stripe object
 *               created:
 *                 type: integer
 *                 format: int64
 *                 description: Unix timestamp when event was created
 *           examples:
 *             paymentSucceeded:
 *               summary: Payment intent succeeded
 *               value:
 *                 id: evt_1234567890
 *                 type: payment_intent.succeeded
 *                 data:
 *                   object:
 *                     id: pi_1234567890
 *                     status: succeeded
 *                     amount: 9999
 *                 created: 1698765432
 *             checkoutCompleted:
 *               summary: Checkout session completed
 *               value:
 *                 id: evt_0987654321
 *                 type: checkout.session.completed
 *                 data:
 *                   object:
 *                     id: cs_test_1234567890
 *                     payment_status: paid
 *                 created: 1698765432
 *     responses:
 *       200:
 *         description: Webhook received and processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 received:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Event processed successfully
 *       400:
 *         description: Invalid webhook signature or format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               missingSignature:
 *                 summary: Missing Stripe signature
 *                 value:
 *                   success: false
 *                   message: Missing Stripe signature
 *                   code: MISSING_SIGNATURE
 *               invalidSignature:
 *                 summary: Invalid signature
 *                 value:
 *                   success: false
 *                   message: Invalid signature
 *                   code: INVALID_SIGNATURE
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * 
 * /api/v1/payments/webhook:
 *   post:
 *     tags: [Webhooks]
 *     summary: Stripe webhook endpoint (alternative route)
 *     description: Alternative route for Stripe webhooks. Same functionality as /api/v1/webhooks/stripe.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook received and processed
 *       400:
 *         description: Invalid webhook signature or format
 *       500:
 *         description: Internal server error
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
      SELECT id, user_id, status, total, subtotal, shipping, tax
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

      // Deduct stock after successful payment
      try {
        const { deductStockForOrder } = await import('../services/stockService');
        const stockDeducted = await deductStockForOrder(order.id);
        if (stockDeducted) {
          logger.info(`✅ Stock deducted successfully for order ${order.id} after payment`);
        } else {
          logger.warn(`⚠️ Failed to deduct stock for order ${order.id}`);
        }
      } catch (stockError) {
        logger.error(`❌ Error deducting stock for order ${order.id}:`, stockError);
        // Don't fail the payment processing if stock deduction fails
        // Admin can manually adjust inventory if needed
      }

      // Emit notification to admin room about paid order
      try {
        const { getWebSocketService } = await import('../services/websocketService');
        const webSocketService = getWebSocketService();
        if (webSocketService) {
          webSocketService.emitToAdminRoom('order_paid_notification', {
            type: 'order_paid',
            orderReviewId: order.id,
            userId,
            amount: order.total,
            status: 'approved-processing',
            message: `Payment received for order #${order.id} ($${order.total})`,
            timestamp: new Date().toISOString()
          });
          logger.info(`📢 Emitted paid order notification for order ${order.id}`);
        }
      } catch (notificationError) {
        logger.error('Error emitting paid order notification:', notificationError);
      }

      // Create payment record
      try {
        const { createPaymentRecord, generateOrderNumber } = await import('../services/paymentRecordService');
        
        // Calculate Stripe fees (typically 2.9% + 30¢)
        const stripeFeeRate = 0.029;
        const stripeFixedFee = 0.30;
        const fees = (order.total * stripeFeeRate) + stripeFixedFee;
        const netAmount = order.total - fees;

        const paymentResult = await createPaymentRecord({
          orderId: order.id,
          orderNumber: generateOrderNumber(order.id),
          customerId: userId,
          customerName: paymentIntent.metadata?.customerName || 'Unknown Customer',
          customerEmail: paymentIntent.metadata?.customerEmail || 'unknown@example.com',
          amount: order.total,
          currency: paymentIntent.currency || 'usd',
          provider: 'stripe',
          paymentMethod: 'card',
          status: 'completed',
          transactionId: `stripe_${paymentIntent.id}`,
          providerTransactionId: paymentIntent.id,
          gatewayResponse: paymentIntent,
          fees: fees,
          netAmount: netAmount,
          metadata: {
            stripeCustomerId: paymentIntent.customer,
            stripePaymentMethodId: paymentIntent.payment_method,
            ipAddress: paymentIntent.metadata?.ipAddress,
            userAgent: paymentIntent.metadata?.userAgent,
          },
          notes: 'Payment processed via Stripe',
        });

        if (paymentResult.success) {
          logger.info('Payment record created successfully', {
            paymentId: paymentResult.paymentId,
            orderId: order.id,
            stripePaymentIntentId: paymentIntent.id,
          });
        } else {
          logger.error('Failed to create payment record:', paymentResult.error);
        }
      } catch (paymentError) {
        logger.error('Error creating payment record:', paymentError);
        // Don't fail the webhook if payment record creation fails
      }

      // Update order_reviews with payment and shipping information
      try {
        // Extract shipping details from metadata
        // Note: Email is stored separately in order_reviews.user_email, not in the address object
        const shippingDetails = {
          firstName: paymentIntent.metadata?.firstName || '',
          lastName: paymentIntent.metadata?.lastName || '',
          phone: paymentIntent.metadata?.phone || '',
          street: paymentIntent.metadata?.street || '',
          city: paymentIntent.metadata?.city || '',
          state: paymentIntent.metadata?.state || '',
          zipCode: paymentIntent.metadata?.zipCode || '',
          country: paymentIntent.metadata?.country || 'US',
        };

        // Generate order number
        const orderNumber = `ORD-${Date.now()}-${order.id}`;

        // Extract pricing from metadata
        const subtotal = paymentIntent.metadata?.subtotal ? parseFloat(paymentIntent.metadata.subtotal) : null;
        const shipping = paymentIntent.metadata?.shipping ? parseFloat(paymentIntent.metadata.shipping) : null;
        const tax = paymentIntent.metadata?.tax ? parseFloat(paymentIntent.metadata.tax) : null;
        const total = paymentIntent.metadata?.total ? parseFloat(paymentIntent.metadata.total) : null;

        // Update order_reviews with payment details and pricing
        await sequelize.query(`
          UPDATE order_reviews 
          SET 
            order_number = ?,
            shipping_address = ?,
            billing_address = ?,
            payment_method = ?,
            payment_status = ?,
            payment_provider = ?,
            payment_intent_id = ?,
            transaction_id = ?,
            card_last4 = ?,
            card_brand = ?,
            ${subtotal !== null ? 'subtotal = ?,' : ''}
            ${shipping !== null ? 'shipping = ?,' : ''}
            ${tax !== null ? 'tax = ?,' : ''}
            ${total !== null ? 'total = ?,' : ''}
            updated_at = NOW()
          WHERE id = ?
        `, {
          replacements: [
            orderNumber,
            JSON.stringify(shippingDetails),
            JSON.stringify(shippingDetails), // Use same as shipping for now
            'card',
            'completed',
            'stripe',
            paymentIntent.id,
            `stripe_${paymentIntent.id}`,
            paymentIntent.charges?.data?.[0]?.payment_method_details?.card?.last4 || null,
            paymentIntent.charges?.data?.[0]?.payment_method_details?.card?.brand || null,
            ...(subtotal !== null ? [subtotal] : []),
            ...(shipping !== null ? [shipping] : []),
            ...(tax !== null ? [tax] : []),
            ...(total !== null ? [total] : []),
            order.id
          ]
        });

        logger.info('Payment and shipping details added to order review', {
          orderReviewId: order.id,
          orderNumber,
          paymentIntentId: paymentIntent.id,
        });

        // Send payment receipt and order confirmation emails
        try {
          // Get user details for emails
          const [userResult] = await sequelize.query(`
            SELECT email, first_name, last_name FROM users WHERE id = ?
          `, {
            replacements: [userId]
          });

          if (Array.isArray(userResult) && userResult.length > 0) {
            const user = userResult[0] as any;
            const customerName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Customer';
            const customerEmail = user.email;

            // Get order items for email
            const [orderDataResult] = await sequelize.query(`
              SELECT order_data FROM order_reviews WHERE id = ?
            `, {
              replacements: [order.id]
            });

            let orderItems = [];
            if (Array.isArray(orderDataResult) && orderDataResult.length > 0) {
              const orderData = (orderDataResult[0] as any).order_data;
              if (typeof orderData === 'string') {
                orderItems = JSON.parse(orderData).items || [];
              } else {
                orderItems = orderData?.items || [];
              }
            }

            // Send payment receipt email
            await EmailNotificationService.sendPaymentReceipt({
              customerName,
              customerEmail,
              orderNumber,
              orderId: order.id,
              paymentInfo: {
                paymentMethod: 'Credit Card',
                paymentProvider: 'Stripe',
                transactionId: paymentIntent.id,
                cardLast4: paymentIntent.charges?.data?.[0]?.payment_method_details?.card?.last4,
                cardBrand: paymentIntent.charges?.data?.[0]?.payment_method_details?.card?.brand,
                paidAmount: paymentIntent.amount / 100
              },
              orderTotal: paymentIntent.amount / 100
            });

            // Send order confirmation email
            await EmailNotificationService.sendOrderConfirmation({
              customerName,
              customerEmail,
              orderNumber,
              orderId: order.id,
              orderItems: orderItems.map((item: any) => ({
                id: item.id || item.cartItemId,
                productId: item.productId,
                productName: item.productName,
                variantName: item.variantName,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.subtotal,
                imageUrl: item.imageUrl
              })),
              subtotal: subtotal !== null && subtotal !== undefined ? Number(subtotal) : (order.subtotal ? Number(order.subtotal) : 0),
              tax: 0, // Tax is included in shipping, so set to 0
              shippingCost: shipping !== null && shipping !== undefined ? Number(shipping) : (order.shipping ? Number(order.shipping) : 0),
              orderTotal: total !== null && total !== undefined ? Number(total) : (order.total ? Number(order.total) : 0),
              shippingAddress: {
                firstName: shippingDetails.firstName,
                lastName: shippingDetails.lastName,
                addressLine1: shippingDetails.street,
                city: shippingDetails.city,
                state: shippingDetails.state,
                postalCode: shippingDetails.zipCode,
                country: shippingDetails.country,
                phone: shippingDetails.phone
              }
            });

            logger.info('Payment receipt and order confirmation emails sent', {
              orderId: order.id,
              customerEmail
            });
          }
        } catch (emailError) {
          logger.error('Error sending payment/order confirmation emails:', emailError);
          // Don't fail the webhook if email fails
        }
      } catch (orderError) {
        logger.error('Error updating order review with payment details:', orderError);
        // Don't fail the webhook if update fails
      }

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

      logger.info('Payment successful and order approved for processing', {
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

    // Extract userId from metadata
    const userId = paymentIntent.metadata?.userId;
    
    const { sequelize } = await import('../config/database');
    
    // Try to find the most recent order for context
    let orderId = 0;
    let orderNumber = 'N/A';
    if (userId) {
      const [orderResult] = await sequelize.query(`
        SELECT id FROM order_reviews 
        WHERE user_id = ? AND status = 'pending-payment'
        ORDER BY created_at DESC 
        LIMIT 1
      `, {
        replacements: [userId]
      });
      
      if (Array.isArray(orderResult) && orderResult.length > 0) {
        const order = orderResult[0] as any;
        orderId = order.id;
        orderNumber = `ORD-${Date.now()}-${order.id}`;
      }
    }

    // Log failed payment transaction
    try {
      const { createPaymentRecord, generateOrderNumber } = await import('../services/paymentRecordService');
      
      const amount = paymentIntent.amount / 100; // Convert from cents
      
      await createPaymentRecord({
        orderId: orderId,
        orderNumber: orderId > 0 ? generateOrderNumber(orderId) : orderNumber,
        customerId: userId ? parseInt(userId) : 0,
        customerName: paymentIntent.metadata?.customerName || 'Unknown Customer',
        customerEmail: paymentIntent.metadata?.customerEmail || paymentIntent.receipt_email || 'unknown@example.com',
        amount: amount,
        currency: paymentIntent.currency || 'usd',
        provider: 'stripe',
        paymentMethod: 'card',
        status: 'failed',
        transactionId: `stripe_${paymentIntent.id}`,
        providerTransactionId: paymentIntent.id,
        gatewayResponse: paymentIntent,
        fees: 0,
        netAmount: 0,
        metadata: {
          errorCode: paymentIntent.last_payment_error?.code,
          errorMessage: paymentIntent.last_payment_error?.message,
          errorType: paymentIntent.last_payment_error?.type,
          declineCode: paymentIntent.last_payment_error?.decline_code,
        },
        notes: `Payment failed: ${paymentIntent.last_payment_error?.message || 'Unknown error'}`,
      });

      logger.info('Failed payment logged successfully', {
        paymentIntentId: paymentIntent.id,
        errorMessage: paymentIntent.last_payment_error?.message,
      });
    } catch (paymentError) {
      logger.error('Error logging failed payment:', paymentError);
    }
    
    logger.warn('Payment failed', {
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
      SELECT id, user_id, status, total, subtotal, shipping, tax
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

      // Deduct stock after successful payment
      try {
        const { deductStockForOrder } = await import('../services/stockService');
        const stockDeducted = await deductStockForOrder(order.id);
        if (stockDeducted) {
          logger.info(`✅ Stock deducted successfully for order ${order.id} after payment`);
        } else {
          logger.warn(`⚠️ Failed to deduct stock for order ${order.id}`);
        }
      } catch (stockError) {
        logger.error(`❌ Error deducting stock for order ${order.id}:`, stockError);
        // Don't fail the payment processing if stock deduction fails
        // Admin can manually adjust inventory if needed
      }

      // Emit notification to admin room about paid order
      try {
        const { getWebSocketService } = await import('../services/websocketService');
        const webSocketService = getWebSocketService();
        if (webSocketService) {
          webSocketService.emitToAdminRoom('order_paid_notification', {
            type: 'order_paid',
            orderReviewId: order.id,
            userId,
            amount: order.total,
            status: 'approved-processing',
            message: `Payment received for order #${order.id} ($${order.total})`,
            timestamp: new Date().toISOString()
          });
          logger.info(`📢 Emitted paid order notification for order ${order.id}`);
        }
      } catch (notificationError) {
        logger.error('Error emitting paid order notification:', notificationError);
      }

      // Create payment record
      try {
        const { createPaymentRecord, generateOrderNumber } = await import('../services/paymentRecordService');
        
        // Calculate Stripe fees (typically 2.9% + 30¢)
        const stripeFeeRate = 0.029;
        const stripeFixedFee = 0.30;
        const amountInDollars = session.amount_total / 100; // Convert cents to dollars
        const fees = (amountInDollars * stripeFeeRate) + stripeFixedFee;
        const netAmount = amountInDollars - fees;

        const paymentResult = await createPaymentRecord({
          orderId: order.id,
          orderNumber: generateOrderNumber(order.id),
          customerId: userId,
          customerName: session.customer_details?.name || session.metadata?.customerName || 'Unknown Customer',
          customerEmail: session.customer_details?.email || session.metadata?.customerEmail || 'unknown@example.com',
          amount: amountInDollars,
          currency: session.currency || 'usd',
          provider: 'stripe',
          paymentMethod: 'card',
          status: 'completed',
          transactionId: `stripe_session_${session.id}`,
          providerTransactionId: session.payment_intent || session.id,
          gatewayResponse: session,
          fees: fees,
          netAmount: netAmount,
          metadata: {
            stripeCustomerId: session.customer,
            stripeSessionId: session.id,
            stripePaymentIntentId: session.payment_intent,
            ipAddress: session.metadata?.ipAddress,
            userAgent: session.metadata?.userAgent,
          },
          notes: 'Payment processed via Stripe Checkout Session',
        });

        if (paymentResult.success) {
          logger.info('Payment record created successfully', {
            paymentId: paymentResult.paymentId,
            orderId: order.id,
            stripeSessionId: session.id,
          });
        } else {
          logger.error('Failed to create payment record:', paymentResult.error);
        }
      } catch (paymentError) {
        logger.error('Error creating payment record:', paymentError);
        // Don't fail the webhook if payment record creation fails
      }

      // Update order_reviews with payment and shipping information
      try {
        // Extract shipping details from metadata
        // Note: Email is stored separately in order_reviews.user_email, not in the address object
        const shippingDetails = {
          firstName: session.metadata?.firstName || session.customer_details?.name?.split(' ')[0] || '',
          lastName: session.metadata?.lastName || session.customer_details?.name?.split(' ').slice(1).join(' ') || '',
          phone: session.metadata?.phone || session.customer_details?.phone || '',
          street: session.metadata?.street || session.customer_details?.address?.line1 || '',
          city: session.metadata?.city || session.customer_details?.address?.city || '',
          state: session.metadata?.state || session.customer_details?.address?.state || '',
          zipCode: session.metadata?.zipCode || session.customer_details?.address?.postal_code || '',
          country: session.metadata?.country || session.customer_details?.address?.country || 'US',
        };

        // Generate order number
        const orderNumber = `ORD-${Date.now()}-${order.id}`;

        // Extract pricing from metadata
        const subtotal = session.metadata?.subtotal ? parseFloat(session.metadata.subtotal) : null;
        const shipping = session.metadata?.shipping ? parseFloat(session.metadata.shipping) : null;
        const tax = session.metadata?.tax ? parseFloat(session.metadata.tax) : null;
        const total = session.metadata?.total ? parseFloat(session.metadata.total) : null;

        // Update order_reviews with payment details and pricing
        await sequelize.query(`
          UPDATE order_reviews 
          SET 
            order_number = ?,
            shipping_address = ?,
            billing_address = ?,
            payment_method = ?,
            payment_status = ?,
            payment_provider = ?,
            payment_intent_id = ?,
            transaction_id = ?,
            card_last4 = ?,
            card_brand = ?,
            ${subtotal !== null ? 'subtotal = ?,' : ''}
            ${shipping !== null ? 'shipping = ?,' : ''}
            ${tax !== null ? 'tax = ?,' : ''}
            ${total !== null ? 'total = ?,' : ''}
            updated_at = NOW()
          WHERE id = ?
        `, {
          replacements: [
            orderNumber,
            JSON.stringify(shippingDetails),
            JSON.stringify(shippingDetails), // Use same as shipping for now
            'card',
            'completed',
            'stripe',
            session.payment_intent || session.id,
            `stripe_session_${session.id}`,
            session.metadata?.cardLast4 || null,
            session.metadata?.cardBrand || null,
            ...(subtotal !== null ? [subtotal] : []),
            ...(shipping !== null ? [shipping] : []),
            ...(tax !== null ? [tax] : []),
            ...(total !== null ? [total] : []),
            order.id
          ]
        });

        logger.info('Payment and shipping details added to order review (checkout session)', {
          orderReviewId: order.id,
          orderNumber,
          sessionId: session.id,
        });

        // Send payment receipt and order confirmation emails
        try {
          // Get user details for emails
          const [userResult] = await sequelize.query(`
            SELECT email, first_name, last_name FROM users WHERE id = ?
          `, {
            replacements: [userId]
          });

          if (Array.isArray(userResult) && userResult.length > 0) {
            const user = userResult[0] as any;
            const customerName = session.customer_details?.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Customer';
            const customerEmail = session.customer_details?.email || user.email;

            // Get order items for email
            const [orderDataResult] = await sequelize.query(`
              SELECT order_data FROM order_reviews WHERE id = ?
            `, {
              replacements: [order.id]
            });

            let orderItems = [];
            if (Array.isArray(orderDataResult) && orderDataResult.length > 0) {
              const orderData = (orderDataResult[0] as any).order_data;
              if (typeof orderData === 'string') {
                orderItems = JSON.parse(orderData).items || [];
              } else {
                orderItems = orderData?.items || [];
              }
            }

            // Send payment receipt email
            await EmailNotificationService.sendPaymentReceipt({
              customerName,
              customerEmail,
              orderNumber,
              orderId: order.id,
              paymentInfo: {
                paymentMethod: 'Credit Card',
                paymentProvider: 'Stripe',
                transactionId: session.payment_intent || session.id,
                paidAmount: session.amount_total / 100
              },
              orderTotal: session.amount_total / 100
            });

            // Send order confirmation email
            await EmailNotificationService.sendOrderConfirmation({
              customerName,
              customerEmail,
              orderNumber,
              orderId: order.id,
              orderItems: orderItems.map((item: any) => ({
                id: item.id || item.cartItemId,
                productId: item.productId,
                productName: item.productName,
                variantName: item.variantName,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.subtotal,
                imageUrl: item.imageUrl
              })),
              subtotal: subtotal !== null && subtotal !== undefined ? Number(subtotal) : (order.subtotal ? Number(order.subtotal) : 0),
              tax: 0, // Tax is included in shipping, so set to 0
              shippingCost: shipping !== null && shipping !== undefined ? Number(shipping) : (order.shipping ? Number(order.shipping) : 0),
              orderTotal: total !== null && total !== undefined ? Number(total) : (order.total ? Number(order.total) : 0),
              shippingAddress: {
                firstName: shippingDetails.firstName,
                lastName: shippingDetails.lastName,
                addressLine1: shippingDetails.street,
                city: shippingDetails.city,
                state: shippingDetails.state,
                postalCode: shippingDetails.zipCode,
                country: shippingDetails.country,
                phone: shippingDetails.phone
              }
            });

            logger.info('Payment receipt and order confirmation emails sent (checkout session)', {
              orderId: order.id,
              customerEmail
            });
          }
        } catch (emailError) {
          logger.error('Error sending payment/order confirmation emails (checkout session):', emailError);
          // Don't fail the webhook if email fails
        }
      } catch (orderError) {
        logger.error('Error updating order review with payment details:', orderError);
        // Don't fail the webhook if update fails
      }

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

      logger.info('Checkout completed and order approved for processing', {
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
    
    logger.info('Checkout expired', { sessionId: session.id });

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
    
    logger.info('Payment initiated', {
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
    
    logger.info('Charge successful', {
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
    
    logger.info('Charge updated', {
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
    
    logger.info('Customer created', {
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
    
    logger.info('Customer updated', {
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
    
    logger.info('Invoice paid', {
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
    
    logger.warn('Invoice payment failed', {
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
    
    logger.info('Subscription created', {
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
    
    logger.info('Subscription updated', {
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
    
    logger.info('Subscription deleted', {
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
    
    logger.warn('Dispute created', {
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
    
    logger.info('Refund created', {
      id: refund.id,
      amount: refund.amount / 100,
      reason: refund.reason,
      charge: refund.charge,
    });

  } catch (error: any) {
    logger.error('Error handling refund creation:', error);
  }
};
