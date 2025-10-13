import React from 'react'
import { Routes, Route } from 'react-router-dom'
import EcommerceLayout from './ecommerce/components/EcommerceLayout'
import { RealTimeChatProvider } from './shared/realTimeChatContext'
import { CartProvider } from './ecommerce/context/CartContext'
import { CustomizationProvider } from './ecommerce/context/CustomizationContext'
import { AuthProvider } from './ecommerce/context/AuthContext'
import { MultiAccountProvider } from './shared/multiAccountContext'
import { AlertModalProvider } from './ecommerce/context/AlertModalContext'
import AdminApp from './admin/AdminApp'
import SellerApp from './admin/SellerApp'
import EmployeeApp from './admin/EmployeeApp'
import Home from './ecommerce/routes/Home'
import Products from './ecommerce/routes/Products'
import ProductPage from './ecommerce/routes/ProductPage'
import Customize from './ecommerce/routes/Customize'
import CustomizedEmbroidery from './ecommerce/routes/CustomizedEmbroidery'
import ProtectedRoute from './ecommerce/components/ProtectedRoute'
import About from './ecommerce/routes/About'
import FAQ from './ecommerce/routes/FAQ'
import Contact from './ecommerce/routes/Contact'
import Cart from './ecommerce/routes/Cart'
import Checkout from './ecommerce/routes/Checkout'
import OrderCheckout from './ecommerce/routes/OrderCheckout'
import MyOrders from './ecommerce/routes/MyOrders'
import VerifyEmail from './pages/VerifyEmail'
import PaymentSuccess from './pages/PaymentSuccess'
import PaymentCancel from './pages/PaymentCancel'
import OrderTracking from './components/OrderTracking'
import StripeTestSuite from './components/StripeTestSuite'

export default function App() {
  return (
    <MultiAccountProvider>
      <AuthProvider>
        <AlertModalProvider>
          <CartProvider>
            <RealTimeChatProvider>
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
              <EcommerceLayout>
                <Home />
              </EcommerceLayout>
            } />
            <Route path="/products" element={
              <EcommerceLayout>
                <Products />
              </EcommerceLayout>
            } />
            <Route path="/product/:id" element={
              <EcommerceLayout>
                <ProductPage />
              </EcommerceLayout>
            } />
            <Route path="/customize/:id" element={
              <EcommerceLayout>
                <Customize />
              </EcommerceLayout>
            } />
            <Route path="/customized-embroidery" element={
              <ProtectedRoute fallbackPath="/">
                <EcommerceLayout>
                  <CustomizedEmbroidery />
                </EcommerceLayout>
              </ProtectedRoute>
            } />
            <Route path="/about" element={
              <EcommerceLayout>
                <About />
              </EcommerceLayout>
            } />
            <Route path="/faq" element={
              <EcommerceLayout>
                <FAQ />
              </EcommerceLayout>
            } />
            <Route path="/contact" element={
              <EcommerceLayout>
                <Contact />
              </EcommerceLayout>
            } />
            <Route path="/cart" element={
              <EcommerceLayout>
                <Cart />
              </EcommerceLayout>
            } />
            <Route path="/checkout" element={
              <EcommerceLayout>
                <Checkout />
              </EcommerceLayout>
            } />
            <Route path="/order-checkout" element={
              <EcommerceLayout>
                <OrderCheckout />
              </EcommerceLayout>
            } />
            <Route path="/track-order" element={
              <EcommerceLayout>
                <OrderTracking />
              </EcommerceLayout>
            } />
            <Route path="/my-orders" element={
              <ProtectedRoute fallbackPath="/">
                <EcommerceLayout>
                  <MyOrders />
                </EcommerceLayout>
              </ProtectedRoute>
            } />
            <Route path="/verify-email" element={<VerifyEmail />} />
            
                    {/* Payment Routes */}
                    <Route path="/payment/success" element={<PaymentSuccess />} />
                    <Route path="/payment/cancel" element={<PaymentCancel />} />
                    <Route path="/stripe-test" element={<StripeTestSuite />} />
            </Routes>
              </CustomizationProvider>
            </RealTimeChatProvider>
          </CartProvider>
        </AlertModalProvider>
      </AuthProvider>
    </MultiAccountProvider>
  )
}