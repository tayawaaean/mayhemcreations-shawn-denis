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
          
          logger.info('📍 Using address from:', { 
            source: useFormData ? 'Form Data (Priority)' : 'PayPal Response (Fallback)',
            shippingAddress 
          });
          
          // Generate order number if not exists
          const { generateOrderNumber } = await import('../services/paymentRecordService');
          const orderNumber = generateOrderNumber(order.id);
          
          // Extract payer email
          const payerEmail = payerInfo?.email_address || metadata?.customerEmail || '';
          const cardBrand = 'paypal'; // PayPal doesn't provide card brand
          
          // Extract pricing information from metadata (passed from frontend)
          const subtotal = metadata?.subtotal ? parseFloat(metadata.subtotal) : order.subtotal || null;
          const shipping = metadata?.shipping ? parseFloat(metadata.shipping) : order.shipping || null;
          const tax = metadata?.tax ? parseFloat(metadata.tax) : order.tax || null;
          const total = metadata?.total ? parseFloat(metadata.total) : order.total || null;
          
          logger.info('💳 Saving PayPal payment details:', {
            orderId: order.id,
            shippingAddress,
            payerEmail,
            orderNumber,
            pricing: { subtotal, shipping, tax, total }
          });
          
          // Update order status and payment/shipping details with pricing
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
              capture.id, // PayPal capture ID as payment intent
              `paypal_${orderId}`,
              cardBrand,
              subtotal,
              shipping,
              tax,
              total,
              order.id
            ]
          });

          // Note: Stock will be deducted when order status changes to 'delivered'
          // This allows for order modifications during production

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
