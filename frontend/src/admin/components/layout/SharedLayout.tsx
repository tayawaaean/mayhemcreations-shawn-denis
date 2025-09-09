import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './Header'
import { useRole } from '../../context/RoleContext'

interface SharedLayoutProps {
  SidebarComponent: React.ComponentType<{ isOpen: boolean; onClose: () => void }>
}

const SharedLayout: React.FC<SharedLayoutProps> = ({ SidebarComponent }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { role } = useRole()

  return (
    <div className="min-h-screen bg-gray-50">
      <SidebarComponent isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="pl-0 lg:pl-64">
        <Header onMenuClick={() => setSidebarOpen(true)} role={role} />
        
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default SharedLayout
