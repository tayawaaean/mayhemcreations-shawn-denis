import React, { createContext, useContext, useState, useEffect } from 'react'
import { loggingService } from '../../shared/loggingService'
import { apiService } from '../services/apiService'

export interface AdminUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'admin' | 'seller'
  avatar?: string
}

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

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext)
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider')
  }
  return context
}

interface AdminAuthProviderProps {
  children: React.ReactNode
}

export const AdminAuthProvider: React.FC<AdminAuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check authentication status using session-based auth
  const checkAuth = async () => {
    try {
      console.log('🔐 Checking admin session authentication...');
      const response = await apiService.getProfile();
      
      if (response.success && response.data) {
        console.log('✅ Admin session authenticated:', response.data);
        
        // Check if user has a role and validate admin/employee role
        const userRole = response.data.user.role
        const allowedRoles = ['admin', 'manager', 'designer', 'support', 'moderator', 'seller']
        
        // Handle different role structures
        let roleName: string | null = null
        if (userRole) {
          if (typeof userRole === 'string') {
            roleName = userRole
          } else if (userRole && typeof userRole === 'object' && 'name' in userRole) {
            roleName = userRole.name
          }
        }
        
        console.log('🔍 User role information:', {
          role: userRole,
          roleName: roleName,
          userEmail: response.data.user.email
        });
        
        if (!roleName || !allowedRoles.includes(roleName)) {
          console.log('❌ User does not have admin/employee role:', roleName);
          setUser(null);
          return;
        }

        // Convert to AdminUser format
        const adminUser: AdminUser = {
          id: response.data.user.id.toString(),
          email: response.data.user.email,
          firstName: response.data.user.firstName || '',
          lastName: response.data.user.lastName || '',
          role: roleName === 'admin' ? 'admin' : 'seller',
          avatar: `https://ui-avatars.com/api/?name=${response.data.user.firstName}+${response.data.user.lastName}&background=3b82f6&color=ffffff`
        };
        
        setUser(adminUser);
        loggingService.info('auth', 'admin_authenticated', {
          userId: response.data.user.id,
          role: roleName
        });
      } else {
        console.log('❌ Admin session not authenticated');
        setUser(null);
      }
    } catch (error) {
      console.error('❌ Admin auth check failed:', error);
      setUser(null);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      await checkAuth();
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  // Periodic auth check every 5 minutes
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      console.log('🔄 Periodic admin auth check...');
      await checkAuth();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [user]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('🔐 Attempting admin login...');
      setIsLoading(true);
      
      const response = await apiService.login(email, password);
      
      if (response.success && response.data) {
        console.log('✅ Admin login successful:', response.data);
        
        // Check if user has a role and validate admin/employee role
        const userRole = response.data.user.role
        const allowedRoles = ['admin', 'manager', 'designer', 'support', 'moderator', 'seller']
        
        // Handle different role structures
        let roleName: string | null = null
        if (userRole) {
          if (typeof userRole === 'string') {
            roleName = userRole
          } else if (userRole && typeof userRole === 'object' && 'name' in userRole) {
            roleName = userRole.name
          }
        }
        
        console.log('🔍 Login - User role information:', {
          role: userRole,
          roleName: roleName,
          userEmail: response.data.user.email
        });
        
        if (!roleName || !allowedRoles.includes(roleName)) {
          console.log('❌ User does not have admin/employee role:', roleName);
          setUser(null);
          setIsLoading(false);
          return false;
        }

        // Convert to AdminUser format
        const adminUser: AdminUser = {
          id: response.data.user.id.toString(),
          email: response.data.user.email,
          firstName: response.data.user.firstName || '',
          lastName: response.data.user.lastName || '',
          role: roleName === 'admin' ? 'admin' : 'seller',
          avatar: `https://ui-avatars.com/api/?name=${response.data.user.firstName}+${response.data.user.lastName}&background=3b82f6&color=ffffff`
        };
        
        setUser(adminUser);
        
        // Log successful login
        loggingService.logLoginSuccess(
          adminUser.id,
          adminUser.email,
          adminUser.role
        );
        
        return true;
      } else {
        console.log('❌ Admin login failed:', response.message);
        setUser(null);
        return false;
      }
    } catch (error) {
      console.error('❌ Admin login error:', error);
      setUser(null);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      console.log('🔐 Admin logging out...');
      
      // Log logout before clearing user data
      if (user) {
        loggingService.logLogout(user.id, user.email, user.role);
      }
      
      // Call backend logout to clear session
      await apiService.logout();
      
      setUser(null);
    } catch (error) {
      console.error('❌ Admin logout error:', error);
      // Clear user data even if logout fails
      setUser(null);
    }
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
