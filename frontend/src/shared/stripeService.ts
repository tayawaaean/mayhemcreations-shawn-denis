/**
 * Stripe Payment Service
 * Handles Stripe payment processing and card validation
 */

import { loadStripe, Stripe, StripeElements, StripeCardElement } from '@stripe/stripe-js'
import { paymentConfig } from './paymentConfig'
import { envConfig } from './envConfig'

export interface StripePaymentData {
  amount: number
  currency: string
  customerEmail: string
  customerName: string
  billingAddress: {
    line1: string
    line2?: string
    city: string
    state: string
    postal_code: string
    country: string
  }
  metadata?: Record<string, string>
}

export interface StripePaymentResult {
  success: boolean
  paymentIntentId?: string
  error?: string
  requiresAction?: boolean
  clientSecret?: string
}

class StripeService {
  private stripe: Stripe | null = null
  private elements: StripeElements | null = null
  private cardElement: StripeCardElement | null = null

  constructor() {
    this.initializeStripe()
  }

  private async initializeStripe(): Promise<void> {
    try {
      const config = paymentConfig.getStripeConfig()
      this.stripe = await loadStripe(config.publishableKey)
      
      if (!this.stripe) {
        throw new Error('Failed to load Stripe')
      }
    } catch (error) {
      console.error('Failed to initialize Stripe:', error)
      throw error
    }
  }

  public async createPaymentElement(containerId: string): Promise<StripeCardElement | null> {
    if (!this.stripe) {
      await this.initializeStripe()
    }

    if (!this.stripe) {
      throw new Error('Stripe not initialized')
    }

    try {
      // Create elements instance
      this.elements = this.stripe.elements({
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#3b82f6',
            colorBackground: '#ffffff',
            colorText: '#1f2937',
            colorDanger: '#ef4444',
            fontFamily: 'Inter, system-ui, sans-serif',
            spacingUnit: '4px',
            borderRadius: '8px',
          },
        },
      })

      // Create card element
      this.cardElement = this.elements.create('card', {
        style: {
          base: {
            fontSize: '16px',
            color: '#1f2937',
            '::placeholder': {
              color: '#9ca3af',
            },
          },
          invalid: {
            color: '#ef4444',
          },
        },
      })

      // Mount the card element
      const cardContainer = document.getElementById(containerId)
      if (cardContainer) {
        this.cardElement.mount(cardContainer)
      }

      return this.cardElement
    } catch (error) {
      console.error('Failed to create payment element:', error)
      throw error
    }
  }

  public async processPayment(paymentData: StripePaymentData): Promise<StripePaymentResult> {
    if (!this.stripe) {
      return {
        success: false,
        error: 'Stripe not initialized'
      }
    }

    try {
      // For now, simulate a successful payment without requiring card elements
      // In a real implementation, you would integrate with your backend to create
      // a PaymentIntent and handle the payment processing
      
      console.log('Processing Stripe payment:', {
        amount: paymentData.amount,
        currency: paymentData.currency,
        customerEmail: paymentData.customerEmail,
        customerName: paymentData.customerName
      })

      // Simulate API call to backend
      const response = await this.simulateBackendPayment({
        amount: paymentData.amount,
        currency: paymentData.currency,
        customerEmail: paymentData.customerEmail,
        customerName: paymentData.customerName,
        metadata: paymentData.metadata
      })

      if (response.success) {
        return {
          success: true,
          paymentIntentId: response.paymentIntentId
        }
      } else {
        return {
          success: false,
          error: response.error || 'Payment failed'
        }
      }
    } catch (error) {
      console.error('Payment processing error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed'
      }
    }
  }

  private async simulateBackendPayment(data: {
    amount: number
    currency: string
    customerEmail: string
    customerName: string
    metadata?: Record<string, string>
  }): Promise<{ success: boolean; paymentIntentId?: string; error?: string }> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Simulate 90% success rate
    const success = Math.random() > 0.1

    if (success) {
      return {
        success: true,
        paymentIntentId: `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
    } else {
      return {
        success: false,
        error: 'Payment was declined by the bank'
      }
    }
  }

  public async confirmPayment(clientSecret: string): Promise<StripePaymentResult> {
    if (!this.stripe) {
      return {
        success: false,
        error: 'Stripe not initialized'
      }
    }

    try {
      const { error, paymentIntent } = await this.stripe.confirmCardPayment(clientSecret)

      if (error) {
        return {
          success: false,
          error: error.message || 'Payment confirmation failed'
        }
      }

      if (paymentIntent?.status === 'succeeded') {
        return {
          success: true,
          paymentIntentId: paymentIntent.id
        }
      } else {
        return {
          success: false,
          error: 'Payment not completed'
        }
      }
    } catch (error) {
      console.error('Payment confirmation error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment confirmation failed'
      }
    }
  }

  public validateCardInput(): { isValid: boolean; error?: string } {
    if (!this.cardElement) {
      return {
        isValid: false,
        error: 'Card element not initialized'
      }
    }

    const { error } = this.cardElement
    return {
      isValid: !error,
      error: error?.message
    }
  }

  public clearCardElement(): void {
    if (this.cardElement) {
      this.cardElement.clear()
    }
  }

  public destroyCardElement(): void {
    if (this.cardElement) {
      this.cardElement.destroy()
      this.cardElement = null
    }
    if (this.elements) {
      this.elements = null
    }
  }

  public getStripeInstance(): Stripe | null {
    return this.stripe
  }

  public isInitialized(): boolean {
    return !!this.stripe
  }
}

// Export singleton instance
export const stripeService = new StripeService()
export default stripeService

// =============================================================================
// API INTEGRATION FUNCTIONS
// =============================================================================

export interface CreatePaymentIntentData {
  amount: number; // Amount in dollars
  currency?: string;
  description?: string;
  metadata?: Record<string, string>;
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
  successUrl?: string;
  cancelUrl?: string;
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
 * Create a Payment Intent
 */
export const createPaymentIntent = async (data: CreatePaymentIntentData): Promise<PaymentIntentResult> => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${envConfig.getApiBaseUrl()}/payments/create-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create payment intent');
    }

    const result = await response.json();
    return result.data;
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
};

/**
 * Create a Checkout Session
 */
export const createCheckoutSession = async (data: CreateCheckoutSessionData): Promise<CheckoutSessionResult> => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${envConfig.getApiBaseUrl()}/payments/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create checkout session');
    }

    const result = await response.json();
    return result.data;
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

/**
 * Get Payment Intent Status
 */
export const getPaymentIntentStatus = async (paymentIntentId: string): Promise<PaymentIntentResult> => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${envConfig.getApiBaseUrl()}/payments/intent/${paymentIntentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to get payment intent status');
    }

    const result = await response.json();
    return result.data;
  } catch (error: any) {
    console.error('Error getting payment intent status:', error);
    throw error;
  }
};

/**
 * Get Checkout Session Status
 */
export const getCheckoutSessionStatus = async (sessionId: string): Promise<CheckoutSessionResult> => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${envConfig.getApiBaseUrl()}/payments/session/${sessionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to get checkout session status');
    }

    const result = await response.json();
    return result.data;
  } catch (error: any) {
    console.error('Error getting checkout session status:', error);
    throw error;
  }
};

/**
 * Create or Retrieve Customer
 */
export const createOrRetrieveCustomer = async (email: string, name?: string) => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${envConfig.getApiBaseUrl()}/payments/customer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ email, name }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create customer');
    }

    const result = await response.json();
    return result.data;
  } catch (error: any) {
    console.error('Error creating customer:', error);
    throw error;
  }
};
