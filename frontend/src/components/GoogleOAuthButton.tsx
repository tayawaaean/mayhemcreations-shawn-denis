/**
 * Google OAuth Button Component
 * Reusable Google sign-in button with proper error handling
 */

import React, { useState, useEffect, useRef } from 'react'
import { googleOAuthService, GoogleOAuthResponse } from '../shared/googleOAuthService'

interface GoogleOAuthButtonProps {
  onSuccess: (response: GoogleOAuthResponse) => void
  onError: (error: string) => void
  disabled?: boolean
  className?: string
  buttonText?: string
  size?: 'small' | 'medium' | 'large'
  theme?: 'outline' | 'filled_blue' | 'filled_black'
}

export default function GoogleOAuthButton({
  onSuccess,
  onError,
  disabled = false,
  className = '',
  buttonText = 'Continue with Google',
  size = 'large',
  theme = 'outline'
}: GoogleOAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const buttonRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    initializeGoogleOAuth()
  }, [])

  // Render button when initialized and ref is available
  useEffect(() => {
    if (isInitialized && buttonRef.current) {
      renderGoogleButton()
    }
  }, [isInitialized])

  const initializeGoogleOAuth = async () => {
    try {
      setIsLoading(true)
      
      await googleOAuthService.initialize((response: GoogleOAuthResponse) => {
        console.log('🔐 Google OAuth success:', response)
        onSuccess(response)
      })

      setIsInitialized(true)
      
    } catch (error: any) {
      console.error('❌ Google OAuth initialization failed:', error)
      onError(error.message || 'Failed to initialize Google OAuth')
    } finally {
      setIsLoading(false)
    }
  }

  const renderGoogleButton = async () => {
    if (!buttonRef.current || !isInitialized) return

    try {
      await googleOAuthService.renderButton(buttonRef.current, {
        theme,
        size,
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: 250
      })
    } catch (error: any) {
      console.error('❌ Failed to render Google button:', error)
      onError(error.message || 'Failed to render Google sign-in button')
    }
  }


  // Show loading state
  if (isLoading) {
    return (
      <div className={`google-oauth-button loading ${className}`}>
        <div className="flex items-center justify-center p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          <span className="text-sm text-gray-600">Loading...</span>
        </div>
      </div>
    )
  }

  // Show error state if not initialized
  if (!isInitialized) {
    return (
      <div className={`google-oauth-button error ${className}`}>
        <div className="flex items-center justify-center p-3 bg-red-50 border border-red-200 rounded-lg">
          <span className="text-sm text-red-600">Google OAuth Not Available</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`google-oauth-button ${className}`}>
      {/* Google's official button */}
      <div 
        ref={buttonRef} 
        className="google-button-container w-full flex justify-center"
        style={{ minHeight: '48px' }}
      ></div>
    </div>
  )
}
