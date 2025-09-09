import React, { createContext, useContext, useState, useEffect } from 'react'

export type UserRole = 'admin' | 'seller'

interface RoleContextType {
  role: UserRole
  setRole: (role: UserRole) => void
  isAdmin: boolean
  isSeller: boolean
}

const RoleContext = createContext<RoleContextType | undefined>(undefined)

export const useRole = () => {
  const context = useContext(RoleContext)
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider')
  }
  return context
}

interface RoleProviderProps {
  children: React.ReactNode
  initialRole?: UserRole
}

export const RoleProvider: React.FC<RoleProviderProps> = ({ children, initialRole = 'admin' }) => {
  const [role, setRole] = useState<UserRole>(initialRole)

  const isAdmin = role === 'admin'
  const isSeller = role === 'seller'

  // Store role in localStorage for persistence
  useEffect(() => {
    const storedRole = localStorage.getItem('userRole') as UserRole
    if (storedRole && (storedRole === 'admin' || storedRole === 'seller')) {
      setRole(storedRole)
    }
  }, [])

  const handleSetRole = (newRole: UserRole) => {
    setRole(newRole)
    localStorage.setItem('userRole', newRole)
  }

  const value: RoleContextType = {
    role,
    setRole: handleSetRole,
    isAdmin,
    isSeller
  }

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  )
}
