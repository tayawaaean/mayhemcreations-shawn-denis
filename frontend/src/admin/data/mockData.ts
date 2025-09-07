import { AdminProduct, Order, Customer, Category, FAQ, Message, EmbroideryOption, Analytics, AdminUser } from '../types'

export const mockAdminUser: AdminUser = {
  id: 'admin-1',
  name: 'John Admin',
  email: 'admin@mayhemcreations.com',
  role: 'admin',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
  lastLogin: new Date(),
  status: 'active'
}

export const mockCategories: Category[] = [
  {
    id: 'cat-1',
    name: 'Apparel',
    slug: 'apparel',
    description: 'Clothing and apparel items',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300&h=200&fit=crop',
    status: 'active',
    sortOrder: 1,
    createdAt: new Date('2024-01-01'),
    children: [
      {
        id: 'cat-1-1',
        name: 'T-Shirts',
        slug: 'tshirts',
        parentId: 'cat-1',
        status: 'active',
        sortOrder: 1,
        createdAt: new Date('2024-01-01')
      },
      {
        id: 'cat-1-2',
        name: 'Hoodies',
        slug: 'hoodies',
        parentId: 'cat-1',
        status: 'active',
        sortOrder: 2,
        createdAt: new Date('2024-01-01')
      },
      {
        id: 'cat-1-3',
        name: 'Polo Shirts',
        slug: 'polo-shirts',
        parentId: 'cat-1',
        status: 'active',
        sortOrder: 3,
        createdAt: new Date('2024-01-01')
      }
    ]
  },
  {
    id: 'cat-2',
    name: 'Accessories',
    slug: 'accessories',
    description: 'Bags, caps, and other accessories',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&h=200&fit=crop',
    status: 'active',
    sortOrder: 2,
    createdAt: new Date('2024-01-01'),
    children: [
      {
        id: 'cat-2-1',
        name: 'Caps',
        slug: 'caps',
        parentId: 'cat-2',
        status: 'active',
        sortOrder: 1,
        createdAt: new Date('2024-01-01')
      },
      {
        id: 'cat-2-2',
        name: 'Bags',
        slug: 'bags',
        parentId: 'cat-2',
        status: 'active',
        sortOrder: 2,
        createdAt: new Date('2024-01-01')
      }
    ]
  },
  {
    id: 'cat-3',
    name: 'Embroidery',
    slug: 'embroidery',
    description: 'Custom embroidery patches and services',
    image: 'https://images.unsplash.com/photo-1583744946564-b52ac1c389c8?w=300&h=200&fit=crop',
    status: 'active',
    sortOrder: 3,
    createdAt: new Date('2024-01-01')
  }
]

