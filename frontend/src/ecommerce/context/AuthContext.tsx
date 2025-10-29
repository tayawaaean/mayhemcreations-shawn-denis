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
  authError: string | null
  retryAuth: () => void
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
  const [authError, setAuthError] = useState<string | null>(null)

  // Initialize auth state from storage on mount ONLY
  useEffect(() => {
    const initializeAuth = () => {
      try {
        setAuthError(null) // Clear any previous errors
        
        // Check for customer account specifically, regardless of current account type
        // This ensures ecommerce customers remain logged in even when multi-account state changes
        const customerData = MultiAccountStorageService.getAccountAuthData('customer');
        const isCustomerAuthenticated = MultiAccountStorageService.isAccountAuthenticated('customer');
        
        console.log('🔐 Ecommerce AuthContext: Initializing customer auth state', {
          hasCustomerData: !!customerData,
          isCustomerAuthenticated
        });
        
        if (customerData && isCustomerAuthenticated) {
          // Validate customer data structure before using it
          if (!customerData.user || !customerData.user.id || !customerData.user.email) {
            console.error('⚠️ Invalid customer data structure:', customerData);
            setAuthError('Stored authentication data is corrupted. Please sign in again.');
            setUser(null);
            setIsLoading(false);
            // Clear corrupted data
            try {
              MultiAccountStorageService.clearAccount('customer');
            } catch (clearError) {
              console.error('Failed to clear corrupted auth data:', clearError);
            }
            return;
          }
          
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
      } catch (error: any) {
        console.error('❌ Auth initialization error:', error);
        
        // Categorize initialization errors
        let errorMessage = 'Failed to load authentication state. ';
        
        if (error?.name === 'QuotaExceededError' || error?.message?.includes('quota')) {
          errorMessage = 'Browser storage is full. Please clear browser data or free up space, then refresh the page.';
        } else if (error?.name === 'SecurityError') {
          errorMessage = 'Browser privacy settings are blocking authentication. Please check your browser settings.';
        } else if (error?.message?.includes('localStorage') || error?.message?.includes('storage')) {
          errorMessage = 'Cannot access browser storage. Please enable cookies and local storage, then refresh the page.';
        } else {
          errorMessage += 'Please refresh the page to try again.';
        }
        
        setAuthError(errorMessage);
        setUser(null);
        setIsLoading(false);
        
        // Show console error for debugging
        console.error('Auth error details:', {
          name: error?.name,
          message: error?.message,
          stack: error?.stack
        });
      }
    }

    initializeAuth()
  }, []) // Empty dependency array - only run on mount

  // Only update if customer account changes (actual login/logout)
  useEffect(() => {
    // Check if we have a customer account authenticated
    const customerData = MultiAccountStorageService.getAccountAuthData('customer');
    const isCustomerAuthenticated = MultiAccountStorageService.isAccountAuthenticated('customer');
    
    console.log('🔐 Ecommerce AuthContext: Checking customer auth state', {
      hasCustomerData: !!customerData,
      isCustomerAuthenticated,
      currentUser: currentUser?.accountType,
      isAuthenticated
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
      console.log('✅ Ecommerce AuthContext: Setting customer user from multi-account', {
        userId: customerUser.id,
        email: customerUser.email
      });
      setUser(customerUser)
    } else {
      // Clear user state when no customer account is authenticated
      console.log('🔐 Ecommerce AuthContext: Customer account cleared');
      setUser(null)
    }
  }, [currentUser, isAuthenticated, currentAccountType])

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
    try {
      // Log logout before clearing user data
      if (user) {
        try {
          loggingService.logLogout(user.id, user.email, 'customer')
        } catch (logError) {
          console.warn('Failed to log logout event:', logError)
          // Continue with logout even if logging fails
        }
      }
      
      // Immediately clear user state for instant logout UI update
      setUser(null)
      setAuthError(null)
      
      // Use multi-account logout for customer account only
      await multiLogout('customer')
      
      console.log('✅ Successfully logged out customer account')
    } catch (error: any) {
      console.error('❌ Logout error:', error)
      
      // Categorize logout errors
      let errorMessage = 'Logout failed. ';
      
      if (error?.message?.includes('network') || !navigator.onLine) {
        errorMessage = 'No internet connection. Your session has been cleared locally but may still be active on the server. You may need to sign in again on other devices.';
      } else if (error?.message?.includes('storage') || error?.name === 'SecurityError') {
        errorMessage = 'Cannot access browser storage. Your session has been cleared from memory. Please close all browser windows to ensure complete logout.';
      } else {
        errorMessage += 'Your session has been cleared locally. You may still be logged in on other devices.';
      }
      
      // Still set user to null even if logout fails server-side
      setUser(null)
      setAuthError(null) // Don't show error in UI for logout - user sees logged out state
      
      // Show warning in console
      console.warn('Logout completed with warnings:', errorMessage)
      
      // Optionally show toast notification if available
      // This would require passing showWarning from AlertModalContext
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast(errorMessage, 'warning')
      }
    }
  }
  
  // Function to retry authentication initialization
  const retryAuth = () => {
    console.log('🔄 Retrying authentication initialization...')
    setIsLoading(true)
    setAuthError(null)
    
    // Re-run initialization logic
    try {
      const customerData = MultiAccountStorageService.getAccountAuthData('customer');
      const isCustomerAuthenticated = MultiAccountStorageService.isAccountAuthenticated('customer');
      
      if (customerData && isCustomerAuthenticated) {
        if (!customerData.user || !customerData.user.id || !customerData.user.email) {
          setAuthError('Stored authentication data is corrupted. Please sign in again.');
          setUser(null);
          setIsLoading(false);
          return;
        }
        
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
        console.log('✅ Auth retry successful')
      } else {
        setUser(null)
      }
      setIsLoading(false)
    } catch (error: any) {
      console.error('❌ Auth retry failed:', error)
      setAuthError('Retry failed. Please refresh the page or clear your browser cache.')
      setUser(null)
      setIsLoading(false)
    }
  }

  const value: AuthContextType = {
    user,
    isLoggedIn: !!user, // Just check if user exists, don't force currentAccountType check
    login,
    logout,
    isLoading,
    authError,
    retryAuth
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}


