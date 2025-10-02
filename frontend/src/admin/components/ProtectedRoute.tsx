import React, { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'
import { centralizedAuthService } from '../../shared/centralizedAuthService'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'seller'
  fallbackPath?: string
}

export default function ProtectedRoute({ 
  children, 
  requiredRole, 
  fallbackPath = '/employee-login' 
}: ProtectedRouteProps) {
  const { user, isLoggedIn, isLoading } = useAdminAuth()
  const location = useLocation()
  const [isValidating, setIsValidating] = useState(true)

  // Simple validation - just check if we have a user
  useEffect(() => {
    const validateSession = async () => {
      console.log('🔐 ProtectedRoute: Checking auth state...')
      setIsValidating(true)
      
      // Simple check - if we have a user in state, we're good
      // Let axios interceptor handle token refresh automatically
      if (isLoggedIn && user) {
        console.log('🔐 ProtectedRoute: User authenticated, access granted')
      } else {
        console.log('🔐 ProtectedRoute: No user, will redirect to login')
      }
      
      setIsValidating(false)
    }

    // Quick validation after auth context initializes
    const timer = setTimeout(validateSession, 500)
    
    return () => {
      clearTimeout(timer)
    }
  }, [isLoggedIn, user])

  // Show loading while authentication is being checked or validated
  if (isLoading || isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Only redirect if we're sure the user is not authenticated
  if (!isLoggedIn || !user) {
    console.log('🔐 ProtectedRoute: User not authenticated, redirecting to:', fallbackPath)
    return <Navigate to={fallbackPath} state={{ from: location }} replace />
  }

  // Check role-based access
  if (requiredRole && user.role !== requiredRole) {
    console.log('🔐 ProtectedRoute: Role mismatch, redirecting to appropriate dashboard')
    // Redirect to appropriate dashboard based on user role
    const redirectPath = user.role === 'admin' ? '/admin' : '/seller'
    return <Navigate to={redirectPath} replace />
  }

  console.log('🔐 ProtectedRoute: Access granted for user:', user.role)
  return <>{children}</>
}
