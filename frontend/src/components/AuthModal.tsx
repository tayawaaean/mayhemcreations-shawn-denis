import React, { useState } from 'react'
import { X, Eye, EyeOff, Mail, Lock, User } from 'lucide-react'
import Button from './Button'
import GoogleOAuthButton from './GoogleOAuthButton'
import { loggingService } from '../shared/loggingService'
import MultiAccountStorageService from '../shared/multiAccountStorage'
import { customerApiService } from '../shared/customerApiService'
import { envConfig } from '../shared/envConfig'

interface User {
  id: number
  firstName: string
  lastName: string
  email: string
  role: string
  isEmailVerified: boolean
  lastLoginAt: string
  createdAt: string
  avatar?: string
}

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'login' | 'register'
  onModeChange: (mode: 'login' | 'register') => void
  onSuccess: (user: User) => void
}

// Demo customer accounts for testing - using environment configuration
// Updated to match userSeeder customer data
const getDemoCustomers = () => {
  const demoAccounts = envConfig.getDemoAccounts()
  if (!demoAccounts) return []
  
  return [
    {
      id: 1,
      firstName: 'Robert',
      lastName: 'Wilson',
      email: demoAccounts.customer1,
      password: 'SecureCustomer2024!',
      role: 'customer'
    },
    {
      id: 2,
      firstName: 'Maria',
      lastName: 'Garcia',
      email: demoAccounts.customer2,
      password: 'SecureCustomer2024!',
      role: 'customer'
    },
    {
      id: 3,
      firstName: 'James',
      lastName: 'Anderson',
      email: demoAccounts.customer3,
      password: 'SecureCustomer2024!',
      role: 'customer'
    },
    {
      id: 4,
      firstName: 'Sophie',
      lastName: 'Taylor',
      email: demoAccounts.customer4,
      password: 'SecureCustomer2024!',
      role: 'customer'
    },
    {
      id: 5,
      firstName: 'Kevin',
      lastName: 'Martinez',
      email: demoAccounts.customer5,
      password: 'SecureCustomer2024!',
      role: 'customer'
    }
  ]
}

const demoCustomers = getDemoCustomers()

