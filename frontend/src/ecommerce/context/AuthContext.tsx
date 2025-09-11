import React, { createContext, useContext, useState, useEffect } from 'react'
import { loggingService } from '../../shared/loggingService'
import AuthStorageService from '../../shared/authStorage'

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

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for stored auth data on mount
    const authData = AuthStorageService.getAuthData()
    if (authData && AuthStorageService.isAuthenticated()) {
      // Validate that user has customer role
      if (authData.user.role !== 'customer') {
        console.warn('Admin/employee account detected in customer area - clearing auth data')
        AuthStorageService.clearAuthData()
        setIsLoading(false)
        return
      }

      // Convert stored user data to User format
      const user: User = {
        id: authData.user.id,
        email: authData.user.email,
        firstName: authData.user.firstName || '',
        lastName: authData.user.lastName || '',
        role: authData.user.role,
        isEmailVerified: authData.user.isEmailVerified || false,
        lastLoginAt: authData.user.lastLoginAt || new Date().toISOString(),
        createdAt: authData.user.createdAt || new Date().toISOString(),
        avatar: authData.user.avatar
      }
      setUser(user)
    }
    setIsLoading(false)
  }, [])

  const login = (userData: User) => {
    setUser(userData)
    // Note: Auth data is already stored by the login components
    // No need to store additional data here
    
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
    
    // Use secure logout that calls backend and clears all auth data
    await AuthStorageService.secureLogout()
    
    setUser(null)
  }

  const value: AuthContextType = {
    user,
    isLoggedIn: !!user,
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


