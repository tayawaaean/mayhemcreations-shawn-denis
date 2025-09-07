import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { AdminProvider } from './context/AdminContext'
import AdminLayout from './components/layout/AdminLayout'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Orders from './pages/Orders'
import Customers from './pages/Customers'
import Messages from './pages/Messages'
import Inventory from './pages/Inventory'
import Categories from './pages/Categories'
import Embroidery from './pages/Embroidery'
import FAQs from './pages/FAQs'
import Analytics from './pages/Analytics'
import ChatSettings from './pages/ChatSettings'

const AdminApp: React.FC = () => {
  return (
    <AdminProvider>
      <Routes>
        <Route path="/*" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="orders" element={<Orders />} />
          <Route path="customers" element={<Customers />} />
          <Route path="messages" element={<Messages />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="categories" element={<Categories />} />
          <Route path="embroidery" element={<Embroidery />} />
          <Route path="faqs" element={<FAQs />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="chat-settings" element={<ChatSettings />} />
        </Route>
      </Routes>
    </AdminProvider>
  )
}

export default AdminApp
