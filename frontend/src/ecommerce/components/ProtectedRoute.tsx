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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    )
  }

  if (!isLoggedIn) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />
  }

  return <>{children}</>
}
