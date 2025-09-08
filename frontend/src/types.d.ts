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
  customization?: {
    design: {
      name: string
      size: number
      preview: string
    } | null
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
  }
}