import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Home, ArrowLeft, Settings, Users, Package, BarChart3, MessageSquare } from 'lucide-react'

const AdminNotFound: React.FC = () => {
  const navigate = useNavigate()

  const handleGoBack = () => {
    navigate(-1)
  }

  const quickLinks = [
    { name: 'Dashboard', path: '/admin', icon: BarChart3 },
    { name: 'Products', path: '/admin/products', icon: Package },
    { name: 'Customers', path: '/admin/customers', icon: Users },
    { name: 'Messages', path: '/admin/messages', icon: MessageSquare },
    { name: 'Settings', path: '/admin/profile', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center">
          {/* 404 Illustration */}
          <div className="mx-auto h-48 w-48 mb-8">
            <div className="relative">
              {/* Large 404 Text */}
              <div className="text-8xl font-bold text-gray-200 select-none">
                404
              </div>
              {/* Decorative Elements */}
              <div className="absolute top-6 right-6 h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Settings className="h-6 w-6 text-blue-600" />
              </div>
              <div className="absolute bottom-6 left-6 h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                <Package className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </div>

          {/* Error Message */}
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Admin Page Not Found
          </h1>
          <p className="text-base text-gray-600 mb-8">
            The admin page you're looking for doesn't exist or has been moved.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <button
              onClick={handleGoBack}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </button>
            <Link
              to="/admin"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <Home className="h-4 w-4 mr-2" />
              Dashboard
            </Link>
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Quick Access
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {quickLinks.map((link) => {
                const Icon = link.icon
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    className="flex items-center p-2 rounded-md border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors group"
                  >
                    <Icon className="h-4 w-4 text-gray-400 group-hover:text-gray-600 mr-2" />
                    <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900">
                      {link.name}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Need help? Check the{' '}
              <Link
                to="/admin/system-logs"
                className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
              >
                system logs
              </Link>{' '}
              or contact support.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminNotFound
