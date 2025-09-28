/**
 * Stripe Configuration for Frontend
 * Handles Stripe.js initialization and configuration
 */

import { loadStripe, Stripe } from '@stripe/stripe-js';

// Get publishable key from environment
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
  console.error('❌ VITE_STRIPE_PUBLISHABLE_KEY is required');
}

// Initialize Stripe
let stripePromise: Promise<Stripe | null>;

if (stripePublishableKey) {
  stripePromise = loadStripe(stripePublishableKey);
} else {
  stripePromise = Promise.resolve(null);
}

// Stripe configuration
export const stripeConfig = {
  // Test mode settings
  testMode: import.meta.env.MODE !== 'production',
  
  // Currency settings
  currency: 'usd',
  
  // Appearance settings
  appearance: {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#2563eb',
      colorBackground: '#ffffff',
      colorText: '#30313d',
      colorDanger: '#df1b41',
      fontFamily: 'Ideal Sans, system-ui, sans-serif',
      spacingUnit: '2px',
      borderRadius: '4px',
    },
  },
  
  // Payment method types
  paymentMethodTypes: ['card'],
  
  // Billing address collection
  billingAddressCollection: 'required' as const,
  
  // Shipping address collection
  shippingAddressCollection: {
    allowedCountries: ['US', 'CA'], // Add more countries as needed
  },
};

export default stripePromise;