export const mockProducts: AdminProduct[] = [
  {
    id: 'prod-1',
    title: 'Embroidered Classic Tee',
    description: '100% cotton tee with premium embroidery on chest.',
    price: 24.0,
    salePrice: 19.99,
    costPrice: 12.0,
    sku: 'MC-TEE-001',
    status: 'active',
    images: [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop&crop=center',
      'https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=400&h=400&fit=crop&crop=center'
    ],
    primaryImage: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop&crop=center',
    category: 'Apparel',
    subcategory: 'T-Shirts',
    variants: [
      { id: 'var-1-1', color: 'White', colorHex: '#FFFFFF', size: 'S', stock: 25, sku: 'MC-TEE-001-WH-S' },
      { id: 'var-1-2', color: 'White', colorHex: '#FFFFFF', size: 'M', stock: 30, sku: 'MC-TEE-001-WH-M' },
      { id: 'var-1-3', color: 'White', colorHex: '#FFFFFF', size: 'L', stock: 20, sku: 'MC-TEE-001-WH-L' },
      { id: 'var-1-4', color: 'Black', colorHex: '#000000', size: 'S', stock: 15, sku: 'MC-TEE-001-BK-S' },
      { id: 'var-1-5', color: 'Black', colorHex: '#000000', size: 'M', stock: 35, sku: 'MC-TEE-001-BK-M' },
      { id: 'var-1-6', color: 'Black', colorHex: '#000000', size: 'L', stock: 28, sku: 'MC-TEE-001-BK-L' }
    ],
    seo: {
      metaTitle: 'Embroidered Classic Tee - Mayhem Creations',
      metaDescription: 'Premium cotton t-shirt with custom embroidery. Available in multiple colors and sizes.',
      slug: 'embroidered-classic-tee'
    },
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20')
  },
  {
    id: 'prod-2',
    title: 'Crewneck Hoodie',
    description: 'Cozy hoodie with embroidered logo on chest.',
    price: 42.0,
    costPrice: 25.0,
    sku: 'MC-HOOD-001',
    status: 'active',
    images: [
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop&crop=center'
    ],
    primaryImage: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop&crop=center',
    category: 'Apparel',
    subcategory: 'Hoodies',
    variants: [
      { id: 'var-2-1', color: 'Black', colorHex: '#000000', size: 'S', stock: 12, sku: 'MC-HOOD-001-BK-S' },
      { id: 'var-2-2', color: 'Black', colorHex: '#000000', size: 'M', stock: 18, sku: 'MC-HOOD-001-BK-M' },
      { id: 'var-2-3', color: 'Black', colorHex: '#000000', size: 'L', stock: 8, sku: 'MC-HOOD-001-BK-L' },
      { id: 'var-2-4', color: 'Navy', colorHex: '#1E3A8A', size: 'M', stock: 15, sku: 'MC-HOOD-001-NV-M' },
      { id: 'var-2-5', color: 'Navy', colorHex: '#1E3A8A', size: 'L', stock: 10, sku: 'MC-HOOD-001-NV-L' }
    ],
    seo: {
      metaTitle: 'Crewneck Hoodie - Mayhem Creations',
      metaDescription: 'Comfortable crewneck hoodie with custom embroidery. Perfect for casual wear.',
      slug: 'crewneck-hoodie'
    },
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-18')
  },
  {
    id: 'prod-3',
    title: 'Embroidered Cap',
    description: 'High-profile cap with custom front embroidery.',
    price: 18.0,
    costPrice: 8.0,
    sku: 'MC-CAP-001',
    status: 'active',
    images: [
      'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&h=400&fit=crop&crop=center'
    ],
    primaryImage: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&h=400&fit=crop&crop=center',
    category: 'Accessories',
    subcategory: 'Caps',
    variants: [
      { id: 'var-3-1', color: 'Black', colorHex: '#000000', size: 'One Size', stock: 45, sku: 'MC-CAP-001-BK-OS' },
      { id: 'var-3-2', color: 'Navy', colorHex: '#1E3A8A', size: 'One Size', stock: 32, sku: 'MC-CAP-001-NV-OS' },
      { id: 'var-3-3', color: 'White', colorHex: '#FFFFFF', size: 'One Size', stock: 28, sku: 'MC-CAP-001-WH-OS' }
    ],
    seo: {
      metaTitle: 'Embroidered Cap - Mayhem Creations',
      metaDescription: 'High-quality embroidered cap with custom design. Available in multiple colors.',
      slug: 'embroidered-cap'
    },
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-12')
  }
]

export const mockCustomers: Customer[] = [
  {
    id: 'cust-1',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@email.com',
    phone: '+1-555-0123',
    address: {
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA'
    },
    orders: [],
    totalSpent: 156.50,
    lastOrderDate: new Date('2024-01-20'),
    status: 'active',
    createdAt: new Date('2024-01-01'),
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face'
  },
  {
    id: 'cust-2',
    name: 'Mike Chen',
    email: 'mike.chen@email.com',
    phone: '+1-555-0456',
    address: {
      street: '456 Oak Ave',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90210',
      country: 'USA'
    },
    orders: [],
    totalSpent: 89.99,
    lastOrderDate: new Date('2024-01-18'),
    status: 'active',
    createdAt: new Date('2024-01-05'),
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face'
  },
  {
    id: 'cust-3',
    name: 'Emily Davis',
    email: 'emily.davis@email.com',
    phone: '+1-555-0789',
    address: {
      street: '789 Pine St',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60601',
      country: 'USA'
    },
    orders: [],
    totalSpent: 234.75,
    lastOrderDate: new Date('2024-01-22'),
    status: 'active',
    createdAt: new Date('2024-01-10'),
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face'
  }
]

export const mockOrders: Order[] = [
  {
    id: 'order-1',
    customerId: 'cust-1',
    customer: mockCustomers[0],
    items: [
      {
        id: 'item-1',
        productId: 'prod-1',
        product: mockProducts[0],
        variant: mockProducts[0].variants[1],
        quantity: 2,
        price: 24.0
      }
    ],
    status: 'shipped',
    total: 48.0,
    shippingAddress: mockCustomers[0].address,
    billingAddress: mockCustomers[0].address,
    paymentMethod: 'Credit Card',
    notes: ['Express shipping requested'],
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-21')
  },
  {
    id: 'order-2',
    customerId: 'cust-2',
    customer: mockCustomers[1],
    items: [
      {
        id: 'item-2',
        productId: 'prod-2',
        product: mockProducts[1],
        variant: mockProducts[1].variants[1],
        quantity: 1,
        price: 42.0
      }
    ],
    status: 'processing',
    total: 42.0,
    shippingAddress: mockCustomers[1].address,
    billingAddress: mockCustomers[1].address,
    paymentMethod: 'PayPal',
    notes: [],
    createdAt: new Date('2024-01-18'),
    updatedAt: new Date('2024-01-19')
  }
]

