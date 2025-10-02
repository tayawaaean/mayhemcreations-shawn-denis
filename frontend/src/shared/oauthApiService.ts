/**
 * OAuth API Service
 * Handles communication with backend OAuth endpoints
 */

import { envConfig } from './envConfig'
import { apiClient } from './axiosConfig'

export interface OAuthUser {
  id: number
  email: string
  firstName: string
  lastName: string
  role: string
  isEmailVerified: boolean
  avatar?: string
}

export interface OAuthSession {
  sessionId: string
  accessToken: string
  refreshToken: string
}

export interface OAuthResponse {
  success: boolean
  message: string
  data?: {
    user: OAuthUser
    sessionId: string
    accessToken: string
    refreshToken: string
  }
}

export interface OAuthError {
  success: false
  message: string
  error?: string
}

class OAuthApiService {
  private baseUrl: string

  constructor() {
    // In development, use relative URL to leverage Vite proxy
    const apiUrl = envConfig.getApiBaseUrl()
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      // Use relative URL in development to leverage Vite proxy
      this.baseUrl = '/api/v1'
    } else {
      this.baseUrl = apiUrl
    }
  }

  /**
   * Send Google OAuth token to backend for verification
   */
  public async authenticateWithGoogle(
    idToken: string, 
    expectedRole: string = 'customer'
  ): Promise<OAuthResponse> {
    try {
      const response = await apiClient.post('/auth/google', {
        idToken,
        expectedRole
      })

      return response.data
    } catch (error: any) {
      console.error('❌ Google OAuth API error:', error)
      throw new Error(error.response?.data?.message || error.message || 'An error occurred during Google login')
    }
  }

  /**
   * Test backend OAuth endpoint connectivity
   */
  public async testConnection(): Promise<boolean> {
    try {
      const response = await apiClient.get('/health')
      return response.status === 200
    } catch (error) {
      console.error('❌ Backend connection test failed:', error)
      return false
    }
  }

  /**
   * Get OAuth providers for a user
   */
  public async getOAuthProviders(): Promise<any> {
    try {
      const response = await apiClient.get('/auth/oauth/providers')
      return response.data
    } catch (error) {
      console.error('❌ Get OAuth providers error:', error)
      throw error
    }
  }
}

// Export singleton instance
export const oauthApiService = new OAuthApiService()
