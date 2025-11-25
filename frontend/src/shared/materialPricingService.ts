import { MaterialCost, materialCostApiService } from './materialCostApiService'

export interface InputParameters {
  patchWidth: number // in inches
  patchHeight: number // in inches
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
  // Start with empty array - materials must be loaded from API via setMaterials()
  private static materials: MaterialCost[] = []

  /**
   * Set materials from API data
   */
  static setMaterials(materials: MaterialCost[]): void {
    // Convert string values to numbers and filter for active materials only
    this.materials = materials
      .filter(material => material.isActive)
      .map(material => ({
        ...material,
        cost: typeof material.cost === 'string' ? parseFloat(material.cost) || 0 : material.cost,
        width: typeof material.width === 'string' ? parseFloat(material.width) || 0 : material.width,
        length: typeof material.length === 'string' ? parseFloat(material.length) || 0 : material.length,
        wasteFactor: typeof material.wasteFactor === 'string' ? parseFloat(material.wasteFactor) || 1.0 : material.wasteFactor
      }))
  }

  /**
   * Get current materials
   */
  static getMaterials(): MaterialCost[] {
    return this.materials
  }

  /**
   * Load materials from API
   */
  static async loadMaterialsFromAPI(): Promise<void> {
    try {
      const response = await materialCostApiService.getActiveMaterialCosts()
      if (response.success && response.data && response.data.length > 0) {
        // Convert string values to numbers to prevent calculation errors
        const materials = response.data.map(material => ({
          ...material,
          cost: typeof material.cost === 'string' ? parseFloat(material.cost) : material.cost,
          width: typeof material.width === 'string' ? parseFloat(material.width) : material.width,
          length: typeof material.length === 'string' ? parseFloat(material.length) : material.length,
          wasteFactor: typeof material.wasteFactor === 'string' ? parseFloat(material.wasteFactor) : material.wasteFactor
        }))
        this.setMaterials(materials)
      }
    } catch (error) {
      // Error loading materials from API, keep using existing materials
    }
  }

  /**
   * Calculate material costs based on patch dimensions
   */
  static calculateMaterialCosts(input: InputParameters): CostBreakdown {
    const { patchWidth, patchHeight } = input
    const patchArea = patchWidth * patchHeight
    
    // If no materials are loaded, return zeros (materials must be loaded from API first)
    if (this.materials.length === 0) {
      return {
        fabricCost: 0,
        patchAttachCost: 0,
        threadCost: 0,
        bobbinCost: 0,
        cutAwayStabilizerCost: 0,
        washAwayStabilizerCost: 0,
        totalCost: 0
      }
    }
    
    // Helper function to find material by name (case-insensitive, prioritizing exact matches)
    const findMaterialByName = (name: string): MaterialCost | null => {
      const normalizedName = name.toLowerCase().trim()
      
      // First try exact match
      let material = this.materials.find(m => 
        m.name.toLowerCase().trim() === normalizedName
      )
      
      // If no exact match, try partial match (material name contains search term)
      if (!material) {
        material = this.materials.find(m => 
          m.name.toLowerCase().trim().includes(normalizedName) ||
          normalizedName.includes(m.name.toLowerCase().trim())
        ) || null
      }
      
      return material || null
    }

    // Helper function to calculate area-based cost for materials with width > 0
    const calculateAreaBasedCost = (material: MaterialCost) => {
      const width = typeof material.width === 'string' ? parseFloat(material.width) : material.width
      const length = typeof material.length === 'string' ? parseFloat(material.length) : material.length
      const cost = typeof material.cost === 'string' ? parseFloat(material.cost) : material.cost
      const wasteFactor = typeof material.wasteFactor === 'string' ? parseFloat(material.wasteFactor) : material.wasteFactor
      
      if (width > 0 && length > 0) {
        // Calculate cost per square inch from the material sheet, then multiply by patch area
        const costPerSqIn = cost / (width * length)
        const result = patchArea * costPerSqIn * wasteFactor
        return result
      }
      return 0
    }

    // Helper function to calculate length-based cost for materials with width = 0
    const calculateLengthBasedCost = (material: MaterialCost) => {
      // Thread, bobbin, and cut-away stabilizer are not calculated based on stitch count
      // They are set to zero as per requirements
      return 0
    }

    // Find materials by name (flexible matching with common variations)
    // Try multiple name variations to handle different naming conventions
    const fabric = findMaterialByName('Fabric') || findMaterialByName('fabric')
    const patchAttach = findMaterialByName('Patch Attach') || findMaterialByName('Patch Attach') || findMaterialByName('patch attach')
    const thread = findMaterialByName('Thread') || findMaterialByName('thread')
    const bobbin = findMaterialByName('Bobbin') || findMaterialByName('bobbin')
    const cutAwayStabilizer = findMaterialByName('Cut-Away Stabilizer') || 
                              findMaterialByName('Cut Away Stabilizer') || 
                              findMaterialByName('cut-away stabilizer') ||
                              findMaterialByName('Cut-Away')
    const washAwayStabilizer = findMaterialByName('Wash-Away Stabilizer') || 
                              findMaterialByName('Wash Away Stabilizer') || 
                              findMaterialByName('wash-away stabilizer') ||
                              findMaterialByName('Wash-Away')

    // Calculate costs for each material (use 0 if material not found)
    // Fabric Cost = Area-based calculation (width > 0)
    const fabricCost = fabric ? this.roundToTwoDecimals(calculateAreaBasedCost(fabric)) : 0

    // Patch Attach Cost = Area-based calculation (width > 0)
    const patchAttachCost = patchAttach ? this.roundToTwoDecimals(calculateAreaBasedCost(patchAttach)) : 0

    // Thread Cost = Length-based calculation (width = 0)
    const threadCost = thread ? this.roundToTwoDecimals(calculateLengthBasedCost(thread)) : 0

    // Bobbin Cost = Length-based calculation (width = 0)
    const bobbinCost = bobbin ? this.roundToTwoDecimals(calculateLengthBasedCost(bobbin)) : 0

    // Cut-Away Stabilizer Cost = Area-based calculation (width > 0)
    const cutAwayStabilizerCost = cutAwayStabilizer ? this.roundToTwoDecimals(calculateAreaBasedCost(cutAwayStabilizer)) : 0

    // Wash-Away Stabilizer Cost = Area-based calculation (width > 0)
    const washAwayStabilizerCost = washAwayStabilizer ? this.roundToTwoDecimals(calculateAreaBasedCost(washAwayStabilizer)) : 0

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
    const materialCosts = this.calculateMaterialCosts({
      patchWidth,
      patchHeight
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
