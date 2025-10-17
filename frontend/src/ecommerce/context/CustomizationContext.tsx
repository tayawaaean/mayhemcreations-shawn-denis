import React, { createContext, useContext, useState, useEffect } from 'react'
import { embroideryOptionApiService, EmbroideryOption as ApiEmbroideryOption } from '../../shared/embroideryOptionApiService'
import { MaterialPricingService } from '../../shared/materialPricingService'

export interface DesignUpload {
  file: File
  preview: string
  name: string
  size: number
}

export interface EmbroideryDesignData {
  id: string
  name: string
  file: File
  preview: string
  dimensions: {
    width: number
    height: number
  }
  position: {
    x: number
    y: number
    // Store the container size when the position was recorded so we can scale
    containerWidth?: number
    containerHeight?: number
    placement: 'front' | 'back' | 'left-chest' | 'right-chest' | 'sleeve' | 'custom'
  }
  scale: number
  rotation: number
  notes: string
  selectedStyles: {
    coverage: EmbroideryStyle | null
    material: EmbroideryStyle | null
    border: EmbroideryStyle | null
    threads: EmbroideryStyle[]
    backing: EmbroideryStyle | null
    upgrades: EmbroideryStyle[]
    cutting: EmbroideryStyle | null
  }
}

export interface EmbroideryStyle {
  id: string
  name: string
  description: string
  price: number
  image: string
  stitches: number
  estimatedTime: string
  category: 'coverage' | 'threads' | 'material' | 'border' | 'backing' | 'upgrades' | 'cutting'
  level: 'basic' | 'standard' | 'premium' | 'luxury'
  isPopular?: boolean
  isSelected?: boolean
  isIncompatible?: string[]
}

export interface CustomizationData {
  productId: string
  productName: string
  productImage: string
  basePrice: number
  // Multi-embroidery support
  designs: EmbroideryDesignData[]
  maxDesigns: number
  // Saved high-quality mockup captured at the end of step 3
  mockup?: string
  // Legacy single design support (for backward compatibility)
  design: DesignUpload | null
  selectedStyles: {
    coverage: EmbroideryStyle | null
    material: EmbroideryStyle | null
    border: EmbroideryStyle | null
    threads: EmbroideryStyle[]
    backing: EmbroideryStyle | null
    upgrades: EmbroideryStyle[]
    cutting: EmbroideryStyle | null
  }
  placement: 'front' | 'back' | 'left-chest' | 'right-chest' | 'sleeve' | 'manual'
  size: 'small' | 'medium' | 'large' | 'extra-large' | ''
  color: string
  quantity: number
  notes: string
  designPosition: {
    x: number
    y: number
  }
  designScale: number
  designRotation: number
}

interface CustomizationContextType {
  customizationData: CustomizationData
  setCustomizationData: (data: Partial<CustomizationData>) => void
  resetCustomization: () => void
  // Legacy methods (for backward compatibility)
  uploadDesign: (file: File) => void
  removeDesign: () => void
  selectStyle: (category: keyof CustomizationData['selectedStyles'], style: EmbroideryStyle) => void
  toggleStyle: (category: 'threads' | 'upgrades', style: EmbroideryStyle) => void
  // New multi-embroidery methods
  addDesign: (file: File) => void
  removeDesignById: (designId: string) => void
  updateDesign: (designId: string, updates: Partial<EmbroideryDesignData>) => void
  reorderDesigns: (fromIndex: number, toIndex: number) => void
  getDesignById: (designId: string) => EmbroideryDesignData | undefined
  selectStyleForDesign: (designId: string, category: keyof EmbroideryDesignData['selectedStyles'], style: EmbroideryStyle) => void
  toggleStyleForDesign: (designId: string, category: 'threads' | 'upgrades', style: EmbroideryStyle) => void
  copyEmbroideryOptions: (fromDesignId: string, toDesignId: string) => void
  // Pricing
  calculateTotalPrice: () => number
  calculateDesignPrice: (designId: string) => number
  // Data
  embroideryStyles: EmbroideryStyle[]
  loading: boolean
}

