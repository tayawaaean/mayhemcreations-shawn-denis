/**
 * PayPal Configuration
 * Handles PayPal payment processing setup
 */

import { Client, Environment } from '@paypal/paypal-server-sdk';

// PayPal configuration
export const paypalConfig = {
  // Environment settings
  environment: process.env.PAYPAL_ENVIRONMENT || 'sandbox',
  
  // API credentials
  clientId: process.env.PAYPAL_CLIENT_ID || '',
  clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
  
  // Currency settings
  currency: 'USD',
  
  // Webhook settings
  webhookId: process.env.PAYPAL_WEBHOOK_ID || '',
  
  // Success/Cancel URLs (will be set dynamically based on request)
  successUrl: process.env.PAYPAL_SUCCESS_URL || 'http://localhost:3000/payment/success',
  cancelUrl: process.env.PAYPAL_CANCEL_URL || 'http://localhost:3000/payment/cancel',
  
  // Branding settings
  brandName: process.env.PAYPAL_BRAND_NAME || 'Mayhem Creations',
  localeCode: 'en-US',
  
  // Payment experience settings
  landingPage: 'BILLING' as const,
  userAction: 'PAY_NOW' as const,
  paymentMethodPreference: 'IMMEDIATE_PAYMENT_REQUIRED' as const,
};

// Initialize PayPal API client
let paypalClient: Client | null = null;

export const getPayPalClient = (): Client => {
  if (!paypalClient) {
    if (!paypalConfig.clientId || !paypalConfig.clientSecret) {
      throw new Error('PayPal credentials not configured');
    }
    
    const environment = paypalConfig.environment === 'production' 
      ? Environment.Production 
      : Environment.Sandbox;
    
    paypalClient = new Client({
      environment: environment,
    });
  }
  
  return paypalClient;
};

// Validate PayPal configuration
export const validatePayPalConfig = (): boolean => {
  if (!process.env.PAYPAL_CLIENT_ID) {
    console.error('❌ PAYPAL_CLIENT_ID is required');
    return false;
  }
  
  if (!process.env.PAYPAL_CLIENT_SECRET) {
    console.error('❌ PAYPAL_CLIENT_SECRET is required');
    return false;
  }
  
  if (paypalConfig.environment === 'production' && process.env.PAYPAL_CLIENT_ID.startsWith('AQkquBDf1zctJ')) {
    console.warn('⚠️ Using sandbox credentials in production mode');
  }
  
  return true;
};

export default paypalConfig;
