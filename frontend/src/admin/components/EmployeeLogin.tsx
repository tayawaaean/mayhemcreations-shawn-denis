import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, User, Shield, Store, AlertCircle, Building2 } from 'lucide-react'
import Button from '../../components/Button'
import { loggingService } from '../../shared/loggingService'

interface EmployeeUser {
  id: string
  email: string
  password: string
  firstName: string
  lastName: string
  role: 'admin' | 'seller'
  avatar?: string
}

// Demo accounts
const demoAccounts: EmployeeUser[] = [
  {
    id: 'admin-1',
    email: 'admin@mayhemcreations.com',
    password: 'admin123',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    avatar: 'https://ui-avatars.com/api/?name=Admin+User&background=3b82f6&color=ffffff'
  },
  {
    id: 'seller-1',
    email: 'seller@mayhemcreations.com',
    password: 'seller123',
    firstName: 'John',
    lastName: 'Seller',
    role: 'seller',
    avatar: 'https://ui-avatars.com/api/?name=John+Seller&background=10b981&color=ffffff'
  },
  {
    id: 'seller-2',
    email: 'jane@mayhemcreations.com',
    password: 'seller123',
    firstName: 'Jane',
    lastName: 'Smith',
    role: 'seller',
    avatar: 'https://ui-avatars.com/api/?name=Jane+Smith&background=8b5cf6&color=ffffff'
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
  const [selectedDemo, setSelectedDemo] = useState<EmployeeUser | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    // Simulate API call delay
    setTimeout(() => {
      const user = demoAccounts.find(
        account => account.email === formData.email && account.password === formData.password
      )

      if (user) {
        // Log successful login attempt
        loggingService.logLoginAttempt(formData.email, true, user.role)
        onLogin(user)
        // Navigate based on role
        if (user.role === 'admin') {
          navigate('/admin')
        } else {
          navigate('/seller')
        }
      } else {
        // Log failed login attempt
        loggingService.logFailedLoginAttempt(formData.email, 'Invalid credentials')
        setError('Invalid email or password')
      }
      setIsLoading(false)
    }, 1000)
  }

  const handleDemoLogin = (user: EmployeeUser) => {
    setFormData({
      email: user.email,
      password: user.password
    })
    setSelectedDemo(user)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
    setError('')
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
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-md">
                <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                <span className="text-sm text-red-600">{error}</span>
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
                  placeholder="admin@mayhemcreations.com"
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
            <div><strong>Admin:</strong> admin@mayhemcreations.com / admin123</div>
            <div><strong>Seller:</strong> seller@mayhemcreations.com / seller123</div>
            <div><strong>Seller 2:</strong> jane@mayhemcreations.com / seller123</div>
          </div>
        </div>
      </div>
    </div>
  )
}
