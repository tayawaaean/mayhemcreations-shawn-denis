import React, { useState, useEffect } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { ShoppingCart, Menu, X, Search, ChevronDown, User, LogIn } from 'lucide-react'
import { useCart } from '../context/CartContext'
import AuthModal from './AuthModal'

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

const CategoryDropdown: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const categories = [
    { 
      name: 'All Products', 
      href: '/products', 
      description: 'Browse our complete collection',
      subcategories: []
    },
    { 
      name: 'Apparel', 
      href: '/products?category=apparel', 
      description: 'Tees, hoodies, and clothing',
      subcategories: [
        { name: 'T-Shirts', href: '/products?category=apparel&subcategory=tshirt' },
        { name: 'Polo Shirts', href: '/products?category=apparel&subcategory=poloshirt' },
        { name: 'Hoodies', href: '/products?category=apparel&subcategory=hoodie' }
      ]
    },
    { 
      name: 'Accessories', 
      href: '/products?category=accessories', 
      description: 'Caps, bags, and more',
      subcategories: [
        { name: 'Caps', href: '/products?category=accessories&subcategory=cap' },
        { name: 'Bags', href: '/products?category=accessories&subcategory=bag' }
      ]
    },
    { 
      name: 'Embroidery', 
      href: '/products?category=embroidery', 
      description: 'Patches and custom work',
      subcategories: []
    }
  ]

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
              {category.subcategories.map((subcategory) => (
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

export default function Navbar() {
  const { items } = useCart()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [productsDropdownOpen, setProductsDropdownOpen] = useState(false)
  const [dropdownTimeout, setDropdownTimeout] = useState<NodeJS.Timeout | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const count = items.reduce((s, i) => s + i.quantity, 0)

  const handleMouseEnter = () => {
    if (dropdownTimeout) {
      clearTimeout(dropdownTimeout)
      setDropdownTimeout(null)
    }
    setProductsDropdownOpen(true)
  }

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setProductsDropdownOpen(false)
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

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <NavItem to="/">Home</NavItem>
            
            {/* Products Dropdown */}
            <div 
              className="relative group"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <button 
                className="flex items-center space-x-1 px-4 py-2 text-sm font-medium text-gray-700 hover:text-accent transition-colors duration-200"
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
            
            <NavItem to="/about">About</NavItem>
            <NavItem to="/faq">FAQ</NavItem>
            <NavItem to="/contact">Contact</NavItem>
          </nav>

          {/* Search Bar - Desktop */}
          <div className="hidden lg:flex items-center flex-1 max-w-lg mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-accent focus:border-accent"
              />
            </div>
          </div>

          {/* Cart & Auth & Mobile Menu */}
          <div className="flex items-center space-x-4">
            {/* Auth Buttons - Desktop */}
            <div className="hidden md:flex items-center space-x-2">
              {isLoggedIn ? (
                <div className="flex items-center space-x-2">
                  <User className="w-5 h-5 text-gray-700" />
                  <span className="text-sm text-gray-700">Welcome back!</span>
                  <button 
                    onClick={() => setIsLoggedIn(false)}
                    className="text-sm text-gray-500 hover:text-gray-700"
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
                    className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-700 hover:text-accent transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Login</span>
                  </button>
                  <button
                    onClick={() => {
                      setAuthMode('register')
                      setShowAuthModal(true)
                    }}
                    className="px-3 py-2 text-sm bg-accent text-white rounded-md hover:bg-opacity-90 transition-colors"
                  >
                    Register
                  </button>
                </>
              )}
            </div>

            {/* Cart */}
            <Link to="/cart" className="relative p-2 text-gray-700 hover:text-accent transition-colors">
              <ShoppingCart className="w-6 h-6" />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 bg-accent text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
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
                <NavItem to="/" onClick={() => setMobileMenuOpen(false)}>Home</NavItem>
                <div className="space-y-1">
                  <div className="px-3 py-2 text-sm font-medium text-gray-500">Products</div>
                  <NavItem to="/products" onClick={() => setMobileMenuOpen(false)}>All Products</NavItem>
                  
                  {/* Apparel */}
                  <div className="ml-2">
                    <NavItem to="/products?category=apparel" onClick={() => setMobileMenuOpen(false)}>Apparel</NavItem>
                    <div className="ml-4 space-y-1">
                      <NavItem to="/products?category=apparel&subcategory=tshirt" onClick={() => setMobileMenuOpen(false)}>T-Shirts</NavItem>
                      <NavItem to="/products?category=apparel&subcategory=poloshirt" onClick={() => setMobileMenuOpen(false)}>Polo Shirts</NavItem>
                      <NavItem to="/products?category=apparel&subcategory=hoodie" onClick={() => setMobileMenuOpen(false)}>Hoodies</NavItem>
                    </div>
                  </div>
                  
                  {/* Accessories */}
                  <div className="ml-2">
                    <NavItem to="/products?category=accessories" onClick={() => setMobileMenuOpen(false)}>Accessories</NavItem>
                    <div className="ml-4 space-y-1">
                      <NavItem to="/products?category=accessories&subcategory=cap" onClick={() => setMobileMenuOpen(false)}>Caps</NavItem>
                      <NavItem to="/products?category=accessories&subcategory=bag" onClick={() => setMobileMenuOpen(false)}>Bags</NavItem>
                    </div>
                  </div>
                  
                  <NavItem to="/products?category=embroidery" onClick={() => setMobileMenuOpen(false)}>Embroidery</NavItem>
                </div>
                <NavItem to="/about" onClick={() => setMobileMenuOpen(false)}>About</NavItem>
                <NavItem to="/faq" onClick={() => setMobileMenuOpen(false)}>FAQ</NavItem>
                <NavItem to="/contact" onClick={() => setMobileMenuOpen(false)}>Contact</NavItem>
                
                {/* Mobile Auth */}
                <div className="border-t border-gray-200 pt-4">
                  {isLoggedIn ? (
                    <div className="px-3 py-2">
                      <div className="flex items-center space-x-2 mb-2">
                        <User className="w-4 h-4 text-gray-700" />
                        <span className="text-sm text-gray-700">Welcome back!</span>
                      </div>
                      <button 
                        onClick={() => {
                          setIsLoggedIn(false)
                          setMobileMenuOpen(false)
                        }}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        Logout
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          setAuthMode('login')
                          setShowAuthModal(true)
                          setMobileMenuOpen(false)
                        }}
                        className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>Login</span>
                      </button>
                      <button
                        onClick={() => {
                          setAuthMode('register')
                          setShowAuthModal(true)
                          setMobileMenuOpen(false)
                        }}
                        className="w-full px-3 py-2 text-sm bg-accent text-white rounded-md hover:bg-opacity-90"
                      >
                        Register
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
        onSuccess={() => setIsLoggedIn(true)}
      />
    </header>
  )
}