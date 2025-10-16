import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  fallbackPath?: string
}

export default function ProtectedRoute({ 
  children, 
  fallbackPath = '/contact' 
}: ProtectedRouteProps) {
  const { user, isLoggedIn, isLoading } = useAuth()
  const location = useLocation()

  // Check for PayPal return bypass flag
  // This allows users returning from PayPal to access the payment page even if auth is temporarily lost
  const paypalReturnExpected = sessionStorage.getItem('paypal_return_expected')
  const paypalReturnTimestamp = sessionStorage.getItem('paypal_return_timestamp')
  const urlParams = new URLSearchParams(location.search)
  const hasPayPalToken = urlParams.get('token') && urlParams.get('PayerID')
  
  // Check if this is a PayPal return within 10 minutes
  const isRecentPayPalReturn = paypalReturnTimestamp && 
    (Date.now() - parseInt(paypalReturnTimestamp)) < 600000 // 10 minutes

  // Debug logging for auth state
  console.log('🔐 ProtectedRoute check:', {
    path: location.pathname,
    search: location.search,
    isLoggedIn,
    isLoading,
    userId: user?.id,
    fallbackPath,
    hasPayPalToken,
    paypalReturnExpected,
    isRecentPayPalReturn
  })

  if (isLoading) {
    console.log('⏳ Auth still loading, showing spinner...')
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    )
  }

  // Allow access if returning from PayPal with valid flag
  if (!isLoggedIn && hasPayPalToken && paypalReturnExpected && isRecentPayPalReturn) {
    console.log('✅ PayPal return detected, bypassing auth check')
    return <>{children}</>
  }

  if (!isLoggedIn) {
    console.log(`❌ Not logged in, redirecting to ${fallbackPath}`)
    return <Navigate to={fallbackPath} state={{ from: location }} replace />
  }

  console.log('✅ Auth check passed, rendering protected content')
  return <>{children}</>
}
