import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAdmin } from '../../context/AdminContext'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  MessageSquare,
  Settings,
  BarChart3,
  HelpCircle,
  X,
  Palette,
  FileText,
  Warehouse,
  LogOut,
  Star
} from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Products', href: '/admin/products', icon: Package },
  { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
  { name: 'Customers', href: '/admin/customers', icon: Users },
  { name: 'Reviews', href: '/admin/reviews', icon: Star },
  { name: 'Messages', href: '/admin/messages', icon: MessageSquare },
  { name: 'Chat Settings', href: '/admin/chat-settings', icon: Settings },
  { name: 'Inventory', href: '/admin/inventory', icon: Warehouse },
  { name: 'Categories', href: '/admin/categories', icon: FileText },
  { name: 'Embroidery', href: '/admin/embroidery', icon: Palette },
  { name: 'FAQs', href: '/admin/faqs', icon: HelpCircle },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
]

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { state } = useAdmin()
  const unreadMessages = state.messages.filter(m => !m.isFromAdmin && !m.isRead).length

  const handleLogout = () => {
    // Clear any admin session data if needed
    // For now, just navigate to the public site
    navigate('/')
  }

  return (
    <>
      {/* Mobile sidebar overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-gray-600 opacity-75"></div>
        </div>
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-0 lg:sticky lg:top-0 lg:h-screen
      `}>
        <div className="flex h-full flex-col lg:h-screen">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-black rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">MC</span>
              </div>
              <span className="ml-2 text-xl font-bold text-gray-900">Admin</span>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                    ${isActive 
                      ? 'bg-gray-100 text-gray-900' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                  onClick={onClose}
                >
                  <item.icon 
                    className={`
                      mr-3 h-5 w-5 flex-shrink-0
                      ${isActive ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-500'}
                    `} 
                  />
                  {item.name}
                  {/* Unread badge for Messages */}
                  {item.name === 'Messages' && unreadMessages > 0 && (
                    <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-600 text-white">
                      {unreadMessages}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center mb-4">
              <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-600 font-medium text-sm">A</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Admin User</p>
                <p className="text-xs text-gray-500">admin@mayhemcreations.com</p>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 rounded-md transition-colors"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default Sidebar
