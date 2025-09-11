import React, { createContext, useContext, useState, useEffect } from 'react'
import { loggingService } from '../../shared/loggingService'
import AuthStorageService from '../../shared/authStorage'

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
  login: (user: AdminUser) => void
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

  useEffect(() => {
    // Check for stored auth data on mount
    const authData = AuthStorageService.getAuthData()
    if (authData && AuthStorageService.isAuthenticated()) {
      // Validate that user has admin/employee role
      const allowedRoles = ['admin', 'manager', 'designer', 'support', 'moderator']
      if (!allowedRoles.includes(authData.user.role)) {
        console.warn('Customer account detected in admin area - clearing auth data')
        AuthStorageService.clearAuthData()
        setIsLoading(false)
        return
      }

      // Convert stored user data to AdminUser format
      const adminUser: AdminUser = {
        id: authData.user.id.toString(),
        email: authData.user.email,
        firstName: '', // Will be fetched from API when needed
        lastName: '', // Will be fetched from API when needed
        role: authData.user.role as 'admin' | 'seller',
        avatar: `https://ui-avatars.com/api/?name=${authData.user.email}&background=3b82f6&color=ffffff`
      }
      setUser(adminUser)
    }
    setIsLoading(false)
  }, [])

  const login = (userData: AdminUser) => {
    setUser(userData)
    // Note: Auth data is already stored by the login components
    // No need to store additional data here
    
    // Log successful login
    loggingService.logLoginSuccess(
      userData.id,
      userData.email,
      userData.role
    )
  }

  const logout = async () => {
    // Log logout before clearing user data
    if (user) {
      loggingService.logLogout(user.id, user.email, user.role)
    }
    
    // Use secure logout that calls backend and clears all auth data
    await AuthStorageService.secureLogout()
    
    setUser(null)
  }

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
