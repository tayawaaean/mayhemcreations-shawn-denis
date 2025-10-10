import { apiAuthService } from './apiAuthService'

type LineItem = {
  price_data: {
    currency: string
    product_data: {
      name: string
      description?: string
      images?: string[]
    }
    unit_amount: number
  }
  quantity: number
}

type PayPalOrderItem = {
  name: string
  quantity: number
  unitAmount: number
  currency: string
}

type CustomerInfo = {
  name: string
  email: string
  phone?: string
}

type ShippingAddress = {
  line1: string
  line2?: string
  city: string
  state: string
  postal_code: string
  country: string
}

export const paymentsApiService = {
  async createCheckoutSession(params: {
    lineItems: LineItem[]
    successUrl?: string
    cancelUrl?: string
    customerInfo?: CustomerInfo
    shippingAddress?: ShippingAddress
    metadata?: Record<string, string>
  }) {
    return apiAuthService.post<{ id: string; url: string }>(
      '/payments/create-checkout-session',
      params,
      true
    )
  },
  
  async createPayPalOrder(params: {
    amount: number
    currency: string
    description?: string
    items?: PayPalOrderItem[]
    customerInfo?: CustomerInfo
    shippingAddress?: ShippingAddress
    metadata?: Record<string, string>
    returnUrl?: string
    cancelUrl?: string
  }) {
    return apiAuthService.post<{ id: string; approvalUrl: string }>(
      '/payments/paypal/create-order',
      params,
      true
    )
  },
  
  async capturePayPalOrder(params: {
    orderId: string
    metadata?: Record<string, string>
  }) {
    return apiAuthService.post<{ id: string; status: string; payer: any }>(
      '/payments/paypal/capture-order',
      params,
      true
    )
  },
}

export type { LineItem, PayPalOrderItem }