export default function AuthModal({ isOpen, onClose, mode, onModeChange, onSuccess }: AuthModalProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [selectedDemo, setSelectedDemo] = useState<typeof demoCustomers[0] | null>(null)
  const [requiresEmailVerification, setRequiresEmailVerification] = useState(false)
  const [isResendingVerification, setIsResendingVerification] = useState(false)
  const [isSuccessMessage, setIsSuccessMessage] = useState(false)

  // Helper function to get field error
  const getFieldError = (fieldName: string) => {
    return validationErrors[fieldName] || ''
  }

  /**
   * Handles resending verification email for unverified users
   * Called when user clicks "Resend Verification Email" button
   */
  const handleResendVerification = async () => {
    setIsResendingVerification(true)
    try {
      const response = await customerApiService.resendVerificationEmail(formData.email)
      if (response.success) {
        setError('Verification email sent! Please check your inbox.')
        setRequiresEmailVerification(false)
      } else {
        setError(response.message || 'Failed to resend verification email')
      }
    } catch (error: any) {
      setError(error.message || 'Failed to resend verification email')
    } finally {
      setIsResendingVerification(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setValidationErrors({})
    setRequiresEmailVerification(false)
    setIsSuccessMessage(false)

    try {
      if (mode === 'register') {
        // Handle registration
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match')
          setIsLoading(false)
          return
        }

        // Call registration API
        const response = await customerApiService.register({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password
        })

        if (response.success && response.data) {
          // Check if email is verified
          if (response.data.user.isEmailVerified) {
            // Only authenticate if email is verified
            MultiAccountStorageService.storeAccountAuthData('customer', {
              user: {
                id: response.data.user.id,
                email: response.data.user.email,
                role: response.data.user.role,
                firstName: response.data.user.firstName,
                lastName: response.data.user.lastName,
                isEmailVerified: response.data.user.isEmailVerified,
                lastLoginAt: new Date().toISOString(),
                createdAt: response.data.user.createdAt || new Date().toISOString(),
                avatar: response.data.user.avatar,
                accountType: 'customer'
              },
              session: {
                sessionId: response.data.sessionId,
                accessToken: response.data.accessToken,
                refreshToken: response.data.refreshToken,
                lastActivity: new Date().toISOString()
              }
            })

            // Convert to User format for context
            const userData: User = {
              id: response.data.user.id,
              firstName: response.data.user.firstName,
              lastName: response.data.user.lastName,
              email: response.data.user.email,
              role: response.data.user.role,
              isEmailVerified: response.data.user.isEmailVerified,
              lastLoginAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              avatar: `https://ui-avatars.com/api/?name=${response.data.user.firstName}+${response.data.user.lastName}&background=3b82f6&color=ffffff`
            }

            // Log successful registration
            loggingService.logUserAction('customer_registration', {
              email: formData.email,
              firstName: formData.firstName,
              lastName: formData.lastName
            }, { userId: userData.id.toString(), userEmail: userData.email, userRole: 'customer' })

            onSuccess(userData)
            onClose()
          } else {
            // Email not verified - show message and keep modal open
            setError('Registration successful! Please check your email and click the verification link to complete your account setup.')
            setIsSuccessMessage(true)
            setIsLoading(false)
            // Don't close modal or authenticate user
          }
        } else {
          // Handle validation errors
          if (response.errors && Array.isArray(response.errors)) {
            const fieldErrors: Record<string, string> = {}
            response.errors.forEach((error: any) => {
              // Use 'path' instead of 'param' as that's what the backend returns
              const fieldName = error.path || error.param
              if (fieldName) {
                fieldErrors[fieldName] = error.msg
              }
            })
            setValidationErrors(fieldErrors)
            setError('Please fix the errors below')
          } else {
            setError(response.message || 'Registration failed')
          }
        }
      } else {
        // Handle login with customer role validation
        const response = await customerApiService.login(formData.email, formData.password, 'customer')

        if (response.success && response.data) {
          // Store auth data using multi-account storage
          MultiAccountStorageService.storeAccountAuthData('customer', {
            user: {
              id: response.data.user.id,
              email: response.data.user.email,
              role: response.data.user.role,
              firstName: response.data.user.firstName,
              lastName: response.data.user.lastName,
              isEmailVerified: response.data.user.isEmailVerified,
              lastLoginAt: new Date().toISOString(),
              createdAt: response.data.user.createdAt || new Date().toISOString(),
              avatar: response.data.user.avatar,
              accountType: 'customer'
            },
            session: {
              sessionId: response.data.sessionId,
              accessToken: response.data.accessToken,
              refreshToken: response.data.refreshToken,
              lastActivity: new Date().toISOString()
            }
          })

          // Convert to User format for context
          const userData: User = {
            id: response.data.user.id,
            firstName: response.data.user.firstName,
            lastName: response.data.user.lastName,
            email: response.data.user.email,
            role: response.data.user.role,
            isEmailVerified: response.data.user.isEmailVerified,
            lastLoginAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            avatar: `https://ui-avatars.com/api/?name=${response.data.user.firstName}+${response.data.user.lastName}&background=3b82f6&color=ffffff`
          }

          // Log successful login
          loggingService.logLoginAttempt(formData.email, true, 'customer')

          onSuccess(userData)
          onClose()
        } else {
          // Handle specific error types
          if (response.requiresEmailVerification) {
            setRequiresEmailVerification(true)
            setError('Please verify your email address before logging in. Check your inbox for the verification email.')
          } else {
            setRequiresEmailVerification(false)
            setError(response.message || 'Login failed')
          }
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error)
      setError(error.message || 'An error occurred')
      
      // Log failed attempt
      if (mode === 'register') {
        loggingService.logUserAction('customer_registration_failed', {
          email: formData.email,
          error: error.message
        }, { userRole: 'customer' })
      } else {
        loggingService.logFailedLoginAttempt(formData.email, error.message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Google OAuth handler
  const handleGoogleLogin = async (response: any) => {
    setIsLoading(true)
    setError('')

    try {
      // Import OAuth API service dynamically to avoid circular imports
      const { oauthApiService } = await import('../shared/oauthApiService')
      
      // Send the ID token to backend for verification
      const result = await oauthApiService.authenticateWithGoogle(
        response.credential,
        'customer'
      )

      if (result.success && result.data) {
        // Store auth data using multi-account storage
        MultiAccountStorageService.storeAccountAuthData('customer', {
          user: {
            id: result.data.user.id,
            email: result.data.user.email,
            role: result.data.user.role,
            firstName: result.data.user.firstName,
            lastName: result.data.user.lastName,
            isEmailVerified: result.data.user.isEmailVerified,
            lastLoginAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            avatar: result.data.user.avatar,
            accountType: 'customer'
          },
          session: {
            sessionId: result.data.sessionId,
            accessToken: result.data.accessToken,
            refreshToken: result.data.refreshToken,
            lastActivity: new Date().toISOString()
          }
        })

        // Convert to User format for context
        const userData: User = {
          id: result.data.user.id,
          firstName: result.data.user.firstName,
          lastName: result.data.user.lastName,
          email: result.data.user.email,
          role: result.data.user.role,
          isEmailVerified: result.data.user.isEmailVerified,
          lastLoginAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          avatar: result.data.user.avatar || `https://ui-avatars.com/api/?name=${result.data.user.firstName}+${result.data.user.lastName}&background=3b82f6&color=ffffff`
        }

        // Log successful login
        loggingService.logLoginAttempt(result.data.user.email, true, 'customer')

        onSuccess(userData)
        onClose()
      } else {
        setError(result.message || 'Google login failed')
      }
    } catch (error: any) {
      console.error('❌ Google OAuth error:', error)
      setError(error.message || 'An error occurred during Google login')
    } finally {
      setIsLoading(false)
    }
  }

  // Google OAuth error handler
  const handleGoogleError = (error: string) => {
    console.error('❌ Google OAuth error:', error)
    setError(error)
    setIsLoading(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError('') // Clear error when user types
    setRequiresEmailVerification(false) // Clear email verification flag
    setIsSuccessMessage(false) // Clear success message flag
    
    // Clear validation error for this field when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleDemoLogin = async (customer: typeof demoCustomers[0]) => {
    setIsLoading(true)
    setError('')
    setSelectedDemo(customer)

    try {
      // Call the real API for authentication with customer role validation
      const response = await customerApiService.login(customer.email, customer.password, 'customer')

      if (response.success) {
        // Store auth data using multi-account storage
        if (response.data) {
          MultiAccountStorageService.storeAccountAuthData('customer', {
            user: {
              id: response.data.user.id,
              email: response.data.user.email,
              role: response.data.user.role,
              firstName: response.data.user.firstName,
              lastName: response.data.user.lastName,
              isEmailVerified: response.data.user.isEmailVerified,
              lastLoginAt: new Date().toISOString(),
              createdAt: response.data.user.createdAt || new Date().toISOString(),
              avatar: response.data.user.avatar,
              accountType: 'customer'
            },
            session: {
              sessionId: response.data.sessionId,
              accessToken: response.data.accessToken,
              refreshToken: response.data.refreshToken,
              lastActivity: new Date().toISOString()
            }
          })
        }

        // Convert to User format for context
        if (response.data) {
          const userData: User = {
            id: response.data.user.id,
            firstName: response.data.user.firstName,
            lastName: response.data.user.lastName,
            email: response.data.user.email,
            role: response.data.user.role,
            isEmailVerified: response.data.user.isEmailVerified,
            lastLoginAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            avatar: `https://ui-avatars.com/api/?name=${response.data.user.firstName}+${response.data.user.lastName}&background=3b82f6&color=ffffff`
          }

          // Log successful login
          loggingService.logLoginAttempt(customer.email, true, 'customer')

          onSuccess(userData)
        }
        onClose()
      } else {
        setError(response.message || 'Demo login failed')
      }
    } catch (error: any) {
      console.error('Demo login error:', error)
      setError(error.message || 'An error occurred during demo login')
      
      // Log failed attempt
      loggingService.logFailedLoginAttempt(customer.email, error.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6">
          {/* Google OAuth Button */}
          <GoogleOAuthButton
            onSuccess={handleGoogleLogin}
            onError={handleGoogleError}
            disabled={isLoading}
            className="mb-4"
            buttonText="Continue with Google"
          />

          {/* Demo Accounts Section */}
          <div className="mt-4">
            <div className="text-center mb-3">
              <span className="text-sm text-gray-500">Or try demo accounts</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {demoCustomers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => handleDemoLogin(customer)}
                  disabled={isLoading}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm border rounded-md transition-colors ${
                    selectedDemo?.id === customer.id
                      ? 'border-accent bg-accent/5 text-accent'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-accent to-accent/80 rounded-full flex items-center justify-center text-white text-xs font-medium">
                      {customer.firstName[0]}{customer.lastName[0]}
                    </div>
                    <div className="text-left">
                      <div className="font-medium">{customer.firstName} {customer.lastName}</div>
                      <div className="text-xs text-gray-500">{customer.email}</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">Demo</div>
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with email</span>
            </div>
          </div>

          {/* Error/Success Message */}
          {error && (
            <div className={`mb-4 p-3 rounded-md border ${
              isSuccessMessage 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <p className={`text-sm ${
                isSuccessMessage ? 'text-green-600' : 'text-red-600'
              }`}>{error}</p>
              {requiresEmailVerification && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={isResendingVerification}
                    className="text-sm text-blue-600 hover:text-blue-800 underline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isResendingVerification ? 'Sending...' : 'Resend Verification Email'}
                  </button>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-accent focus:border-accent ${
                      getFieldError('firstName') ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'
                    }`}
                    placeholder="John"
                  />
                </div>
                {getFieldError('firstName') && (
                  <p className="mt-1 text-sm text-red-600">{getFieldError('firstName')}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-accent focus:border-accent ${
                      getFieldError('lastName') ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Doe"
                  />
                </div>
                {getFieldError('lastName') && (
                  <p className="mt-1 text-sm text-red-600">{getFieldError('lastName')}</p>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-accent focus:border-accent ${
                  getFieldError('email') ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'
                }`}
                placeholder="john@example.com"
              />
            </div>
            {getFieldError('email') && (
              <p className="mt-1 text-sm text-red-600">{getFieldError('email')}</p>
            )}
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
                className={`w-full pl-10 pr-10 py-2 border rounded-md focus:ring-2 focus:ring-accent focus:border-accent ${
                  getFieldError('password') ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'
                }`}
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
            {getFieldError('password') && (
              <p className="mt-1 text-sm text-red-600">{getFieldError('password')}</p>
            )}
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  className={`w-full pl-10 pr-10 py-2 border rounded-md focus:ring-2 focus:ring-accent focus:border-accent ${
                    getFieldError('confirmPassword') ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {getFieldError('confirmPassword') && (
                <p className="mt-1 text-sm text-red-600">{getFieldError('confirmPassword')}</p>
              )}
            </div>
          )}

          {mode === 'login' && (
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300 text-accent focus:ring-accent" />
                <span className="ml-2 text-sm text-gray-600">Remember me</span>
              </label>
              <button type="button" className="text-sm text-accent hover:text-accent/80">
                Forgot password?
              </button>
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Please wait...' : (mode === 'login' ? 'Sign In' : 'Create Account')}
          </Button>

          <div className="text-center">
            <span className="text-sm text-gray-600">
              {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button
              type="button"
              onClick={() => onModeChange(mode === 'login' ? 'register' : 'login')}
              className="text-sm text-accent hover:text-accent/80 font-medium"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </div>
          </form>

          {/* Demo Account Credentials */}
          {envConfig.hasDemoAccounts() && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Demo Account Credentials</h4>
              <div className="space-y-2 text-xs text-gray-600">
                {(() => {
                  const demoAccounts = envConfig.getDemoAccounts()
                  if (!demoAccounts) return null
                  
                  return (
                    <>
                      <div className="flex justify-between">
                        <span className="font-medium">Robert Wilson:</span>
                        <span>{demoAccounts.customer1}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Maria Garcia:</span>
                        <span>{demoAccounts.customer2}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">James Anderson:</span>
                        <span>{demoAccounts.customer3}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Sophie Taylor:</span>
                        <span>{demoAccounts.customer4}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Kevin Martinez:</span>
                        <span>{demoAccounts.customer5}</span>
                      </div>
                    </>
                  )
                })()}
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <span className="text-gray-500">Password for all demo accounts: SecureCustomer2024!</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
