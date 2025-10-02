import React, { useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'
import { centralizedAuthService } from '../../shared/centralizedAuthService'
import EmployeeLogin from './EmployeeLogin'

export default function EmployeeLoginWrapper() {
  const { login, user, isLoggedIn, isLoading } = useAdminAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const hasRedirected = useRef(false)

  // Validate session and redirect authenticated users
  useEffect(() => {
    const validateAndRedirect = async () => {
      // Only redirect if we haven't already redirected
      if (!hasRedirected.current) {
        console.log('🔄 EmployeeLoginWrapper: Checking auth state...')
        
        // If we already have a user in state, redirect immediately
        if (!isLoading && isLoggedIn && user) {
          console.log('🔄 EmployeeLoginWrapper: User already authenticated, redirecting to dashboard...', user)
          hasRedirected.current = true
          
          if (user.role === 'admin') {
            console.log('🔄 Redirecting admin to /admin')
            navigate('/admin', { replace: true })
          } else if (user.role === 'seller') {
            console.log('🔄 Redirecting seller to /seller')
            navigate('/seller', { replace: true })
          }
        } else {
          // Only validate session if we don't have a user yet
          console.log('🔄 EmployeeLoginWrapper: No user in state, validating session...')
          const isValid = await centralizedAuthService.validateSession()
          
          if (isValid && !isLoading && isLoggedIn && user) {
            console.log('🔄 EmployeeLoginWrapper: User authenticated after validation, redirecting to dashboard...', user)
            hasRedirected.current = true
            
            if (user.role === 'admin') {
              console.log('🔄 Redirecting admin to /admin')
              navigate('/admin', { replace: true })
            } else if (user.role === 'seller') {
              console.log('🔄 Redirecting seller to /seller')
              navigate('/seller', { replace: true })
            }
          }
        }
      }
    }

    // Add a small delay to let the auth context initialize
    const timer = setTimeout(validateAndRedirect, 200)
    
    return () => clearTimeout(timer)
  }, [isLoading, isLoggedIn, user, navigate])

  // Reset redirect flag when location changes
  useEffect(() => {
    hasRedirected.current = false
  }, [location.pathname])

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // If user is already authenticated, don't show login form
  if (isLoggedIn && user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return <EmployeeLogin onLogin={login} />
}
