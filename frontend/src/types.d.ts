export type Product = {
  id: string
  title: string
  price: number
  description: string
  image: string
  alt: string
  badges?: string[]
  category: 'apparel' | 'accessories' | 'embroidery'
  subcategory?: string
  availableColors?: string[]
  availableSizes?: string[]
  reviews?: ProductReview[]
  averageRating?: number
  totalReviews?: number
  stock?: number
  sku?: string
  status?: 'active' | 'inactive' | 'draft'
  hasSizing?: boolean
  variants?: ProductVariant[]
}

export type ProductVariant = {
  id: number
  name: string
  color?: string
  colorHex?: string
  size?: string
  sku: string
  stock: number
  price?: number
  isActive: boolean
}

export type ProductReview = {
  id: string
  customerName: string
  customerAvatar?: string
  rating: number
  title: string
  comment: string
  isVerified: boolean
  helpfulVotes: number
  createdAt: Date
  images?: string[]
}

export type CartItem = {
  productId: string
  quantity: number
  reviewStatus: 'pending' | 'approved' | 'rejected' | 'needs-changes'
  customization?: {
    design: {
      name: string
      size: number
      preview: string
      base64?: string
    } | null
    mockup?: string
    selectedStyles: {
      coverage: { id: string; name: string; price: number } | null
      material: { id: string; name: string; price: number } | null
      border: { id: string; name: string; price: number } | null
      threads: { id: string; name: string; price: number }[]
      backing: { id: string; name: string; price: number } | null
      upgrades: { id: string; name: string; price: number }[]
      cutting: { id: string; name: string; price: number } | null
    }
    placement: 'front' | 'back' | 'left-chest' | 'right-chest' | 'sleeve' | 'manual'
    size: 'small' | 'medium' | 'large' | 'extra-large' | ''
    color: string
    notes: string
    designPosition: {
      x: number
      y: number
    }
    designScale: number
    designRotation: number
    // Embroidery-specific data
    embroideryData?: {
      dimensions: {
        width: number
        height: number
      }
      materialCosts: {
        fabricCost: number
        patchAttachCost: number
        threadCost: number
        bobbinCost: number
        cutAwayStabilizerCost: number
        washAwayStabilizerCost: number
        totalCost: number
      }
      optionsPrice: number
      totalPrice: number
      reviewStatus: 'pending' | 'approved' | 'rejected' | 'needs-changes'
    }
  }
}

// Google OAuth types
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string; select_by: string }) => void
            auto_select?: boolean
            cancel_on_tap_outside?: boolean
          }) => void
          prompt: (callback?: () => void) => void
          renderButton: (element: HTMLElement, config: {
            theme?: 'outline' | 'filled_blue' | 'filled_black'
            size?: 'small' | 'medium' | 'large'
            text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
            shape?: 'rectangular' | 'pill' | 'circle' | 'square'
            logo_alignment?: 'left' | 'center'
            width?: number
          }) => void
          disableAutoSelect: () => void
          storeCredential: (credential: string, callback: () => void) => void
        }
      }
    }
  }
}