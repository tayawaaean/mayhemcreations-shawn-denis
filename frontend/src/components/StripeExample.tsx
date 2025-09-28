/**
 * Stripe Integration Example
 * Demonstrates how to use Stripe components
 */

import React, { useState } from 'react';
import StripePaymentForm from './StripePaymentForm';
import StripeCheckoutButton from './StripeCheckoutButton';

const StripeExample: React.FC = () => {
  const [paymentMethod, setPaymentMethod] = useState<'form' | 'checkout'>('form');
  const [amount, setAmount] = useState(25.99);

  const handlePaymentSuccess = (paymentIntent: any) => {
    console.log('Payment successful:', paymentIntent);
    alert(`Payment successful! Payment Intent ID: ${paymentIntent.id}`);
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    alert(`Payment failed: ${error}`);
  };

  const checkoutLineItems = [
    {
      name: 'Sample Product',
      description: 'A sample product for testing',
      price: amount,
      quantity: 1,
      images: ['https://via.placeholder.com/300x200'],
    },
  ];

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Stripe Payment Integration</h1>
        <p className="text-gray-600">Test Stripe payment processing</p>
      </div>

      {/* Payment Method Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Payment Method</h2>
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setPaymentMethod('form')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              paymentMethod === 'form'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Payment Form
          </button>
          <button
            onClick={() => setPaymentMethod('checkout')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              paymentMethod === 'checkout'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Checkout Session
          </button>
        </div>

        {/* Amount Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount (USD)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            step="0.01"
            min="0.50"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Payment Form */}
        {paymentMethod === 'form' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Card Payment</h3>
            <StripePaymentForm
              amount={amount}
              description="Test payment"
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          </div>
        )}

        {/* Checkout Button */}
        {paymentMethod === 'checkout' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Hosted Checkout</h3>
            <StripeCheckoutButton
              lineItems={checkoutLineItems}
              metadata={{ source: 'example' }}
            >
              Pay ${amount.toFixed(2)} with Stripe
            </StripeCheckoutButton>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Test Instructions</h3>
        <div className="text-blue-800 space-y-2">
          <p><strong>Test Card Numbers:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><code>4242 4242 4242 4242</code> - Visa (successful payment)</li>
            <li><code>5555 5555 5555 4444</code> - Mastercard (successful payment)</li>
            <li><code>3782 822463 10005</code> - American Express (successful payment)</li>
            <li><code>4000 0000 0000 0002</code> - Visa (declined payment)</li>
            <li><code>4000 0000 0000 9995</code> - Visa (insufficient funds)</li>
            <li><code>4000 0000 0000 9987</code> - Visa (lost card)</li>
            <li><code>4000 0000 0000 9979</code> - Visa (stolen card)</li>
            <li><code>4000 0000 0000 0069</code> - Visa (expired card)</li>
            <li><code>4000 0000 0000 0127</code> - Visa (incorrect CVC)</li>
          </ul>
          <p className="mt-3"><strong>Test Details:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Use any future expiry date (e.g., 12/25)</li>
            <li>Use any 3-digit CVC (e.g., 123)</li>
            <li>Use any billing address</li>
            <li>All test cards work in test mode only</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default StripeExample;
