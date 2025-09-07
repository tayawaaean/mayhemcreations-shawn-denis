import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ChatWidget from './components/ChatWidget'
import { ChatProvider } from './context/ChatContext'
import { CartProvider } from './context/CartContext'
import { CustomizationProvider } from './context/CustomizationContext'
import Home from './routes/Home'
import Products from './routes/Products'
import ProductPage from './routes/ProductPage'
import Customize from './routes/Customize'
import About from './routes/About'
import FAQ from './routes/FAQ'
import Contact from './routes/Contact'
import Cart from './routes/Cart'
import Checkout from './routes/Checkout'

export default function App() {
  return (
    <CartProvider>
      <ChatProvider>
        <CustomizationProvider>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <div className="flex-1">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/products" element={<Products />} />
                <Route path="/product/:id" element={<ProductPage />} />
                <Route path="/customize/:id" element={<Customize />} />
                <Route path="/about" element={<About />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
              </Routes>
            </div>
            <Footer />
            <ChatWidget />
          </div>
        </CustomizationProvider>
      </ChatProvider>
    </CartProvider>
  )
}