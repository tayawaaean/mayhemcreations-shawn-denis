import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Navbar from './ecommerce/components/Navbar'
import Footer from './ecommerce/components/Footer'
import ChatWidget from './ecommerce/components/ChatWidget'
import { ChatProvider } from './ecommerce/context/ChatContext'
import { CartProvider } from './ecommerce/context/CartContext'
import { CustomizationProvider } from './ecommerce/context/CustomizationContext'
import { AuthProvider } from './ecommerce/context/AuthContext'
import { MultiAccountProvider } from './shared/multiAccountContext'
import AdminApp from './admin/AdminApp'
import SellerApp from './admin/SellerApp'
import EmployeeApp from './admin/EmployeeApp'
import Home from './ecommerce/routes/Home'
import Products from './ecommerce/routes/Products'
import ProductPage from './ecommerce/routes/ProductPage'
import Customize from './ecommerce/routes/Customize'
import About from './ecommerce/routes/About'
import FAQ from './ecommerce/routes/FAQ'
import Contact from './ecommerce/routes/Contact'
import Cart from './ecommerce/routes/Cart'
import Checkout from './ecommerce/routes/Checkout'
import MyOrders from './ecommerce/routes/MyOrders'

export default function App() {
  return (
    <MultiAccountProvider>
      <AuthProvider>
        <CartProvider>
          <ChatProvider>
            <CustomizationProvider>
            <Routes>
            {/* Employee Login Route */}
            <Route path="/employee-login" element={<EmployeeApp />} />
            
            {/* Admin Routes */}
            <Route path="/admin/*" element={<AdminApp />} />
            
            {/* Seller Routes */}
            <Route path="/seller/*" element={<SellerApp />} />
            
            {/* Public Routes */}
            <Route path="/" element={
              <div className="min-h-screen flex flex-col">
                <Navbar />
                <div className="flex-1">
                  <Home />
                </div>
                <Footer />
                <ChatWidget />
              </div>
            } />
            <Route path="/products" element={
              <div className="min-h-screen flex flex-col">
                <Navbar />
                <div className="flex-1">
                  <Products />
                </div>
                <Footer />
                <ChatWidget />
              </div>
            } />
            <Route path="/product/:id" element={
              <div className="min-h-screen flex flex-col">
                <Navbar />
                <div className="flex-1">
                  <ProductPage />
                </div>
                <Footer />
                <ChatWidget />
              </div>
            } />
            <Route path="/customize/:id" element={
              <div className="min-h-screen flex flex-col">
                <Navbar />
                <div className="flex-1">
                  <Customize />
                </div>
                <Footer />
              </div>
            } />
            <Route path="/about" element={
              <div className="min-h-screen flex flex-col">
                <Navbar />
                <div className="flex-1">
                  <About />
                </div>
                <Footer />
                <ChatWidget />
              </div>
            } />
            <Route path="/faq" element={
              <div className="min-h-screen flex flex-col">
                <Navbar />
                <div className="flex-1">
                  <FAQ />
                </div>
                <Footer />
                <ChatWidget />
              </div>
            } />
            <Route path="/contact" element={
              <div className="min-h-screen flex flex-col">
                <Navbar />
                <div className="flex-1">
                  <Contact />
                </div>
                <Footer />
                <ChatWidget />
              </div>
            } />
            <Route path="/cart" element={
              <div className="min-h-screen flex flex-col">
                <Navbar />
                <div className="flex-1">
                  <Cart />
                </div>
                <Footer />
                <ChatWidget />
              </div>
            } />
            <Route path="/checkout" element={
              <div className="min-h-screen flex flex-col">
                <Navbar />
                <div className="flex-1">
                  <Checkout />
                </div>
                <Footer />
                <ChatWidget />
              </div>
            } />
            <Route path="/my-orders" element={
              <div className="min-h-screen flex flex-col">
                <Navbar />
                <div className="flex-1">
                  <MyOrders />
                </div>
                <Footer />
                <ChatWidget />
              </div>
            } />
          </Routes>
        </CustomizationProvider>
      </ChatProvider>
    </CartProvider>
    </AuthProvider>
    </MultiAccountProvider>
  )
}