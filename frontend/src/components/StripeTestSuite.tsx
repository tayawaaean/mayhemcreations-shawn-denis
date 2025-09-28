import React, { useState } from 'react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { createPaymentIntent } from '../shared/stripeService';
import { loadStripe } from '@stripe/stripe-js';

// Load Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!);

interface TestCard {
  number: string;
  name: string;
  description: string;
  category: 'success' | 'decline' | 'error' | 'fraud' | '3ds';
}

const testCards: TestCard[] = [
  // Success Cards
  { number: '4242424242424242', name: 'Visa', description: 'Successful payment', category: 'success' },
  { number: '5555555555554444', name: 'Mastercard', description: 'Successful payment', category: 'success' },
  { number: '378282246310005', name: 'American Express', description: 'Successful payment', category: 'success' },
  { number: '6011111111111117', name: 'Discover', description: 'Successful payment', category: 'success' },
  
  // Decline Cards
  { number: '4000000000000002', name: 'Visa', description: 'Generic decline', category: 'decline' },
  { number: '4000000000009995', name: 'Visa', description: 'Insufficient funds', category: 'decline' },
  { number: '4000000000009987', name: 'Visa', description: 'Lost card', category: 'decline' },
  { number: '4000000000009979', name: 'Visa', description: 'Stolen card', category: 'decline' },
  
  // Error Cards
  { number: '4000000000000069', name: 'Visa', description: 'Expired card', category: 'error' },
  { number: '4000000000000127', name: 'Visa', description: 'Incorrect CVC', category: 'error' },
  { number: '4000000000000119', name: 'Visa', description: 'Processing error', category: 'error' },
  { number: '4242424242424241', name: 'Visa', description: 'Incorrect number', category: 'error' },
  
  // Fraud Prevention Cards
  { number: '4100000000000019', name: 'Visa', description: 'Always blocked by Radar', category: 'fraud' },
  { number: '4000000000004954', name: 'Visa', description: 'Highest risk (might be blocked)', category: 'fraud' },
  { number: '4000000000009235', name: 'Visa', description: 'Elevated risk', category: 'fraud' },
  
  // 3D Secure Cards
  { number: '4000000000003220', name: 'Visa', description: '3D Secure required (OK)', category: '3ds' },
  { number: '4000008400001629', name: 'Visa', description: '3D Secure required (declined)', category: '3ds' },
  { number: '4000000000003055', name: 'Visa', description: '3D Secure supported (OK)', category: '3ds' },
];

const TestCardButton: React.FC<{ card: TestCard; onSelect: (card: TestCard) => void }> = ({ card, onSelect }) => {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'success': return 'bg-green-100 text-green-800 border-green-200';
      case 'decline': return 'bg-red-100 text-red-800 border-red-200';
      case 'error': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'fraud': return 'bg-purple-100 text-purple-800 border-purple-200';
      case '3ds': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <button
      onClick={() => onSelect(card)}
      className={`p-3 rounded-lg border-2 text-left hover:shadow-md transition-all ${getCategoryColor(card.category)}`}
    >
      <div className="font-mono text-sm font-bold">{card.number}</div>
      <div className="text-xs font-medium">{card.name}</div>
      <div className="text-xs opacity-75">{card.description}</div>
    </button>
  );
};

const PaymentForm: React.FC = () => {
  const stripe = useStripe();
  const elements = useElements();
  const [selectedCard, setSelectedCard] = useState<TestCard | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      // Create payment intent
      const paymentIntentData = await createPaymentIntent({
        amount: 2000, // $20.00 in cents
        currency: 'usd',
        description: `Test payment with ${selectedCard?.name || 'selected card'}`,
        metadata: {
          test_card: selectedCard?.number || 'unknown',
          test_category: selectedCard?.category || 'unknown',
        },
      });

      if (!paymentIntentData.success) {
        throw new Error(paymentIntentData.message || 'Failed to create payment intent');
      }

      // Confirm payment with Stripe
      const { error } = await stripe.confirmCardPayment(paymentIntentData.data.client_secret!, {
        payment_method: {
          card: elements.getElement(CardElement)!,
          billing_details: {
            name: 'Test Customer',
            email: 'test@example.com',
          },
        },
      });

      if (error) {
        setResult({
          type: 'error',
          message: `Payment failed: ${error.message}`,
        });
      } else {
        setResult({
          type: 'success',
          message: 'Payment succeeded!',
        });
      }
    } catch (error: any) {
      setResult({
        type: 'error',
        message: `Error: ${error.message}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Test Card Selection */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Select Test Card</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
          {testCards.map((card, index) => (
            <TestCardButton
              key={index}
              card={card}
              onSelect={setSelectedCard}
            />
          ))}
        </div>
        {selectedCard && (
          <div className="mt-3 p-3 bg-gray-100 rounded-lg">
            <p className="text-sm">
              <strong>Selected:</strong> {selectedCard.number} ({selectedCard.name}) - {selectedCard.description}
            </p>
          </div>
        )}
      </div>

      {/* Payment Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Card Details
          </label>
          <div className="p-3 border border-gray-300 rounded-md">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={!stripe || !elements || isLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Processing...' : 'Test Payment'}
        </button>
      </form>

      {/* Result */}
      {result && (
        <div className={`p-4 rounded-md ${
          result.type === 'success' 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          <p className="font-medium">{result.message}</p>
        </div>
      )}
    </div>
  );
};

const StripeTestSuite: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Stripe Test Suite</h1>
        <p className="text-gray-600">
          Test various payment scenarios using Stripe's test cards. This tool helps you verify your integration handles different payment outcomes correctly.
        </p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.726-1.36 3.491 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Test Mode Only
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>This test suite only works with Stripe test keys. Make sure you're using test mode and not live mode.</p>
            </div>
          </div>
        </div>
      </div>

      <Elements stripe={stripePromise}>
        <PaymentForm />
      </Elements>

      {/* Instructions */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">How to Use</h3>
        <div className="text-blue-800 space-y-2">
          <ol className="list-decimal list-inside space-y-2">
            <li>Select a test card from the grid above</li>
            <li>Enter the card details in the form (use any future expiry date and 3-digit CVC)</li>
            <li>Click "Test Payment" to process the payment</li>
            <li>Observe the result to verify your error handling works correctly</li>
          </ol>
          <div className="mt-4">
            <p><strong>Card Categories:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
              <li><span className="inline-block w-3 h-3 bg-green-100 border border-green-200 rounded mr-2"></span>Success - Payment should succeed</li>
              <li><span className="inline-block w-3 h-3 bg-red-100 border border-red-200 rounded mr-2"></span>Decline - Payment should be declined</li>
              <li><span className="inline-block w-3 h-3 bg-yellow-100 border border-yellow-200 rounded mr-2"></span>Error - Payment should fail with error</li>
              <li><span className="inline-block w-3 h-3 bg-purple-100 border border-purple-200 rounded mr-2"></span>Fraud - Payment should be blocked by Radar</li>
              <li><span className="inline-block w-3 h-3 bg-blue-100 border border-blue-200 rounded mr-2"></span>3DS - Payment should require 3D Secure</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StripeTestSuite;
