import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAdmin } from '../../context/AdminContext'
import { useAdminAuth } from '../../context/AdminAuthContext'
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
  Store,
  CreditCard,
  ChevronDown,
  ChevronRight,
  BarChart,
  Cog,
  DollarSign,
  RotateCcw,
  Clock
} from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

// Seller-specific navigation sections
const navigationSections = [
  {
    name: 'Overview',
    icon: LayoutDashboard,
    items: [
      { name: 'Dashboard', href: '/seller', icon: LayoutDashboard }
    ]
  },
  {
    name: 'My Store',
    icon: Store,
    items: [
      { name: 'My Products', href: '/seller/products', icon: Package },
      { name: 'Categories', href: '/seller/categories', icon: FileText },
      { name: 'Inventory', href: '/seller/inventory', icon: Warehouse },
      { name: 'Embroidery', href: '/seller/embroidery', icon: Palette }
    ]
  },
  {
    name: 'Orders & Customers',
    icon: ShoppingCart,
    items: [
      { name: 'Orders', href: '/seller/orders', icon: ShoppingCart },
      { name: 'Pending Review', href: '/seller/pending-review', icon: Clock },
      { name: 'Customers', href: '/seller/customers', icon: Users },
      { name: 'Reviews', href: '/seller/reviews', icon: Star }
    ]
  },
  {
    name: 'Payments',
    icon: DollarSign,
    items: [
      { name: 'Payment Management', href: '/seller/payment-management', icon: DollarSign }
    ]
  },
  {
    name: 'Refunds',
    icon: RotateCcw,
    items: [
      { name: 'Refund Management', href: '/seller/refund-management', icon: RotateCcw }
    ]
  },
  {
    name: 'Communication',
    icon: MessageSquare,
    items: [
      { name: 'Messages', href: '/seller/messages', icon: MessageSquare },
      { name: 'FAQs', href: '/seller/faqs', icon: HelpCircle }
    ]
  },
  {
    name: 'Analytics & Reports',
    icon: BarChart,
    items: [
      { name: 'Analytics', href: '/seller/analytics', icon: BarChart3 }
    ]
  }
]

const SellerSidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { state } = useAdmin()
  const { logout } = useAdminAuth()
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const unreadMessages = state.messages.filter(m => !m.isFromAdmin && !m.isRead).length

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
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Store className="h-5 w-5 text-white" />
              </div>
              <span className="ml-2 text-xl font-bold text-gray-900">Seller</span>
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
            {navigationSections.map((section) => {
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
                        ? 'text-blue-700 bg-blue-50' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <div className="flex items-center">
                      <section.icon 
                        className={`
                          mr-3 h-5 w-5 flex-shrink-0
                          ${hasActiveItem ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-500'}
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
                      {section.items.map((item) => {
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
                            {/* Unread badge for Messages */}
                            {item.name === 'Messages' && unreadMessages > 0 && (
                              <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-600 text-white">
                                {unreadMessages}
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
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Store className="h-4 w-4 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Seller Account</p>
                <p className="text-xs text-gray-500">seller@mayhemcreation.com</p>
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

export default SellerSidebar
