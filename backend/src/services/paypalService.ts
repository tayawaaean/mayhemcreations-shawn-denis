/**
 * PayPal Service - Real PayPal API Integration
 * Handles PayPal payment operations using PayPal REST API directly
 * Migrated from deprecated @paypal/checkout-server-sdk to REST API calls
 */

import axios from 'axios';
import { logger } from '../utils/logger';

// PayPal API Configuration
function getPayPalBaseUrl(): string {
  return process.env.PAYPAL_ENVIRONMENT === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

/**
 * Get PayPal OAuth access token
 * Used for authenticating REST API calls
 */
async function getPayPalAccessToken(): Promise<string> {
  // Trim whitespace from credentials to prevent auth issues
  const clientId = (process.env.PAYPAL_CLIENT_ID || '').trim();
  const clientSecret = (process.env.PAYPAL_CLIENT_SECRET || '').trim();
  const environment = process.env.PAYPAL_ENVIRONMENT || 'sandbox';
  const baseUrl = getPayPalBaseUrl();

  // Validate credentials are provided
  if (!clientId || !clientSecret) {
    const missingCreds = [];
    if (!clientId) missingCreds.push('PAYPAL_CLIENT_ID');
    if (!clientSecret) missingCreds.push('PAYPAL_CLIENT_SECRET');
    
    logger.error('PayPal credentials not configured', {
      missing: missingCreds,
      environment: environment,
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
    });
    throw new Error(`PayPal credentials not configured: Missing ${missingCreds.join(', ')}`);
  }

  // Log environment for debugging (without exposing credentials)
  logger.info('Requesting PayPal access token', {
    environment: environment,
    baseUrl: baseUrl,
    clientIdLength: clientId.length,
    clientSecretLength: clientSecret.length,
  });
  
  try {
    const response = await axios.post(
      `${baseUrl}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        auth: {
          username: clientId,
          password: clientSecret,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
      }
    );

    // Validate response contains access token
    if (!response.data?.access_token) {
      logger.error('PayPal access token response missing access_token field', {
        responseKeys: Object.keys(response.data || {}),
        status: response.status,
      });
      throw new Error('Invalid PayPal access token response: missing access_token');
    }

    logger.info('PayPal access token retrieved successfully', {
      environment: environment,
      tokenLength: response.data.access_token?.length || 0,
    });

    return response.data.access_token;
  } catch (error: any) {
    // Enhanced error logging for 401 authentication errors
    const errorStatus = error.response?.status;
    const errorData = error.response?.data;
    
    if (errorStatus === 401) {
      logger.error('PayPal authentication failed (401 Unauthorized)', {
        environment: environment,
        baseUrl: baseUrl,
        clientIdPrefix: clientId.substring(0, 8) + '...',
        clientIdLength: clientId.length,
        clientSecretLength: clientSecret.length,
        errorMessage: errorData?.error_description || error.message,
        errorDetails: errorData,
      });
      
      // Provide helpful error message based on common causes
      let helpfulMessage = 'PayPal authentication failed. ';
      
      if (environment === 'sandbox' && clientId.startsWith('AQkquBDf1zctJ')) {
        helpfulMessage += 'Detected production credentials used with sandbox environment. ';
      } else if (environment === 'production' && !clientId.startsWith('AQkquBDf1zctJ')) {
        helpfulMessage += 'Detected sandbox credentials used with production environment. ';
      }
      
      helpfulMessage += 'Please verify: 1) PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are correct, 2) PAYPAL_ENVIRONMENT matches your credentials (sandbox/production), 3) Credentials are active and not revoked in PayPal dashboard.';
      
      throw new Error(helpfulMessage);
    }
    
    // Log other errors with details
    logger.error('Error getting PayPal access token', {
      status: errorStatus,
      statusText: error.response?.statusText,
      errorMessage: error.message,
      errorData: errorData,
      environment: environment,
      baseUrl: baseUrl,
    });
    
    throw new Error(`Failed to get PayPal access token: ${error.message || 'Unknown error'}`);
  }
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
        description: data.description || 'Mayhem Creation Order',
        custom_id: data.metadata?.userId || undefined,
      }],
      application_context: {
        brand_name: 'Mayhem Creation',
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

    // Execute PayPal API Request using REST API
    const accessToken = await getPayPalAccessToken();
    const baseUrl = getPayPalBaseUrl();
    
    const response = await axios.post(
      `${baseUrl}/v2/checkout/orders`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'Prefer': 'return=representation',
        },
      }
    );
    
    const order = response.data;
    
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

    // Execute PayPal Capture Request using REST API
    const accessToken = await getPayPalAccessToken();
    const baseUrl = getPayPalBaseUrl();
    
    const response = await axios.post(
      `${baseUrl}/v2/checkout/orders/${data.orderId}/capture`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'Prefer': 'return=representation',
        },
      }
    );
    
    const capture = response.data;
    
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
    // Execute PayPal Get Order Request using REST API
    const accessToken = await getPayPalAccessToken();
    const baseUrl = getPayPalBaseUrl();
    
    const response = await axios.get(
      `${baseUrl}/v2/checkout/orders/${orderId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );
    
    const order = response.data;
    
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
 * Uses PayPal's Verify Webhook Signature API to validate webhook authenticity
 * Reference: https://developer.paypal.com/docs/api/webhooks/v1/#verify-webhook-signature
 */
export const verifyPayPalWebhookSignature = async (
  headers: any, 
  body: string | object, 
  webhookId?: string
): Promise<boolean> => {
  try {
    // Support environment-specific webhook IDs
    // If PAYPAL_ENVIRONMENT=production, use PAYPAL_WEBHOOK_ID_LIVE (if set), otherwise use PAYPAL_WEBHOOK_ID
    // If PAYPAL_ENVIRONMENT=sandbox, use PAYPAL_WEBHOOK_ID_SANDBOX (if set), otherwise use PAYPAL_WEBHOOK_ID
    const environment = process.env.PAYPAL_ENVIRONMENT || 'sandbox';
    let webhookIdToUse = webhookId;
    
    if (!webhookIdToUse) {
      if (environment === 'production' && process.env.PAYPAL_WEBHOOK_ID_LIVE) {
        webhookIdToUse = process.env.PAYPAL_WEBHOOK_ID_LIVE;
      } else if (environment === 'sandbox' && process.env.PAYPAL_WEBHOOK_ID_SANDBOX) {
        webhookIdToUse = process.env.PAYPAL_WEBHOOK_ID_SANDBOX;
      } else {
        webhookIdToUse = process.env.PAYPAL_WEBHOOK_ID;
      }
    }
    
    if (!webhookIdToUse) {
      logger.error('PayPal webhook ID not configured', {
        environment,
        hasLive: !!process.env.PAYPAL_WEBHOOK_ID_LIVE,
        hasSandbox: !!process.env.PAYPAL_WEBHOOK_ID_SANDBOX,
        hasDefault: !!process.env.PAYPAL_WEBHOOK_ID,
      });
      throw new Error(`PAYPAL_WEBHOOK_ID${environment === 'production' ? '_LIVE' : '_SANDBOX'} or PAYPAL_WEBHOOK_ID is required for webhook verification`);
    }

    // Extract required headers from PayPal webhook
    const authAlgo = headers['paypal-auth-algo'] as string;
    const certUrl = headers['paypal-cert-url'] as string;
    const transmissionId = headers['paypal-transmission-id'] as string;
    const transmissionSig = headers['paypal-transmission-sig'] as string;
    const transmissionTime = headers['paypal-transmission-time'] as string;

    // Validate all required headers are present
    if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) {
      logger.error('Missing required PayPal webhook headers', {
        hasAuthAlgo: !!authAlgo,
        hasCertUrl: !!certUrl,
        hasTransmissionId: !!transmissionId,
        hasTransmissionSig: !!transmissionSig,
        hasTransmissionTime: !!transmissionTime,
      });
      throw new Error('Missing required PayPal webhook headers');
    }

    // Convert body to JSON string if it's an object
    const bodyString = typeof body === 'string' ? body : JSON.stringify(body);

    // Prepare webhook event from body
    const webhookEvent = typeof body === 'object' ? body : JSON.parse(bodyString);

    // Use PayPal REST API directly to verify webhook signature
    // Reference: https://developer.paypal.com/docs/api/webhooks/v1/#verify-webhook-signature
    
    // Get the PayPal base URL based on environment
    const baseUrl = getPayPalBaseUrl();
    
    // Prepare verification request body
    const verificationPayload = {
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      webhook_id: webhookIdToUse,
      webhook_event: webhookEvent,
    };

    // Get OAuth token for the API call
    const accessToken = await getPayPalAccessToken();

    // Call PayPal's Verify Webhook Signature endpoint
    const verifyResponse = await axios.post(
      `${baseUrl}/v1/notifications/verify-webhook-signature`,
      verificationPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    const verificationStatus = verifyResponse.data.verification_status;

    // Check verification status
    if (verificationStatus === 'SUCCESS') {
      logger.info('PayPal webhook signature verified successfully', {
        webhookId: webhookIdToUse,
        transmissionId: transmissionId,
      });
      return true;
    } else {
      logger.error('PayPal webhook signature verification failed', {
        webhookId: webhookIdToUse,
        verificationStatus: verificationStatus,
        transmissionId: transmissionId,
      });
      return false;
    }
  } catch (error: any) {
    logger.error('Error verifying PayPal webhook signature:', error);
    
    // In development, allow unverified webhooks for testing
    // In production, reject unverified webhooks
    if (process.env.NODE_ENV === 'development' && !process.env.PAYPAL_WEBHOOK_ID) {
      logger.warn('⚠️ PayPal webhook verification skipped in development (PAYPAL_WEBHOOK_ID not set)');
      return true; // Allow in development for testing
    }
    
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