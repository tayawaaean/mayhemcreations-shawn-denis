import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Home, ArrowLeft, Search, ShoppingBag, User, HelpCircle } from 'lucide-react'

const NotFound: React.FC = () => {
  const navigate = useNavigate()

  const handleGoBack = () => {
    navigate(-1)
  }

  const quickLinks = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Products', path: '/products', icon: ShoppingBag },
    { name: 'About', path: '/about', icon: User },
    { name: 'FAQ', path: '/faq', icon: HelpCircle },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          {/* 404 Illustration */}
          <div className="mx-auto h-64 w-64 mb-8">
            <div className="relative">
              {/* Large 404 Text */}
              <div className="text-9xl font-bold text-gray-200 select-none">
                404
              </div>
              {/* Decorative Elements */}
              <div className="absolute top-8 right-8 h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Search className="h-8 w-8 text-blue-600" />
              </div>
              <div className="absolute bottom-8 left-8 h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                <ShoppingBag className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>

          {/* Error Message */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Page Not Found
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
            Sorry, we couldn't find the page you're looking for. It might have been moved, deleted, or you entered the wrong URL.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button
              onClick={handleGoBack}
              className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Go Back
            </button>
            <Link
              to="/"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <Home className="h-5 w-5 mr-2" />
              Go Home
            </Link>
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-lg shadow-sm p-6 max-w-md mx-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Popular Pages
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {quickLinks.map((link) => {
                const Icon = link.icon
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors group"
                  >
                    <Icon className="h-5 w-5 text-gray-400 group-hover:text-gray-600 mr-3" />
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                      {link.name}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Still can't find what you're looking for?{' '}
              <Link
                to="/contact"
                className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
              >
                Contact our support team
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotFound
