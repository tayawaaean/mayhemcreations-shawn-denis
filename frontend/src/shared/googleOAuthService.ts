/**
 * Google OAuth Service
 * Handles Google OAuth authentication flow
 */

import { envConfig } from './envConfig'

// Google OAuth types
export interface GoogleUserInfo {
  id: string
  email: string
  name: string
  given_name: string
  family_name: string
  picture: string
  verified_email: boolean
}

export interface GoogleOAuthResponse {
  credential: string
  select_by: string
}

export interface GoogleOAuthConfig {
  client_id: string
  callback: (response: GoogleOAuthResponse) => void
  auto_select?: boolean
  cancel_on_tap_outside?: boolean
}

// Global Google types
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: GoogleOAuthConfig) => void
          prompt: (callback?: () => void) => void
          renderButton: (element: HTMLElement, config: any) => void
          disableAutoSelect: () => void
          storeCredential: (credential: string, callback: () => void) => void
        }
      }
    }
  }
}

class GoogleOAuthService {
  private isScriptLoaded = false
  private isInitialized = false
  private currentCallback: ((response: GoogleOAuthResponse) => void) | null = null

  /**
   * Load Google OAuth script dynamically
   */
  public async loadScript(): Promise<void> {
    if (this.isScriptLoaded || window.google) {
      this.isScriptLoaded = true
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = envConfig.getGoogleOAuthScriptUrl()
      script.async = true
      script.defer = true
      
      script.onload = () => {
        this.isScriptLoaded = true
        resolve()
      }
      
      script.onerror = () => {
        console.error('❌ Failed to load Google OAuth script')
        reject(new Error('Failed to load Google OAuth script'))
      }
      
      document.head.appendChild(script)
    })
  }

  /**
   * Initialize Google OAuth with client ID and callback
   */
  public async initialize(callback: (response: GoogleOAuthResponse) => void): Promise<void> {
    try {
      // Load script if not already loaded
      await this.loadScript()

      if (!window.google?.accounts?.id) {
        throw new Error('Google OAuth script not available')
      }

      const clientId = envConfig.getGoogleClientId()
      if (!clientId) {
        throw new Error('Google Client ID not configured')
      }

      // Store callback for later use
      this.currentCallback = callback

      // Initialize Google OAuth
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: GoogleOAuthResponse) => {
          callback(response)
        },
        auto_select: false,
        cancel_on_tap_outside: true
      })

      this.isInitialized = true

    } catch (error) {
      console.error('❌ Google OAuth initialization failed:', error)
      throw error
    }
  }

  /**
   * Trigger Google sign-in (deprecated - use renderButton instead)
   */
  public async promptSignIn(): Promise<void> {
    console.warn('⚠️ promptSignIn() is deprecated. Use renderButton() instead.')
    throw new Error('Use renderButton() instead of promptSignIn()')
  }

  /**
   * Render Google sign-in button
   */
  public async renderButton(element: HTMLElement, config: any = {}): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Google OAuth not initialized. Call initialize() first.')
    }

    if (!window.google?.accounts?.id) {
      throw new Error('Google OAuth script not available')
    }

    try {
      const defaultConfig = {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: 250,
        ...config
      }

      window.google.accounts.id.renderButton(element, defaultConfig)
    } catch (error) {
      console.error('❌ Failed to render Google sign-in button:', error)
      throw error
    }
  }

  /**
   * Check if Google OAuth is available
   */
  public isAvailable(): boolean {
    return this.isScriptLoaded && !!window.google?.accounts?.id
  }

  /**
   * Check if Google OAuth is initialized
   */
  public isReady(): boolean {
    return this.isInitialized && this.isAvailable()
  }

  /**
   * Get Google Client ID
   */
  public getClientId(): string {
    return envConfig.getGoogleClientId()
  }

  /**
   * Reset Google OAuth state
   */
  public reset(): void {
    this.isScriptLoaded = false
    this.isInitialized = false
    this.currentCallback = null
  }
}

// Export singleton instance
export const googleOAuthService = new GoogleOAuthService()