const CustomizationContext = createContext<CustomizationContextType | undefined>(undefined)

// Convert API embroidery option to context format
const convertApiToContext = (apiOption: ApiEmbroideryOption): EmbroideryStyle => ({
  id: apiOption.id.toString(),
  name: apiOption.name,
  description: apiOption.description,
  price: Number(apiOption.price),
  image: apiOption.image,
  stitches: apiOption.stitches,
  estimatedTime: apiOption.estimatedTime,
  category: apiOption.category,
  level: apiOption.level,
  isPopular: apiOption.isPopular,
  isSelected: false,
  isIncompatible: apiOption.isIncompatible ? JSON.parse(apiOption.isIncompatible) : []
})

// Default embroidery styles (fallback)
const defaultEmbroideryStyles: EmbroideryStyle[] = [
  // COVERAGE LEVELS
  {
    id: 'coverage-50',
    name: '50% Coverage - Mostly Text',
    description: 'Perfect for text-heavy designs with minimal graphics',
    price: 0,
    image: '/demo-images/coverage-50.jpg',
    stitches: 3000,
    estimatedTime: '1-2 days',
    category: 'coverage',
    level: 'basic',
    isPopular: false
  },
  {
    id: 'coverage-75',
    name: '75% Coverage - Balanced',
    description: 'Ideal balance of detail and cost for most designs',
    price: 14.50,
    image: '/demo-images/coverage-75.jpg',
    stitches: 6000,
    estimatedTime: '2-3 days',
    category: 'coverage',
    level: 'standard',
    isPopular: true
  },
  {
    id: 'coverage-100',
    name: '100% Coverage - Most Detailed',
    description: 'Full coverage embroidery for intricate, detailed designs',
    price: 27.00,
    image: '/demo-images/coverage-100.jpg',
    stitches: 10000,
    estimatedTime: '3-4 days',
    category: 'coverage',
    level: 'premium'
  },

  // BASE MATERIALS
  {
    id: 'material-polyester',
    name: 'Polyester Blend Twill',
    description: 'Standard, durable material perfect for most applications',
    price: 0,
    image: '/demo-images/material-polyester.jpg',
    stitches: 0,
    estimatedTime: '0 days',
    category: 'material',
    level: 'basic',
    isPopular: true,
    isSelected: true
  },
  {
    id: 'material-felt',
    name: 'Felt',
    description: 'Soft, unique texture that stands out from standard patches',
    price: 12.78,
    image: '/demo-images/material-felt.jpg',
    stitches: 0,
    estimatedTime: '0 days',
    category: 'material',
    level: 'standard'
  },
  {
    id: 'material-ballistic',
    name: 'Black Ballistic Nylon',
    description: 'Ultra-durable military-grade material for heavy use',
    price: 69.90,
    image: '/demo-images/material-ballistic.jpg',
    stitches: 0,
    estimatedTime: '0 days',
    category: 'material',
    level: 'luxury'
  },
  {
    id: 'material-camo',
    name: 'Camouflage Material',
    description: 'Tactical camo pattern for outdoor and military applications',
    price: 26.63,
    image: '/demo-images/material-camo.jpg',
    stitches: 0,
    estimatedTime: '0 days',
    category: 'material',
    level: 'premium'
  },
  {
    id: 'material-reflective',
    name: 'Reflective Material (Silver)',
    description: 'High-visibility reflective backing for safety applications',
    price: 58.58,
    image: '/demo-images/material-reflective.jpg',
    stitches: 0,
    estimatedTime: '0 days',
    category: 'material',
    level: 'luxury'
  },

  // BORDER & EDGE OPTIONS
  {
    id: 'border-none',
    name: 'No Border',
    description: 'Clean cut edge without additional finishing',
    price: 0,
    image: '/demo-images/border-none.jpg',
    stitches: 0,
    estimatedTime: '0 days',
    category: 'border',
    level: 'basic'
  },
  {
    id: 'border-embroidered',
    name: 'Embroidered Border',
    description: 'Classic embroidered edge that follows your design shape',
    price: 0,
    image: '/demo-images/border-embroidered.jpg',
    stitches: 1000,
    estimatedTime: '1 day',
    category: 'border',
    level: 'standard',
    isPopular: true,
    isSelected: true
  },
  {
    id: 'border-merrowed',
    name: 'Merrowed Border',
    description: 'Professional overlock stitch for clean, finished edges',
    price: 20.24,
    image: '/demo-images/border-merrowed.jpg',
    stitches: 0,
    estimatedTime: '1 day',
    category: 'border',
    level: 'premium',
    isIncompatible: ['border-embroidered']
  },
  {
    id: 'border-frayed',
    name: 'Frayed Edges',
    description: 'Rustic, vintage look with intentionally frayed edges',
    price: 20.24,
    image: '/demo-images/border-frayed.jpg',
    stitches: 0,
    estimatedTime: '1 day',
    category: 'border',
    level: 'premium'
  },

  // THREAD OPTIONS
  {
    id: 'thread-standard',
    name: 'Standard Thread (1-9 colors)',
    description: 'High-quality polyester thread in standard colors',
    price: 0,
    image: '/demo-images/thread-standard.jpg',
    stitches: 0,
    estimatedTime: '0 days',
    category: 'threads',
    level: 'basic',
    isPopular: true,
    isSelected: true
  },
  {
    id: 'thread-extra',
    name: 'Extra Thread Colors (10-12)',
    description: 'Expanded color palette for complex designs',
    price: 79.88,
    image: '/demo-images/thread-extra.jpg',
    stitches: 0,
    estimatedTime: '0 days',
    category: 'threads',
    level: 'standard'
  },
  {
    id: 'thread-many',
    name: '13+ Thread Colors',
    description: 'Unlimited colors for the most detailed designs',
    price: 127.80,
    image: '/demo-images/thread-many.jpg',
    stitches: 0,
    estimatedTime: '0 days',
    category: 'threads',
    level: 'premium'
  },
  {
    id: 'thread-metallic',
    name: 'Metallic Thread',
    description: 'Shimmering metallic thread for eye-catching designs',
    price: 38.34,
    image: '/demo-images/thread-metallic.jpg',
    stitches: 0,
    estimatedTime: '0 days',
    category: 'threads',
    level: 'premium'
  },
  {
    id: 'thread-neon',
    name: 'Neon Thread',
    description: 'Bright, vibrant neon colors for maximum visibility',
    price: 26.63,
    image: '/demo-images/thread-neon.jpg',
    stitches: 0,
    estimatedTime: '0 days',
    category: 'threads',
    level: 'standard'
  },
  {
    id: 'thread-glow-10',
    name: 'Glow in the Dark (10%)',
    description: 'Minimal glow elements for subtle night visibility',
    price: 35.15,
    image: '/demo-images/thread-glow-10.jpg',
    stitches: 0,
    estimatedTime: '0 days',
    category: 'threads',
    level: 'premium'
  },
  {
    id: 'thread-glow-25',
    name: 'Glow in the Dark (25%)',
    description: 'Moderate glow coverage for enhanced visibility',
    price: 63.90,
    image: '/demo-images/thread-glow-25.jpg',
    stitches: 0,
    estimatedTime: '0 days',
    category: 'threads',
    level: 'luxury'
  },
  {
    id: 'thread-glow-50',
    name: 'Glow in the Dark (50%)',
    description: 'Maximum glow coverage for dramatic night effects',
    price: 99.05,
    image: '/demo-images/thread-glow-50.jpg',
    stitches: 0,
    estimatedTime: '0 days',
    category: 'threads',
    level: 'luxury'
  },
  {
    id: 'thread-puff',
    name: 'Puff Embroidery (3D)',
    description: 'Raised, three-dimensional embroidery effect',
    price: 20.24,
    image: '/demo-images/thread-puff.jpg',
    stitches: 0,
    estimatedTime: '1 day',
    category: 'threads',
    level: 'premium'
  },

  // BACKING OPTIONS
  {
    id: 'backing-none',
    name: 'No Backing',
    description: 'No additional backing applied',
    price: 0,
    image: '/demo-images/backing-none.jpg',
    stitches: 0,
    estimatedTime: '0 days',
    category: 'backing',
    level: 'basic',
    isSelected: true
  },
  {
    id: 'backing-iron',
    name: 'Iron-on Backing',
    description: 'Heat-activated adhesive for easy application',
    price: 0,
    image: '/demo-images/backing-iron.jpg',
    stitches: 0,
    estimatedTime: '0 days',
    category: 'backing',
    level: 'basic',
    isPopular: true
  },
  {
    id: 'backing-adhesive',
    name: 'Adhesive Backing',
    description: 'Peel-and-stick adhesive for quick application',
    price: 12.78,
    image: '/demo-images/backing-adhesive.jpg',
    stitches: 0,
    estimatedTime: '0 days',
    category: 'backing',
    level: 'standard'
  },
  {
    id: 'backing-velcro-hook',
    name: 'Velcro Hook Backing',
    description: 'Hook-side Velcro for secure attachment',
    price: 53.25,
    image: '/demo-images/backing-velcro-hook.jpg',
    stitches: 0,
    estimatedTime: '0 days',
    category: 'backing',
    level: 'premium'
  },
  {
    id: 'backing-velcro-loop',
    name: 'Velcro Loop Backing',
    description: 'Loop-side Velcro for soft attachment',
    price: 46.86,
    image: '/demo-images/backing-velcro-loop.jpg',
    stitches: 0,
    estimatedTime: '0 days',
    category: 'backing',
    level: 'premium'
  },
  {
    id: 'backing-magnetic',
    name: 'Magnetic Backing',
    description: 'Magnetic backing for easy repositioning',
    price: 35.15,
    image: '/demo-images/backing-magnetic.jpg',
    stitches: 0,
    estimatedTime: '0 days',
    category: 'backing',
    level: 'premium'
  },

  // UPGRADES
  {
    id: 'upgrade-button-loop',
    name: 'Button Loop',
    description: 'Fabric loop for button attachment',
    price: 20.24,
    image: '/demo-images/upgrade-button-loop.jpg',
    stitches: 0,
    estimatedTime: '0 days',
    category: 'upgrades',
    level: 'standard',
    isPopular: true
  },
  {
    id: 'upgrade-rhinestone',
    name: 'Rhinestone Accents',
    description: 'Sparkling rhinestone embellishments',
    price: 260.93,
    image: '/demo-images/upgrade-rhinestone.jpg',
    stitches: 0,
    estimatedTime: '1 day',
    category: 'upgrades',
    level: 'luxury'
  },

  // CUT TO SHAPE METHOD
  {
    id: 'cutting-laser',
    name: 'Laser Cut or Hand Cut',
    description: 'Standard cutting method for basic shapes',
    price: 0,
    image: '/demo-images/cutting-laser.jpg',
    stitches: 0,
    estimatedTime: '0 days',
    category: 'cutting',
    level: 'basic',
    isPopular: true,
    isSelected: true
  },
  {
    id: 'cutting-hot-cut',
    name: 'Hot Cut Edge',
    description: 'Precision cutting for complex shapes and irregular designs',
    price: 20.24,
    image: '/demo-images/cutting-hot-cut.jpg',
    stitches: 0,
    estimatedTime: '0 days',
    category: 'cutting',
    level: 'premium',
    isPopular: true
  }
]

