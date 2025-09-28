import React, { createContext, useContext, useState, useEffect } from 'react'
import { loggingService } from '../../shared/loggingService'
import { useMultiAccount } from '../../shared/multiAccountContext'
import MultiAccountStorageService from '../../shared/multiAccountStorage'

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

interface AuthContextType {
  user: User | null
  isLoggedIn: boolean
  login: (user: User) => void
  logout: () => Promise<void>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export { useAuth }

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { 
    currentUser, 
    currentAccountType, 
    isAuthenticated, 
    login: multiLogin, 
    logout: multiLogout 
  } = useMultiAccount()
  
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for customer account specifically, regardless of current account type
    const customerData = MultiAccountStorageService.getAccountAuthData('customer');
    const isCustomerAuthenticated = MultiAccountStorageService.isAccountAuthenticated('customer');
    
    if (customerData && isCustomerAuthenticated) {
      // Convert customer account data to User format
      const customerUser: User = {
        id: customerData.user.id,
        email: customerData.user.email,
        firstName: customerData.user.firstName || '',
        lastName: customerData.user.lastName || '',
        role: customerData.user.role,
        isEmailVerified: customerData.user.isEmailVerified || false,
        lastLoginAt: customerData.user.lastLoginAt || new Date().toISOString(),
        createdAt: customerData.user.createdAt || new Date().toISOString(),
        avatar: customerData.user.avatar
      }
      setUser(customerUser)
    } else {
      setUser(null)
    }
    setIsLoading(false)
  }, [currentUser, currentAccountType, isAuthenticated])

  const login = (userData: User) => {
    // Convert to multi-account user format
    const multiUser = {
      ...userData,
      accountType: 'customer' as const
    }
    
    // Use multi-account login and switch to customer account
    multiLogin(multiUser, 'customer')
    MultiAccountStorageService.switchAccount('customer')
    
    // Log successful customer login
    loggingService.logLoginSuccess(
      userData.id,
      userData.email,
      'customer'
    )
  }

  const logout = async () => {
    // Log logout before clearing user data
    if (user) {
      loggingService.logLogout(user.id, user.email, 'customer')
    }
    
    // Use multi-account logout for customer account only
    await multiLogout('customer')
  }

  const value: AuthContextType = {
    user,
    isLoggedIn: !!user && currentAccountType === 'customer',
    login,
    logout,
    isLoading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}


