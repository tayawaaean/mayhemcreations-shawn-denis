/**
 * Customer API Service
 * Handles API calls for customer-facing features
 */

import { envConfig } from './envConfig'
import { apiClient } from './axiosConfig'

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
    try {
      const response = await apiClient.request({
        url: endpoint,
        method: options.method || 'GET',
        data: options.body ? JSON.parse(options.body as string) : undefined,
        headers: options.headers,
        ...options,
      })

      return response.data
    } catch (error: any) {
      console.error('API request failed:', error)
      
      // Handle axios errors
      if (error.response) {
        return {
          success: false,
          message: error.response.data?.message || `HTTP ${error.response.status}: ${error.response.statusText}`,
          errors: error.response.data?.errors || [error.response.data?.message || 'Request failed'],
          timestamp: new Date().toISOString(),
        }
      } else if (error.request) {
        return {
          success: false,
          message: 'Network error - please check your connection',
          errors: ['NETWORK_ERROR'],
          timestamp: new Date().toISOString(),
        }
      } else {
        return {
          success: false,
          message: error.message || 'An error occurred',
          errors: [error.message || 'Request failed'],
          timestamp: new Date().toISOString(),
        }
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
   * Verify email with token
   * @param token - The verification token received via email
   * @returns Promise<ApiResponse> - Response containing verification status
   * @throws {Error} When verification fails or token is invalid
   */
  async verifyEmail(token: string): Promise<ApiResponse> {
    return this.request('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
  }

  /**
   * Resend verification email
   * @param email - The email address to resend verification to
   * @returns Promise<ApiResponse> - Response containing resend status
   * @throws {Error} When resend fails or email is not found
   */
  async resendVerificationEmail(email: string): Promise<ApiResponse> {
    return this.request('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
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
      const response = await apiClient.get('/health')
      return response.status === 200
    } catch (error) {
      return false
    }
  }
}

// Export singleton instance
export const customerApiService = new CustomerApiService()
