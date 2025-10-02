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

  // Subscribe to centralized auth service
  useEffect(() => {
    console.log('🔐 AdminAuthContext: Setting up auth subscription...');
    
    const unsubscribe = centralizedAuthService.subscribe((authState) => {
      console.log('🔐 AdminAuthContext: Auth state changed:', authState);
      
      // Check if user has admin/employee role
      const allowedRoles = ['admin', 'manager', 'designer', 'support', 'moderator', 'seller'];
      
      if (authState.isAuthenticated && authState.user) {
        const userRole = authState.user.role;
        console.log('🔐 AdminAuthContext: User role:', userRole);
        
        if (allowedRoles.includes(userRole)) {
          const adminUser = convertToAdminUser(authState.user);
          setUser(adminUser);
          setIsLoggedIn(true);
          console.log('✅ Admin user authenticated:', adminUser);
        } else {
          console.log('❌ User does not have admin/employee role:', userRole);
          setUser(null);
          setIsLoggedIn(false);
        }
      } else {
        console.log('🔐 AdminAuthContext: No authenticated user');
        setUser(null);
        setIsLoggedIn(false);
      }
      
      setIsLoading(authState.isLoading);
    });

    // Don't validate session immediately - let the centralized service handle initialization
    // The service will initialize from localStorage and then validate if needed
    console.log('🔐 AdminAuthContext: Auth subscription set up');

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    console.log('🔐 AdminAuthContext: Attempting login...');
    return await centralizedAuthService.login(email, password);
  };

  const logout = async (): Promise<void> => {
    console.log('🔐 AdminAuthContext: Logging out...');
    await centralizedAuthService.logout();
  };

  const value: AdminAuthContextType = {
    user,
    isLoggedIn: !!user,
    isAdmin: user?.role === 'admin',
    isSeller: user?.role === 'seller',
    login,
    logout,
    isLoading
  }

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  )
}
