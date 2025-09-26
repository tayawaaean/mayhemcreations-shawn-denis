import React from 'react'
import Navbar from './Navbar'
import Footer from './Footer'
import ChatWidget from './ChatWidget'
import MessageNotification from './MessageNotification'
import { InventoryProvider } from '../../shared/inventoryContext'

interface EcommerceLayoutProps {
  children: React.ReactNode
}

export default function EcommerceLayout({ children }: EcommerceLayoutProps) {
  return (
    <InventoryProvider>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1">
          <MessageNotification />
          {children}
        </div>
        <Footer />
        <ChatWidget />
      </div>
    </InventoryProvider>
  )
}
