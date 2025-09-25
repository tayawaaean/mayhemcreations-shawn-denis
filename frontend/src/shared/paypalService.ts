/**
 * PayPal Payment Service
 * Handles PayPal payment processing and button integration
 */

import { paymentConfig } from './paymentConfig'

export interface PayPalPaymentData {
  amount: number
  currency: string
  description: string
  customerEmail: string
  customerName: string
  orderId?: string
  items?: Array<{
    name: string
    quantity: number
    price: number
    currency: string
  }>
}

export interface PayPalPaymentResult {
  success: boolean
  paymentId?: string
  orderId?: string
  error?: string
  payerEmail?: string
  payerName?: string
}

export interface PayPalButtonConfig {
  createOrder: (data: any, actions: any) => Promise<string>
  onApprove: (data: any, actions: any) => Promise<void>
  onError: (err: any) => void
  onCancel: (data: any) => void
  style?: {
    layout?: 'vertical' | 'horizontal'
    color?: 'gold' | 'blue' | 'silver' | 'white' | 'black'
    shape?: 'rect' | 'pill'
    label?: 'paypal' | 'checkout' | 'buynow' | 'pay' | 'installment'
    height?: number
  }
}

class PayPalService {
  private isInitialized = false
  private config: ReturnType<typeof paymentConfig.getPayPalConfig> | null = null

  constructor() {
    this.initialize()
  }

  private initialize(): void {
    try {
      this.config = paymentConfig.getPayPalConfig()
      this.isInitialized = true
    } catch (error) {
      console.error('Failed to initialize PayPal service:', error)
      this.isInitialized = false
    }
  }

  public getConfig() {
    if (!this.config) {
      throw new Error('PayPal configuration not loaded')
    }
    return this.config
  }

  public isReady(): boolean {
    return this.isInitialized && !!this.config
  }

  public createButtonConfig(paymentData: PayPalPaymentData): PayPalButtonConfig {
    return {
      createOrder: async (data: any, actions: any) => {
        try {
          // In a real implementation, you would call your backend to create the order
          const order = await this.createOrder(paymentData)
          return order.id
        } catch (error) {
          console.error('Error creating PayPal order:', error)
          throw error
        }
      },
      onApprove: async (data: any, actions: any) => {
        try {
          // Capture the payment
          const result = await this.capturePayment(data.orderID, paymentData)
          
          if (result.success) {
            // Payment successful - you can trigger your success callback here
            console.log('PayPal payment successful:', result)
          } else {
            console.error('PayPal payment failed:', result.error)
          }
        } catch (error) {
          console.error('Error capturing PayPal payment:', error)
        }
      },
      onError: (err: any) => {
        console.error('PayPal payment error:', err)
      },
      onCancel: (data: any) => {
        console.log('PayPal payment cancelled:', data)
      },
      style: {
        layout: 'vertical',
        color: 'blue',
        shape: 'rect',
        label: 'paypal',
        height: 50
      }
    }
  }

  private async createOrder(paymentData: PayPalPaymentData): Promise<{ id: string }> {
    // Simulate API call to backend to create PayPal order
    await new Promise(resolve => setTimeout(resolve, 1000))

    // In a real implementation, this would call your backend API
    // which would then call PayPal's Orders API to create an order
    
    const orderId = `paypal_order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    return {
      id: orderId
    }
  }

  private async capturePayment(orderId: string, paymentData: PayPalPaymentData): Promise<PayPalPaymentResult> {
    // Simulate API call to backend to capture the payment
    await new Promise(resolve => setTimeout(resolve, 1500))

    // In a real implementation, this would call your backend API
    // which would then call PayPal's Orders API to capture the payment

    // Simulate 90% success rate
    const success = Math.random() > 0.1

    if (success) {
      return {
        success: true,
        paymentId: `paypal_payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        orderId: orderId,
        payerEmail: paymentData.customerEmail,
        payerName: paymentData.customerName
      }
    } else {
      return {
        success: false,
        error: 'Payment was declined by PayPal'
      }
    }
  }

  public async processPayment(paymentData: PayPalPaymentData): Promise<PayPalPaymentResult> {
    if (!this.isReady()) {
      return {
        success: false,
        error: 'PayPal service not initialized'
      }
    }

    try {
      // Create order
      const order = await this.createOrder(paymentData)
      
      // Simulate payment approval and capture
      const result = await this.capturePayment(order.id, paymentData)
      
      return result
    } catch (error) {
      console.error('PayPal payment processing error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PayPal payment processing failed'
      }
    }
  }

  public getButtonStyle() {
    return {
      layout: 'vertical' as const,
      color: 'blue' as const,
      shape: 'rect' as const,
      label: 'paypal' as const,
      height: 50
    }
  }

  public getAdvancedButtonStyle() {
    return {
      layout: 'vertical' as const,
      color: 'gold' as const,
      shape: 'pill' as const,
      label: 'checkout' as const,
      height: 55
    }
  }

  public validatePaymentData(paymentData: PayPalPaymentData): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!paymentData.amount || paymentData.amount <= 0) {
      errors.push('Amount must be greater than 0')
    }

    if (!paymentData.currency || paymentData.currency.length !== 3) {
      errors.push('Valid currency code is required')
    }

    if (!paymentData.customerEmail || !this.isValidEmail(paymentData.customerEmail)) {
      errors.push('Valid customer email is required')
    }

    if (!paymentData.customerName || paymentData.customerName.trim().length === 0) {
      errors.push('Customer name is required')
    }

    if (!paymentData.description || paymentData.description.trim().length === 0) {
      errors.push('Payment description is required')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  public formatAmount(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount)
  }

  public getSupportedCurrencies(): string[] {
    return ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'NOK', 'DKK', 'SEK']
  }

  public isCurrencySupported(currency: string): boolean {
    return this.getSupportedCurrencies().includes(currency.toUpperCase())
  }
}

// Export singleton instance
export const paypalService = new PayPalService()
export default paypalService
