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
  customerPhone?: string;
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
  purchase_units?: Array<{
    shipping?: {
      name?: {
        full_name?: string;
      };
      address?: {
        address_line_1?: string;
        address_line_2?: string;
        admin_area_2?: string; // City
        admin_area_1?: string; // State
        postal_code?: string;
        country_code?: string;
      };
    };
  }>;
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
    shipping?: {
      name?: {
        full_name?: string;
      };
      address?: {
        address_line_1?: string;
        address_line_2?: string;
        admin_area_2?: string; // City
        admin_area_1?: string; // State
        postal_code?: string;
        country_code?: string;
      };
    };
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
    // Calculate subtotal from items
    const subtotal = data.items 
      ? data.items.reduce((sum, item) => sum + (item.unitAmount * item.quantity), 0)
      : data.amount;

    // Extract shipping and tax from metadata (passed from frontend)
    const shippingCost = data.metadata?.shipping ? parseFloat(data.metadata.shipping) : 0;
    const taxAmount = data.metadata?.tax ? parseFloat(data.metadata.tax) : 0;
    
    // Calculate total amount (subtotal + shipping + tax)
    const totalAmount = subtotal + shippingCost + taxAmount;

    logger.info('💰 PayPal Order Pricing:', {
      subtotal: formatPayPalAmount(subtotal),
      shipping: formatPayPalAmount(shippingCost),
      tax: formatPayPalAmount(taxAmount),
      total: formatPayPalAmount(totalAmount)
    });

    // Create PayPal Order Request
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    
    // Split customer name into first and last name
    const nameParts = (data.customerName || 'Customer').trim().split(' ');
    const firstName = nameParts[0] || 'Customer';
    const lastName = nameParts.slice(1).join(' ') || '';

    const requestBody: any = {
      intent: 'CAPTURE',
      payer: {
        // Override PayPal account info with form data
        name: {
          given_name: firstName,
          surname: lastName || 'Customer'
        },
        email_address: data.customerEmail,
        phone: data.customerPhone ? {
          phone_type: 'MOBILE',
          phone_number: {
            national_number: data.customerPhone.replace(/\D/g, '')
          }
        } : undefined
      },
      purchase_units: [{
        amount: {
          currency_code: data.currency?.toUpperCase() || 'USD',
          value: formatPayPalAmount(totalAmount),
          // Add breakdown so PayPal shows subtotal, shipping, and tax separately
          breakdown: {
            item_total: {
              currency_code: data.currency?.toUpperCase() || 'USD',
              value: formatPayPalAmount(subtotal)
            },
            shipping: {
              currency_code: data.currency?.toUpperCase() || 'USD',
              value: formatPayPalAmount(shippingCost)
            },
            tax_total: {
              currency_code: data.currency?.toUpperCase() || 'USD',
              value: formatPayPalAmount(taxAmount)
            }
          }
        },
        description: data.description || 'Mayhem Creations Order',
        custom_id: data.metadata?.userId || undefined,
      }],
      application_context: {
        brand_name: 'Mayhem Creations',
        landing_page: 'BILLING',
        user_action: 'PAY_NOW',
        shipping_preference: 'SET_PROVIDED_ADDRESS', // Use the address we provide, don't allow changes
        return_url: data.returnUrl || process.env.FRONTEND_URL + '/payment/success',
        cancel_url: data.cancelUrl || process.env.FRONTEND_URL + '/payment/cancel'
      }
    };

    // Add shipping address if provided (required when shipping_preference is SET_PROVIDED_ADDRESS)
    if (data.shippingAddress) {
      const shippingData: any = {
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
      
      // Add phone number if provided
      if (data.customerPhone) {
        shippingData.phone_number = {
          national_number: data.customerPhone.replace(/\D/g, '') // Remove non-numeric characters
        };
      }
      
      requestBody.purchase_units[0].shipping = shippingData;
    }

    request.requestBody(requestBody);

    // Log the complete request for debugging
    logger.info('📦 Creating PayPal Order with request:', {
      shippingPreference: requestBody.application_context.shipping_preference,
      payerName: `${requestBody.payer.name.given_name} ${requestBody.payer.name.surname}`,
      payerEmail: requestBody.payer.email_address,
      hasShipping: !!requestBody.purchase_units[0].shipping,
      shippingAddress: requestBody.purchase_units[0].shipping?.address,
      shippingName: requestBody.purchase_units[0].shipping?.name?.full_name,
      amount: {
        total: requestBody.purchase_units[0].amount.value,
        breakdown: requestBody.purchase_units[0].amount.breakdown
      }
    });

    // Execute PayPal API Request
    const response = await paypalClient().execute(request);
    const order = response.result;
    
    logger.info('PayPal Order created successfully', {
      orderId: order.id,
      amount: totalAmount,
      currency: data.currency || 'USD',
      status: order.status,
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
    // First, check if order is already captured by retrieving its status
    const orderDetails = await retrievePayPalOrder(data.orderId);
    
    // If order is already captured or completed, return the existing capture details
    if (orderDetails.status === 'COMPLETED') {
      logger.info('PayPal Order already captured, returning existing details', {
        orderId: data.orderId,
        status: orderDetails.status,
      });
      
      // Extract capture information from the completed order
      const existingCapture = orderDetails.purchase_units?.[0]?.payments?.captures?.[0];
      
      return {
        id: existingCapture?.id || orderDetails.id,
        status: orderDetails.status,
        amount: existingCapture?.amount || {
          currency_code: 'USD',
          value: '0.00'
        },
        payer: orderDetails.payer,
        purchase_units: orderDetails.purchase_units
      };
    }

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
    // Handle ORDER_ALREADY_CAPTURED error gracefully
    if (error.message && error.message.includes('ORDER_ALREADY_CAPTURED')) {
      logger.info('Order already captured, retrieving existing details', {
        orderId: data.orderId,
      });
      
      // Retrieve the order details to get the capture information
      try {
        const orderDetails = await retrievePayPalOrder(data.orderId);
        const existingCapture = orderDetails.purchase_units?.[0]?.payments?.captures?.[0];
        
        return {
          id: existingCapture?.id || orderDetails.id,
          status: orderDetails.status,
          amount: existingCapture?.amount || {
            currency_code: 'USD',
            value: '0.00'
          },
          payer: orderDetails.payer,
          purchase_units: orderDetails.purchase_units
        };
      } catch (retrieveError: any) {
        logger.error('Error retrieving already-captured order:', retrieveError);
        throw new Error(`Order already captured but failed to retrieve details: ${retrieveError.message}`);
      }
    }
    
    logger.error('Error capturing PayPal Order:', error);
    throw new Error(`Failed to capture PayPal order: ${error.message}`);
  }
};

export interface PayPalOrderDetailsResult {
  id: string;
  status: string;
  amount?: any;
  payer?: {
    email_address?: string;
    name?: {
      given_name?: string;
      surname?: string;
    };
  };
  purchase_units?: Array<{
    shipping?: {
      name?: {
        full_name?: string;
      };
      address?: {
        address_line_1?: string;
        address_line_2?: string;
        admin_area_2?: string; // City
        admin_area_1?: string; // State
        postal_code?: string;
        country_code?: string;
      };
    };
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
  createTime?: string;
  updateTime?: string;
}

/**
 * Retrieve a PayPal Order using real PayPal API
 */
export const retrievePayPalOrder = async (orderId: string): Promise<PayPalOrderDetailsResult> => {
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
      purchase_units: order.purchase_units, // Include full purchase_units for capture details
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

  // PayPal standard checkout supports up to $25,000 per transaction
  // For higher amounts, contact PayPal to increase limits or use PayPal Commerce Platform
  if (data.amount > 25000) {
    errors.push('Maximum amount is $25,000 per transaction. For higher amounts, please contact us directly.');
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