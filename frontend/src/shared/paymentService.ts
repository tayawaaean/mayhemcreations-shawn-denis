/**
 * Unified Payment Service
 * Combines Stripe and PayPal payment processing
 */

import { stripeService, StripePaymentData, StripePaymentResult } from './stripeService'
import { paypalService, PayPalPaymentData, PayPalPaymentResult } from './paypalService'
import { paymentConfig } from './paymentConfig'

export type PaymentMethod = 'stripe' | 'paypal'

export interface PaymentData {
  amount: number
  currency: string
  customerEmail: string
  customerName: string
  description: string
  billingAddress: {
    line1: string
    line2?: string
    city: string
    state: string
    postal_code: string
    country: string
  }
  items?: Array<{
    name: string
    quantity: number
    price: number
    currency: string
  }>
  metadata?: Record<string, string>
}

export interface PaymentResult {
  success: boolean
  paymentId?: string
  orderId?: string
  error?: string
  method: PaymentMethod
  requiresAction?: boolean
  clientSecret?: string
  payerEmail?: string
  payerName?: string
}

export interface PaymentValidation {
  isValid: boolean
  errors: string[]
}

class PaymentService {
  constructor() {
    this.validateConfiguration()
  }

  private validateConfiguration(): void {
    const errors = paymentConfig.getValidationErrors()
    if (errors.length > 0) {
      console.warn('Payment configuration issues:', errors)
    }
  }

  public async processPayment(
    method: PaymentMethod,
    paymentData: PaymentData
  ): Promise<PaymentResult> {
    try {
      // Validate payment data
      const validation = this.validatePaymentData(paymentData)
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', '),
          method
        }
      }

      // Process payment based on method
      switch (method) {
        case 'stripe':
          return await this.processStripePayment(paymentData)
        case 'paypal':
          return await this.processPayPalPayment(paymentData)
        default:
          return {
            success: false,
            error: 'Unsupported payment method',
            method
          }
      }
    } catch (error) {
      console.error('Payment processing error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed',
        method
      }
    }
  }

  private async processStripePayment(paymentData: PaymentData): Promise<PaymentResult> {
    const stripeData: StripePaymentData = {
      amount: paymentData.amount,
      currency: paymentData.currency,
      customerEmail: paymentData.customerEmail,
      customerName: paymentData.customerName,
      billingAddress: paymentData.billingAddress,
      metadata: paymentData.metadata
    }

    const result = await stripeService.processPayment(stripeData)
    
    return {
      success: result.success,
      paymentId: result.paymentIntentId,
      error: result.error,
      method: 'stripe',
      requiresAction: result.requiresAction,
      clientSecret: result.clientSecret
    }
  }

  private async processPayPalPayment(paymentData: PaymentData): Promise<PaymentResult> {
    const paypalData: PayPalPaymentData = {
      amount: paymentData.amount,
      currency: paymentData.currency,
      description: paymentData.description,
      customerEmail: paymentData.customerEmail,
      customerName: paymentData.customerName,
      items: paymentData.items
    }

    const result = await paypalService.processPayment(paypalData)
    
    return {
      success: result.success,
      paymentId: result.paymentId,
      orderId: result.orderId,
      error: result.error,
      method: 'paypal',
      payerEmail: result.payerEmail,
      payerName: result.payerName
    }
  }

  public validatePaymentData(paymentData: PaymentData): PaymentValidation {
    const errors: string[] = []

    // Amount validation
    if (!paymentData.amount || paymentData.amount <= 0) {
      errors.push('Amount must be greater than 0')
    }

    if (paymentData.amount < 0.50) {
      errors.push('Minimum amount is $0.50')
    }

    // Currency validation
    if (!paymentData.currency || paymentData.currency.length !== 3) {
      errors.push('Valid currency code is required')
    }

    // Customer validation
    if (!paymentData.customerEmail || !this.isValidEmail(paymentData.customerEmail)) {
      errors.push('Valid customer email is required')
    }

    if (!paymentData.customerName || paymentData.customerName.trim().length === 0) {
      errors.push('Customer name is required')
    }

    // Description validation
    if (!paymentData.description || paymentData.description.trim().length === 0) {
      errors.push('Payment description is required')
    }

    // Billing address validation
    if (!paymentData.billingAddress.line1 || paymentData.billingAddress.line1.trim().length === 0) {
      errors.push('Billing address line 1 is required')
    }

    if (!paymentData.billingAddress.city || paymentData.billingAddress.city.trim().length === 0) {
      errors.push('Billing city is required')
    }

    if (!paymentData.billingAddress.state || paymentData.billingAddress.state.trim().length === 0) {
      errors.push('Billing state is required')
    }

    if (!paymentData.billingAddress.postal_code || paymentData.billingAddress.postal_code.trim().length === 0) {
      errors.push('Billing postal code is required')
    }

    if (!paymentData.billingAddress.country || paymentData.billingAddress.country.trim().length === 0) {
      errors.push('Billing country is required')
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

  public getStripeService() {
    return stripeService
  }

  public getPayPalService() {
    return paypalService
  }

  public isConfigured(): boolean {
    return paymentConfig.isConfigured()
  }

  public getConfigurationErrors(): string[] {
    return paymentConfig.getValidationErrors()
  }

  public async confirmStripePayment(clientSecret: string): Promise<PaymentResult> {
    const result = await stripeService.confirmPayment(clientSecret)
    
    return {
      success: result.success,
      paymentId: result.paymentIntentId,
      error: result.error,
      method: 'stripe',
      requiresAction: result.requiresAction,
      clientSecret: result.clientSecret
    }
  }

  public getPayPalButtonConfig(paymentData: PaymentData) {
    return paypalService.createButtonConfig({
      amount: paymentData.amount,
      currency: paymentData.currency,
      description: paymentData.description,
      customerEmail: paymentData.customerEmail,
      customerName: paymentData.customerName,
      items: paymentData.items
    })
  }
}

// Export singleton instance
export const paymentService = new PaymentService()
export default paymentService
