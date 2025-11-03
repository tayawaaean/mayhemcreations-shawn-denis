import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, AlertCircle, Building2 } from 'lucide-react'
import Button from '../../components/Button'
import { loggingService } from '../../shared/loggingService'
import { apiService } from '../services/apiService'
import MultiAccountStorageService from '../../shared/multiAccountStorage'

interface EmployeeUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'admin' | 'manager' | 'designer' | 'support' | 'moderator'
  avatar?: string
}


interface EmployeeLoginProps {
  onLogin: (user: EmployeeUser) => void
}

export default function EmployeeLogin({ onLogin }: EmployeeLoginProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [errorCategory, setErrorCategory] = useState<'timeout' | 'network' | 'server' | 'rate_limit' | 'auth' | 'validation' | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // Call the real API for authentication with employee role validation
      const response = await apiService.login(formData.email, formData.password, 'employee')
      
      if (response.success) {
        // Login succeeded, but apiService.login doesn't return user data
        // We need to get the user data from centralizedAuthService or storage
        // Wait a moment for centralizedAuthService to process the login
        await new Promise(resolve => setTimeout(resolve, 200))
        
        // Get user data from centralized auth service
        const currentAccount = MultiAccountStorageService.getCurrentAccountData()
        
        if (!currentAccount || !currentAccount.user) {
          setError('Login successful but user data not found. Please try again.')
          setIsLoading(false)
          return
        }
        
        const apiUser = currentAccount.user
        const sessionId = currentAccount.session?.sessionId
        
        // Create employee user object
        const employeeUser: EmployeeUser = {
          id: apiUser.id.toString(),
          email: apiUser.email,
          firstName: apiUser.firstName,
          lastName: apiUser.lastName,
          role: apiUser.role as 'admin' | 'manager' | 'designer' | 'support' | 'moderator',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${apiUser.firstName.toLowerCase()}`
        }

        // Auth data is already stored by centralizedAuthService.login()
        // Just ensure the current account is set correctly
        const currentAccountData = MultiAccountStorageService.getCurrentAccountData()
        if (!currentAccountData || currentAccountData.user.accountType !== 'employee') {
          MultiAccountStorageService.setCurrentAccount('employee')
        }

        // Log successful login attempt
        const logRole = employeeUser.role === 'admin' ? 'admin' : 'seller'
        loggingService.logLoginAttempt(formData.email, true, logRole)
        
        // Auth data is already stored in MultiAccountStorageService
        // AdminAuthContext will automatically pick up the user from centralizedAuthService subscription
        // No need to call onLogin callback - it would cause errors since login function signature doesn't match
        
        // Small delay to ensure auth context picks up the stored data
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Check for redirect parameter in URL (from session expiration)
        const urlParams = new URLSearchParams(location.search)
        const redirectPath = urlParams.get('redirect')
        
        if (redirectPath) {
          // Decode and navigate to the original page
          const decodedPath = decodeURIComponent(redirectPath)
          navigate(decodedPath, { replace: true })
        } else {
          // Navigate based on role only if no redirect parameter
          const navPath = employeeUser.role === 'admin' ? '/admin' : '/seller'
          navigate(navPath)
        }
      } else {
        // Log failed login attempt - only if login actually failed
        loggingService.logFailedLoginAttempt(formData.email, response.message || 'Invalid credentials')
        setError(response.message || 'Login failed')
        setIsLoading(false)
      }
    } catch (error: any) {
      
      // Enhanced error categorization with retry logic
      let errorMessage = 'Login failed. '
      let category: 'timeout' | 'network' | 'server' | 'rate_limit' | 'auth' | 'validation' = 'server'
      let canRetry = false
      
      // Categorize the error based on type
      if (error?.message?.includes('timeout') || error?.code === 'ECONNABORTED') {
        errorMessage = 'Connection timeout. The server is taking too long to respond. Please try again.'
        category = 'timeout'
        canRetry = true
      } else if (!navigator.onLine) {
        errorMessage = 'No internet connection detected. Please check your network connection and try again.'
        category = 'network'
        canRetry = true
      } else if (error?.response?.status === 429) {
        const retryAfter = error?.response?.headers?.['retry-after']
        errorMessage = `Too many login attempts. Please wait ${retryAfter ? `${retryAfter} seconds` : 'a few minutes'} before trying again.`
        category = 'rate_limit'
        canRetry = false
      } else if (error?.response?.status >= 500) {
        errorMessage = 'Server error encountered. Our systems are experiencing issues. Please try again in a few moments.'
        category = 'server'
        canRetry = true
      } else if (error?.response?.status === 401 || error?.response?.status === 403) {
        errorMessage = 'Invalid email or password. Please check your credentials.'
        category = 'auth'
        canRetry = false
      } else if (error?.response?.status === 404) {
        errorMessage = 'Employee login service unavailable. Please contact IT support.'
        category = 'server'
        canRetry = false
      } else if (error?.message?.includes('Role not authorized') || error?.message?.includes('not authorized')) {
        errorMessage = 'Your account does not have employee access. Please contact your administrator.'
        category = 'auth'
        canRetry = false
      } else if (error?.response?.status >= 400 && error?.response?.status < 500) {
        errorMessage = error?.response?.data?.message || error?.message || 'Invalid request. Please check your input.'
        category = 'validation'
        canRetry = false
      } else if (error?.message) {
        errorMessage = error.message
        canRetry = true
      } else {
        errorMessage += 'An unexpected error occurred. Please try again or contact IT support.'
        canRetry = true
      }
      
      // Log failed login attempt with categorized error
      loggingService.logFailedLoginAttempt(formData.email, `[${category.toUpperCase()}] ${errorMessage}`)
      
      setError(errorMessage)
      setErrorCategory(category)
      
      // Auto-retry logic for transient errors (with exponential backoff)
      if (canRetry && retryCount < 2) {
        const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 5000)
        setTimeout(() => {
          setRetryCount(prev => prev + 1)
        }, backoffDelay)
      } else if (retryCount >= 2) {
        setError(errorMessage + ' Multiple retry attempts failed. Please contact IT support.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
    // Reset error state when user makes changes
    setError('')
    setErrorCategory(null)
    setRetryCount(0)
  }

  // Manual retry function
  const handleRetry = () => {
    setError('')
    setErrorCategory(null)
    setRetryCount(0)
    // Trigger form submission
    const form = document.querySelector('form') as HTMLFormElement
    if (form) {
      form.requestSubmit()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Building2 className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Employee Portal
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sign in to access your dashboard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md space-y-2">
                <div className="flex items-start">
                  <AlertCircle className="w-4 h-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-sm text-red-600 block">{error}</span>
                    {errorCategory && (
                      <span className="text-xs text-red-500 mt-1 block">
                        Error Type: {errorCategory === 'timeout' ? 'Connection Timeout' : 
                                    errorCategory === 'network' ? 'Network Error' :
                                    errorCategory === 'server' ? 'Server Error' :
                                    errorCategory === 'rate_limit' ? 'Rate Limited' :
                                    errorCategory === 'auth' ? 'Authentication Failed' :
                                    'Validation Error'}
                      </span>
                    )}
                  </div>
                </div>
                {(errorCategory === 'timeout' || errorCategory === 'network' || errorCategory === 'server') && !isLoading && (
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="w-full mt-2 px-3 py-1.5 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors"
                  >
                    Retry Login
                  </button>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-600">Remember me</span>
              </label>
              <button type="button" className="text-sm text-indigo-600 hover:text-indigo-500">
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Back to Store */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-sm text-gray-600 hover:text-gray-500"
            >
              ← Back to Store
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
