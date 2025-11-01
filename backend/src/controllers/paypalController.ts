/**
 * PayPal Controller
 * Handles PayPal payment processing
 */

import { Request, Response, NextFunction } from 'express';
import { 
  createPayPalOrder, 
  capturePayPalOrder, 
  retrievePayPalOrder,
  verifyPayPalWebhookSignature,
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
 * @swagger
 * /api/v1/payments/paypal/create-order:
 *   post:
 *     tags: [Payments]
 *     summary: Create a PayPal order
 *     description: Creates a new PayPal order with the provided payment details. Returns a PayPal order ID that can be used for payment processing.
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - items
 *             properties:
 *               amount:
 *                 type: number
 *                 format: float
 *                 example: 99.99
 *                 description: Total order amount
 *               currency:
 *                 type: string
 *                 default: USD
 *                 example: USD
 *                 description: Payment currency
 *               description:
 *                 type: string
 *                 example: Mayhem Creations Order
 *                 description: Order description
 *               items:
 *                 type: array
 *                 description: Order items
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: Custom T-Shirt
 *                     quantity:
 *                       type: integer
 *                       example: 1
 *                     price:
 *                       type: number
 *                       format: float
 *                       example: 99.99
 *               customerInfo:
 *                 type: object
 *                 properties:
 *                   email:
 *                     type: string
 *                     format: email
 *                     example: customer@example.com
 *                   name:
 *                     type: string
 *                     example: John Doe
 *                   phone:
 *                     type: string
 *                     example: +15551234567
 *               shippingAddress:
 *                 type: object
 *                 description: Shipping address
 *                 properties:
 *                   street:
 *                     type: string
 *                     example: 123 Main St
 *                   city:
 *                     type: string
 *                     example: Columbus
 *                   state:
 *                     type: string
 *                     example: OH
 *                   zipCode:
 *                     type: string
 *                     example: 43017
 *                   country:
 *                     type: string
 *                     default: US
 *                     example: US
 *               metadata:
 *                 type: object
 *                 description: Additional order metadata
 *               returnUrl:
 *                 type: string
 *                 format: uri
 *                 example: https://example.com/payment/success
 *                 description: URL to redirect after successful payment
 *               cancelUrl:
 *                 type: string
 *                 format: uri
 *                 example: https://example.com/payment/cancel
 *                 description: URL to redirect if payment is cancelled
 *           examples:
 *             basicOrder:
 *               summary: Basic order
 *               value:
 *                 amount: 99.99
 *                 currency: USD
 *                 items:
 *                   - name: Custom T-Shirt
 *                     quantity: 1
 *                     price: 99.99
 *                 returnUrl: https://example.com/payment/success
 *                 cancelUrl: https://example.com/payment/cancel
 *     responses:
 *       201:
 *         description: PayPal order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: 5O190127TN364715T
 *                           description: PayPal order ID
 *                         status:
 *                           type: string
 *                           example: CREATED
 *                         links:
 *                           type: array
 *                           items:
 *                             type: object
 *       400:
 *         description: Invalid order data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               invalidData:
 *                 summary: Invalid order data
 *                 value:
 *                   success: false
 *                   message: Invalid order data
 *                   code: INVALID_ORDER_DATA
 *                   errors:
 *                     - msg: Amount is required
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
      customerPhone: customerInfo?.phone || metadata?.phone,
      items,
      shippingAddress,
      metadata: {
        userId: userId.toString(),
        ...metadata,
      },
      returnUrl,
      cancelUrl,
    };

    // Order data received - debug logging disabled for verbosity

    const validation = validatePayPalOrderData(orderData);
    // Validation result - debug logging disabled for verbosity
    
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
 * @swagger
 * /api/v1/payments/paypal/capture-order:
 *   post:
 *     tags: [Payments]
 *     summary: Capture a PayPal order
 *     description: Captures payment for an approved PayPal order. This completes the payment transaction and updates the order status.
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *             properties:
 *               orderId:
 *                 type: string
 *                 example: 5O190127TN364715T
 *                 description: PayPal order ID from create-order response
 *               metadata:
 *                 type: object
 *                 description: Additional order metadata
 *                 properties:
 *                   subtotal:
 *                     type: number
 *                     example: 89.99
 *                   shipping:
 *                     type: number
 *                     example: 5.00
 *                   tax:
 *                     type: number
 *                     example: 5.00
 *                   total:
 *                     type: number
 *                     example: 99.99
 *                   customerName:
 *                     type: string
 *                     example: John Doe
 *                   customerEmail:
 *                     type: string
 *                     format: email
 *                     example: customer@example.com
 *               orderData:
 *                 type: object
 *                 description: Complete order data
 *           examples:
 *             captureOrder:
 *               summary: Capture order
 *               value:
 *                 orderId: 5O190127TN364715T
 *                 metadata:
 *                   subtotal: 89.99
 *                   shipping: 5.00
 *                   tax: 5.00
 *                   total: 99.99
 *     responses:
 *       200:
 *         description: PayPal order captured successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: 5O190127TN364715T
 *                         status:
 *                           type: string
 *                           example: COMPLETED
 *       400:
 *         description: Missing or invalid order ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
        logger.info('🔍 Looking for pending-payment order for user:', userId);
        
        const [orderResult] = await sequelize.query(`
          SELECT id, user_id, status, total, subtotal, shipping, tax, payment_status
          FROM order_reviews 
          WHERE user_id = ? AND status = 'pending-payment'
          ORDER BY created_at DESC 
          LIMIT 1
        `, {
          replacements: [userId]
        });

        // Found orders - detailed logging disabled for verbosity

        if (Array.isArray(orderResult) && orderResult.length > 0) {
          const order = orderResult[0] as any;
          
          // Found order to update - detailed logging disabled
          
          // Prioritize form data (metadata) over PayPal shipping address
          // This ensures consistent address usage like Stripe
          const useFormData = metadata?.street && metadata?.city; // Check if form data exists
          
          const shippingDetails = capture.purchase_units?.[0]?.shipping;
          const payerInfo = capture.payer;
          
          // Format shipping address for database - use same format as Stripe for consistency
          // This ensures the admin panel can correctly display addresses from both payment providers
          // Note: Email is stored separately in order_reviews.user_email, not in the address object
          const shippingAddress = useFormData ? {
            firstName: metadata.firstName || '',
            lastName: metadata.lastName || '',
            phone: metadata.phone || '',
            street: metadata.street || '',
            apartment: metadata.apartment || '',
            city: metadata.city || '',
            state: metadata.state || '',
            zipCode: metadata.zipCode || '',
            country: metadata.country || 'US',
          } : (shippingDetails ? {
            firstName: payerInfo?.name?.given_name || '',
            lastName: payerInfo?.name?.surname || '',
            phone: '',
            street: shippingDetails.address?.address_line_1 || '',
            apartment: shippingDetails.address?.address_line_2 || '',
            city: shippingDetails.address?.admin_area_2 || '',
            state: shippingDetails.address?.admin_area_1 || '',
            zipCode: shippingDetails.address?.postal_code || '',
            country: shippingDetails.address?.country_code || '',
          } : null);
          
          // Using address from metadata/form data - detailed logging disabled
          
          // Generate order number if not exists
          const { generateOrderNumber } = await import('../services/paymentRecordService');
          const orderNumber = generateOrderNumber(order.id);
          
          // Extract payer email
          const payerEmail = payerInfo?.email_address || metadata?.customerEmail || '';
          const cardBrand = 'paypal'; // PayPal doesn't provide card brand
          
          // Extract the actual PayPal capture ID (needed for refunds)
          // The capture.id is the order ID, but the actual capture ID is in purchase_units
          const paypalCaptureId = capture.purchase_units?.[0]?.payments?.captures?.[0]?.id || capture.id;
          
          // PayPal IDs extracted - detailed logging disabled
          
          // Extract pricing information from metadata (passed from frontend)
          const subtotal = metadata?.subtotal ? parseFloat(metadata.subtotal) : order.subtotal || null;
          const shipping = metadata?.shipping ? parseFloat(metadata.shipping) : order.shipping || null;
          const tax = metadata?.tax ? parseFloat(metadata.tax) : order.tax || null;
          const total = metadata?.total ? parseFloat(metadata.total) : order.total || null;
          
          // Saving PayPal payment details - detailed logging disabled
          
          // Update order status and payment/shipping details with pricing
          // Updating order in database - detailed logging disabled
          
          const [updateResult] = await sequelize.query(`
            UPDATE order_reviews 
            SET status = 'approved-processing',
                order_number = ?,
                shipping_address = ?,
                billing_address = ?,
                payment_method = 'paypal',
                payment_status = 'completed',
                payment_provider = 'paypal',
                payment_intent_id = ?,
                transaction_id = ?,
                card_brand = ?,
                subtotal = ?,
                shipping = ?,
                tax = ?,
                total = ?,
                reviewed_at = NOW(),
                updated_at = NOW()
            WHERE id = ?
          `, {
            replacements: [
              orderNumber,
              shippingAddress ? JSON.stringify(shippingAddress) : null,
              shippingAddress ? JSON.stringify(shippingAddress) : null, // Use same address for billing
              paypalCaptureId, // ✅ PayPal capture ID (used for refunds)
              `paypal_${orderId}`,
              cardBrand,
              subtotal,
              shipping,
              tax,
              total,
              order.id
            ]
          });
          
          // Order update completed - detailed logging disabled
          
          // Verify the update by querying the order again
          const [verifyResult] = await sequelize.query(`
            SELECT id, status, payment_status, payment_method, payment_provider
            FROM order_reviews 
            WHERE id = ?
          `, {
            replacements: [order.id]
          });
          
          logger.info('✅ Order status after update:', verifyResult[0]);

          // Deduct stock after successful payment
          try {
            const { deductStockForOrder } = await import('../services/stockService');
            const stockDeducted = await deductStockForOrder(order.id);
            if (stockDeducted) {
              logger.info(`✅ Stock deducted successfully for order ${order.id} after PayPal payment`);
            } else {
              logger.warn(`⚠️ Failed to deduct stock for order ${order.id}`);
            }
          } catch (stockError) {
            logger.error(`❌ Error deducting stock for order ${order.id}:`, stockError);
            // Don't fail the payment processing if stock deduction fails
            // Admin can manually adjust inventory if needed
          }

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

          logger.info('PayPal payment successful and order updated:', {
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
 * @swagger
 * /api/v1/payments/paypal/order/{orderId}:
 *   get:
 *     tags: [Payments]
 *     summary: Get PayPal order status
 *     description: Retrieves the current status and details of a PayPal order by order ID.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: PayPal order ID
 *         example: 5O190127TN364715T
 *     responses:
 *       200:
 *         description: PayPal order retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: 5O190127TN364715T
 *                         status:
 *                           type: string
 *                           example: COMPLETED
 *                         amount:
 *                           type: number
 *                           example: 99.99
 *                         payer:
 *                           type: object
 *                           description: Payer information
 *                         createTime:
 *                           type: string
 *                           format: date-time
 *                         updateTime:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Missing order ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @swagger
 * /api/v1/payments/paypal/webhook:
 *   post:
 *     tags: [Webhooks]
 *     summary: PayPal webhook endpoint
 *     description: Receives and processes webhook events from PayPal. This endpoint verifies webhook signatures and handles payment events.
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
 *                 description: Webhook event ID
 *               event_type:
 *                 type: string
 *                 example: PAYMENT.CAPTURE.COMPLETED
 *                 description: Type of webhook event
 *               resource_type:
 *                 type: string
 *                 example: capture
 *               resource:
 *                 type: object
 *                 description: Event resource data
 *               create_time:
 *                 type: string
 *                 format: date-time
 *           examples:
 *             paymentCompleted:
 *               summary: Payment capture completed
 *               value:
 *                 id: WH-2W42680A68360706X-620RTSHUQI042
 *                 event_type: PAYMENT.CAPTURE.COMPLETED
 *                 resource_type: capture
 *                 create_time: '2025-11-01T12:00:00Z'
 *     responses:
 *       200:
 *         description: Webhook received and processed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 received:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Invalid webhook signature or format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const handlePayPalWebhook = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const headers = req.headers;
    // Use raw body if available (for signature verification), otherwise use parsed body
    const body = (req as any).rawBody || req.body;
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;

    // Verify webhook signature using PayPal's verification API
    try {
      const isValid = await verifyPayPalWebhookSignature(headers, body, webhookId);
      if (!isValid) {
        logger.error('PayPal webhook signature verification failed');
        res.status(400).json({
          success: false,
          message: 'Invalid webhook signature',
          code: 'INVALID_SIGNATURE',
          timestamp: new Date().toISOString(),
        });
        return;
      }
    } catch (verificationError: any) {
      // In development, allow webhooks without verification for testing
      // In production, reject invalid signatures
      if (process.env.NODE_ENV === 'production') {
        logger.error('PayPal webhook verification error in production:', verificationError);
        res.status(400).json({
          success: false,
          message: 'Webhook signature verification failed',
          code: 'VERIFICATION_ERROR',
          timestamp: new Date().toISOString(),
        });
        return;
      } else {
        logger.warn('PayPal webhook verification skipped in development:', verificationError.message);
      }
    }

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
  const captureResource = event.resource;
  
  logger.info('Payment capture completed', {
    captureId: captureResource?.id,
    amount: captureResource?.amount,
    payerEmail: captureResource?.payer?.email_address,
  });
  
  try {
    const { sequelize } = await import('../config/database');
    
    // Extract custom_id or supplementary_data to find the order
    const customId = captureResource?.custom_id;
    const supplementaryData = captureResource?.supplementary_data;
    
    // Try to find order by transaction ID or most recent pending payment
    // PayPal webhooks might not have order context, so we need to match by timing
    const [orderResult] = await sequelize.query(`
      SELECT id, user_id, status, total, subtotal, shipping, tax
      FROM order_reviews 
      WHERE status = 'pending-payment'
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    if (Array.isArray(orderResult) && orderResult.length > 0) {
      const order = orderResult[0] as any;
      
      // Extract shipping address from webhook payload
      // Note: Webhook might have less detail than direct API call
      const shippingDetails = supplementaryData?.related_ids?.shipping;
      const payerInfo = captureResource?.payer;
      
      // Retrieve full order details from PayPal to get complete shipping info
      let fullShippingAddress = null;
      if (captureResource?.supplementary_data?.related_ids?.order_id) {
        try {
          const { retrievePayPalOrder } = await import('../services/paypalService');
          const fullOrder = await retrievePayPalOrder(captureResource.supplementary_data.related_ids.order_id);
          const fullShipping = fullOrder.purchase_units?.[0]?.shipping;
          
          if (fullShipping) {
            // Use same format as Stripe for consistency with admin panel display
            // Email is stored separately in order_reviews.user_email
            fullShippingAddress = {
              firstName: payerInfo?.name?.given_name || '',
              lastName: payerInfo?.name?.surname || '',
              phone: '',
              street: fullShipping.address?.address_line_1 || '',
              apartment: fullShipping.address?.address_line_2 || '',
              city: fullShipping.address?.admin_area_2 || '',
              state: fullShipping.address?.admin_area_1 || '',
              zipCode: fullShipping.address?.postal_code || '',
              country: fullShipping.address?.country_code || '',
            };
          }
        } catch (retrieveError) {
          logger.error('Error retrieving full order details from PayPal:', retrieveError);
        }
      }
      
      // Generate order number if not exists
      const { generateOrderNumber } = await import('../services/paymentRecordService');
      const orderNumber = generateOrderNumber(order.id);
      
      // Update order with payment and shipping details
      await sequelize.query(`
        UPDATE order_reviews 
        SET status = 'approved-processing',
            order_number = ?,
            shipping_address = ?,
            billing_address = ?,
            payment_method = 'paypal',
            payment_status = 'completed',
            payment_provider = 'paypal',
            payment_intent_id = ?,
            transaction_id = ?,
            card_brand = 'paypal',
            reviewed_at = NOW(),
            updated_at = NOW()
        WHERE id = ?
      `, {
        replacements: [
          orderNumber,
          fullShippingAddress ? JSON.stringify(fullShippingAddress) : null,
          fullShippingAddress ? JSON.stringify(fullShippingAddress) : null,
          captureResource.id,
          `paypal_webhook_${captureResource.id}`,
          order.id
        ]
      });
      
      // Note: Stock will be deducted when order status changes to 'delivered'
      // This allows for order modifications during production
      
      logger.info('✅ Order updated via PayPal webhook with shipping details', {
        orderId: order.id,
        captureId: captureResource.id,
        shippingAddress: fullShippingAddress,
      });
      
      // Emit WebSocket event for real-time updates
      try {
        const { getWebSocketService } = await import('../services/websocketService');
        const webSocketService = getWebSocketService();
        if (webSocketService) {
          webSocketService.emitOrderStatusChange(order.id, {
            userId: order.user_id,
            status: 'approved-processing',
            originalStatus: 'pending-payment',
            reviewedAt: new Date().toISOString(),
            paypalCaptureId: captureResource.id
          });
        }
      } catch (wsError) {
        logger.error('Error emitting WebSocket event:', wsError);
      }
    } else {
      logger.warn('No pending-payment order found for PayPal webhook');
    }
  } catch (error) {
    logger.error('Error processing PayPal capture webhook:', error);
  }
};

const handlePaymentCaptureDenied = async (event: any) => {
  const captureResource = event.resource;
  
  logger.info('Payment capture denied', {
    captureId: captureResource?.id,
    reason: captureResource?.reason_code,
  });
  
  try {
    const { sequelize } = await import('../config/database');
    
    // Try to find the most recent pending order
    const [orderResult] = await sequelize.query(`
      SELECT id, user_id
      FROM order_reviews 
      WHERE status = 'pending-payment'
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    let orderId = 0;
    let userId = 0;
    if (Array.isArray(orderResult) && orderResult.length > 0) {
      const order = orderResult[0] as any;
      orderId = order.id;
      userId = order.user_id;
    }
    
    // Log failed PayPal payment
    const { createPaymentRecord, generateOrderNumber } = await import('../services/paymentRecordService');
    
    const amount = captureResource?.amount?.value ? parseFloat(captureResource.amount.value) : 0;
    
    await createPaymentRecord({
      orderId: orderId,
      orderNumber: orderId > 0 ? generateOrderNumber(orderId) : 'N/A',
      customerId: userId,
      customerName: captureResource?.payer?.name?.given_name || 'Unknown Customer',
      customerEmail: captureResource?.payer?.email_address || 'unknown@example.com',
      amount: amount,
      currency: captureResource?.amount?.currency_code || 'USD',
      provider: 'paypal',
      paymentMethod: 'digital_wallet',
      status: 'failed',
      transactionId: `paypal_${captureResource?.id}`,
      providerTransactionId: captureResource?.id || '',
      gatewayResponse: captureResource,
      fees: 0,
      netAmount: 0,
      metadata: {
        reasonCode: captureResource?.reason_code,
        eventType: event.event_type,
      },
      notes: `PayPal payment denied: ${captureResource?.reason_code || 'Unknown reason'}`,
    });
    
    logger.info('Failed PayPal payment logged successfully', {
      captureId: captureResource?.id,
      reasonCode: captureResource?.reason_code,
    });
  } catch (error) {
    logger.error('Error logging denied PayPal payment:', error);
  }
};

const handlePaymentCaptureRefunded = async (event: any) => {
  const refundResource = event.resource;
  
  logger.info('Payment capture refunded', {
    refundId: refundResource?.id,
    refundAmount: refundResource?.amount,
  });
  
  try {
    const { sequelize } = await import('../config/database');
    
    // Try to find existing payment by PayPal transaction ID
    const captureId = refundResource?.links?.find((link: any) => 
      link.rel === 'up'
    )?.href?.split('/').pop();
    
    const [paymentResult] = await sequelize.query(`
      SELECT * FROM payments 
      WHERE provider_transaction_id LIKE ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `, {
      replacements: [`%${captureId}%`]
    });
    
    if (Array.isArray(paymentResult) && paymentResult.length > 0) {
      const payment = paymentResult[0] as any;
      
      // Update existing payment to refunded status
      const refundAmount = refundResource?.amount?.value ? parseFloat(refundResource.amount.value) : 0;
      
      await sequelize.query(`
        UPDATE payments 
        SET status = 'refunded',
            refund_amount = ?,
            refunded_at = NOW(),
            notes = CONCAT(COALESCE(notes, ''), '\\nRefunded: ', ?),
            gateway_response = ?,
            updated_at = NOW()
        WHERE id = ?
      `, {
        replacements: [
          refundAmount,
          refundResource?.note_to_payer || 'No reason provided',
          JSON.stringify(refundResource),
          payment.id
        ]
      });
      
      logger.info('PayPal refund logged successfully', {
        paymentId: payment.id,
        refundId: refundResource?.id,
        refundAmount,
      });
    } else {
      logger.warn('No existing payment found for refund', {
        refundId: refundResource?.id,
        captureId,
      });
    }
  } catch (error) {
    logger.error('Error logging PayPal refund:', error);
  }
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
