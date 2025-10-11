export type AdminProduct = {
  id: string
  title: string
  description: string
  price: number
  salePrice?: number
  costPrice?: number
  sku: string
  status: 'active' | 'draft' | 'archived'
  images: string[]
  primaryImage: string
  category: string
  subcategory: string
  variants: ProductVariant[]
  seo: {
    metaTitle: string
    metaDescription: string
    slug: string
  }
  createdAt: Date
  updatedAt: Date
}

export type ProductVariant = {
  id: string
  color: string
  colorHex: string
  size: string
  stock: number
  sku: string
  price?: number
}

export type Order = {
  id: string
  orderNumber?: string
  customerId: string
  customer: Customer
  items: OrderItem[]
  status: 'pending' | 'preparing' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
  total: number
  subtotal?: number
  shipping?: number
  tax?: number
  shippingAddress: Address
  billingAddress: Address
  paymentMethod: string
  paymentStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded'
  paymentProvider: 'stripe' | 'paypal' | 'google_pay' | 'apple_pay' | 'square' | 'manual'
  paymentDetails?: {
    transactionId?: string
    providerTransactionId?: string
    cardLast4?: string
    cardBrand?: string
    processedAt?: Date
    failedAt?: Date
    refundedAt?: Date
    refundAmount?: number
  }
  trackingNumber?: string
  shippingCarrier?: string
  notes: string[]
  createdAt: Date
  updatedAt: Date
}

export type OrderItem = {
  id: string
  productId: string
  product: AdminProduct
  variant: ProductVariant
  quantity: number
  price: number
  customization?: any
}

export type Customer = {
  id: string
  name: string
  email: string
  phone?: string
  address: Address
  orders: Order[]
  totalSpent: number
  lastOrderDate?: Date
  status: 'active' | 'inactive'
  createdAt: Date
  avatar?: string
}

export type Address = {
  street: string
  city: string
  state: string
  zipCode: string
  country: string
}

export type Category = {
  id: number
  name: string
  slug: string
  description?: string
  image?: string
  parentId?: number
  children?: Category[]
  status: 'active' | 'inactive'
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type FAQ = {
  id: string
  question: string
  answer: string
  category: string
  sortOrder: number
  status: 'active' | 'inactive'
  createdAt: Date
}

export type Message = {
  id: string
  customerId: string
  customer: Customer
  content: string
  type: 'text' | 'image' | 'file'
  isFromAdmin: boolean
  isRead: boolean
  createdAt: Date
  attachments?: string[]
}

export type EmbroideryOption = {
  id: number
  name: string
  description: string
  price: number
  image: string // Base64 encoded image
  stitches: number
  estimatedTime: string
  category: 'coverage' | 'threads' | 'material' | 'border' | 'backing' | 'upgrades' | 'cutting'
  level: 'basic' | 'standard' | 'premium' | 'luxury'
  isPopular: boolean
  isActive: boolean
  isIncompatible?: string // JSON string of incompatible option IDs
  createdAt: string
  updatedAt: string
}

export type Analytics = {
  totalSales: number
  totalOrders: number
  totalProducts: number
  totalCustomers: number
  salesGrowth: number
  ordersGrowth: number
  customersGrowth: number
  revenueChart: { date: string; revenue: number }[]
  topProducts: { product: AdminProduct; sales: number }[]
  recentOrders: Order[]
  lowStockProducts: AdminProduct[]
}

export type AdminUser = {
  id: string
  name: string
  email: string
  role: 'admin' | 'manager' | 'staff'
  avatar?: string
  lastLogin: Date
  status: 'active' | 'inactive'
}

export type Review = {
  id: string
  productId: string
  product: AdminProduct
  customerId: string
  customer: Customer
  rating: number
  title: string
  comment: string
  status: 'pending' | 'approved' | 'rejected'
  isVerified: boolean
  helpfulVotes: number
  createdAt: Date
  updatedAt: Date
  images?: string[]
}

export type MaterialCost = {
  id: number
  name: string
  cost: string | number  // Can be string from DB or number from form
  width: string | number
  length: string | number
  wasteFactor: string | number
  isActive: boolean
  createdAt: string
  updatedAt: string
}
