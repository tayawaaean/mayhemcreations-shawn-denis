/**
 * Stripe Configuration
 * Handles Stripe payment processing setup
 */

import Stripe from 'stripe';

// Initialize Stripe with test mode
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-08-27.basil', // Use latest stable API version
  typescript: true,
});

// Stripe configuration
export const stripeConfig = {
  // Test mode settings
  testMode: process.env.NODE_ENV !== 'production',
  
  // Currency settings
  currency: 'usd',
  
  // Webhook settings
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  
  // Payment method types
  paymentMethodTypes: ['card'] as Stripe.Checkout.SessionCreateParams.PaymentMethodType[],
  
  // Success/Cancel URLs (will be set dynamically based on request)
  successUrl: process.env.STRIPE_SUCCESS_URL || 'http://localhost:3000/payment/success',
  cancelUrl: process.env.STRIPE_CANCEL_URL || 'http://localhost:3000/payment/cancel',
};

// Validate Stripe configuration
export const validateStripeConfig = (): boolean => {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY is required');
    return false;
  }
  
  if (stripeConfig.testMode && !process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
    console.warn('⚠️ Using production key in test mode');
  }
  
  return true;
};

export default stripe;
