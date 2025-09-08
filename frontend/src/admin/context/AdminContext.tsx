import React, { createContext, useContext, useReducer, ReactNode } from 'react'
import { AdminProduct, Order, Customer, Category, FAQ, Message, EmbroideryOption, Analytics, Review } from '../types'
import { 
  mockProducts, 
  mockOrders, 
  mockCustomers, 
  mockCategories, 
  mockFAQs, 
  mockMessages, 
  mockEmbroideryOptions, 
  mockAnalytics,
  mockReviews
} from '../data/mockData'

type AdminState = {
  products: AdminProduct[]
  orders: Order[]
  customers: Customer[]
  categories: Category[]
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
  | { type: 'SET_CATEGORIES'; payload: Category[] }
  | { type: 'ADD_CATEGORY'; payload: Category }
  | { type: 'UPDATE_CATEGORY'; payload: Category }
  | { type: 'DELETE_CATEGORY'; payload: string }
  | { type: 'SET_FAQS'; payload: FAQ[] }
  | { type: 'ADD_FAQ'; payload: FAQ }
  | { type: 'UPDATE_FAQ'; payload: FAQ }
  | { type: 'DELETE_FAQ'; payload: string }
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_EMBROIDERY_OPTIONS'; payload: EmbroideryOption[] }
  | { type: 'ADD_EMBROIDERY_OPTION'; payload: EmbroideryOption }
  | { type: 'UPDATE_EMBROIDERY_OPTION'; payload: EmbroideryOption }
  | { type: 'DELETE_EMBROIDERY_OPTION'; payload: string }
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
  categories: mockCategories,
  faqs: mockFAQs,
  messages: mockMessages,
  embroideryOptions: mockEmbroideryOptions,
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
    case 'SET_CATEGORIES':
      return { ...state, categories: action.payload }
    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, action.payload] }
    case 'UPDATE_CATEGORY':
      return {
        ...state,
        categories: state.categories.map(c => c.id === action.payload.id ? action.payload : c)
      }
    case 'DELETE_CATEGORY':
      return {
        ...state,
        categories: state.categories.filter(c => c.id !== action.payload)
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
