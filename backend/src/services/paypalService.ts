/**
 * PayPal Service - Real PayPal API Integration
 * Handles PayPal payment operations with PayPal Checkout Server SDK
 */

import paypal from '@paypal/checkout-server-sdk';
import { logger } from '../utils/logger';

// PayPal Environment Configuration
function paypalEnvironment() {
  const clientId = process.env.PAYPAL_CLIENT_ID || '';
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured');
  }

  if (process.env.PAYPAL_ENVIRONMENT === 'production') {
    return new paypal.core.LiveEnvironment(clientId, clientSecret);
  }
  return new paypal.core.SandboxEnvironment(clientId, clientSecret);
}

// PayPal Client
function paypalClient() {
  return new paypal.core.PayPalHttpClient(paypalEnvironment());
}

export interface CreatePayPalOrderData {
  amount: number; // Amount in dollars
  currency?: string;
  description?: string;
  customerEmail?: string;
  customerName?: string;
  items?: Array<{
    name: string;
    quantity: number;
    unitAmount: number; // Amount in dollars
    currency: string;
  }>;
  shippingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  metadata?: Record<string, string>;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface PayPalOrderResult {
  id: string;
  status: string;
  links: Array<{
    href: string;
    rel: string;
    method?: string;
  }>;
  approvalUrl?: string;
}

export interface CapturePayPalOrderData {
  orderId: string;
  metadata?: Record<string, string>;
}

export interface PayPalCaptureResult {
  id: string;
  status: string;
  amount: {
    currency_code: string;
    value: string;
  };
  payer?: {
    email_address?: string;
    name?: {
      given_name?: string;
      surname?: string;
    };
  };
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{
        id: string;
        status: string;
        amount: {
          currency_code: string;
          value: string;
        };
      }>;
    };
  }>;
}

/**
 * Create a PayPal Order using real PayPal API
 */
export const createPayPalOrder = async (data: CreatePayPalOrderData): Promise<PayPalOrderResult> => {
  try {
    // Calculate total amount
    const totalAmount = data.items 
      ? data.items.reduce((sum, item) => sum + (item.unitAmount * item.quantity), 0)
      : data.amount;

    // Create PayPal Order Request
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    
    const requestBody: any = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: data.currency?.toUpperCase() || 'USD',
          value: formatPayPalAmount(totalAmount),
        },
        description: data.description || 'Mayhem Creations Order',
        custom_id: data.metadata?.userId || undefined,
      }],
      application_context: {
        brand_name: 'Mayhem Creations',
        landing_page: 'BILLING',
        user_action: 'PAY_NOW',
        return_url: data.returnUrl || process.env.FRONTEND_URL + '/payment/success',
        cancel_url: data.cancelUrl || process.env.FRONTEND_URL + '/payment/cancel'
      }
    };

    // Add shipping address if provided
    if (data.shippingAddress) {
      requestBody.purchase_units[0].shipping = {
        name: {
          full_name: data.customerName || 'Customer'
        },
        address: {
          address_line_1: data.shippingAddress.line1,
          address_line_2: data.shippingAddress.line2 || undefined,
          admin_area_2: data.shippingAddress.city,
          admin_area_1: data.shippingAddress.state,
          postal_code: data.shippingAddress.postal_code,
          country_code: data.shippingAddress.country
        }
      };
    }

    request.requestBody(requestBody);

    // Execute PayPal API Request
    const response = await paypalClient().execute(request);
    const order = response.result;
    
    logger.info('PayPal Order created successfully', {
      orderId: order.id,
      amount: totalAmount,
      currency: data.currency || 'USD',
    });

    // Extract approval URL
    const approvalUrl = order.links?.find((link: any) => link.rel === 'approve')?.href;

    return {
      id: order.id,
      status: order.status,
      links: order.links || [],
      approvalUrl: approvalUrl
    };
  } catch (error: any) {
    logger.error('Error creating PayPal Order:', error);
    throw new Error(`Failed to create PayPal order: ${error.message}`);
  }
};

/**
 * Capture a PayPal Order using real PayPal API
 */
export const capturePayPalOrder = async (data: CapturePayPalOrderData): Promise<PayPalCaptureResult> => {
  try {
    // Create PayPal Capture Request
    const request = new paypal.orders.OrdersCaptureRequest(data.orderId);
    // Request body is optional for capture, use type assertion
    (request as any).requestBody({});

    // Execute PayPal API Request
    const response = await paypalClient().execute(request);
    const capture = response.result;
    
    logger.info('PayPal Order captured successfully', {
      orderId: data.orderId,
      captureId: capture.id,
      status: capture.status,
    });

    return {
      id: capture.id,
      status: capture.status,
      amount: capture.purchase_units?.[0]?.payments?.captures?.[0]?.amount || {
        currency_code: 'USD',
        value: '0.00'
      },
      payer: capture.payer,
      purchase_units: capture.purchase_units
    };
  } catch (error: any) {
    logger.error('Error capturing PayPal Order:', error);
    throw new Error(`Failed to capture PayPal order: ${error.message}`);
  }
};

/**
 * Retrieve a PayPal Order using real PayPal API
 */
export const retrievePayPalOrder = async (orderId: string) => {
  try {
    // Create PayPal Get Order Request
    const request = new paypal.orders.OrdersGetRequest(orderId);

    // Execute PayPal API Request
    const response = await paypalClient().execute(request);
    const order = response.result;
    
    logger.info('PayPal Order retrieved successfully', { 
      orderId: order.id,
      status: order.status 
    });
    
    return {
      id: order.id,
      status: order.status,
      amount: order.purchase_units?.[0]?.amount,
      payer: order.payer,
      createTime: order.create_time,
      updateTime: order.update_time,
    };
  } catch (error: any) {
    logger.error('Error retrieving PayPal Order:', error);
    throw new Error(`Failed to retrieve PayPal order: ${error.message}`);
  }
};

/**
 * Verify PayPal Webhook Signature
 * Note: This is a placeholder implementation for development
 * In production, implement proper signature verification
 */
export const verifyPayPalWebhookSignature = (headers: any, body: string, webhookId?: string) => {
  try {
    logger.info('PayPal webhook signature verification (mock)', {
      webhookId: webhookId || 'mock_webhook_id',
    });
    
    // For development, always return true
    // In production, implement proper signature verification
    return true;
  } catch (error: any) {
    logger.error('PayPal webhook signature verification failed:', error);
    throw new Error(`PayPal webhook signature verification failed: ${error.message}`);
  }
};

/**
 * Format amount for PayPal (convert to string with 2 decimal places)
 */
export const formatPayPalAmount = (amount: number): string => {
  return amount.toFixed(2);
};

/**
 * Validate PayPal order data
 */
export const validatePayPalOrderData = (data: CreatePayPalOrderData): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data.amount || data.amount <= 0) {
    errors.push('Amount must be greater than 0');
  }

  if (data.amount < 0.01) {
    errors.push('Minimum amount is $0.01');
  }

  if (data.amount > 10000) {
    errors.push('Maximum amount is $10,000');
  }

  if (data.items) {
    for (const item of data.items) {
      if (!item.name || item.name.trim().length === 0) {
        errors.push('Item name is required');
      }
      if (!item.quantity || item.quantity <= 0) {
        errors.push('Item quantity must be greater than 0');
      }
      if (!item.unitAmount || item.unitAmount <= 0) {
        errors.push('Item unit amount must be greater than 0');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};