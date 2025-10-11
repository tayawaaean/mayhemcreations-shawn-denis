import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAdmin } from '../../context/AdminContext'
import { useAdminChat } from '../../context/AdminChatContext'
import { useRole } from '../../context/RoleContext'
import { useAdminAuth } from '../../context/AdminAuthContext'
import { useNotifications } from '../../context/NotificationContext'
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
  Star,
  CreditCard,
  DollarSign,
  ChevronDown,
  ChevronRight,
  Store,
  BarChart,
  Cog,
  RotateCcw,
  Clock,
  Truck
} from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const navigationSections = [
  {
    name: 'Overview',
    icon: LayoutDashboard,
    items: [
      { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, adminOnly: false }
    ]
  },
  {
    name: 'Store Management',
    icon: Store,
    items: [
      { name: 'Products', href: '/admin/products', icon: Package, adminOnly: false },
      { name: 'Categories', href: '/admin/categories', icon: FileText, adminOnly: false },
      { name: 'Inventory', href: '/admin/inventory', icon: Warehouse, adminOnly: false },
      { name: 'Embroidery', href: '/admin/embroidery', icon: Palette, adminOnly: false }
    ]
  },
  {
    name: 'Orders & Customers',
    icon: ShoppingCart,
    items: [
      { name: 'Orders', href: '/admin/orders', icon: ShoppingCart, adminOnly: false },
      { name: 'Customers', href: '/admin/customers', icon: Users, adminOnly: false },
      { name: 'Reviews', href: '/admin/reviews', icon: Star, adminOnly: false }
    ]
  },
  {
    name: 'User Management',
    icon: Users,
    items: [
      { name: 'Users', href: '/admin/users', icon: Users, adminOnly: true }
    ]
  },
  {
    name: 'Payments',
    icon: DollarSign,
    items: [
      { name: 'Payment Management', href: '/admin/payment-management', icon: DollarSign, adminOnly: false },
      { name: 'Payment Logs', href: '/admin/payment-logs', icon: CreditCard, adminOnly: true }
    ]
  },
  {
    name: 'Shipping',
    icon: Truck,
    items: [
      { name: 'ShipStation', href: '/admin/shipstation', icon: Truck, adminOnly: false }
    ]
  },
  {
    name: 'Communication',
    icon: MessageSquare,
    items: [
      { name: 'Messages', href: '/admin/messages', icon: MessageSquare, adminOnly: false },
      { name: 'FAQs', href: '/admin/faqs', icon: HelpCircle, adminOnly: false }
    ]
  },
  {
    name: 'Analytics & Reports',
    icon: BarChart,
    items: [
      { name: 'Analytics', href: '/admin/analytics', icon: BarChart3, adminOnly: true },
      { name: 'System Logs', href: '/admin/system-logs', icon: FileText, adminOnly: true }
    ]
  },
  {
    name: 'Settings',
    icon: Cog,
    items: [
      { name: 'My Profile', href: '/admin/profile', icon: Users, adminOnly: false },
      { name: 'Material Costs', href: '/admin/material-costs', icon: DollarSign, adminOnly: true }
    ]
  }
]

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { state } = useAdmin()
  const { messages: chatMessages } = useAdminChat()
  const { role } = useRole()
  const { logout } = useAdminAuth()
  const { getUnreadCountByType } = useNotifications()
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  
  // Get notification counts for different sections
  const unreadMessages = chatMessages.filter(m => m.sender === 'user' && !m.isRead).length
  const unreadPayments = getUnreadCountByType('payment')
  const unreadOrders = getUnreadCountByType('order')
  const unreadUpdates = getUnreadCountByType('update')
  
  // Debug logging for unread messages
  React.useEffect(() => {
    if (unreadMessages > 0) {
      console.log(`📬 Sidebar: ${unreadMessages} unread messages detected`);
    }
  }, [unreadMessages])

  // Helper function to get notification count for a specific navigation item
  const getNotificationCount = (href: string) => {
    switch (href) {
      case '/admin/orders':
        return unreadOrders + unreadUpdates
      case '/admin/payment-management':
      case '/admin/payment-logs':
        return unreadPayments
      case '/admin/messages':
        return unreadMessages
      default:
        return 0
    }
  }

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sectionName)) {
        newSet.delete(sectionName)
      } else {
        newSet.add(sectionName)
      }
      return newSet
    })
  }

  const handleLogout = async () => {
    try {
      // Use secure logout that calls backend and clears all auth data
      await logout()
      // Navigate to the public site after successful logout
      navigate('/')
    } catch (error) {
      console.error('Logout error:', error)
      // Still navigate even if logout fails
      navigate('/')
    }
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
        lg:translate-x-0 lg:fixed lg:inset-y-0 lg:left-0 lg:z-40
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
          <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
            {navigationSections
              .filter(section => {
                // Show section if user is admin or if section has non-admin-only items
                return role === 'admin' || section.items.some(item => !item.adminOnly)
              })
              .map((section) => {
              const isExpanded = expandedSections.has(section.name)
              const hasActiveItem = section.items.some(item => location.pathname === item.href)
              
              return (
                <div key={section.name}>
                  {/* Section Header */}
                  <button
                    onClick={() => toggleSection(section.name)}
                    className={`
                      w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors group
                      ${hasActiveItem 
                        ? 'text-gray-900 bg-gray-100' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <div className="flex items-center">
                      <section.icon 
                        className={`
                          mr-3 h-5 w-5 flex-shrink-0
                          ${hasActiveItem ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-500'}
                        `} 
                      />
                      {section.name}
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                  </button>

                  {/* Section Items */}
                  {isExpanded && (
                    <div className="ml-6 space-y-1 mt-1">
                      {section.items
                        .filter(item => role === 'admin' || !item.adminOnly)
                        .map((item) => {
                        const isActive = location.pathname === item.href
                        return (
                          <Link
                            key={item.name}
                            to={item.href}
                            className={`
                              group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                              ${isActive 
                                ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-700' 
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                              }
                            `}
                            onClick={onClose}
                          >
                            <item.icon 
                              className={`
                                mr-3 h-4 w-4 flex-shrink-0
                                ${isActive ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-500'}
                              `} 
                            />
                            {item.name}
                            
                            {/* Notification badges */}
                            {(() => {
                              const notificationCount = getNotificationCount(item.href)
                              return notificationCount > 0 ? (
                                <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-600 text-white">
                                  {notificationCount > 99 ? '99+' : notificationCount}
                                </span>
                              ) : null
                            })()}
                            
                            {/* Admin-only indicator */}
                            {item.adminOnly && (
                              <span className="ml-auto inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-800">
                                Admin
                              </span>
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
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
                <p className="text-xs text-gray-500">admin@mayhemcreation.com</p>
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
