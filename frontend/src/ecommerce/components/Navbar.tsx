import React, { useState, useEffect } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { ShoppingCart, Menu, X, Search, ChevronDown, ChevronRight, User, LogIn, Package, Home, Info, HelpCircle, Mail, Shirt, Crown, Palette, Sparkles, LifeBuoy } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import AuthModal from '../../components/AuthModal'
import { categoryApiService, Category } from '../../shared/categoryApiService'

const NavItem: React.FC<{ to: string; children: React.ReactNode; onClick?: () => void }> = ({ to, children, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) =>
      `px-4 py-2 text-sm font-medium transition-colors duration-200 ${
        isActive
          ? 'text-accent border-b-2 border-accent'
          : 'text-gray-700 hover:text-accent hover:border-b-2 hover:border-accent'
      }`
    }
  >
    {children}
  </NavLink>
)

const MobileNavItem: React.FC<{ to: string; children: React.ReactNode; onClick?: () => void }> = ({ to, children, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) =>
      `px-4 py-3 text-sm font-medium transition-colors duration-200 rounded-md ${
        isActive
          ? 'text-accent bg-accent/10'
          : 'text-gray-700 hover:text-accent hover:bg-gray-50'
      }`
    }
  >
    {children}
  </NavLink>
)

const SupportDropdown: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const supportItems = [
    {
      name: 'About Us',
      href: '/about',
      description: 'Learn about our company and mission',
      icon: <Info className="w-4 h-4" />
    },
    {
      name: 'FAQ',
      href: '/faq',
      description: 'Frequently asked questions',
      icon: <HelpCircle className="w-4 h-4" />
    },
    {
      name: 'Contact',
      href: '/contact',
      description: 'Get in touch with us',
      icon: <Mail className="w-4 h-4" />
    }
  ]

  return (
    <>
      {supportItems.map((item) => (
        <Link
          key={item.name}
          to={item.href}
          onClick={onClose}
          className="block px-4 py-3 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className="text-gray-500">{item.icon}</div>
            <div>
              <div className="font-medium text-gray-900">{item.name}</div>
              <div className="text-sm text-gray-500">{item.description}</div>
            </div>
          </div>
        </Link>
      ))}
    </>
  )
}

