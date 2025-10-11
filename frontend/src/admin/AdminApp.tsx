import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { AdminProvider } from './context/AdminContext'
import { AdminAuthProvider } from './context/AdminAuthContext'
import { AdminChatProvider } from './context/AdminChatContext'
import { RoleProvider } from './context/RoleContext'
import { InventoryProvider } from '../shared/inventoryContext'
import { NotificationProvider } from './context/NotificationContext'
import SharedLayout from './components/layout/SharedLayout'
import Sidebar from './components/layout/Sidebar'
import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import PendingReview from './pages/PendingReview'
import Customers from './pages/Customers'
import Reviews from './pages/Reviews'
import UsersPage from './pages/Users'
import Messages from './pages/Messages'
import Inventory from './pages/Inventory'
import Categories from './pages/Categories'
import Embroidery from './pages/Embroidery'
import FAQs from './pages/FAQs'
import MaterialCosts from './pages/MaterialCosts'
import MaterialCostsTest from './pages/MaterialCostsTest'
import Analytics from './pages/Analytics'
import PaymentLogs from './pages/PaymentLogs'
import PaymentManagement from './pages/PaymentManagement'
import ShipStationManagement from './pages/ShipStationManagement'
import RefundManagement from './pages/RefundManagement'
import SystemLogs from './pages/SystemLogs'
import Profile from './pages/Profile'

const AdminApp: React.FC = () => {
  return (
    <AdminAuthProvider>
      <RoleProvider initialRole="admin">
        <AdminProvider>
          <InventoryProvider>
            <AdminChatProvider>
              <NotificationProvider>
                <Routes>
                <Route path="/*" element={
                  <ProtectedRoute requiredRole="admin">
                    <Routes>
                      <Route path="/*" element={<SharedLayout SidebarComponent={Sidebar} />}>
                        <Route index element={<Dashboard />} />
                        <Route path="products" element={<Products />} />
                        <Route path="orders" element={<PendingReview />} />
                        <Route path="customers" element={<Customers />} />
                        <Route path="reviews" element={<Reviews />} />
                        <Route path="users" element={<UsersPage />} />
                        <Route path="messages" element={<Messages />} />
                        <Route path="inventory" element={<Inventory />} />
                        <Route path="categories" element={<Categories />} />
                        <Route path="embroidery" element={<Embroidery />} />
                        <Route path="faqs" element={<FAQs />} />
                        <Route path="material-costs" element={<MaterialCosts />} />
                        <Route path="material-costs-test" element={<MaterialCostsTest />} />
                        <Route path="analytics" element={<Analytics />} />
                        <Route path="shipstation" element={<ShipStationManagement />} />
                        <Route path="payment-management" element={<PaymentManagement />} />
                        <Route path="payment-logs" element={<PaymentLogs />} />
                        <Route path="refund-management" element={<RefundManagement />} />
                        <Route path="system-logs" element={<SystemLogs />} />
                        <Route path="profile" element={<Profile />} />
                      </Route>
                    </Routes>
                  </ProtectedRoute>
                }>
                </Route>
              </Routes>
              </NotificationProvider>
            </AdminChatProvider>
          </InventoryProvider>
        </AdminProvider>
      </RoleProvider>
    </AdminAuthProvider>
  )
}

export default AdminApp