export const mockFAQs: FAQ[] = [
  {
    id: 'faq-1',
    question: 'How long does shipping take?',
    answer: 'Standard shipping takes 3-5 business days, while express shipping takes 1-2 business days.',
    category: 'Shipping',
    sortOrder: 1,
    status: 'active',
    createdAt: new Date('2024-01-01')
  },
  {
    id: 'faq-2',
    question: 'What is your return policy?',
    answer: 'We offer a 30-day return policy for unused items in original packaging.',
    category: 'Returns',
    sortOrder: 1,
    status: 'active',
    createdAt: new Date('2024-01-01')
  },
  {
    id: 'faq-3',
    question: 'Do you offer custom embroidery?',
    answer: 'Yes! We offer custom embroidery services. Contact us for a quote.',
    category: 'Customization',
    sortOrder: 1,
    status: 'active',
    createdAt: new Date('2024-01-01')
  }
]

export const mockMessages: Message[] = [
  {
    id: 'msg-1',
    customerId: 'cust-1',
    customer: mockCustomers[0],
    content: 'Hi, I have a question about my order #order-1',
    type: 'text',
    isFromAdmin: false,
    isRead: false,
    createdAt: new Date('2024-01-22T10:30:00')
  },
  {
    id: 'msg-2',
    customerId: 'cust-1',
    customer: mockCustomers[0],
    content: 'Hello Sarah! I can help you with that. What would you like to know?',
    type: 'text',
    isFromAdmin: true,
    isRead: true,
    createdAt: new Date('2024-01-22T10:35:00')
  },
  {
    id: 'msg-3',
    customerId: 'cust-2',
    customer: mockCustomers[1],
    content: 'When will my hoodie be shipped?',
    type: 'text',
    isFromAdmin: false,
    isRead: true,
    createdAt: new Date('2024-01-22T14:20:00')
  }
]

export const mockEmbroideryOptions: EmbroideryOption[] = [
  {
    id: 'emb-1',
    name: 'Small Coverage (2x2 inches)',
    type: 'coverage',
    price: 5.0,
    description: 'Perfect for small logos or simple designs',
    status: 'active',
    sortOrder: 1,
    createdAt: new Date('2024-01-01')
  },
  {
    id: 'emb-2',
    name: 'Medium Coverage (4x4 inches)',
    type: 'coverage',
    price: 8.0,
    description: 'Ideal for most designs and logos',
    status: 'active',
    sortOrder: 2,
    createdAt: new Date('2024-01-01')
  },
  {
    id: 'emb-3',
    name: 'Large Coverage (6x6 inches)',
    type: 'coverage',
    price: 12.0,
    description: 'For large, detailed designs',
    status: 'active',
    sortOrder: 3,
    createdAt: new Date('2024-01-01')
  },
  {
    id: 'emb-4',
    name: 'Cotton Thread',
    type: 'thread',
    price: 0.0,
    description: 'Standard cotton embroidery thread',
    status: 'active',
    sortOrder: 1,
    createdAt: new Date('2024-01-01')
  },
  {
    id: 'emb-5',
    name: 'Metallic Thread',
    type: 'thread',
    price: 2.0,
    description: 'Premium metallic thread for special effects',
    status: 'active',
    sortOrder: 2,
    createdAt: new Date('2024-01-01')
  }
]

export const mockAnalytics: Analytics = {
  totalSales: 15420.50,
  totalOrders: 89,
  totalProducts: 12,
  totalCustomers: 156,
  salesGrowth: 12.5,
  ordersGrowth: 8.3,
  customersGrowth: 15.2,
  revenueChart: [
    { date: '2024-01-01', revenue: 1200 },
    { date: '2024-01-02', revenue: 1500 },
    { date: '2024-01-03', revenue: 1800 },
    { date: '2024-01-04', revenue: 2200 },
    { date: '2024-01-05', revenue: 1900 },
    { date: '2024-01-06', revenue: 2100 },
    { date: '2024-01-07', revenue: 2400 }
  ],
  topProducts: [
    { product: mockProducts[0], sales: 45 },
    { product: mockProducts[1], sales: 32 },
    { product: mockProducts[2], sales: 28 }
  ],
  recentOrders: mockOrders,
  lowStockProducts: mockProducts.filter(p => p.variants.some(v => v.stock < 10))
}
