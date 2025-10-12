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

  // Initialize auth state from storage on mount ONLY
  useEffect(() => {
    const initializeAuth = () => {
      // Check for customer account specifically, regardless of current account type
      // This ensures ecommerce customers remain logged in even when multi-account state changes
      const customerData = MultiAccountStorageService.getAccountAuthData('customer');
      const isCustomerAuthenticated = MultiAccountStorageService.isAccountAuthenticated('customer');
      
      console.log('🔐 Ecommerce AuthContext: Initializing customer auth state', {
        hasCustomerData: !!customerData,
        isCustomerAuthenticated
      });
      
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
        console.log('✅ Ecommerce AuthContext: Setting customer user', {
          userId: customerUser.id,
          email: customerUser.email
        });
        setUser(customerUser)
      } else {
        console.log('⚠️ Ecommerce AuthContext: No valid customer auth found');
        setUser(null)
      }
      setIsLoading(false)
    }

    initializeAuth()
  }, []) // Empty dependency array - only run on mount

  // Only update if customer account changes (actual login/logout)
  useEffect(() => {
    // Only react to currentUser changes if it's a customer account
    if (currentUser && currentUser.accountType === 'customer') {
      console.log('🔐 Ecommerce AuthContext: Customer account updated', currentUser);
      setUser(currentUser as User)
    } else if (!currentUser) {
      // Clear user state when currentUser becomes null (logout)
      console.log('🔐 Ecommerce AuthContext: Customer account cleared');
      setUser(null)
    }
  }, [currentUser])

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
    
    // Immediately clear user state for instant logout UI update
    setUser(null)
    
    // Use multi-account logout for customer account only
    await multiLogout('customer')
  }

  const value: AuthContextType = {
    user,
    isLoggedIn: !!user, // Just check if user exists, don't force currentAccountType check
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


