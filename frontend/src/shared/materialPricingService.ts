import { MaterialCost, materialCostApiService } from './materialCostApiService'

export interface InputParameters {
  patchWidth: number // in inches
  patchHeight: number // in inches
}

export interface MaterialCostBreakdownItem {
  id: number
  name: string
  cost: number
}

export interface CostBreakdown {
  items: MaterialCostBreakdownItem[]
  totalCost: number
  // Legacy named properties (kept for backwards compatibility wherever
  // specific materials are referenced in the UI)
  fabricCost: number
  patchAttachCost: number
  threadCost: number
  bobbinCost: number
  cutAwayStabilizerCost: number
  washAwayStabilizerCost: number
  manualLaborCost: number
}

export class MaterialPricingService {
  // Start with empty array - materials must be loaded from API via setMaterials()
  private static materials: MaterialCost[] = []

  /**
   * Set materials from API data
   */
  static setMaterials(materials: MaterialCost[]): void {
    // Convert string values to numbers and filter for active materials only
    // Create a completely new array to ensure reference changes
    this.materials = materials
      .filter(material => material.isActive)
      .map(material => ({
        ...material,
        cost: typeof material.cost === 'string' ? parseFloat(material.cost) || 0 : (typeof material.cost === 'number' ? material.cost : 0),
        width: typeof material.width === 'string' ? parseFloat(material.width) || 0 : (typeof material.width === 'number' ? material.width : 0),
        length: typeof material.length === 'string' ? parseFloat(material.length) || 0 : (typeof material.length === 'number' ? material.length : 0),
        wasteFactor: typeof material.wasteFactor === 'string' ? parseFloat(material.wasteFactor) || 1.0 : (typeof material.wasteFactor === 'number' ? material.wasteFactor : 1.0)
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
        items: [],
        totalCost: 0,
        fabricCost: 0,
        patchAttachCost: 0,
        threadCost: 0,
        bobbinCost: 0,
        cutAwayStabilizerCost: 0,
        washAwayStabilizerCost: 0,
        manualLaborCost: 0
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
    // The findMaterialByName function already handles case-insensitive matching
    // Try to find materials that match the expected names
    const fabric = findMaterialByName('Fabric')
    const patchAttach = findMaterialByName('Patch Attach')
    const thread = findMaterialByName('Thread')
    const bobbin = findMaterialByName('Bobbin')
    const cutAwayStabilizer = findMaterialByName('Cut-Away Stabilizer') || 
                              findMaterialByName('Cut Away Stabilizer') ||
                              findMaterialByName('Cut-Away')
    // Helper to convert values to numbers safely
    const toNumber = (value: string | number | undefined, defaultValue = 0) => {
      if (typeof value === 'number' && !isNaN(value)) {
        return value
      }
      if (typeof value === 'string') {
        const parsed = parseFloat(value)
        return isNaN(parsed) ? defaultValue : parsed
      }
      return defaultValue
    }

    // Calculate costs for every available material
    const breakdownItems: MaterialCostBreakdownItem[] = this.materials.map(material => {
      const width = toNumber(material.width)
      const length = toNumber(material.length)
      const cost = toNumber(material.cost)
      const wasteFactor = toNumber(material.wasteFactor, 1)

      let calculatedCost = 0
      if (width > 0 && length > 0 && cost > 0) {
        const costPerSqIn = cost / (width * length)
        calculatedCost = this.roundToTwoDecimals(patchArea * costPerSqIn * wasteFactor)
      }

      return {
        id: material.id,
        name: material.name,
        cost: calculatedCost
      }
    })

    const totalCost = this.roundToTwoDecimals(
      breakdownItems.reduce((sum, item) => sum + item.cost, 0)
    )

    // Maintain legacy named cost fields for existing UI references
    const getCostByName = (search: string): number => {
      const normalized = search.toLowerCase()
      const match = breakdownItems.find(item =>
        item.name.toLowerCase().includes(normalized)
      )
      return match ? match.cost : 0
    }

    return {
      items: breakdownItems,
      totalCost,
      fabricCost: getCostByName('fabric'),
      patchAttachCost: getCostByName('patch attach'),
      threadCost: getCostByName('thread'),
      bobbinCost: getCostByName('bobbin'),
      cutAwayStabilizerCost: getCostByName('cut-away'),
      washAwayStabilizerCost: getCostByName('wash-away'),
      manualLaborCost: getCostByName('manual labor')
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
