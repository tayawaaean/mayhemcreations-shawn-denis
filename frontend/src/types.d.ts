export type Product = {
  id: string
  title: string
  price: number
  description: string
  image: string
  images?: string[]
  primaryImageIndex?: number
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
    designs?: {
      id: string
      name: string
      preview: string
      dimensions: {
        width: number
        height: number
      }
      position: {
        x: number
        y: number
        placement: string
      }
      scale: number
      rotation: number
      notes: string
      selectedStyles: {
        coverage: { id: string; name: string; price: number } | null
        material: { id: string; name: string; price: number } | null
        border: { id: string; name: string; price: number } | null
        threads: { id: string; name: string; price: number }[]
        backing: { id: string; name: string; price: number } | null
        upgrades: { id: string; name: string; price: number }[]
        cutting: { id: string; name: string; price: number } | null
      }
    }[] | null
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

// Vite environment variables
/// <reference types="vite/client" />

declare global {
  interface ImportMetaEnv {
    readonly VITE_REACT_APP_GOOGLE_CLIENT_ID: string
    readonly VITE_REACT_APP_GOOGLE_OAUTH_SCRIPT_URL: string
    readonly VITE_REACT_APP_API_URL: string
    readonly VITE_REACT_APP_APP_NAME: string
    readonly VITE_REACT_APP_APP_DOMAIN: string
    readonly VITE_REACT_APP_APP_ENV: string
    readonly VITE_REACT_APP_CONTACT_EMAIL: string
    readonly VITE_REACT_APP_ORDERS_EMAIL: string
    readonly VITE_REACT_APP_PHONE_1: string
    readonly VITE_REACT_APP_PHONE_2: string
    readonly VITE_REACT_APP_BUSINESS_ADDRESS_1: string
    readonly VITE_REACT_APP_BUSINESS_ADDRESS_2: string
    readonly VITE_REACT_APP_BUSINESS_HOURS_WEEKDAY: string
    readonly VITE_REACT_APP_BUSINESS_HOURS_SATURDAY: string
    readonly VITE_REACT_APP_BUSINESS_HOURS_SUNDAY: string
    readonly VITE_REACT_APP_DEMO_ADMIN_EMAIL: string
    readonly VITE_REACT_APP_DEMO_SHAWN_EMAIL: string
    readonly VITE_REACT_APP_DEMO_MANAGER_EMAIL: string
    readonly VITE_REACT_APP_DEMO_DESIGNER_EMAIL: string
    readonly VITE_REACT_APP_DEMO_CUSTOMER1_EMAIL: string
    readonly VITE_REACT_APP_DEMO_CUSTOMER2_EMAIL: string
    readonly VITE_REACT_APP_DEMO_CUSTOMER3_EMAIL: string
    readonly VITE_REACT_APP_DEMO_CUSTOMER4_EMAIL: string
    readonly VITE_REACT_APP_DEMO_CUSTOMER5_EMAIL: string
    readonly VITE_REACT_APP_UI_AVATARS_BASE_URL: string
    readonly VITE_REACT_APP_PLACEHOLDER_IMAGE_URL: string
    readonly VITE_REACT_APP_UNSPLASH_BASE_URL: string
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string
  readonly VITE_PAYPAL_CLIENT_ID: string
  readonly VITE_PAYPAL_ENVIRONMENT: string
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