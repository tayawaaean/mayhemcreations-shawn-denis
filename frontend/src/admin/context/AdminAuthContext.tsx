import React, { createContext, useContext, useState, useEffect } from 'react'
import { loggingService } from '../../shared/loggingService'
import MultiAccountStorageService from '../../shared/multiAccountStorage'

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
    // Check for employee account specifically, regardless of current account type
    const employeeData = MultiAccountStorageService.getAccountAuthData('employee');
    const isEmployeeAuthenticated = MultiAccountStorageService.isAccountAuthenticated('employee');
    
    if (employeeData && isEmployeeAuthenticated) {
      // Validate that user has admin/employee role
      const allowedRoles = ['admin', 'manager', 'designer', 'support', 'moderator', 'seller']
      if (!allowedRoles.includes(employeeData.user.role)) {
        console.warn('Invalid employee role detected in admin area')
        setUser(null)
        setIsLoading(false)
        return
      }

      // Convert employee account data to AdminUser format
      const adminUser: AdminUser = {
        id: employeeData.user.id.toString(),
        email: employeeData.user.email,
        firstName: employeeData.user.firstName || '',
        lastName: employeeData.user.lastName || '',
        role: employeeData.user.role === 'admin' ? 'admin' : 'seller',
        avatar: employeeData.user.avatar || `https://ui-avatars.com/api/?name=${employeeData.user.firstName}+${employeeData.user.lastName}&background=3b82f6&color=ffffff`
      }
      setUser(adminUser)
    } else {
      setUser(null)
    }
    setIsLoading(false)
  }, [])

  const login = (userData: AdminUser) => {
    setUser(userData)
    // Switch to employee account when logging in
    MultiAccountStorageService.switchAccount('employee')
    
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
    
    // Use multi-account logout for employee account only
    await MultiAccountStorageService.logoutAccount('employee')
    
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
