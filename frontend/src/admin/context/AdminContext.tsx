import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react'
import { AdminProduct, Order, Customer, Category, FAQ, Message, EmbroideryOption, Analytics, Review, AdminUser } from '../types'
import { 
  mockProducts, 
  mockOrders, 
  mockCustomers, 
  mockFAQs, 
  mockMessages, 
  mockAnalytics,
  mockReviews,
  mockAdminUsers
} from '../data/mockData'
import { embroideryOptionApiService } from '../../shared/embroideryOptionApiService'
import { adminAnalyticsApiService } from '../../shared/adminAnalyticsApiService'

type AdminState = {
  products: AdminProduct[]
  orders: Order[]
  customers: Customer[]
  users: AdminUser[]
  faqs: FAQ[]
  messages: Message[]
  embroideryOptions: EmbroideryOption[]
  reviews: Review[]
  analytics: Analytics
  selectedProduct: AdminProduct | null
  selectedOrder: Order | null
  selectedCustomer: Customer | null
  selectedReview: Review | null
  loading: boolean
  error: string | null
}

type AdminAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_PRODUCTS'; payload: AdminProduct[] }
  | { type: 'ADD_PRODUCT'; payload: AdminProduct }
  | { type: 'UPDATE_PRODUCT'; payload: AdminProduct }
  | { type: 'DELETE_PRODUCT'; payload: string }
  | { type: 'SET_ORDERS'; payload: Order[] }
  | { type: 'UPDATE_ORDER'; payload: Order }
  | { type: 'SET_CUSTOMERS'; payload: Customer[] }
  | { type: 'SET_USERS'; payload: AdminUser[] }
  | { type: 'ADD_USER'; payload: AdminUser }
  | { type: 'UPDATE_USER'; payload: AdminUser }
  | { type: 'DELETE_USER'; payload: string }
  | { type: 'SET_FAQS'; payload: FAQ[] }
  | { type: 'ADD_FAQ'; payload: FAQ }
  | { type: 'UPDATE_FAQ'; payload: FAQ }
  | { type: 'DELETE_FAQ'; payload: string }
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_EMBROIDERY_OPTIONS'; payload: EmbroideryOption[] }
  | { type: 'ADD_EMBROIDERY_OPTION'; payload: EmbroideryOption }
  | { type: 'UPDATE_EMBROIDERY_OPTION'; payload: EmbroideryOption }
  | { type: 'DELETE_EMBROIDERY_OPTION'; payload: number }
  | { type: 'SET_REVIEWS'; payload: Review[] }
  | { type: 'ADD_REVIEW'; payload: Review }
  | { type: 'UPDATE_REVIEW'; payload: Review }
  | { type: 'DELETE_REVIEW'; payload: string }
  | { type: 'SET_SELECTED_PRODUCT'; payload: AdminProduct | null }
  | { type: 'SET_SELECTED_ORDER'; payload: Order | null }
  | { type: 'SET_SELECTED_CUSTOMER'; payload: Customer | null }
  | { type: 'SET_SELECTED_REVIEW'; payload: Review | null }
  | { type: 'SET_ANALYTICS'; payload: Analytics }

const initialState: AdminState = {
  products: mockProducts,
  orders: mockOrders,
  customers: mockCustomers,
  users: mockAdminUsers,
  faqs: mockFAQs,
  messages: mockMessages,
  embroideryOptions: [],
  reviews: mockReviews,
  analytics: mockAnalytics,
  selectedProduct: null,
  selectedOrder: null,
  selectedCustomer: null,
  selectedReview: null,
  loading: false,
  error: null
}

const adminReducer = (state: AdminState, action: AdminAction): AdminState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'SET_PRODUCTS':
      return { ...state, products: action.payload }
    case 'ADD_PRODUCT':
      return { ...state, products: [...state.products, action.payload] }
    case 'UPDATE_PRODUCT':
      return {
        ...state,
        products: state.products.map(p => p.id === action.payload.id ? action.payload : p)
      }
    case 'DELETE_PRODUCT':
      return {
        ...state,
        products: state.products.filter(p => p.id !== action.payload)
      }
    case 'SET_ORDERS':
      return { ...state, orders: action.payload }
    case 'UPDATE_ORDER':
      return {
        ...state,
        orders: state.orders.map(o => o.id === action.payload.id ? action.payload : o)
      }
    case 'SET_CUSTOMERS':
      return { ...state, customers: action.payload }
    case 'SET_USERS':
      return { ...state, users: action.payload }
    case 'ADD_USER':
      return { ...state, users: [...state.users, action.payload] }
    case 'UPDATE_USER':
      return {
        ...state,
        users: state.users.map(u => u.id === action.payload.id ? action.payload : u)
      }
    case 'DELETE_USER':
      return {
        ...state,
        users: state.users.filter(u => u.id !== action.payload)
      }
    case 'SET_FAQS':
      return { ...state, faqs: action.payload }
    case 'ADD_FAQ':
      return { ...state, faqs: [...state.faqs, action.payload] }
    case 'UPDATE_FAQ':
      return {
        ...state,
        faqs: state.faqs.map(f => f.id === action.payload.id ? action.payload : f)
      }
    case 'DELETE_FAQ':
      return {
        ...state,
        faqs: state.faqs.filter(f => f.id !== action.payload)
      }
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload }
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] }
    case 'SET_EMBROIDERY_OPTIONS':
      return { ...state, embroideryOptions: action.payload }
    case 'ADD_EMBROIDERY_OPTION':
      return { ...state, embroideryOptions: [...state.embroideryOptions, action.payload] }
    case 'UPDATE_EMBROIDERY_OPTION':
      return {
        ...state,
        embroideryOptions: state.embroideryOptions.map(e => e.id === action.payload.id ? action.payload : e)
      }
    case 'DELETE_EMBROIDERY_OPTION':
      return {
        ...state,
        embroideryOptions: state.embroideryOptions.filter(e => e.id !== action.payload)
      }
    case 'SET_REVIEWS':
      return { ...state, reviews: action.payload }
    case 'ADD_REVIEW':
      return { ...state, reviews: [...state.reviews, action.payload] }
    case 'UPDATE_REVIEW':
      return {
        ...state,
        reviews: state.reviews.map(r => r.id === action.payload.id ? action.payload : r)
      }
    case 'DELETE_REVIEW':
      return {
        ...state,
        reviews: state.reviews.filter(r => r.id !== action.payload)
      }
    case 'SET_SELECTED_PRODUCT':
      return { ...state, selectedProduct: action.payload }
    case 'SET_SELECTED_ORDER':
      return { ...state, selectedOrder: action.payload }
    case 'SET_SELECTED_CUSTOMER':
      return { ...state, selectedCustomer: action.payload }
    case 'SET_SELECTED_REVIEW':
      return { ...state, selectedReview: action.payload }
    case 'SET_ANALYTICS':
      return { ...state, analytics: action.payload }
    default:
      return state
  }
}

