import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isLoggedIn) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />
  }

  if (requiredRole && user?.role !== requiredRole) {
    // Redirect to appropriate dashboard based on user role
    const redirectPath = user?.role === 'admin' ? '/admin' : '/seller'
    return <Navigate to={redirectPath} replace />
  }

  return <>{children}</>
}
