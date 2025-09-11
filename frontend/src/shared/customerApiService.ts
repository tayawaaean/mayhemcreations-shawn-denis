/**
 * Customer API Service
 * Handles API calls for customer-facing features
 */

import { envConfig } from './envConfig'

const API_BASE_URL = envConfig.getApiBaseUrl()

interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  errors?: any[]
  timestamp: string
}

interface LoginRequest {
  email: string
  password: string
  expectedRole?: string
}

interface RegisterRequest {
  firstName: string
  lastName: string
  email: string
  password: string
}

interface User {
  id: number
  email: string
  firstName: string
  lastName: string
  role: string
  isEmailVerified: boolean
  lastLoginAt?: string
  createdAt: string
  avatar?: string
}

interface LoginResponse {
  user: User
  sessionId: string
  accessToken: string
  refreshToken: string
}

class CustomerApiService {
  private baseUrl: string

  constructor() {
    this.baseUrl = API_BASE_URL
  }

  /**
   * Make authenticated API request
   */
  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    }

    // Add auth token if available
    try {
      const authData = JSON.parse(localStorage.getItem('mayhem_auth') || '{}')
      if (authData.session?.accessToken) {
        defaultHeaders['Authorization'] = `Bearer ${authData.session.accessToken}`
      }
    } catch (error) {
      // Ignore auth token errors for public endpoints
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      credentials: 'include', // Include cookies for session management
    }

    try {
      const response = await fetch(url, config)
      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          message: data.message || `HTTP ${response.status}: ${response.statusText}`,
          errors: data.errors || [],
          timestamp: new Date().toISOString(),
        }
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message,
        timestamp: new Date().toISOString(),
      }
    } catch (error: any) {
      console.error('API request failed:', error)
      return {
        success: false,
        message: error.message || 'Network error occurred',
        errors: [error.message],
        timestamp: new Date().toISOString(),
      }
    }
  }

  /**
   * Customer login
   */
  async login(email: string, password: string, expectedRole: string = 'customer'): Promise<ApiResponse<LoginResponse>> {
    return this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, expectedRole }),
    })
  }

  /**
   * Customer registration
   */
  async register(userData: RegisterRequest): Promise<ApiResponse<LoginResponse>> {
    return this.request<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<ApiResponse<User>> {
    return this.request<User>('/auth/profile')
  }

  /**
   * Update user profile
   */
  async updateProfile(userData: Partial<User>): Promise<ApiResponse<User>> {
    return this.request<User>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(userData),
    })
  }

  /**
   * Logout user
   */
  async logout(): Promise<ApiResponse> {
    return this.request('/auth/logout', {
      method: 'POST',
    })
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> {
    return this.request<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
      method: 'POST',
    })
  }

  /**
   * Test backend connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl.replace('/api/v1', '')}/health`)
      return response.ok
    } catch (error) {
      return false
    }
  }
}

// Export singleton instance
export const customerApiService = new CustomerApiService()
