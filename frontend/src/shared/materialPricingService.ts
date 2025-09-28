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
  private static materials: MaterialCost[] = [
    { id: 1, name: 'Fabric', cost: 34.4, width: 30, length: 36, wasteFactor: 1.5, isActive: true, createdAt: '', updatedAt: '' },
    { id: 2, name: 'Patch Attach', cost: 100.8, width: 9, length: 360, wasteFactor: 1.5, isActive: true, createdAt: '', updatedAt: '' },
    { id: 3, name: 'Thread', cost: 4, width: 0, length: 5000, wasteFactor: 1.2, isActive: true, createdAt: '', updatedAt: '' },
    { id: 4, name: 'Bobbin', cost: 50, width: 0, length: 35000, wasteFactor: 1.2, isActive: true, createdAt: '', updatedAt: '' },
    { id: 5, name: 'Cut-Away Stabilizer', cost: 192, width: 18, length: 3600, wasteFactor: 1.5, isActive: true, createdAt: '', updatedAt: '' },
    { id: 6, name: 'Wash-Away Stabilizer', cost: 60, width: 15, length: 900, wasteFactor: 1.5, isActive: true, createdAt: '', updatedAt: '' }
  ]

  /**
   * Set materials from API data
   */
  static setMaterials(materials: MaterialCost[]): void {
    this.materials = materials
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
        console.log('Materials loaded from API:', materials)
      } else {
        console.warn('Failed to load materials from API or no data received, using default values')
        // Keep using the hardcoded default values
      }
    } catch (error) {
      console.warn('Error loading materials from API, using default values:', error)
      // Keep using the hardcoded default values
    }
  }

  /**
   * Calculate material costs based on patch dimensions
   */
  static calculateMaterialCosts(input: InputParameters): CostBreakdown {
    const { patchWidth, patchHeight } = input
    const patchArea = patchWidth * patchHeight
    
    // Ensure we have materials loaded
    if (this.materials.length === 0) {
      console.warn('No materials loaded, using default values')
      // Load default materials if none are loaded
      this.materials = [
        { id: 1, name: 'Fabric', cost: 34.4, width: 30, length: 36, wasteFactor: 1.5, isActive: true, createdAt: '', updatedAt: '' },
        { id: 2, name: 'Patch Attach', cost: 100.8, width: 9, length: 360, wasteFactor: 1.5, isActive: true, createdAt: '', updatedAt: '' },
        { id: 3, name: 'Thread', cost: 4, width: 0, length: 5000, wasteFactor: 1.2, isActive: true, createdAt: '', updatedAt: '' },
        { id: 4, name: 'Bobbin', cost: 50, width: 0, length: 35000, wasteFactor: 1.2, isActive: true, createdAt: '', updatedAt: '' },
        { id: 5, name: 'Cut-Away Stabilizer', cost: 192, width: 18, length: 3600, wasteFactor: 1.5, isActive: true, createdAt: '', updatedAt: '' },
        { id: 6, name: 'Wash-Away Stabilizer', cost: 60, width: 15, length: 900, wasteFactor: 1.5, isActive: true, createdAt: '', updatedAt: '' }
      ]
    } else {
      console.log('Using loaded materials from API:', this.materials.length, 'materials')
      console.log('First material from API:', this.materials[0])
      
      // Check if the first material has valid width and length for area calculation
      const firstMaterial = this.materials[0]
      const width = typeof firstMaterial.width === 'string' ? parseFloat(firstMaterial.width) : firstMaterial.width
      const length = typeof firstMaterial.length === 'string' ? parseFloat(firstMaterial.length) : firstMaterial.length
      
      if (width <= 0 || length <= 0) {
        console.warn('API materials have invalid dimensions, using default values')
        this.materials = [
          { id: 1, name: 'Fabric', cost: 34.4, width: 30, length: 36, wasteFactor: 1.5, isActive: true, createdAt: '', updatedAt: '' },
          { id: 2, name: 'Patch Attach', cost: 100.8, width: 9, length: 360, wasteFactor: 1.5, isActive: true, createdAt: '', updatedAt: '' },
          { id: 3, name: 'Thread', cost: 4, width: 0, length: 5000, wasteFactor: 1.2, isActive: true, createdAt: '', updatedAt: '' },
          { id: 4, name: 'Bobbin', cost: 50, width: 0, length: 35000, wasteFactor: 1.2, isActive: true, createdAt: '', updatedAt: '' },
          { id: 5, name: 'Cut-Away Stabilizer', cost: 192, width: 18, length: 3600, wasteFactor: 1.5, isActive: true, createdAt: '', updatedAt: '' },
          { id: 6, name: 'Wash-Away Stabilizer', cost: 60, width: 15, length: 900, wasteFactor: 1.5, isActive: true, createdAt: '', updatedAt: '' }
        ]
      }
    }
    
    console.log('Material cost calculation debug:', {
      patchWidth,
      patchHeight,
      patchArea,
      materialsCount: this.materials.length,
      materials: this.materials.map(m => ({
        name: m.name,
        cost: m.cost,
        width: m.width,
        length: m.length,
        wasteFactor: m.wasteFactor
      }))
    })

    // Helper function to calculate area-based cost for materials with width > 0
    const calculateAreaBasedCost = (material: MaterialCost) => {
      const width = typeof material.width === 'string' ? parseFloat(material.width) : material.width
      const length = typeof material.length === 'string' ? parseFloat(material.length) : material.length
      const cost = typeof material.cost === 'string' ? parseFloat(material.cost) : material.cost
      const wasteFactor = typeof material.wasteFactor === 'string' ? parseFloat(material.wasteFactor) : material.wasteFactor
      
      console.log(`Area calculation for ${material.name}:`, {
        width,
        length,
        cost,
        wasteFactor,
        patchArea,
        widthValid: width > 0,
        lengthValid: length > 0
      })
      
      if (width > 0 && length > 0) {
        // Calculate cost per square inch from the material sheet, then multiply by patch area
        const costPerSqIn = cost / (width * length)
        const result = patchArea * costPerSqIn * wasteFactor
        console.log(`Area calculation result for ${material.name}:`, {
          costPerSqIn,
          result
        })
        return result
      }
      console.log(`Area calculation returning 0 for ${material.name} (width: ${width}, length: ${length})`)
      return 0
    }

    // Helper function to calculate length-based cost for materials with width = 0
    const calculateLengthBasedCost = (material: MaterialCost) => {
      // Thread, bobbin, and cut-away stabilizer are not calculated based on stitch count
      // They are set to zero as per requirements
      return 0
    }

    // Ensure we have at least 6 materials
    if (this.materials.length < 6) {
      console.error('Not enough materials loaded:', this.materials.length, 'expected 6')
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

    // Fabric Cost = Area-based calculation (width > 0)
    const fabricCost = this.roundToTwoDecimals(calculateAreaBasedCost(this.materials[0]))
    console.log('Fabric calculation:', {
      material: this.materials[0],
      hasMaterial: !!this.materials[0],
      costPerSqIn: this.materials[0] ? (typeof this.materials[0].cost === 'string' ? parseFloat(this.materials[0].cost) : this.materials[0].cost) / 
                   ((typeof this.materials[0].width === 'string' ? parseFloat(this.materials[0].width) : this.materials[0].width) * 
                    (typeof this.materials[0].length === 'string' ? parseFloat(this.materials[0].length) : this.materials[0].length)) : 'N/A',
      result: fabricCost
    })

    // Patch Attach Cost = Area-based calculation (width > 0)
    const patchAttachCost = this.roundToTwoDecimals(calculateAreaBasedCost(this.materials[1]))
    console.log('Patch Attach calculation:', {
      material: this.materials[1],
      hasMaterial: !!this.materials[1],
      costPerSqIn: this.materials[1] ? (typeof this.materials[1].cost === 'string' ? parseFloat(this.materials[1].cost) : this.materials[1].cost) / 
                   ((typeof this.materials[1].width === 'string' ? parseFloat(this.materials[1].width) : this.materials[1].width) * 
                    (typeof this.materials[1].length === 'string' ? parseFloat(this.materials[1].length) : this.materials[1].length)) : 'N/A',
      result: patchAttachCost
    })

    // Thread Cost = Length-based calculation (width = 0)
    const threadCost = this.roundToTwoDecimals(calculateLengthBasedCost(this.materials[2]))

    // Bobbin Cost = Length-based calculation (width = 0)
    const bobbinCost = this.roundToTwoDecimals(calculateLengthBasedCost(this.materials[3]))

    // Cut-Away Stabilizer Cost = Area-based calculation (width > 0)
    const cutAwayStabilizerCost = this.roundToTwoDecimals(calculateAreaBasedCost(this.materials[4]))
    console.log('Cut-Away Stabilizer calculation:', {
      material: this.materials[4],
      hasMaterial: !!this.materials[4],
      costPerSqIn: this.materials[4] ? (typeof this.materials[4].cost === 'string' ? parseFloat(this.materials[4].cost) : this.materials[4].cost) / 
                   ((typeof this.materials[4].width === 'string' ? parseFloat(this.materials[4].width) : this.materials[4].width) * 
                    (typeof this.materials[4].length === 'string' ? parseFloat(this.materials[4].length) : this.materials[4].length)) : 'N/A',
      result: cutAwayStabilizerCost
    })

    // Wash-Away Stabilizer Cost = Area-based calculation (width > 0)
    const washAwayStabilizerCost = this.roundToTwoDecimals(calculateAreaBasedCost(this.materials[5]))
    console.log('Wash-Away Stabilizer calculation:', {
      material: this.materials[5],
      hasMaterial: !!this.materials[5],
      costPerSqIn: this.materials[5] ? (typeof this.materials[5].cost === 'string' ? parseFloat(this.materials[5].cost) : this.materials[5].cost) / 
                   ((typeof this.materials[5].width === 'string' ? parseFloat(this.materials[5].width) : this.materials[5].width) * 
                    (typeof this.materials[5].length === 'string' ? parseFloat(this.materials[5].length) : this.materials[5].length)) : 'N/A',
      result: washAwayStabilizerCost
    })

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
