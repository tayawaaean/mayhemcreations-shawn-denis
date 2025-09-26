/**
 * Admin API Service
 * Handles API calls for admin-specific features
 */

import { envConfig } from './envConfig'
import { apiAuthService } from './apiAuthService'

const API_BASE_URL = envConfig.getApiBaseUrl()

interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  errors?: any[]
  timestamp: string
}

export interface Customer {
  id: number
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  dateOfBirth?: string
  isEmailVerified: boolean
  isPhoneVerified: boolean
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
  role: {
    id: number
    name: string
    displayName: string
    permissions: string[]
  }
}

export interface CustomerFilters {
  page?: number
  limit?: number
  search?: string
  status?: 'active' | 'inactive' | 'all'
  role?: string
  verified?: 'email' | 'phone' | 'both' | 'none' | 'all'
  sortBy?: 'createdAt' | 'updatedAt' | 'firstName' | 'lastName' | 'email' | 'lastLoginAt'
  sortOrder?: 'asc' | 'desc'
}

export interface CustomerListResponse {
  users: Customer[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

class AdminApiService {
  private baseUrl: string

  constructor() {
    this.baseUrl = API_BASE_URL
  }

  /**
   * Get all customers with optional filtering and pagination
   */
  async getCustomers(filters: CustomerFilters = {}): Promise<ApiResponse<CustomerListResponse>> {
    const params = new URLSearchParams()
    
    if (filters.page) params.append('page', filters.page.toString())
    if (filters.limit) params.append('limit', filters.limit.toString())
    if (filters.search) params.append('search', filters.search)
    if (filters.status) params.append('status', filters.status)
    if (filters.role) params.append('role', filters.role)
    if (filters.verified) params.append('verified', filters.verified)
    if (filters.sortBy) params.append('sortBy', filters.sortBy)
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder)

    const queryString = params.toString()
    const endpoint = `/users${queryString ? `?${queryString}` : ''}`

    return apiAuthService.get<CustomerListResponse>(endpoint, true) // Requires admin auth
  }

  /**
   * Get all customers (simplified version for chat)
   */
  async getAllCustomers(): Promise<ApiResponse<Customer[]>> {
    try {
      const response = await this.getCustomers({ 
        role: 'customer', 
        status: 'active',
        limit: 1000 // Get a large number to get all customers
      })
      
      if (response.success && response.data) {
        return {
          success: true,
          data: response.data.users,
          timestamp: response.timestamp
        }
      }
      
      return response
    } catch (error: any) {
      console.error('Failed to fetch customers:', error)
      return {
        success: false,
        message: error.message || 'Failed to fetch customers',
        errors: [error.message],
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Get customer by ID
   */
  async getCustomerById(id: number): Promise<ApiResponse<Customer>> {
    return apiAuthService.get<Customer>(`/users/${id}`, true) // Requires admin auth
  }

  /**
   * Update customer
   */
  async updateCustomer(id: number, data: Partial<Customer>): Promise<ApiResponse<Customer>> {
    return apiAuthService.put<Customer>(`/users/${id}`, data, true) // Requires admin auth
  }

  /**
   * Update customer status
   */
  async updateCustomerStatus(id: number, isActive: boolean): Promise<ApiResponse<Customer>> {
    return apiAuthService.patch<Customer>(`/users/${id}/status`, { isActive }, true) // Requires admin auth
  }
}

export const adminApiService = new AdminApiService()