const CategoryDropdown: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categoryApiService.getCategories({
          includeChildren: true,
          status: 'active',
          sortBy: 'sortOrder',
          sortOrder: 'ASC'
        })
        
        // Transform database categories to navbar format
        const transformedCategories = [
          {
            name: 'All Products',
            href: '/products',
            description: 'Browse our complete collection',
            subcategories: []
          },
          ...response.data.map((category: Category) => ({
            name: category.name,
            href: `/products?category=${category.slug}`,
            description: category.description || '',
            subcategories: category.children?.map((child: Category) => ({
              name: child.name,
              href: `/products?category=${category.slug}&subcategory=${child.slug}`
            })) || []
          }))
        ]
        setCategories(transformedCategories)
      } catch (error) {
        console.error('Error fetching categories:', error)
        // Fallback to empty array if API fails
        setCategories([{
          name: 'All Products',
          href: '/products',
          description: 'Browse our complete collection',
          subcategories: []
        }])
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [])

  if (loading) {
    return (
      <div className="px-4 py-3 text-gray-500">
        Loading categories...
      </div>
    )
  }

  return (
    <>
      {categories.map((category) => (
        <div key={category.name} className="group">
          <Link
            to={category.href}
            onClick={onClose}
            className="block px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="font-medium text-gray-900">{category.name}</div>
            <div className="text-sm text-gray-500">{category.description}</div>
          </Link>

          {/* Subcategories */}
          {category.subcategories.length > 0 && (
            <div className="ml-4 border-l border-gray-200 pl-2">
              {category.subcategories.map((subcategory: any) => (
                <Link
                  key={subcategory.name}
                  to={subcategory.href}
                  onClick={onClose}
                  className="block px-3 py-2 text-sm text-gray-600 hover:text-accent hover:bg-gray-50 transition-colors"
                >
                  {subcategory.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </>
  )
}

const MobileCategorySection: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({})

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categoryApiService.getCategories({
          includeChildren: true,
          status: 'active',
          sortBy: 'sortOrder',
          sortOrder: 'ASC'
        })
        
        // Transform database categories to mobile navbar format
        const transformedCategories = response.data.map((category: Category) => ({
          name: category.name,
          slug: category.slug,
          href: `/products?category=${category.slug}`,
          subcategories: category.children?.map((child: Category) => ({
            name: child.name,
            href: `/products?category=${category.slug}&subcategory=${child.slug}`
          })) || []
        }))
        setCategories(transformedCategories)
      } catch (error) {
        console.error('Error fetching categories:', error)
        setCategories([])
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [])

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  if (loading) {
    return (
      <div className="px-4 py-3 text-gray-500">
        Loading categories...
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <MobileNavItem to="/products" onClick={onClose}>
        <div className="flex items-center space-x-3">
          <Package className="w-4 h-4 text-gray-500" />
          <span>All Products</span>
        </div>
      </MobileNavItem>

      {categories.map((category) => (
        <div key={category.slug} className="space-y-1">
          <button
            onClick={() => toggleSection(category.slug)}
            className="flex items-center justify-between w-full px-3 py-2 text-left text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
          >
            <div className="flex items-center space-x-3">
              <Shirt className="w-4 h-4 text-gray-500" />
              <span>{category.name}</span>
            </div>
            {expandedSections[category.slug] ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {expandedSections[category.slug] && category.subcategories.length > 0 && (
            <div className="ml-6 space-y-1 pl-3">
              {category.subcategories.map((subcategory: any) => (
                <MobileNavItem key={subcategory.name} to={subcategory.href} onClick={onClose}>
                  <div className="flex items-center space-x-3">
                    <Shirt className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{subcategory.name}</span>
                  </div>
                </MobileNavItem>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function Navbar() {
  const { items } = useCart()
  const { user, isLoggedIn, login, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [productsDropdownOpen, setProductsDropdownOpen] = useState(false)
  const [supportDropdownOpen, setSupportDropdownOpen] = useState(false)
  const [dropdownTimeout, setDropdownTimeout] = useState<number | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    products: false,
    support: false
  })
  const count = items.reduce((s, i) => s + i.quantity, 0)

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleProductsMouseEnter = () => {
    if (dropdownTimeout) {
      clearTimeout(dropdownTimeout)
      setDropdownTimeout(null)
    }
    setProductsDropdownOpen(true)
  }

  const handleProductsMouseLeave = () => {
    const timeout = setTimeout(() => {
      setProductsDropdownOpen(false)
    }, 150) // Small delay to prevent flickering
    setDropdownTimeout(timeout)
  }

  const handleSupportMouseEnter = () => {
    if (dropdownTimeout) {
      clearTimeout(dropdownTimeout)
      setDropdownTimeout(null)
    }
    setSupportDropdownOpen(true)
  }

  const handleSupportMouseLeave = () => {
    const timeout = setTimeout(() => {
      setSupportDropdownOpen(false)
    }, 150) // Small delay to prevent flickering
    setDropdownTimeout(timeout)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (dropdownTimeout) {
        clearTimeout(dropdownTimeout)
      }
    }
  }, [dropdownTimeout])

  return (
    <header className="w-full bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <div className="hidden sm:block">
              <div className="font-bold text-xl text-gray-900">Mayhem Creation</div>
              <div className="text-xs text-gray-500">Custom Embroidery</div>
            </div>
          </Link>

          {/* Desktop Navigation - Large screens */}
          <nav className="hidden lg:flex items-center space-x-6">
            <NavItem to="/">Home</NavItem>

            {/* Products Dropdown */}
            <div
              className="relative group"
              onMouseEnter={handleProductsMouseEnter}
              onMouseLeave={handleProductsMouseLeave}
            >
              <button
                className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-700 hover:text-accent transition-colors duration-200"
                onClick={() => setProductsDropdownOpen(!productsDropdownOpen)}
              >
                <span>Products</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${productsDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {productsDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <CategoryDropdown onClose={() => setProductsDropdownOpen(false)} />
                </div>
              )}
            </div>

            <NavItem to="/customized-embroidery">Customized Embroidery</NavItem>

            {/* Support Dropdown */}
            <div
              className="relative group"
              onMouseEnter={handleSupportMouseEnter}
              onMouseLeave={handleSupportMouseLeave}
            >
              <button
                className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-700 hover:text-accent transition-colors duration-200"
                onClick={() => setSupportDropdownOpen(!supportDropdownOpen)}
              >
                <span>Support</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${supportDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {supportDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <SupportDropdown onClose={() => setSupportDropdownOpen(false)} />
                </div>
              )}
            </div>
            {isLoggedIn && (
              <NavItem to="/my-orders">Orders</NavItem>
            )}
          </nav>

          {/* Desktop Navigation - Medium screens */}
          <nav className="hidden md:flex lg:hidden items-center space-x-4">
            <NavItem to="/">Home</NavItem>
            <NavItem to="/products">Products</NavItem>
            <NavItem to="/customized-embroidery">Customized Embroidery</NavItem>
            <NavItem to="/about">Support</NavItem>
            {isLoggedIn && (
              <NavItem to="/my-orders">Orders</NavItem>
            )}
          </nav>

          {/* Search Bar - Desktop */}
          <div className="hidden xl:flex items-center flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-accent focus:border-accent text-sm"
              />
            </div>
          </div>

          {/* Cart & Auth & Mobile Menu */}
          <div className="flex items-center space-x-4">
            {/* Auth Buttons - Desktop */}
            <div className="hidden md:flex items-center space-x-2">
              {isLoggedIn ? (
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-700" />
                  <span className="text-sm text-gray-700 hidden lg:inline">Hi, {user?.firstName}!</span>
                  <button
                    onClick={logout}
                    className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setAuthMode('login')
                      setShowAuthModal(true)
                    }}
                    className="flex items-center space-x-1 px-2 py-1 text-sm text-gray-700 hover:text-accent transition-colors rounded"
                  >
                    <LogIn className="w-4 h-4" />
                    <span className="hidden lg:inline">Login</span>
                  </button>
                  <button
                    onClick={() => {
                      setAuthMode('register')
                      setShowAuthModal(true)
                    }}
                    className="px-2 py-1 text-sm bg-accent text-white rounded hover:bg-opacity-90 transition-colors"
                  >
                    <span className="hidden lg:inline">Register</span>
                    <span className="lg:hidden">Sign Up</span>
                  </button>
                </>
              )}
            </div>

            {/* Cart */}
            <Link to="/cart" className="relative p-2 text-gray-700 hover:text-accent transition-colors">
              <ShoppingCart className="w-5 h-5" />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 bg-accent text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-medium text-xs">
                  {count}
                </span>
              )}
              <span className="sr-only">Shopping cart with {count} items</span>
            </Link>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-700 hover:text-accent"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-4 space-y-4">
              {/* Mobile Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search products..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-accent focus:border-accent"
                />
              </div>

              {/* Mobile Menu Items */}
              <nav className="space-y-2">
                {/* Home */}
                <MobileNavItem to="/" onClick={() => setMobileMenuOpen(false)}>
                  <div className="flex items-center space-x-3">
                    <Home className="w-5 h-5 text-gray-600" />
                    <span>Home</span>
                  </div>
                </MobileNavItem>

                {/* Products Section */}
                <div className="space-y-1">
                  <button
                    onClick={() => toggleSection('products')}
                    className="flex items-center justify-between w-full px-4 py-3 text-left text-base font-medium text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <Package className="w-5 h-5 text-gray-600" />
                      <span>Products</span>
                    </div>
                    {expandedSections.products ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  {expandedSections.products && (
                    <div className="ml-6 space-y-1 pl-4">
                      <MobileCategorySection onClose={() => setMobileMenuOpen(false)} />
                    </div>
                  )}
                </div>

                {/* Customized Embroidery */}
                <MobileNavItem to="/customized-embroidery" onClick={() => setMobileMenuOpen(false)}>
                  <div className="flex items-center space-x-3">
                    <Sparkles className="w-5 h-5 text-gray-600" />
                    <span>Customized Embroidery</span>
                  </div>
                </MobileNavItem>

                {/* Support Section */}
                <div className="space-y-1">
                  <button
                    onClick={() => toggleSection('support')}
                    className="flex items-center justify-between w-full px-4 py-3 text-left text-base font-medium text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <LifeBuoy className="w-5 h-5 text-gray-600" />
                      <span>Support</span>
                    </div>
                    {expandedSections.support ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  {expandedSections.support && (
                    <div className="ml-6 space-y-1 pl-4">
                      <MobileNavItem to="/about" onClick={() => setMobileMenuOpen(false)}>
                        <div className="flex items-center space-x-3">
                          <Info className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">About Us</span>
                        </div>
                      </MobileNavItem>
                      
                      <MobileNavItem to="/faq" onClick={() => setMobileMenuOpen(false)}>
                        <div className="flex items-center space-x-3">
                          <HelpCircle className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">FAQ</span>
                        </div>
                      </MobileNavItem>
                      
                      <MobileNavItem to="/contact" onClick={() => setMobileMenuOpen(false)}>
                        <div className="flex items-center space-x-3">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">Contact</span>
                        </div>
                      </MobileNavItem>
                    </div>
                  )}
                </div>

                {/* Orders (if logged in) */}
                {isLoggedIn && (
                  <MobileNavItem to="/my-orders" onClick={() => setMobileMenuOpen(false)}>
                    <div className="flex items-center space-x-3">
                      <Package className="w-5 h-5 text-gray-600" />
                      <span>My Orders</span>
                    </div>
                  </MobileNavItem>
                )}

                {/* Mobile Auth */}
                <div className="border-t-2 border-gray-100 pt-4 mt-6">
                  {isLoggedIn ? (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 px-4 py-3 bg-gray-50 rounded-lg">
                        <User className="w-5 h-5 text-accent" />
                        <span className="text-base text-gray-700 font-medium">Welcome, {user?.firstName}!</span>
                      </div>
                      <button
                        onClick={() => {
                          logout()
                          setMobileMenuOpen(false)
                        }}
                        className="flex items-center justify-center space-x-3 w-full px-4 py-3 text-base text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md transition-colors border border-gray-200"
                      >
                        <LogIn className="w-5 h-5 rotate-180" />
                        <span>Logout</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <button
                        onClick={() => {
                          setAuthMode('login')
                          setShowAuthModal(true)
                          setMobileMenuOpen(false)
                        }}
                        className="flex items-center justify-center space-x-3 w-full px-4 py-3 text-base text-gray-700 hover:bg-gray-50 rounded-md transition-colors border border-gray-200"
                      >
                        <LogIn className="w-5 h-5" />
                        <span>Login</span>
                      </button>
                      <button
                        onClick={() => {
                          setAuthMode('register')
                          setShowAuthModal(true)
                          setMobileMenuOpen(false)
                        }}
                        className="flex items-center justify-center space-x-3 w-full px-4 py-3 text-base bg-accent text-white rounded-md hover:bg-opacity-90 transition-colors shadow-sm"
                      >
                        <User className="w-5 h-5" />
                        <span>Register</span>
                      </button>
                    </div>
                  )}
                </div>
              </nav>
            </div>
          </div>
        )}
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
        onModeChange={setAuthMode}
        onSuccess={(userData) => {
          login(userData)
          setShowAuthModal(false)
        }}
      />
    </header>
  )
}
