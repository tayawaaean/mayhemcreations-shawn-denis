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
      customerEmail: req.user?.email,
      customerName: `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim(),
      items,
      metadata: {
        userId: userId.toString(),
        ...metadata,
      },
      returnUrl,
      cancelUrl,
    };

    const validation = validatePayPalOrderData(orderData);
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
    const { orderId, metadata } = req.body;

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
