import React, { createContext, useContext, useState } from 'react'

export interface DesignUpload {
  file: File
  preview: string
  name: string
  size: number
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
  uploadDesign: (file: File) => void
  removeDesign: () => void
  selectStyle: (category: keyof CustomizationData['selectedStyles'], style: EmbroideryStyle) => void
  toggleStyle: (category: 'threads' | 'upgrades', style: EmbroideryStyle) => void
  calculateTotalPrice: () => number
}

const CustomizationContext = createContext<CustomizationContextType | undefined>(undefined)

const embroideryStyles: EmbroideryStyle[] = [
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
  design: null,
  selectedStyles: {
    coverage: null,
    material: null,
    border: null,
    threads: [],
    backing: null,
    upgrades: [],
    cutting: null
  },
  placement: 'front',
  size: '',
  color: '#000000',
  quantity: 1,
  notes: '',
  designPosition: { x: 50, y: 50 },
  designScale: 1,
  designRotation: 0
}

export const CustomizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customizationData, setCustomizationDataState] = useState<CustomizationData>(defaultCustomizationData)

  const setCustomizationData = (data: Partial<CustomizationData>) => {
    setCustomizationDataState(prev => ({ ...prev, ...data }))
  }

  const resetCustomization = () => {
    setCustomizationDataState(defaultCustomizationData)
  }

  const uploadDesign = (file: File) => {
    const designUpload: DesignUpload = {
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
      size: file.size
    }
    setCustomizationData({ design: designUpload })
  }

  const removeDesign = () => {
    if (customizationData.design) {
      URL.revokeObjectURL(customizationData.design.preview)
    }
    setCustomizationData({ design: null })
  }

  const selectStyle = (category: keyof CustomizationData['selectedStyles'], style: EmbroideryStyle) => {
    if (category === 'threads' || category === 'upgrades') {
      // These are arrays, handled by toggleStyle
      return
    }
    
    setCustomizationData({
      selectedStyles: {
        ...customizationData.selectedStyles,
        [category]: style
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
    const basePrice = customizationData.basePrice
    const { selectedStyles } = customizationData
    
    let totalStylePrice = 0
    if (selectedStyles.coverage) totalStylePrice += selectedStyles.coverage.price
    if (selectedStyles.material) totalStylePrice += selectedStyles.material.price
    if (selectedStyles.border) totalStylePrice += selectedStyles.border.price
    if (selectedStyles.backing) totalStylePrice += selectedStyles.backing.price
    if (selectedStyles.cutting) totalStylePrice += selectedStyles.cutting.price
    
    selectedStyles.threads.forEach(thread => totalStylePrice += thread.price)
    selectedStyles.upgrades.forEach(upgrade => totalStylePrice += upgrade.price)
    
    const quantity = customizationData.quantity
    return (basePrice + totalStylePrice) * quantity
  }

  return (
    <CustomizationContext.Provider value={{
      customizationData,
      setCustomizationData,
      resetCustomization,
      uploadDesign,
      removeDesign,
      selectStyle,
      toggleStyle,
      calculateTotalPrice
    }}>
      {children}
    </CustomizationContext.Provider>
  )
}

export const useCustomization = () => {
  const context = useContext(CustomizationContext)
  if (context === undefined) {
    throw new Error('useCustomization must be used within a CustomizationProvider')
  }
  return context
}

export { embroideryStyles }
