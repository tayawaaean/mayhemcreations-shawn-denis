/**
 * Payment Configuration Service
 * Manages API keys and configuration for payment providers
 */

export interface PaymentConfig {
  stripe: {
    publishableKey: string
    secretKey?: string // Only for server-side use
  }
  paypal: {
    clientId: string
    environment: 'sandbox' | 'production'
  }
}

class PaymentConfigService {
  private config: PaymentConfig | null = null

  constructor() {
    this.loadConfig()
  }

  private loadConfig(): void {
    // In production, these should come from environment variables
    // For now, we'll use placeholder values that should be replaced with actual keys
    this.config = {
      stripe: {
        publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_stripe_publishable_key_here',
        secretKey: import.meta.env.VITE_STRIPE_SECRET_KEY || 'sk_test_your_stripe_secret_key_here'
      },
      paypal: {
        clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || 'your_paypal_client_id_here',
        environment: (import.meta.env.VITE_PAYPAL_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox'
      }
    }
  }

  public getStripeConfig() {
    if (!this.config) {
      throw new Error('Payment configuration not loaded')
    }
    return this.config.stripe
  }

  public getPayPalConfig() {
    if (!this.config) {
      throw new Error('Payment configuration not loaded')
    }
    return this.config.paypal
  }

  public getConfig(): PaymentConfig {
    if (!this.config) {
      throw new Error('Payment configuration not loaded')
    }
    return this.config
  }

  public updateConfig(newConfig: Partial<PaymentConfig>): void {
    if (!this.config) {
      this.config = {
        stripe: { publishableKey: '' },
        paypal: { clientId: '', environment: 'sandbox' }
      }
    }
    this.config = { ...this.config, ...newConfig }
  }

  public isConfigured(): boolean {
    if (!this.config) return false
    
    return !!(
      this.config.stripe.publishableKey && 
      this.config.stripe.publishableKey !== 'pk_test_your_stripe_publishable_key_here' &&
      this.config.paypal.clientId && 
      this.config.paypal.clientId !== 'your_paypal_client_id_here'
    )
  }

  public getValidationErrors(): string[] {
    const errors: string[] = []
    
    if (!this.config) {
      errors.push('Payment configuration not loaded')
      return errors
    }

    if (!this.config.stripe.publishableKey || this.config.stripe.publishableKey === 'pk_test_your_stripe_publishable_key_here') {
      errors.push('Stripe publishable key is not configured')
    }

    if (!this.config.paypal.clientId || this.config.paypal.clientId === 'your_paypal_client_id_here') {
      errors.push('PayPal client ID is not configured')
    }

    return errors
  }
}

// Export singleton instance
export const paymentConfig = new PaymentConfigService()
export default paymentConfig
