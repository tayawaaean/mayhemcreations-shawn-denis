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
  shippingCost?: number; // Shipping cost in dollars
  taxAmount?: number; // Tax amount in dollars
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
    // Start with product line items
    const allLineItems = [...data.lineItems];

    // Add shipping as a line item if provided
    if (data.shippingCost && data.shippingCost > 0) {
      allLineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Shipping',
            description: 'Standard shipping',
          },
          unit_amount: Math.round(data.shippingCost * 100), // Convert to cents
        },
        quantity: 1,
      });
    }

    // Add tax as a line item if provided
    if (data.taxAmount && data.taxAmount > 0) {
      allLineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Tax',
            description: 'Sales tax (8%)',
          },
          unit_amount: Math.round(data.taxAmount * 100), // Convert to cents
        },
        quantity: 1,
      });
    }

    const sessionData: any = {
      payment_method_types: stripeConfig.paymentMethodTypes,
      line_items: allLineItems,
      mode: 'payment',
      success_url: data.successUrl,
      cancel_url: data.cancelUrl,
      metadata: data.metadata || {},
      billing_address_collection: 'required',
      shipping_address_collection: {
        allowed_countries: ['US'], // US only
      },
    };

    // Create or update customer with shipping address to enable pre-fill
    let customerId = data.customerId;
    
    if (data.customerInfo && data.shippingAddress) {
      try {
        // Try to find existing customer by email
        const customers = await stripe.customers.list({
          email: data.customerInfo.email,
          limit: 1
        });
        
        const customerData: any = {
          name: data.customerInfo.name,
          email: data.customerInfo.email,
          phone: data.customerInfo.phone || undefined,
          shipping: {
            name: data.customerInfo.name,
            address: {
              line1: data.shippingAddress.line1,
              line2: data.shippingAddress.line2 || undefined,
              city: data.shippingAddress.city,
              state: data.shippingAddress.state,
              postal_code: data.shippingAddress.postal_code,
              country: data.shippingAddress.country
            }
          }
        };
        
        if (customers.data.length > 0) {
          // Update existing customer with shipping address
          const customer = await stripe.customers.update(customers.data[0].id, customerData);
          customerId = customer.id;
          logger.info('Updated existing Stripe customer with shipping address:', customer.id);
        } else {
          // Create new customer with shipping address
          const customer = await stripe.customers.create(customerData);
          customerId = customer.id;
          logger.info('Created new Stripe customer with shipping address:', customer.id);
        }
      } catch (error: any) {
        logger.warn('Failed to create/update Stripe customer:', error.message);
        // Continue without customer - will use customer_email instead
      }
    }
    
    // Set customer OR customer_email (not both)
    // Using customer will pre-fill shipping address from customer.shipping
    if (customerId) {
      sessionData.customer = customerId;
    } else if (data.customerInfo?.email) {
      sessionData.customer_email = data.customerInfo.email;
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
      productLineItems: data.lineItems.length,
      totalLineItems: allLineItems.length,
      hasShippingAddress: !!data.shippingAddress,
      shippingCost: data.shippingCost || 0,
      taxAmount: data.taxAmount || 0,
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
