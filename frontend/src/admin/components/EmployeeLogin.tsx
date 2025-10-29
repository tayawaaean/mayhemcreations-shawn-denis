import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, User, Shield, Store, AlertCircle, Building2 } from 'lucide-react'
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

// Demo accounts with secure passwords - Updated to match userSeeder data
const demoAccounts: EmployeeUser[] = [
  // Admin Users
  {
    id: 'admin-1',
    email: 'admin@mayhemcreation.com',
    firstName: 'John',
    lastName: 'Admin',
    role: 'admin',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin'
  },
  {
    id: 'admin-2',
    email: 'shawn.denis@mayhemcreation.com',
    firstName: 'Shawn',
    lastName: 'Denis',
    role: 'admin',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=shawn'
  },
  // Manager Users
  {
    id: 'manager-1',
    email: 'manager@mayhemcreation.com',
    firstName: 'Sarah',
    lastName: 'Johnson',
    role: 'manager',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=manager'
  },
  {
    id: 'manager-2',
    email: 'operations@mayhemcreation.com',
    firstName: 'Michael',
    lastName: 'Chen',
    role: 'manager',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=operations'
  },
  // Designer Users
  {
    id: 'designer-1',
    email: 'designer@mayhemcreation.com',
    firstName: 'Emma',
    lastName: 'Rodriguez',
    role: 'designer',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=designer'
  },
  {
    id: 'designer-2',
    email: 'creative@mayhemcreation.com',
    firstName: 'Alex',
    lastName: 'Thompson',
    role: 'designer',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=creative'
  },
  // Support Users
  {
    id: 'support-1',
    email: 'support@mayhemcreation.com',
    firstName: 'Lisa',
    lastName: 'Williams',
    role: 'support',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=support'
  },
  {
    id: 'support-2',
    email: 'help@mayhemcreation.com',
    firstName: 'David',
    lastName: 'Brown',
    role: 'support',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=help'
  },
  // Moderator Users
  {
    id: 'moderator-1',
    email: 'moderator@mayhemcreation.com',
    firstName: 'Jennifer',
    lastName: 'Davis',
    role: 'moderator',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=moderator'
  }
]

interface EmployeeLoginProps {
  onLogin: (user: EmployeeUser) => void
}

export default function EmployeeLogin({ onLogin }: EmployeeLoginProps) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [errorCategory, setErrorCategory] = useState<'timeout' | 'network' | 'server' | 'rate_limit' | 'auth' | 'validation' | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [selectedDemo, setSelectedDemo] = useState<EmployeeUser | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // Call the real API for authentication with employee role validation
      const response = await apiService.login(formData.email, formData.password, 'employee')
      
      if (response.success && response.data) {
        const { user: apiUser, sessionId } = response.data
        
        // Create employee user object
        const employeeUser: EmployeeUser = {
          id: apiUser.id.toString(),
          email: apiUser.email,
          firstName: apiUser.firstName,
          lastName: apiUser.lastName,
          role: apiUser.role as 'admin' | 'manager' | 'designer' | 'support' | 'moderator',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${apiUser.firstName.toLowerCase()}`
        }

        // Store auth data using multi-account storage
        MultiAccountStorageService.storeAccountAuthData('employee', {
          user: {
            id: apiUser.id,
            email: apiUser.email,
            firstName: apiUser.firstName,
            lastName: apiUser.lastName,
            role: apiUser.role,
            isEmailVerified: apiUser.isEmailVerified,
            lastLoginAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            accountType: 'employee'
          },
          session: {
            sessionId,
            lastActivity: new Date().toISOString()
          }
        })

        // Explicitly set as current account to ensure proper token management
        MultiAccountStorageService.setCurrentAccount('employee')

        // Log successful login attempt
        const logRole = employeeUser.role === 'admin' ? 'admin' : 'seller'
        loggingService.logLoginAttempt(formData.email, true, logRole)
        onLogin(employeeUser)
        
        // Navigate based on role
        if (employeeUser.role === 'admin') {
          navigate('/admin')
        } else {
          navigate('/seller')
        }
      } else {
        // Log failed login attempt
        loggingService.logFailedLoginAttempt(formData.email, response.message || 'Invalid credentials')
        setError(response.message || 'Login failed')
      }
    } catch (error: any) {
      console.error('Login error:', error)
      
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
          console.log(`Auto-retrying login (attempt ${retryCount + 1}/2)...`)
          setRetryCount(prev => prev + 1)
        }, backoffDelay)
      } else if (retryCount >= 2) {
        setError(errorMessage + ' Multiple retry attempts failed. Please contact IT support.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleDemoLogin = (user: EmployeeUser) => {
    setFormData({
      email: user.email,
      password: '' // Don't pre-fill password for security
    })
    setSelectedDemo(user)
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
          {/* Demo Accounts Section */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Demo Accounts</h3>
            <div className="space-y-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => handleDemoLogin(account)}
                  className={`w-full flex items-center p-3 text-left border rounded-lg transition-colors ${
                    selectedDemo?.id === account.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex-shrink-0">
                    <img
                      className="h-8 w-8 rounded-full"
                      src={account.avatar}
                      alt={account.firstName}
                    />
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-gray-900">
                        {account.firstName} {account.lastName}
                      </p>
                      <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        account.role === 'admin'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {account.role === 'admin' ? (
                          <>
                            <Shield className="w-3 h-3 mr-1" />
                            Admin
                          </>
                        ) : (
                          <>
                            <Store className="w-3 h-3 mr-1" />
                            Seller
                          </>
                        )}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{account.email}</p>
                  </div>
                </button>
              ))}
            </div>
            
            {/* Password Hints */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Demo Account Passwords</h4>
              <div className="text-xs text-blue-700 space-y-1">
                <div><strong>Admin:</strong> SecureAdmin2024!</div>
                <div><strong>Shawn Denis:</strong> SecureShawn2024!</div>
                <div><strong>Manager:</strong> SecureManager2024!</div>
                <div><strong>Designer:</strong> SecureCustomer2024!</div>
              </div>
            </div>
          </div>

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
                  placeholder="admin@mayhemcreation.com"
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

      {/* Demo Account Info */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-indigo-900 mb-2">Demo Account Credentials</h4>
          <div className="text-xs text-indigo-800 space-y-1">
            <div><strong>John Admin:</strong> admin@mayhemcreation.com / SecureAdmin2024!</div>
            <div><strong>Shawn Denis:</strong> shawn.denis@mayhemcreation.com / SecureShawn2024!</div>
            <div><strong>Sarah Johnson (Manager):</strong> manager@mayhemcreation.com / SecureManager2024!</div>
            <div><strong>Michael Chen (Manager):</strong> operations@mayhemcreation.com / OpsPass123!</div>
            <div><strong>Emma Rodriguez (Designer):</strong> designer@mayhemcreation.com / DesignerPass123!</div>
            <div><strong>Alex Thompson (Designer):</strong> creative@mayhemcreation.com / CreativePass123!</div>
            <div><strong>Lisa Williams (Support):</strong> support@mayhemcreation.com / SupportPass123!</div>
            <div><strong>David Brown (Support):</strong> help@mayhemcreation.com / HelpPass123!</div>
            <div><strong>Jennifer Davis (Moderator):</strong> moderator@mayhemcreation.com / ModeratorPass123!</div>
          </div>
        </div>
      </div>
    </div>
  )
}
