export interface MaterialCost {
  name: string
  cost: number
  width: number
  length: number
  wasteFactor: number
}

export interface InputParameters {
  patchWidth: number // in inches
  patchHeight: number // in inches
  stitchCount: number
}

export interface CostBreakdown {
  fabricCost: number
  patchAttachCost: number
  threadCost: number
  bobbinCost: number
  cutAwayStabilizerCost: number
  washAwayStabilizerCost: number
  totalCost: number
}

export class MaterialPricingService {
  private static materials: MaterialCost[] = [
    { name: 'Fabric', cost: 34, width: 30, length: 36, wasteFactor: 1.5 },
    { name: 'Patch Attach', cost: 100, width: 9, length: 360, wasteFactor: 1.5 },
    { name: 'Thread', cost: 4, width: 0, length: 5000, wasteFactor: 1.2 },
    { name: 'Bobbin', cost: 50, width: 0, length: 35000, wasteFactor: 1.2 },
    { name: 'Cut-Away Stabilizer', cost: 180, width: 18, length: 3600, wasteFactor: 1.5 },
    { name: 'Wash-Away Stabilizer', cost: 60, width: 15, length: 900, wasteFactor: 1.5 }
  ]

  /**
   * Calculate material costs based on patch dimensions and stitch count
   */
  static calculateMaterialCosts(input: InputParameters): CostBreakdown {
    const { patchWidth, patchHeight, stitchCount } = input

    // Fabric Cost = (Patch Width * Patch Height / (Material Width * Material Length)) * Material Cost * Waste Factor
    const fabricCost = this.roundToTwoDecimals(
      (patchWidth * patchHeight / (this.materials[0].width * this.materials[0].length)) * 
      this.materials[0].cost * 
      this.materials[0].wasteFactor
    )

    // Patch Attach Cost = (Patch Width * Patch Height / (Material Width * Material Length)) * Material Cost * Waste Factor
    const patchAttachCost = this.roundToTwoDecimals(
      (patchWidth * patchHeight / (this.materials[1].width * this.materials[1].length)) * 
      this.materials[1].cost * 
      this.materials[1].wasteFactor
    )

    // Thread Cost = (Stitch Count / 1,000,000) * Material Cost * Waste Factor
    const threadCost = this.roundToTwoDecimals(
      (stitchCount / 1000000) * 
      this.materials[2].cost * 
      this.materials[2].wasteFactor
    )

    // Bobbin Cost = (Stitch Count / Material Length) * (Material Cost / 144) * Waste Factor
    const bobbinCost = this.roundToTwoDecimals(
      (stitchCount / this.materials[3].length) * 
      (this.materials[3].cost / 144) * 
      this.materials[3].wasteFactor
    )

    // Cut-Away Stabilizer Cost = (Patch Width * Patch Height / (Material Width * Material Length)) * Material Cost * Waste Factor
    const cutAwayStabilizerCost = this.roundToTwoDecimals(
      (patchWidth * patchHeight / (this.materials[4].width * this.materials[4].length)) * 
      this.materials[4].cost * 
      this.materials[4].wasteFactor
    )

    // Wash-Away Stabilizer Cost = (Patch Width * Patch Height / (Material Width * Material Length)) * Material Cost * Waste Factor
    const washAwayStabilizerCost = this.roundToTwoDecimals(
      (patchWidth * patchHeight / (this.materials[5].width * this.materials[5].length)) * 
      this.materials[5].cost * 
      this.materials[5].wasteFactor
    )

    const totalCost = this.roundToTwoDecimals(
      fabricCost + 
      patchAttachCost + 
      threadCost + 
      bobbinCost + 
      cutAwayStabilizerCost + 
      washAwayStabilizerCost
    )

    return {
      fabricCost,
      patchAttachCost,
      threadCost,
      bobbinCost,
      cutAwayStabilizerCost,
      washAwayStabilizerCost,
      totalCost
    }
  }

  /**
   * Estimate stitch count based on patch dimensions
   * This is a rough estimation - in practice, this would be calculated by the embroidery software
   */
  static estimateStitchCount(width: number, height: number): number {
    // Rough estimation: 1000 stitches per square inch for basic designs
    // This can be adjusted based on design complexity
    const area = width * height
    return Math.round(area * 1000)
  }

  /**
   * Calculate total price including material costs and embroidery options
   */
  static calculateTotalPrice(
    patchWidth: number, 
    patchHeight: number, 
    embroideryOptions: Array<{ id: number; price: number; name: string }>
  ): {
    materialCosts: CostBreakdown
    optionsPrice: number
    totalPrice: number
  } {
    const stitchCount = this.estimateStitchCount(patchWidth, patchHeight)
    const materialCosts = this.calculateMaterialCosts({
      patchWidth,
      patchHeight,
      stitchCount
    })

    const optionsPrice = embroideryOptions.reduce((sum, option) => {
      const price = typeof option.price === 'string' ? parseFloat(option.price) || 0 : option.price
      return sum + price
    }, 0)

    const totalPrice = this.roundToTwoDecimals(materialCosts.totalCost + optionsPrice)

    return {
      materialCosts,
      optionsPrice,
      totalPrice
    }
  }

  /**
   * Format price for display
   */
  static formatPrice(price: number | string): string {
    const numericPrice = typeof price === 'string' ? parseFloat(price) || 0 : price
    return `$${numericPrice.toFixed(2)}`
  }

  /**
   * Round to two decimal places
   */
  private static roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100
  }
}
