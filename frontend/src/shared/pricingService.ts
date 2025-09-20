export interface PricingConfig {
  pricePerSqInch: number
  minimumPrice: number
  currency: string
  currencySymbol: string
}

export interface SizeInput {
  width: number
  height: number
  unit: 'inches' | 'cm'
}

export interface PricingBreakdown {
  basePrice: number
  optionsPrice: number
  totalPrice: number
  sizeInSqInches: number
  currency: string
  currencySymbol: string
}

export interface EmbroideryOption {
  id: number
  price: number
  name: string
}

class PricingService {
  private config: PricingConfig = {
    pricePerSqInch: 2.50,
    minimumPrice: 15.00,
    currency: 'USD',
    currencySymbol: '$'
  }

  /**
   * Update pricing configuration
   */
  updateConfig(newConfig: Partial<PricingConfig>) {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Convert size to square inches
   */
  private convertToSquareInches(size: SizeInput): number {
    const widthInches = size.unit === 'cm' ? size.width / 2.54 : size.width
    const heightInches = size.unit === 'cm' ? size.height / 2.54 : size.height
    return widthInches * heightInches
  }

  /**
   * Calculate base price based on size
   */
  calculateBasePrice(size: SizeInput): number {
    const sizeInSqInches = this.convertToSquareInches(size)
    const calculatedPrice = sizeInSqInches * this.config.pricePerSqInch
    return Math.max(calculatedPrice, this.config.minimumPrice)
  }

  /**
   * Calculate total price including options
   */
  calculateTotalPrice(
    size: SizeInput, 
    selectedOptions: EmbroideryOption[]
  ): PricingBreakdown {
    const sizeInSqInches = this.convertToSquareInches(size)
    const basePrice = this.calculateBasePrice(size)
    
    const optionsPrice = selectedOptions.reduce(
      (total, option) => {
        const price = typeof option.price === 'string' ? parseFloat(option.price) || 0 : option.price
        return total + price
      }, 
      0
    )

    const totalPrice = basePrice + optionsPrice

    return {
      basePrice,
      optionsPrice,
      totalPrice,
      sizeInSqInches,
      currency: this.config.currency,
      currencySymbol: this.config.currencySymbol
    }
  }

  /**
   * Format price with currency symbol
   */
  formatPrice(price: number | string): string {
    const numericPrice = typeof price === 'string' ? parseFloat(price) : price
    if (isNaN(numericPrice)) {
      return `${this.config.currencySymbol}0.00`
    }
    return `${this.config.currencySymbol}${numericPrice.toFixed(2)}`
  }

  /**
   * Get pricing tiers based on size
   */
  getPricingTiers() {
    return {
      small: { maxSize: 4, multiplier: 1.0, label: 'Small (up to 4 sq in)' },
      medium: { maxSize: 16, multiplier: 0.9, label: 'Medium (4-16 sq in)' },
      large: { maxSize: 36, multiplier: 0.8, label: 'Large (16-36 sq in)' },
      xlarge: { maxSize: Infinity, multiplier: 0.7, label: 'Extra Large (36+ sq in)' }
    }
  }

  /**
   * Calculate price with tier-based discounts
   */
  calculateTieredPrice(size: SizeInput, selectedOptions: EmbroideryOption[]): PricingBreakdown {
    const sizeInSqInches = this.convertToSquareInches(size)
    const tiers = this.getPricingTiers()
    
    // Find the appropriate tier
    let tier = tiers.small
    for (const [key, tierData] of Object.entries(tiers)) {
      if (sizeInSqInches <= tierData.maxSize) {
        tier = tierData
        break
      }
    }

    // Calculate base price with tier multiplier
    const basePrice = Math.max(
      sizeInSqInches * this.config.pricePerSqInch * tier.multiplier,
      this.config.minimumPrice
    )
    
    const optionsPrice = selectedOptions.reduce(
      (total, option) => {
        const price = typeof option.price === 'string' ? parseFloat(option.price) || 0 : option.price
        return total + price
      }, 
      0
    )

    const totalPrice = basePrice + optionsPrice

    return {
      basePrice,
      optionsPrice,
      totalPrice,
      sizeInSqInches,
      currency: this.config.currency,
      currencySymbol: this.config.currencySymbol
    }
  }

  /**
   * Get estimated pricing for different sizes
   */
  getEstimatedPricing() {
    const sizes = [
      { width: 2, height: 2, unit: 'inches' as const, label: '2" x 2"' },
      { width: 4, height: 4, unit: 'inches' as const, label: '4" x 4"' },
      { width: 6, height: 6, unit: 'inches' as const, label: '6" x 6"' },
      { width: 8, height: 8, unit: 'inches' as const, label: '8" x 8"' },
      { width: 10, height: 10, unit: 'inches' as const, label: '10" x 10"' }
    ]

    return sizes.map(size => ({
      ...size,
      price: this.calculateBasePrice(size)
    }))
  }
}

export const pricingService = new PricingService()
