import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { AdminProvider } from './context/AdminContext'
import { AdminAuthProvider } from './context/AdminAuthContext'
import { RoleProvider } from './context/RoleContext'
import SharedLayout from './components/layout/SharedLayout'
import SellerSidebar from './components/layout/SellerSidebar'
import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import PendingReview from './pages/PendingReview'
import Customers from './pages/Customers'
import Reviews from './pages/Reviews'
import Messages from './pages/Messages'
import Inventory from './pages/Inventory'
import Categories from './pages/Categories'
import Embroidery from './pages/Embroidery'
import FAQs from './pages/FAQs'
import Analytics from './pages/Analytics'
import PaymentManagement from './pages/PaymentManagement'
import SellerRefundManagement from './pages/SellerRefundManagement'

const SellerApp: React.FC = () => {
  return (
    <AdminAuthProvider>
      <RoleProvider initialRole="seller">
        <AdminProvider>
          <Routes>
            <Route path="/*" element={
              <ProtectedRoute requiredRole="seller">
                <Routes>
                  <Route path="/*" element={<SharedLayout SidebarComponent={SellerSidebar} />}>
                    <Route index element={<Dashboard />} />
                    <Route path="products" element={<Products />} />
                    <Route path="orders" element={<PendingReview />} />
                    <Route path="customers" element={<Customers />} />
                    <Route path="reviews" element={<Reviews />} />
                    <Route path="messages" element={<Messages />} />
                    <Route path="inventory" element={<Inventory />} />
                    <Route path="categories" element={<Categories />} />
                    <Route path="embroidery" element={<Embroidery />} />
                    <Route path="faqs" element={<FAQs />} />
                    <Route path="analytics" element={<Analytics />} />
                    <Route path="payment-management" element={<PaymentManagement />} />
                    <Route path="refund-management" element={<SellerRefundManagement />} />
                  </Route>
                </Routes>
              </ProtectedRoute>
            }>
            </Route>
          </Routes>
        </AdminProvider>
      </RoleProvider>
    </AdminAuthProvider>
  )
}

export default SellerApp
