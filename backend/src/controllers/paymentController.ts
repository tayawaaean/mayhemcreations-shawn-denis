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
 * Create Payment Intent
 * @route POST /api/v1/payments/create-intent
 * @access Private (Customer only)
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
 * Create Checkout Session
 * @route POST /api/v1/payments/create-checkout-session
 * @access Private (Customer only)
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
 * Get Payment Intent Status
 * @route GET /api/v1/payments/intent/:paymentIntentId
 * @access Private
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
