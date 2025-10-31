/**
 * Payment API Service
 * Handles API calls for both Stripe and PayPal payments
 */

export interface PaymentApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface StripePaymentIntentData {
  amount: number;
  currency?: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface StripeCheckoutSessionData {
  lineItems: Array<{
    price_data: {
      currency: string;
      product_data: {
        name: string;
        description?: string;
        images?: string[];
      };
      unit_amount: number;
    };
    quantity: number;
  }>;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export interface PayPalOrderData {
  amount: number;
  currency?: string;
  description?: string;
  items?: Array<{
    name: string;
    quantity: number;
    unitAmount: number;
    currency: string;
  }>;
  metadata?: Record<string, string>;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface PayPalCaptureData {
  orderId: string;
  metadata?: Record<string, string>;
  orderData?: {
    items: Array<{
      name: string;
      quantity: number;
      unitAmount: number;
      currency: string;
    }>;
    subtotal: number;
    shipping: number;
    tax: number;
    total: number;
  };
}

import { apiClient } from './axiosConfig';

class PaymentApiService {
  private baseUrl: string;

  constructor() {
    const envUrl = (import.meta as any).env.VITE_API_BASE_URL || (import.meta as any).env.VITE_REACT_APP_API_URL;
    if (envUrl) {
      this.baseUrl = envUrl;
    } else if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      // Production: use relative URL (nginx will proxy)
      this.baseUrl = '/api/v1';
    } else {
      // Development fallback
      this.baseUrl = 'http://localhost:5001/api/v1';
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<PaymentApiResponse<T>> {
    try {
      const method = (options.method || 'GET').toUpperCase();
      const url = `${this.baseUrl}${endpoint}`;
      const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) } as any;
      const data = options.body ? JSON.parse(options.body as string) : undefined;

      const response = await apiClient.request({ url, method, headers, data, withCredentials: true });

      return {
        success: true,
        data: response.data?.data,
        message: response.data?.message,
        timestamp: response.data?.timestamp || new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.response?.data?.message || error?.message || 'Network error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Stripe API methods
  async createPaymentIntent(data: StripePaymentIntentData): Promise<PaymentApiResponse> {
    return this.makeRequest('/payments/create-intent', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createCheckoutSession(data: StripeCheckoutSessionData): Promise<PaymentApiResponse> {
    return this.makeRequest('/payments/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPaymentIntentStatus(paymentIntentId: string): Promise<PaymentApiResponse> {
    return this.makeRequest(`/payments/intent/${paymentIntentId}`);
  }

  async getCheckoutSessionStatus(sessionId: string): Promise<PaymentApiResponse> {
    return this.makeRequest(`/payments/session/${sessionId}`);
  }

  async createOrRetrieveCustomer(email: string, name?: string): Promise<PaymentApiResponse> {
    return this.makeRequest('/payments/customer', {
      method: 'POST',
      body: JSON.stringify({ email, name }),
    });
  }

  // PayPal API methods
  async createPayPalOrder(data: PayPalOrderData): Promise<PaymentApiResponse> {
    return this.makeRequest('/payments/paypal/create-order', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async capturePayPalOrder(data: PayPalCaptureData): Promise<PaymentApiResponse> {
    return this.makeRequest('/payments/paypal/capture-order', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPayPalOrderStatus(orderId: string): Promise<PaymentApiResponse> {
    return this.makeRequest(`/payments/paypal/order/${orderId}`);
  }

  // Utility methods
  formatAmount(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  }

  convertToCents(amount: number): number {
    return Math.round(amount * 100);
  }

  convertFromCents(amount: number): number {
    return amount / 100;
  }

  validateAmount(amount: number): { isValid: boolean; error?: string } {
    if (!amount || amount <= 0) {
      return { isValid: false, error: 'Amount must be greater than 0' };
    }
    if (amount < 0.01) {
      return { isValid: false, error: 'Minimum amount is $0.01' };
    }
    if (amount > 10000) {
      return { isValid: false, error: 'Maximum amount is $10,000' };
    }
    return { isValid: true };
  }

  validateEmail(email: string): { isValid: boolean; error?: string } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return { isValid: false, error: 'Valid email address is required' };
    }
    return { isValid: true };
  }

  // Error handling
  getErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }
    if (error?.message) {
      return error.message;
    }
    if (error?.error) {
      return error.error;
    }
    return 'An unexpected error occurred';
  }

  // Payment method detection
  isStripePayment(method: string): boolean {
    return method.toLowerCase() === 'stripe';
  }

  isPayPalPayment(method: string): boolean {
    return method.toLowerCase() === 'paypal';
  }

  // Configuration helpers
  getSupportedCurrencies(): string[] {
    return ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'NOK', 'DKK', 'SEK'];
  }

  isCurrencySupported(currency: string): boolean {
    return this.getSupportedCurrencies().includes(currency.toUpperCase());
  }
}

// Export singleton instance
export const paymentApiService = new PaymentApiService();
export default paymentApiService;
