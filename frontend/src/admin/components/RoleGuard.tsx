import React from 'react'
import { useRole } from '../context/RoleContext'
import { Shield, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

interface RoleGuardProps {
  children: React.ReactNode
  adminOnly?: boolean
  sellerOnly?: boolean
  fallback?: React.ReactNode
}

const RoleGuard: React.FC<RoleGuardProps> = ({ 
  children, 
  adminOnly = false, 
  sellerOnly = false, 
  fallback 
}) => {
  const { isAdmin, isSeller, role } = useRole()

  // If no role restrictions, show children
  if (!adminOnly && !sellerOnly) {
    return <>{children}</>
  }

  // Check access
  const hasAccess = 
    (adminOnly && isAdmin) || 
    (sellerOnly && isSeller) ||
    (!adminOnly && !sellerOnly)

  if (hasAccess) {
    return <>{children}</>
  }

  // Show fallback or default access denied
  if (fallback) {
    return <>{fallback}</>
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
        <div className="flex justify-center mb-4">
          <Shield className="h-16 w-16 text-red-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Access Denied
        </h1>
        
        <p className="text-gray-600 mb-6">
          You don't have permission to access this page. This page is only available to{' '}
          {adminOnly ? 'administrators' : 'sellers'}.
        </p>
        
        <div className="space-y-3">
          <Link
            to={isAdmin ? '/admin' : isSeller ? '/seller' : '/'}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back to Dashboard
          </Link>
          
          <p className="text-sm text-gray-500">
            Current role: <span className="font-medium capitalize">{role}</span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default RoleGuard
