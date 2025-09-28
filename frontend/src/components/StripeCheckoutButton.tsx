/**
 * Stripe Checkout Button Component
 * Redirects to Stripe Checkout for hosted payments
 */

import React, { useState } from 'react';
import { createCheckoutSession, CreateCheckoutSessionData } from '../shared/stripeService';

interface StripeCheckoutButtonProps {
  lineItems: Array<{
    name: string;
    description?: string;
    images?: string[];
    price: number; // Price in dollars
    quantity: number;
  }>;
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, string>;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const StripeCheckoutButton: React.FC<StripeCheckoutButtonProps> = ({
  lineItems,
  successUrl,
  cancelUrl,
  metadata,
  disabled = false,
  className = '',
  children
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Convert line items to Stripe format
      const stripeLineItems: CreateCheckoutSessionData['lineItems'] = lineItems.map(item => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
            description: item.description,
            images: item.images,
          },
          unit_amount: Math.round(item.price * 100), // Convert to cents
        },
        quantity: item.quantity,
      }));

      const checkoutData: CreateCheckoutSessionData = {
        lineItems: stripeLineItems,
        successUrl: successUrl || `${window.location.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: cancelUrl || `${window.location.origin}/payment/cancel`,
        metadata: metadata || {},
      };

      const { url } = await createCheckoutSession(checkoutData);
      
      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create checkout session';
      setError(errorMessage);
      console.error('Checkout error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleCheckout}
        disabled={disabled || isLoading}
        className={`w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors ${className}`}
      >
        {isLoading ? 'Creating checkout...' : (children || 'Checkout with Stripe')}
      </button>
      
      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
};

export default StripeCheckoutButton;
