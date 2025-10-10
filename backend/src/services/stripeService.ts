/**
 * Stripe Service
 * Handles all Stripe payment operations
 */

import stripe, { stripeConfig } from '../config/stripe';
import { logger } from '../utils/logger';

export interface CreatePaymentIntentData {
  amount: number; // Amount in cents
  currency?: string;
  customerId?: string;
  metadata?: Record<string, string>;
  description?: string;
}

export interface CreateCheckoutSessionData {
  lineItems: Array<{
    price_data: {
      currency: string;
      product_data: {
        name: string;
        description?: string;
        images?: string[];
      };
      unit_amount: number; // Amount in cents
    };
    quantity: number;
  }>;
  customerId?: string;
  successUrl: string;
  cancelUrl: string;
  customerInfo?: {
    name: string;
    email: string;
    phone?: string;
  };
  shippingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  metadata?: Record<string, string>;
}

export interface PaymentIntentResult {
  id: string;
  client_secret: string;
  status: string;
  amount: number;
  currency: string;
}

export interface CheckoutSessionResult {
  id: string;
  url: string;
}

/**
 * Create a Payment Intent for one-time payments
 */
export const createPaymentIntent = async (data: CreatePaymentIntentData): Promise<PaymentIntentResult> => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: data.amount,
      currency: data.currency || stripeConfig.currency,
      customer: data.customerId,
      metadata: data.metadata || {},
      description: data.description,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    logger.info('Payment Intent created', {
      paymentIntentId: paymentIntent.id,
      amount: data.amount,
      currency: data.currency || stripeConfig.currency,
    });

    return {
      id: paymentIntent.id,
      client_secret: paymentIntent.client_secret!,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    };
  } catch (error: any) {
    logger.error('Error creating Payment Intent:', error);
    throw new Error(`Failed to create payment intent: ${error.message}`);
  }
};

/**
 * Create a Checkout Session for hosted payments
 */
export const createCheckoutSession = async (data: CreateCheckoutSessionData): Promise<CheckoutSessionResult> => {
  try {
    const sessionData: any = {
      payment_method_types: stripeConfig.paymentMethodTypes,
      line_items: data.lineItems,
      mode: 'payment',
      success_url: data.successUrl,
      cancel_url: data.cancelUrl,
      metadata: data.metadata || {},
      billing_address_collection: 'required',
      shipping_address_collection: {
        allowed_countries: ['US'], // US only
      },
    };

    // Set customer OR customer_email (not both)
    // If customer exists, Stripe will pre-fill shipping from customer.shipping
    if (data.customerId) {
      sessionData.customer = data.customerId;
    } else if (data.customerInfo?.email) {
      sessionData.customer_email = data.customerInfo.email;
    }

    // Add shipping options if address is provided
    if (data.shippingAddress) {
      sessionData.shipping_options = [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: 0, // Calculated by your system
              currency: 'usd',
            },
            display_name: 'Standard Shipping',
          },
        },
      ];
    }

    // Store additional info in metadata for reference
    if (data.shippingAddress && data.customerInfo) {
      sessionData.metadata = {
        ...sessionData.metadata,
        shipping_name: data.customerInfo.name,
        shipping_line1: data.shippingAddress.line1,
        shipping_line2: data.shippingAddress.line2 || '',
        shipping_city: data.shippingAddress.city,
        shipping_state: data.shippingAddress.state,
        shipping_postal_code: data.shippingAddress.postal_code,
        shipping_country: data.shippingAddress.country,
        customer_phone: data.customerInfo.phone || '',
      };
    }

    const session = await stripe.checkout.sessions.create(sessionData);

    logger.info('Checkout Session created', {
      sessionId: session.id,
      lineItemsCount: data.lineItems.length,
      hasShippingAddress: !!data.shippingAddress,
    });

    return {
      id: session.id,
      url: session.url!,
    };
  } catch (error: any) {
    logger.error('Error creating Checkout Session:', error);
    throw new Error(`Failed to create checkout session: ${error.message}`);
  }
};

/**
 * Retrieve a Payment Intent
 */
export const retrievePaymentIntent = async (paymentIntentId: string) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error: any) {
    logger.error('Error retrieving Payment Intent:', error);
    throw new Error(`Failed to retrieve payment intent: ${error.message}`);
  }
};

/**
 * Retrieve a Checkout Session
 */
export const retrieveCheckoutSession = async (sessionId: string) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return session;
  } catch (error: any) {
    logger.error('Error retrieving Checkout Session:', error);
    throw new Error(`Failed to retrieve checkout session: ${error.message}`);
  }
};

/**
 * Create a Customer
 */
export const createCustomer = async (email: string, name?: string, metadata?: Record<string, string>) => {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: metadata || {},
    });

    logger.info('Customer created', {
      customerId: customer.id,
      email,
    });

    return customer;
  } catch (error: any) {
    logger.error('Error creating Customer:', error);
    throw new Error(`Failed to create customer: ${error.message}`);
  }
};

/**
 * Retrieve a Customer
 */
export const retrieveCustomer = async (customerId: string) => {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    return customer;
  } catch (error: any) {
    logger.error('Error retrieving Customer:', error);
    throw new Error(`Failed to retrieve customer: ${error.message}`);
  }
};

/**
 * Verify Webhook Signature
 */
export const verifyWebhookSignature = (payload: string, signature: string) => {
  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      stripeConfig.webhookSecret
    );
    return event;
  } catch (error: any) {
    logger.error('Webhook signature verification failed:', error);
    throw new Error(`Webhook signature verification failed: ${error.message}`);
  }
};
