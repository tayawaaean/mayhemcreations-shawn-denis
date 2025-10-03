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

export const paymentsApiService = {
  async createCheckoutSession(params: {
    lineItems: LineItem[]
    successUrl?: string
    cancelUrl?: string
    metadata?: Record<string, string>
  }) {
    return apiAuthService.post<{ id: string; url: string }>(
      '/payments/create-checkout-session',
      params,
      true
    )
  },
}

export type { LineItem }


