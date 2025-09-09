import React, { createContext, useContext, useState, useEffect } from 'react'
import { loggingService } from '../../shared/loggingService'

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
  logout: () => void
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
    // Check for stored admin user data on mount
    const storedUser = localStorage.getItem('adminUser')
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser)
        setUser(userData)
      } catch (error) {
        console.error('Error parsing stored admin user data:', error)
        localStorage.removeItem('adminUser')
      }
    }
    setIsLoading(false)
  }, [])

  const login = (userData: AdminUser) => {
    setUser(userData)
    localStorage.setItem('adminUser', JSON.stringify(userData))
    
    // Log successful login
    loggingService.logLoginSuccess(
      userData.id,
      userData.email,
      userData.role
    )
  }

  const logout = () => {
    // Log logout before clearing user data
    if (user) {
      loggingService.logLogout(user.id, user.email, user.role)
    }
    
    setUser(null)
    localStorage.removeItem('adminUser')
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