const AdminContext = createContext<{
  state: AdminState
  dispatch: React.Dispatch<AdminAction>
} | null>(null)

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(adminReducer, initialState)

  // Fetch embroidery options from API on mount
  useEffect(() => {
    const fetchEmbroideryOptions = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true })
        const response = await embroideryOptionApiService.getEmbroideryOptions()
        if (response.success && response.data) {
          dispatch({ type: 'SET_EMBROIDERY_OPTIONS', payload: response.data })
        }
      } catch (error) {
        console.error('Failed to fetch embroidery options:', error)
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load embroidery options' })
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    }

    fetchEmbroideryOptions()
  }, [])

  // Fetch analytics data from API on mount
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        console.log('🔄 Fetching analytics data...')
        const response = await adminAnalyticsApiService.getDashboardAnalytics()
        
        if (response.success && response.data) {
          console.log('📊 Analytics API Response:', response.data)
          console.log('👥 Total Customers from API:', response.data.totalCustomers)
          console.log('📦 Total Products from API:', response.data.totalProducts)
          console.log('⚠️ Low Stock Variants from API:', response.data.lowStockVariants)
          console.log('⚠️ Low Stock Count:', response.data.lowStockCount)
          
          // Convert the API data to match the Analytics type
          const analyticsData: Analytics = {
            totalSales: mockAnalytics.totalSales, // Keep mock for now, can be replaced later
            totalOrders: mockAnalytics.totalOrders, // Keep mock for now, can be replaced later
            totalProducts: response.data.totalProducts,
            totalCustomers: response.data.totalCustomers,
            salesGrowth: mockAnalytics.salesGrowth, // Keep mock for now
            ordersGrowth: mockAnalytics.ordersGrowth, // Keep mock for now
            customersGrowth: mockAnalytics.customersGrowth, // Keep mock for now
            revenueChart: mockAnalytics.revenueChart, // Keep mock for now
            topProducts: mockAnalytics.topProducts, // Keep mock for now
            recentOrders: mockAnalytics.recentOrders, // Keep mock for now
            lowStockProducts: response.data.lowStockVariants.map(variant => ({
              id: variant.id.toString(),
              title: variant.product?.title || variant.name || 'Unknown Product',
              slug: variant.product?.slug || '',
              sku: variant.sku,
              price: variant.price || variant.product?.price || 0,
              status: 'active' as 'active' | 'draft' | 'archived',
              featured: false,
              stock: variant.stock,
              image: variant.image || variant.product?.image || '',
              alt: variant.product?.title || variant.name || '',
              description: '', // Default value
              shortDescription: '', // Default value
              images: [variant.image || variant.product?.image || ''].filter(Boolean),
              primaryImage: variant.image || variant.product?.image || '',
              category: variant.product?.category?.name || 'Uncategorized',
              subcategory: '', // Default value
              variants: [{
                id: variant.id.toString(),
                name: variant.name,
                color: variant.color || 'Default',
                colorHex: variant.colorHex || '#000000',
                size: variant.size || 'One Size',
                sku: variant.sku,
                stock: variant.stock,
                price: variant.price || variant.product?.price || 0,
                weight: variant.weight || 0,
                dimensions: variant.dimensions || '',
                isActive: variant.isActive
              }],
              tags: [], // Default value
              metaTitle: '', // Default value
              metaDescription: '', // Default value
              seo: {
                metaTitle: '',
                metaDescription: '',
                slug: variant.product?.slug || ''
              },
              createdAt: new Date(variant.createdAt),
              updatedAt: new Date(variant.updatedAt)
            }))
          }
          
          dispatch({ type: 'SET_ANALYTICS', payload: analyticsData })
          console.log('✅ Analytics data loaded successfully')
          console.log('⚠️ Final Low Stock Products:', analyticsData.lowStockProducts)
          console.log('⚠️ Final Low Stock Count:', analyticsData.lowStockProducts.length)
        } else {
          console.error('❌ Failed to fetch analytics:', response.message)
        }
      } catch (error) {
        console.error('❌ Error fetching analytics:', error)
      }
    }

    fetchAnalytics()
  }, [])

  return (
    <AdminContext.Provider value={{ state, dispatch }}>
      {children}
    </AdminContext.Provider>
  )
}

export const useAdmin = () => {
  const context = useContext(AdminContext)
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider')
  }
  return context
}
