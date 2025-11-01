/**
 * Payment Controller
 * Handles payment processing with Stripe
 */

import { Request, Response, NextFunction } from 'express';
import { 
  createPaymentIntent, 
  createCheckoutSession, 
  retrievePaymentIntent,
  retrieveCheckoutSession,
  createCustomer,
  CreatePaymentIntentData,
  CreateCheckoutSessionData
} from '../services/stripeService';
import stripe from '../config/stripe';
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
 * /api/v1/payments/create-intent:
 *   post:
 *     tags: [Payments]
 *     summary: Create a payment intent
 *     description: Creates a Stripe payment intent for processing a payment. Payment intents track the payment lifecycle.
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
 *             properties:
 *               amount:
 *                 type: number
 *                 format: float
 *                 example: 99.99
 *                 description: Payment amount in dollars
 *               currency:
 *                 type: string
 *                 default: usd
 *                 example: usd
 *                 description: Payment currency
 *               description:
 *                 type: string
 *                 example: Mayhem Creations Order
 *                 description: Payment description
 *               metadata:
 *                 type: object
 *                 description: Additional metadata for the payment
 *           examples:
 *             basicPayment:
 *               summary: Basic payment intent
 *               value:
 *                 amount: 99.99
 *                 currency: usd
 *                 description: Order #12345
 *     responses:
 *       201:
 *         description: Payment intent created successfully
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
 *                           example: pi_1234567890
 *                         client_secret:
 *                           type: string
 *                           example: pi_1234567890_secret_xxx
 *                         status:
 *                           type: string
 *                           example: requires_payment_method
 *       400:
 *         description: Invalid amount
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
export const createPaymentIntentHandler = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { amount, currency, description, metadata } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    if (!amount || amount <= 0) {
      res.status(400).json({
        success: false,
        message: 'Valid amount is required',
        code: 'INVALID_AMOUNT',
      });
      return;
    }

    // Convert amount to cents
    const amountInCents = Math.round(amount * 100);

    // Create or retrieve customer first
    let customerId: string | undefined;
    
    try {
      // Try to find existing customer by email
      const existingCustomers = await stripe.customers.list({
        email: req.user?.email,
        limit: 1,
      });
      
      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;
        logger.info('Using existing Stripe customer for payment intent', {
          customerId,
          email: req.user?.email,
        });
      } else {
        // Create new customer
        const customer = await createCustomer(
          req.user?.email || '',
          `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim(),
          {
            userId: userId.toString(),
          }
        );
        customerId = customer.id;
        logger.info('Created new Stripe customer for payment intent', {
          customerId,
          email: req.user?.email,
        });
      }
    } catch (customerError: any) {
      logger.warn('Customer creation/retrieval failed for payment intent, proceeding without customer', {
        error: customerError.message,
        email: req.user?.email,
      });
      // Continue without customer
    }

    const paymentData: CreatePaymentIntentData = {
      amount: amountInCents,
      currency: currency || 'usd',
      customerId,
      metadata: {
        userId: userId.toString(),
        ...metadata,
      },
      description: description || 'Mayhem Creations Order',
    };

    const paymentIntent = await createPaymentIntent(paymentData);

    res.status(201).json({
      success: true,
      data: paymentIntent,
      message: 'Payment intent created successfully',
      timestamp: new Date().toISOString(),
    });

    logger.info('Payment intent created', {
      userId,
      amount: amountInCents,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: any) {
    logger.error('Create payment intent error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * @swagger
 * /api/v1/payments/create-checkout-session:
 *   post:
 *     tags: [Payments]
 *     summary: Create a checkout session
 *     description: Creates a Stripe Checkout session for hosted payment processing.
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lineItems
 *             properties:
 *               lineItems:
 *                 type: array
 *                 description: Items to purchase
 *                 items:
 *                   type: object
 *                   properties:
 *                     price_data:
 *                       type: object
 *                       properties:
 *                         currency:
 *                           type: string
 *                         product_data:
 *                           type: object
 *                         unit_amount:
 *                           type: integer
 *                     quantity:
 *                       type: integer
 *               successUrl:
 *                 type: string
 *                 format: uri
 *                 description: URL to redirect after successful payment
 *               cancelUrl:
 *                 type: string
 *                 format: uri
 *                 description: URL to redirect if payment is cancelled
 *               metadata:
 *                 type: object
 *                 description: Additional metadata
 *     responses:
 *       201:
 *         description: Checkout session created successfully
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
 *                           example: cs_test_1234567890
 *                         url:
 *                           type: string
 *                           format: uri
 *                           example: https://checkout.stripe.com/pay/cs_test_xxx
 *       400:
 *         description: Invalid request data
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
export const createCheckoutSessionHandler = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { lineItems, successUrl, cancelUrl, customerInfo, shippingAddress, shippingCost, taxAmount, metadata } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Line items are required',
        code: 'INVALID_LINE_ITEMS',
      });
      return;
    }

    // Validate line items
    for (const item of lineItems) {
      if (!item.price_data || !item.price_data.product_data || !item.price_data.product_data.name) {
        res.status(400).json({
          success: false,
          message: 'Invalid line item format',
          code: 'INVALID_LINE_ITEM_FORMAT',
        });
        return;
      }
    }

    // Create or retrieve customer first
    let customerId: string | undefined;
    
    try {
      // Try to find existing customer by email
      const customerEmail = customerInfo?.email || req.user?.email;
      const existingCustomers = await stripe.customers.list({
        email: customerEmail,
        limit: 1,
      });
      
      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;
        logger.info('Using existing Stripe customer', {
          customerId,
          email: customerEmail,
        });

        // Update customer with shipping address if provided
        if (shippingAddress && customerInfo) {
          await stripe.customers.update(customerId, {
            name: customerInfo.name,
            phone: customerInfo.phone || undefined,
            shipping: {
              name: customerInfo.name,
              phone: customerInfo.phone || undefined,
              address: {
                line1: shippingAddress.line1,
                line2: shippingAddress.line2 || undefined,
                city: shippingAddress.city,
                state: shippingAddress.state,
                postal_code: shippingAddress.postal_code,
                country: shippingAddress.country,
              },
            },
          });
          logger.info('Updated customer with shipping address', { customerId });
        }
      } else {
        // Create new customer with shipping address
        const customerData: any = {
          email: customerEmail,
          name: customerInfo?.name || `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim(),
          phone: customerInfo?.phone || undefined,
          metadata: {
            userId: userId.toString(),
          },
        };

        // Add shipping address if provided
        if (shippingAddress && customerInfo) {
          customerData.shipping = {
            name: customerInfo.name,
            phone: customerInfo.phone || undefined,
            address: {
              line1: shippingAddress.line1,
              line2: shippingAddress.line2 || undefined,
              city: shippingAddress.city,
              state: shippingAddress.state,
              postal_code: shippingAddress.postal_code,
              country: shippingAddress.country,
            },
          };
        }

        const customer = await stripe.customers.create(customerData);
        customerId = customer.id;
        logger.info('Created new Stripe customer with shipping', {
          customerId,
          email: customerEmail,
        });
      }
    } catch (customerError: any) {
      logger.warn('Customer creation/retrieval failed, proceeding without customer', {
        error: customerError.message,
        email: req.user?.email,
      });
      // Continue without customer - Stripe will collect customer info during checkout
    }

    const checkoutData: CreateCheckoutSessionData = {
      lineItems,
      customerId,
      successUrl: successUrl || `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: cancelUrl || `${process.env.FRONTEND_URL}/payment/cancel`,
      customerInfo,
      shippingAddress,
      shippingCost, // Pass shipping cost to Stripe
      taxAmount, // Pass tax amount to Stripe
      metadata: {
        userId: userId.toString(),
        ...metadata,
      },
    };

    const checkoutSession = await createCheckoutSession(checkoutData);

    res.status(201).json({
      success: true,
      data: checkoutSession,
      message: 'Checkout session created successfully',
      timestamp: new Date().toISOString(),
    });

    logger.info('Checkout session created', {
      userId,
      sessionId: checkoutSession.id,
      lineItemsCount: lineItems.length,
    });
  } catch (error: any) {
    logger.error('Create checkout session error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * @swagger
 * /api/v1/payments/intent/{paymentIntentId}:
 *   get:
 *     tags: [Payments]
 *     summary: Get payment intent status
 *     description: Retrieves the current status and details of a Stripe payment intent.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentIntentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Stripe payment intent ID
 *         example: pi_1234567890
 *     responses:
 *       200:
 *         description: Payment intent retrieved successfully
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
 *                         status:
 *                           type: string
 *                           example: succeeded
 *                         amount:
 *                           type: integer
 *                         currency:
 *                           type: string
 *       404:
 *         description: Payment intent not found
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
export const getPaymentIntentStatus = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const { paymentIntentId } = req.params;

    if (!paymentIntentId) {
      res.status(400).json({
        success: false,
        message: 'Payment intent ID is required',
        code: 'MISSING_PAYMENT_INTENT_ID',
      });
      return;
    }

    const paymentIntent = await retrievePaymentIntent(paymentIntentId);

    res.status(200).json({
      success: true,
      data: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        client_secret: paymentIntent.client_secret,
      },
      message: 'Payment intent retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Get payment intent status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get Checkout Session Status
 * @route GET /api/v1/payments/session/:sessionId
 * @access Private
 */
export const getCheckoutSessionStatus = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      res.status(400).json({
        success: false,
        message: 'Session ID is required',
        code: 'MISSING_SESSION_ID',
      });
      return;
    }

    const session = await retrieveCheckoutSession(sessionId);

    res.status(200).json({
      success: true,
      data: {
        id: session.id,
        status: session.payment_status,
        amount_total: session.amount_total,
        currency: session.currency,
        customer_email: session.customer_details?.email,
      },
      message: 'Checkout session retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Get checkout session status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Create or Retrieve Customer
 * @route POST /api/v1/payments/customer
 * @access Private (Customer only)
 */
export const createOrRetrieveCustomer = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { email, name } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    if (!email) {
      res.status(400).json({
        success: false,
        message: 'Email is required',
        code: 'MISSING_EMAIL',
      });
      return;
    }

    // For now, create a new customer each time
    // In production, you might want to store and retrieve existing customers
    const customer = await createCustomer(email, name, {
      userId: userId.toString(),
    });

    res.status(201).json({
      success: true,
      data: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
      },
      message: 'Customer created successfully',
      timestamp: new Date().toISOString(),
    });

    logger.info('Customer created', {
      userId,
      customerId: customer.id,
      email,
    });
  } catch (error: any) {
    logger.error('Create customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
};