const defaultCustomizationData: CustomizationData = {
  productId: '',
  productName: '',
  productImage: '',
  basePrice: 0,
  quantity: 1,
  color: '#000000',
  size: '',
  notes: '',
  // Multi-embroidery support
  designs: [],
  maxDesigns: 5, // Maximum number of designs per product
  mockup: undefined,
  // Legacy single design support (for backward compatibility)
  design: null,
  selectedStyles: {
    coverage: null,
    material: null,
    border: null,
    backing: null,
    threads: [],
    upgrades: [],
    cutting: null
  },
  placement: 'manual',
  designPosition: { x: 50, y: 50 },
  designScale: 1,
  designRotation: 0
}

const CUSTOMIZATION_STORAGE_KEY = 'mayhem_customization_v1'

export const CustomizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [embroideryStyles, setEmbroideryStyles] = useState<EmbroideryStyle[]>(defaultEmbroideryStyles)
  const [loading, setLoading] = useState(true)
  
  // Initialize customization data from localStorage if available
  const [customizationData, setCustomizationDataState] = useState<CustomizationData>(() => {
    try {
      const saved = localStorage.getItem(CUSTOMIZATION_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Merge with default to ensure all required fields exist
        const loadedData = { ...defaultCustomizationData, ...parsed }
        
        // Handle design File object restoration
        if (loadedData.design) {
          loadedData.design = {
            ...loadedData.design,
            // File objects are lost on reload, create dummy File for preview
            file: new File([], loadedData.design.name || 'design', { type: 'image/png' })
          }
        }
        
        // Restore designs with proper File handling
        if (loadedData.designs && loadedData.designs.length > 0) {
          loadedData.designs = loadedData.designs.map((design: any) => ({
            ...design,
            // File objects are lost on reload, but we keep the preview and other data
            file: new File([], design.name || 'design', { type: 'image/png' }) // Create dummy File
          }))
        }
        
        console.log('📱 Loaded customization data from localStorage:', {
          designsCount: loadedData.designs?.length || 0,
          hasDesign: !!loadedData.design,
          hasMockup: !!loadedData.mockup,
          mockupSize: loadedData.mockup ? Math.round(loadedData.mockup.length / 1024) : 0
        })
        
        return loadedData
      }
    } catch (error) {
      console.warn('Failed to load customization data from localStorage:', error)
    }
    return defaultCustomizationData
  })

  // Fetch embroidery options from API
  useEffect(() => {
    const fetchEmbroideryOptions = async () => {
      try {
        setLoading(true)
        const response = await embroideryOptionApiService.getActiveEmbroideryOptions()
        const convertedOptions = response.data?.map(convertApiToContext) || []
        setEmbroideryStyles(convertedOptions)
      } catch (error) {
        console.error('Failed to fetch embroidery options, using defaults:', error)
        // Keep using default styles if API fails
      } finally {
        setLoading(false)
      }
    }

    fetchEmbroideryOptions()
  }, [])

  const setCustomizationData = (data: Partial<CustomizationData>) => {
    setCustomizationDataState(prev => {
      const newState = { ...prev, ...data }
      
      // Save to localStorage (excluding File objects which can't be serialized)
      try {
        const serializableState = {
          ...newState,
          design: newState.design ? {
            ...newState.design,
            file: undefined, // Remove File object, keep other data
            preview: newState.design.preview // Keep preview URL or base64
          } : null,
          designs: newState.designs.map(design => ({
            ...design,
            file: undefined, // Remove File object, keep other data
            preview: design.preview // Keep base64 preview
          }))
        }
        
        const dataString = JSON.stringify(serializableState)
        const dataSizeInMB = dataString.length / 1024 / 1024
        
        // Check if data is too large (limit to 2MB to leave room for auth data)
        if (dataSizeInMB > 2) {
          console.warn('⚠️ Customization data too large for localStorage:', dataSizeInMB.toFixed(2), 'MB')
          console.warn('⚠️ Skipping localStorage save to prevent quota issues that could affect authentication')
          return newState
        }
        
        localStorage.setItem(CUSTOMIZATION_STORAGE_KEY, dataString)
        console.log('💾 Customization data saved to localStorage (' + dataSizeInMB.toFixed(2) + ' MB)')
      } catch (error: any) {
        if (error.name === 'QuotaExceededError') {
          console.error('❌ localStorage quota exceeded! This may affect authentication.')
          console.error('❌ Clearing customization data to preserve auth state')
          // Clear customization data to prevent auth issues
          try {
            localStorage.removeItem(CUSTOMIZATION_STORAGE_KEY)
          } catch (e) {
            console.error('Failed to clear customization data:', e)
          }
        } else {
          console.warn('Failed to save customization data to localStorage:', error)
        }
      }
      
      return newState
    })
  }

  const resetCustomization = () => {
    setCustomizationDataState(defaultCustomizationData)
    // Clear localStorage when resetting
    try {
      localStorage.removeItem(CUSTOMIZATION_STORAGE_KEY)
      console.log('🗑️ Customization data cleared from localStorage')
    } catch (error) {
      console.warn('Failed to clear customization data from localStorage:', error)
    }
  }

  const uploadDesign = async (file: File) => {
    try {
      // Convert file to base64 for persistent preview
      const reader = new FileReader()
      const preview = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      
      const designUpload: DesignUpload = {
        file,
        preview,
        name: file.name,
        size: file.size
      }
      setCustomizationData({ design: designUpload })
    } catch (error) {
      console.error('Error converting file to base64:', error)
      // Fallback to blob URL if base64 conversion fails
      const designUpload: DesignUpload = {
        file,
        preview: URL.createObjectURL(file),
        name: file.name,
        size: file.size
      }
      setCustomizationData({ design: designUpload })
    }
  }

  const removeDesign = () => {
    if (customizationData.design) {
      // Only revoke blob URLs, not base64 data URLs
      if (customizationData.design.preview.startsWith('blob:')) {
        URL.revokeObjectURL(customizationData.design.preview)
      }
    }
    setCustomizationData({ design: null })
  }

  const selectStyle = (category: keyof CustomizationData['selectedStyles'], style: EmbroideryStyle) => {
    if (category === 'threads' || category === 'upgrades') {
      // These are arrays, handled by toggleStyle
      return
    }
    
    // Check if clicking the same style - if so, unselect it
    const currentSelected = customizationData.selectedStyles[category] as EmbroideryStyle | null
    const newValue = currentSelected?.id === style.id ? null : style
    
    setCustomizationData({
      selectedStyles: {
        ...customizationData.selectedStyles,
        [category]: newValue
      }
    })
  }

  const toggleStyle = (category: 'threads' | 'upgrades', style: EmbroideryStyle) => {
    const currentStyles = customizationData.selectedStyles[category]
    const isSelected = currentStyles.some(s => s.id === style.id)
    
    if (isSelected) {
      setCustomizationData({
        selectedStyles: {
          ...customizationData.selectedStyles,
          [category]: currentStyles.filter(s => s.id !== style.id)
        }
      })
    } else {
      setCustomizationData({
        selectedStyles: {
          ...customizationData.selectedStyles,
          [category]: [...currentStyles, style]
        }
      })
    }
  }

  const calculateTotalPrice = () => {
    const basePrice = Number(customizationData.basePrice) || 0
    
    // Calculate price for multi-embroidery designs
    if (customizationData.designs.length > 0) {
      const totalDesignPrice = customizationData.designs.reduce((sum, design) => {
        return sum + calculateDesignPrice(design.id)
      }, 0)
      const quantity = Number(customizationData.quantity) || 1
      return (basePrice + totalDesignPrice) * quantity
    }
    
    // Legacy single design calculation
    const { selectedStyles } = customizationData
    
    let totalStylePrice = 0
    if (selectedStyles.coverage) totalStylePrice += Number(selectedStyles.coverage.price) || 0
    if (selectedStyles.material) totalStylePrice += Number(selectedStyles.material.price) || 0
    if (selectedStyles.border) totalStylePrice += Number(selectedStyles.border.price) || 0
    if (selectedStyles.backing) totalStylePrice += Number(selectedStyles.backing.price) || 0
    if (selectedStyles.cutting) totalStylePrice += Number(selectedStyles.cutting.price) || 0
    
    selectedStyles.threads.forEach(thread => totalStylePrice += Number(thread.price) || 0)
    selectedStyles.upgrades.forEach(upgrade => totalStylePrice += Number(upgrade.price) || 0)
    
    const quantity = Number(customizationData.quantity) || 1
    return (basePrice + totalStylePrice) * quantity
  }

  // Multi-embroidery methods
  const addDesign = async (file: File) => {
    console.log('addDesign called with file:', file.name, 'Current designs:', customizationData.designs.length, 'Max designs:', customizationData.maxDesigns)
    console.log('Current designs array:', customizationData.designs.map(d => d.name))
    
    if (customizationData.designs.length >= customizationData.maxDesigns) {
      console.warn(`Maximum ${customizationData.maxDesigns} designs allowed`)
      return
    }

    const designId = `design_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    console.log('Creating new design with ID:', designId)
    
    try {
      // Convert file to base64 for persistent preview
      const reader = new FileReader()
      const preview = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      
      const newDesign: EmbroideryDesignData = {
        id: designId,
        name: file.name,
        file,
        preview,
        dimensions: { width: 3, height: 3 }, // Default dimensions
        position: { x: 50, y: 50, placement: 'front' },
        scale: 1,
        rotation: 0,
        notes: '',
        selectedStyles: {
          coverage: null,
          material: null,
          border: null,
          threads: [],
          backing: null,
          upgrades: [],
          cutting: null
        }
      }

      const newDesignsArray = [...customizationData.designs, newDesign]
      console.log('Setting new designs array with', newDesignsArray.length, 'designs:', newDesignsArray.map(d => d.name))
      
      setCustomizationData({
        designs: newDesignsArray
      })
      
      console.log('Design added successfully. New count should be:', newDesignsArray.length)
      console.log('Current designs array after add:', newDesignsArray.map(d => ({ id: d.id, name: d.name })))
    } catch (error) {
      console.error('Error converting file to base64:', error)
      // Fallback to blob URL if base64 conversion fails
      const newDesign: EmbroideryDesignData = {
        id: designId,
        name: file.name,
        file,
        preview: URL.createObjectURL(file),
        dimensions: { width: 3, height: 3 }, // Default dimensions
        position: { x: 50, y: 50, placement: 'front' },
        scale: 1,
        rotation: 0,
        notes: '',
        selectedStyles: {
          coverage: null,
          material: null,
          border: null,
          threads: [],
          backing: null,
          upgrades: [],
          cutting: null
        }
      }

      const newDesignsArray = [...customizationData.designs, newDesign]
      console.log('Setting new designs array with fallback blob URL')
      
      setCustomizationData({
        designs: newDesignsArray
      })
    }
  }

  const removeDesignById = (designId: string) => {
    const designToRemove = customizationData.designs.find(d => d.id === designId)
    if (designToRemove) {
      URL.revokeObjectURL(designToRemove.preview)
    }

    setCustomizationData({
      designs: customizationData.designs.filter(d => d.id !== designId)
    })
  }

  const updateDesign = (designId: string, updates: Partial<EmbroideryDesignData>) => {
    setCustomizationData({
      designs: customizationData.designs.map(design =>
        design.id === designId ? { ...design, ...updates } : design
      )
    })
  }

  const reorderDesigns = (fromIndex: number, toIndex: number) => {
    const newDesigns = [...customizationData.designs]
    const [movedDesign] = newDesigns.splice(fromIndex, 1)
    newDesigns.splice(toIndex, 0, movedDesign)
    
    setCustomizationData({ designs: newDesigns })
  }

  const getDesignById = (designId: string) => {
    return customizationData.designs.find(d => d.id === designId)
  }

  const selectStyleForDesign = (designId: string, category: keyof EmbroideryDesignData['selectedStyles'], style: EmbroideryStyle) => {
    if (category === 'threads' || category === 'upgrades') {
      // These are arrays, handled by toggleStyleForDesign
      return
    }

    const design = getDesignById(designId)
    if (design) {
      // Check if clicking the same style - if so, unselect it
      const currentSelected = design.selectedStyles[category] as EmbroideryStyle | null
      const newValue = currentSelected?.id === style.id ? null : style
      
      updateDesign(designId, {
        selectedStyles: {
          ...design.selectedStyles,
          [category]: newValue
        }
      })
    }
  }

  const toggleStyleForDesign = (designId: string, category: 'threads' | 'upgrades', style: EmbroideryStyle) => {
    const design = getDesignById(designId)
    if (!design) return

    const currentStyles = design.selectedStyles[category]
    const isSelected = currentStyles.some(s => s.id === style.id)
    
    const newStyles = isSelected
      ? currentStyles.filter(s => s.id !== style.id)
      : [...currentStyles, style]

    updateDesign(designId, {
      selectedStyles: {
        ...design.selectedStyles,
        [category]: newStyles
      }
    })
  }

  const copyEmbroideryOptions = (fromDesignId: string, toDesignId: string) => {
    const fromDesign = customizationData.designs.find(d => d.id === fromDesignId)
    const toDesign = customizationData.designs.find(d => d.id === toDesignId)
    
    if (!fromDesign || !toDesign) {
      console.warn('Design not found for copying embroidery options')
      return
    }

    console.log(`Copying embroidery options from ${fromDesign.name} to ${toDesign.name}`)
    
    updateDesign(toDesignId, {
      selectedStyles: { ...fromDesign.selectedStyles }
    })
  }

  const calculateDesignPrice = (designId: string) => {
    const design = getDesignById(designId)
    if (!design) return 0

    // Calculate base material costs from dimensions
    let totalPrice = 0
    if (design.dimensions && design.dimensions.width > 0 && design.dimensions.height > 0) {
      try {
        const materialCosts = MaterialPricingService.calculateMaterialCosts({
          patchWidth: design.dimensions.width,
          patchHeight: design.dimensions.height
        })
        totalPrice += materialCosts.totalCost
      } catch (error) {
        console.warn('Failed to calculate material costs for design:', design.name, error)
      }
    }

    // Calculate options price and add to total
    const { selectedStyles } = design
    if (selectedStyles.coverage) totalPrice += Number(selectedStyles.coverage.price) || 0
    if (selectedStyles.material) totalPrice += Number(selectedStyles.material.price) || 0
    if (selectedStyles.border) totalPrice += Number(selectedStyles.border.price) || 0
    if (selectedStyles.backing) totalPrice += Number(selectedStyles.backing.price) || 0
    if (selectedStyles.cutting) totalPrice += Number(selectedStyles.cutting.price) || 0
    
    selectedStyles.threads.forEach(thread => totalPrice += Number(thread.price) || 0)
    selectedStyles.upgrades.forEach(upgrade => totalPrice += Number(upgrade.price) || 0)

    return totalPrice
  }

  return (
    <CustomizationContext.Provider value={{
      customizationData,
      setCustomizationData,
      resetCustomization,
      // Legacy methods (for backward compatibility)
      uploadDesign,
      removeDesign,
      selectStyle,
      toggleStyle,
      // New multi-embroidery methods
      addDesign,
      removeDesignById,
      updateDesign,
      reorderDesigns,
      getDesignById,
      selectStyleForDesign,
      toggleStyleForDesign,
      copyEmbroideryOptions,
      // Pricing
      calculateTotalPrice,
      calculateDesignPrice,
      // Data
      embroideryStyles,
      loading
    }}>
      {children}
    </CustomizationContext.Provider>
  )
}

const useCustomization = () => {
  const context = useContext(CustomizationContext)
  if (context === undefined) {
    throw new Error('useCustomization must be used within a CustomizationProvider')
  }
  return context
}

export { useCustomization }

