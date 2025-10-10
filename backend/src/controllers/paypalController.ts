/**
 * PayPal Controller
 * Handles PayPal payment processing
 */

import { Request, Response, NextFunction } from 'express';
import { 
  createPayPalOrder, 
  capturePayPalOrder, 
  retrievePayPalOrder,
  CreatePayPalOrderData,
  CapturePayPalOrderData,
  validatePayPalOrderData
} from '../services/paypalService';
import { logger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
  };
}

/**
 * Create PayPal Order
 * @route POST /api/v1/payments/paypal/create-order
 * @access Private (Customer only)
 */
export const createPayPalOrderHandler = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { 
      amount, 
      currency, 
      description, 
      items,
      customerInfo,
      shippingAddress,
      metadata, 
      returnUrl, 
      cancelUrl 
    } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    // Validate order data
    const orderData: CreatePayPalOrderData = {
      amount,
      currency: currency || 'USD',
      description: description || 'Mayhem Creations Order',
      customerEmail: customerInfo?.email || req.user?.email,
      customerName: customerInfo?.name || `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim(),
      items,
      shippingAddress,
      metadata: {
        userId: userId.toString(),
        ...metadata,
      },
      returnUrl,
      cancelUrl,
    };

    console.log('🔍 PayPal Controller - orderData:', orderData);

    const validation = validatePayPalOrderData(orderData);
    console.log('🔍 PayPal Controller - validation result:', validation);
    
    if (!validation.isValid) {
      res.status(400).json({
        success: false,
        message: 'Invalid order data',
        code: 'INVALID_ORDER_DATA',
        errors: validation.errors,
      });
      return;
    }

    const order = await createPayPalOrder(orderData);

    res.status(201).json({
      success: true,
      data: order,
      message: 'PayPal order created successfully',
      timestamp: new Date().toISOString(),
    });

    logger.info('PayPal order created', {
      userId,
      orderId: order.id,
      amount: orderData.amount,
      currency: orderData.currency,
    });
  } catch (error: any) {
    logger.error('Create PayPal order error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Capture PayPal Order
 * @route POST /api/v1/payments/paypal/capture-order
 * @access Private (Customer only)
 */
export const capturePayPalOrderHandler = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { orderId, metadata, orderData } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    if (!orderId) {
      res.status(400).json({
        success: false,
        message: 'Order ID is required',
        code: 'MISSING_ORDER_ID',
      });
      return;
    }

    const captureData: CapturePayPalOrderData = {
      orderId,
      metadata: {
        userId: userId.toString(),
        ...metadata,
      },
    };

    const capture = await capturePayPalOrder(captureData);

    // Update existing order in database after successful capture
    if (capture.status === 'COMPLETED') {
      try {
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

          // Create payment record
          try {
            const { createPaymentRecord, generateOrderNumber } = await import('../services/paymentRecordService');
            
            // Calculate PayPal fees (typically 2.9% + fixed fee)
            const paypalFeeRate = 0.029;
            const paypalFixedFee = 0.30;
            const fees = (order.total * paypalFeeRate) + paypalFixedFee;
            const netAmount = order.total - fees;

            const paymentResult = await createPaymentRecord({
              orderId: order.id,
              orderNumber: generateOrderNumber(order.id),
              customerId: userId,
              customerName: metadata?.customerName || 'Unknown Customer',
              customerEmail: metadata?.customerEmail || 'unknown@example.com',
              amount: order.total,
              currency: 'usd',
              provider: 'paypal',
              paymentMethod: 'digital_wallet',
              status: 'completed',
              transactionId: `paypal_${orderId}`,
              providerTransactionId: orderId,
              gatewayResponse: capture,
              fees: fees,
              netAmount: netAmount,
              metadata: {
                paypalOrderId: orderId,
                paypalCaptureId: capture.id,
                ipAddress: metadata?.ipAddress,
                userAgent: metadata?.userAgent,
              },
              notes: 'Payment processed via PayPal',
            });

            if (paymentResult.success) {
              logger.info('Payment record created successfully', {
                paymentId: paymentResult.paymentId,
                orderId: order.id,
                paypalOrderId: orderId,
              });
            } else {
              logger.error('Failed to create payment record:', paymentResult.error);
            }
          } catch (paymentError) {
            logger.error('Error creating payment record:', paymentError);
            // Don't fail the payment if payment record creation fails
          }

          logger.info('Order status updated to approved-processing after PayPal payment success', {
            orderId: order.id,
            userId: userId,
            paypalOrderId: orderId,
            amount: order.total,
          });

          // Emit WebSocket event for real-time updates
          try {
            const { getWebSocketService } = await import('../services/websocketService');
            const webSocketService = getWebSocketService();
            if (webSocketService) {
              webSocketService.emitOrderStatusChange(order.id, {
                userId: userId,
                status: 'approved-processing',
                originalStatus: 'pending-payment',
                reviewedAt: new Date().toISOString(),
                paypalOrderId: orderId
              });
            }
          } catch (wsError) {
            logger.error('Error emitting WebSocket event:', wsError);
          }

          console.log('✅ PayPal payment successful and order updated:', {
            orderId: order.id,
            paypalOrderId: orderId,
            amount: order.total,
            userId: userId,
          });
        } else {
          logger.warn('No pending-payment order found for user after PayPal payment success', {
            userId: userId,
            paypalOrderId: orderId,
          });
        }
      } catch (dbError: any) {
        logger.error('Error updating order in database after PayPal payment:', dbError);
        // Don't fail the payment response, just log the error
      }
    }

    res.status(200).json({
      success: true,
      data: capture,
      message: 'PayPal order captured successfully',
      timestamp: new Date().toISOString(),
    });

    logger.info('PayPal order captured', {
      userId,
      orderId,
      captureId: capture.id,
      status: capture.status,
    });
  } catch (error: any) {
    logger.error('Capture PayPal order error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get PayPal Order Status
 * @route GET /api/v1/payments/paypal/order/:orderId
 * @access Private
 */
export const getPayPalOrderStatus = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      res.status(400).json({
        success: false,
        message: 'Order ID is required',
        code: 'MISSING_ORDER_ID',
      });
      return;
    }

    const order = await retrievePayPalOrder(orderId);

    res.status(200).json({
      success: true,
      data: {
        id: order?.id,
        status: order?.status,
        amount: order?.amount,
        payer: order?.payer,
        createTime: order?.createTime,
        updateTime: order?.updateTime,
      },
      message: 'PayPal order retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Get PayPal order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Handle PayPal Webhook Events
 * @route POST /api/v1/payments/paypal/webhook
 * @access Public (PayPal only)
 */
export const handlePayPalWebhook = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const headers = req.headers;
    const body = JSON.stringify(req.body);

    // Verify webhook signature (implement proper verification in production)
    // const isValid = verifyPayPalWebhookSignature(headers, body);
    // if (!isValid) {
    //   res.status(400).json({
    //     success: false,
    //     message: 'Invalid webhook signature',
    //     code: 'INVALID_SIGNATURE',
    //   });
    //   return;
    // }

    const event = req.body;
    const eventType = event.event_type;

    logger.info(`Processing PayPal webhook event: ${eventType}`, {
      eventId: event.id,
      resourceType: event.resource_type,
    });

    // Handle different event types
    switch (eventType) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        await handlePaymentCaptureCompleted(event);
        break;
      case 'PAYMENT.CAPTURE.DENIED':
        await handlePaymentCaptureDenied(event);
        break;
      case 'PAYMENT.CAPTURE.REFUNDED':
        await handlePaymentCaptureRefunded(event);
        break;
      case 'CHECKOUT.ORDER.APPROVED':
        await handleOrderApproved(event);
        break;
      case 'CHECKOUT.ORDER.COMPLETED':
        await handleOrderCompleted(event);
        break;
      default:
        logger.info(`Unhandled PayPal webhook event type: ${eventType}`);
    }

    res.status(200).json({ received: true });
  } catch (error: any) {
    logger.error('PayPal webhook processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
};

// Webhook event handlers
const handlePaymentCaptureCompleted = async (event: any) => {
  logger.info('Payment capture completed', {
    captureId: event.resource?.id,
    amount: event.resource?.amount,
    payerEmail: event.resource?.payer?.email_address,
  });
  
  // TODO: Update order status in database
  // TODO: Send confirmation email
  // TODO: Update inventory
};

const handlePaymentCaptureDenied = async (event: any) => {
  logger.info('Payment capture denied', {
    captureId: event.resource?.id,
    reason: event.resource?.reason_code,
  });
  
  // TODO: Update order status in database
  // TODO: Send notification email
};

const handlePaymentCaptureRefunded = async (event: any) => {
  logger.info('Payment capture refunded', {
    captureId: event.resource?.id,
    refundAmount: event.resource?.amount,
  });
  
  // TODO: Update order status in database
  // TODO: Send refund confirmation email
  // TODO: Restore inventory
};

const handleOrderApproved = async (event: any) => {
  logger.info('Order approved', {
    orderId: event.resource?.id,
    status: event.resource?.status,
  });
  
  // TODO: Update order status in database
};

const handleOrderCompleted = async (event: any) => {
  logger.info('Order completed', {
    orderId: event.resource?.id,
    status: event.resource?.status,
  });
  
  // TODO: Update order status in database
  // TODO: Send order confirmation email
};
