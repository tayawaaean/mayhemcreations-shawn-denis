import React, { createContext, useContext, useState, useEffect } from 'react'
import { centralizedAuthService, AuthUser } from '../../shared/centralizedAuthService'

export interface AdminUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'admin' | 'seller'
  avatar?: string
}

// Convert AuthUser to AdminUser
const convertToAdminUser = (authUser: AuthUser): AdminUser => ({
  id: authUser.id.toString(),
  email: authUser.email,
  firstName: authUser.firstName,
  lastName: authUser.lastName,
  role: authUser.role === 'admin' ? 'admin' : 'seller',
  avatar: authUser.avatar
})

interface AdminAuthContextType {
  user: AdminUser | null
  isLoggedIn: boolean
  isAdmin: boolean
  isSeller: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  isLoading: boolean
  error: string | null
  clearError: () => void
  retryAuth: () => Promise<void>
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined)

const useAdminAuth = () => {
  const context = useContext(AdminAuthContext)
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider')
  }
  return context
}

export { useAdminAuth }

interface AdminAuthProviderProps {
  children: React.ReactNode
}

export const AdminAuthProvider: React.FC<AdminAuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryAttempts, setRetryAttempts] = useState(0)

  // Detect and cleanup corrupted auth data
  const detectAndCleanupCorruptedData = (): boolean => {
    try {
      // Check if localStorage is accessible
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);

      // Check for corrupted auth data in multi-account storage
      const currentAccountData = localStorage.getItem('currentAccount');
      if (currentAccountData && currentAccountData !== 'null' && currentAccountData !== 'undefined') {
        try {
          // Try to parse the current account
          const accountType = currentAccountData.replace(/"/g, '');
          const accountKey = `account_${accountType}`;
          const accountData = localStorage.getItem(accountKey);
          
          if (accountData) {
            const parsedData = JSON.parse(accountData);
            
            // Validate structure
            if (!parsedData.user || typeof parsedData.user !== 'object') {
              console.warn('⚠️ Corrupted user data detected in account storage');
              return true;
            }
            
            // Validate required user fields
            const user = parsedData.user;
            if (!user.id || !user.email || typeof user.id === 'object') {
              console.warn('⚠️ Invalid user fields detected');
              return true;
            }
            
            // Check for circular references or malformed data
            try {
              JSON.stringify(parsedData);
            } catch (stringifyError) {
              console.warn('⚠️ Circular reference detected in auth data');
              return true;
            }
          }
        } catch (parseError) {
          console.warn('⚠️ Failed to parse account data:', parseError);
          return true;
        }
      }
      
      return false;
    } catch (storageError) {
      console.error('❌ Storage access error:', storageError);
      return true;
    }
  };

  // Cleanup corrupted data with user notification
  const cleanupCorruptedData = () => {
    try {
      console.log('🧹 Cleaning up corrupted auth data...');
      
      // Clear all auth-related data
      const keysToRemove = ['currentAccount'];
      const allKeys = Object.keys(localStorage);
      
      allKeys.forEach(key => {
        if (key.startsWith('account_') || key.includes('auth') || key.includes('session')) {
          keysToRemove.push(key);
        }
      });
      
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.warn(`Failed to remove ${key}:`, e);
        }
      });
      
      setError('Authentication data was corrupted and has been reset. Please log in again.');
      setUser(null);
      setIsLoggedIn(false);
      setIsLoading(false);
      
      console.log('✅ Corrupted data cleanup completed');
    } catch (cleanupError) {
      console.error('❌ Error during cleanup:', cleanupError);
      setError('Unable to recover from authentication error. Please clear your browser cache and try again.');
    }
  };

  // Subscribe to centralized auth service with enhanced error handling
  useEffect(() => {
    console.log('🔐 AdminAuthContext: Setting up auth subscription...');
    
    // Check for corrupted data on initialization
    if (detectAndCleanupCorruptedData()) {
      cleanupCorruptedData();
      return () => {};
    }
    
    try {
      const unsubscribe = centralizedAuthService.subscribe((authState) => {
        try {
          console.log('🔐 AdminAuthContext: Auth state changed:', authState);
          
          // Validate auth state structure with comprehensive checks
          if (!authState || typeof authState !== 'object') {
            console.error('⚠️ Invalid auth state received:', authState);
            setError('Invalid authentication state received');
            setUser(null);
            setIsLoggedIn(false);
            setIsLoading(false);
            return;
          }
          
          // Check if user has admin/employee role
          const allowedRoles = ['admin', 'manager', 'designer', 'support', 'moderator', 'seller'];
          
          if (authState.isAuthenticated && authState.user) {
            // Comprehensive user data validation
            const user = authState.user;
            
            // Check for required fields
            if (!user.id || !user.email || !user.role) {
              console.error('⚠️ Invalid user data structure:', user);
              setError('Incomplete user data received. Please log in again.');
              
              // Check if data is corrupted
              if (detectAndCleanupCorruptedData()) {
                cleanupCorruptedData();
              } else {
                setUser(null);
                setIsLoggedIn(false);
              }
              return;
            }
            
            // Type validation
            if (typeof user.id === 'object' || typeof user.email !== 'string' || typeof user.role !== 'string') {
              console.error('⚠️ Invalid user data types:', { id: typeof user.id, email: typeof user.email, role: typeof user.role });
              cleanupCorruptedData();
              return;
            }
            
            const userRole = user.role;
            console.log('🔐 AdminAuthContext: User role:', userRole);
            
            if (allowedRoles.includes(userRole)) {
              try {
                const adminUser = convertToAdminUser(user);
                setUser(adminUser);
                setIsLoggedIn(true);
                setError(null);
                setRetryAttempts(0);
                console.log('✅ Admin user authenticated:', adminUser);
              } catch (conversionError) {
                console.error('❌ Error converting user data:', conversionError);
                setError('Failed to process user data. Please log in again.');
                cleanupCorruptedData();
              }
            } else {
              console.log('❌ User does not have admin/employee role:', userRole);
              setError('Access denied. Admin or employee role required.');
              setUser(null);
              setIsLoggedIn(false);
            }
          } else {
            console.log('🔐 AdminAuthContext: No authenticated user');
            setUser(null);
            setIsLoggedIn(false);
            setError(null);
          }
          
          setIsLoading(authState.isLoading);
        } catch (subscriptionError) {
          console.error('❌ Error in auth subscription callback:', subscriptionError);
          setError('Authentication error occurred. Please refresh the page.');
          
          // Attempt recovery on error
          if (retryAttempts < 3) {
            setRetryAttempts(prev => prev + 1);
            console.log(`Retry attempt ${retryAttempts + 1}/3`);
          } else {
            cleanupCorruptedData();
          }
          
          setUser(null);
          setIsLoggedIn(false);
          setIsLoading(false);
        }
      });

      console.log('🔐 AdminAuthContext: Auth subscription set up successfully');
      return unsubscribe;
      
    } catch (setupError) {
      console.error('❌ Error setting up auth subscription:', setupError);
      setError('Failed to initialize authentication. Please refresh the page.');
      setUser(null);
      setIsLoggedIn(false);
      setIsLoading(false);
      
      // Return empty cleanup function
      return () => {};
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    console.log('🔐 AdminAuthContext: Attempting login...');
    setError(null);
    setIsLoading(true);
    
    try {
      const result = await centralizedAuthService.login(email, password);
      if (result) {
        console.log('✅ Login successful');
        setError(null);
        setRetryAttempts(0);
        return true;
      } else {
        setError('Login failed. Please check your credentials.');
        return false;
      }
    } catch (error: any) {
      console.error('❌ Login error in AdminAuthContext:', error);
      
      // Categorize error for better user feedback
      let errorMessage = 'Login failed. ';
      if (error?.message?.includes('timeout')) {
        errorMessage = 'Connection timeout. Please try again.';
      } else if (!navigator.onLine) {
        errorMessage = 'No internet connection. Please check your connection.';
      } else if (error?.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error?.message) {
        errorMessage = error.message;
      } else {
        errorMessage += 'Please try again.';
      }
      
      setError(errorMessage);
      // Return false instead of throwing to prevent unexpected navigation
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    console.log('🔐 AdminAuthContext: Logging out...');
    setError(null);
    
    try {
      await centralizedAuthService.logout();
      setUser(null);
      setIsLoggedIn(false);
      setError(null);
      setRetryAttempts(0);
      console.log('✅ Logout successful');
    } catch (error: any) {
      console.error('❌ Logout error:', error);
      setError('Logout encountered an error, but you have been logged out locally.');
      // Still clear local state even if server logout fails
      setUser(null);
      setIsLoggedIn(false);
      // Don't throw - user should still be logged out locally
    }
  };

  const clearError = () => {
    setError(null);
  };

  const retryAuth = async (): Promise<void> => {
    console.log('🔄 Retrying authentication...');
    setError(null);
    setIsLoading(true);
    
    try {
      const isValid = await centralizedAuthService.validateSession();
      if (!isValid) {
        setError('Session validation failed. Please log in again.');
        setUser(null);
        setIsLoggedIn(false);
      } else {
        console.log('✅ Authentication retry successful');
        setRetryAttempts(0);
      }
    } catch (error) {
      console.error('❌ Retry auth error:', error);
      setError('Failed to retry authentication. Please log in again.');
      setUser(null);
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  const value: AdminAuthContextType = {
    user,
    isLoggedIn: !!user,
    isAdmin: user?.role === 'admin',
    isSeller: user?.role === 'seller',
    login,
    logout,
    isLoading,
    error,
    clearError,
    retryAuth
  }

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  )
}
