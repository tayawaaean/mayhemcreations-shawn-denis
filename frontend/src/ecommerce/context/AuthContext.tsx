import React, { createContext, useContext, useState, useEffect } from 'react'
import { loggingService } from '../../shared/loggingService'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  avatar?: string
}

interface AuthContextType {
  user: User | null
  isLoggedIn: boolean
  login: (user: User) => void
  logout: () => void
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
    // Check for stored user data on mount
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (error) {
        console.error('Error parsing stored user data:', error)
        localStorage.removeItem('user')
      }
    }
    setIsLoading(false)
  }, [])

  const login = (userData: User) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
    
    // Log successful customer login
    loggingService.logLoginSuccess(
      userData.id,
      userData.email,
      'customer'
    )
  }

  const logout = () => {
    // Log logout before clearing user data
    if (user) {
      loggingService.logLogout(user.id, user.email, 'customer')
    }
    
    setUser(null)
    localStorage.removeItem('user')
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


