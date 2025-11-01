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
        // Check for redirect parameter in URL (from session expiration)
        const urlParams = new URLSearchParams(location.search)
        const redirectPath = urlParams.get('redirect')
        
        // If we already have a user in state, redirect immediately
        if (!isLoading && isLoggedIn && user) {
          hasRedirected.current = true
          
          if (redirectPath) {
            // Decode and navigate to the original page
            const decodedPath = decodeURIComponent(redirectPath)
            navigate(decodedPath, { replace: true })
          } else {
            // Navigate based on role only if no redirect parameter
            if (user.role === 'admin') {
              navigate('/admin', { replace: true })
            } else if (user.role === 'seller') {
              navigate('/seller', { replace: true })
            }
          }
        } else {
          // Only validate session if we don't have a user yet
          const isValid = await centralizedAuthService.validateSession()
          
          if (isValid && !isLoading && isLoggedIn && user) {
            hasRedirected.current = true
            
            if (redirectPath) {
              // Decode and navigate to the original page
              const decodedPath = decodeURIComponent(redirectPath)
              navigate(decodedPath, { replace: true })
            } else {
              // Navigate based on role only if no redirect parameter
              if (user.role === 'admin') {
                navigate('/admin', { replace: true })
              } else if (user.role === 'seller') {
                navigate('/seller', { replace: true })
              }
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
