/**
 * OAuth API Service
 * Handles communication with backend OAuth endpoints
 */

import { envConfig } from './envConfig'

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
    this.baseUrl = envConfig.getApiBaseUrl()
  }

  /**
   * Send Google OAuth token to backend for verification
   */
  public async authenticateWithGoogle(
    idToken: string, 
    expectedRole: string = 'customer'
  ): Promise<OAuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken,
          expectedRole
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}: ${response.statusText}`)
      }

      return result
    } catch (error) {
      console.error('❌ Google OAuth API error:', error)
      throw error
    }
  }

  /**
   * Test backend OAuth endpoint connectivity
   */
  public async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl.replace('/api/v1', '')}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      return response.ok
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
      const response = await fetch(`${this.baseUrl}/auth/oauth/providers`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include' // Include session cookies
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('❌ Get OAuth providers error:', error)
      throw error
    }
  }
}

// Export singleton instance
export const oauthApiService = new OAuthApiService()
