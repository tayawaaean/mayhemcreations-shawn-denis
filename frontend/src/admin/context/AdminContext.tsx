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
        if (response.success) {
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
