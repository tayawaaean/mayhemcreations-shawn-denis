import React, { createContext, useContext, useEffect, useState } from 'react'
import type { CartItem } from '../types'

type CartContextType = {
  items: CartItem[]
  add: (productId: string, qty?: number, customization?: CartItem['customization']) => void
  remove: (productId: string) => void
  update: (productId: string, qty: number) => void
  clear: () => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const LOCAL_KEY = 'mayhem_cart_v1'

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY)
      return raw ? JSON.parse(raw) : []
    } catch (e) {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(items))
  }, [items])

  const add = (productId: string, qty = 1, customization?: CartItem['customization']) => {
    setItems((prev) => {
      // For customized items, always add as new item (don't merge with existing)
      if (customization) {
        return [...prev, { productId, quantity: qty, customization }]
      }
      
      // For regular items, merge quantities if same product
      const found = prev.find((p) => p.productId === productId && !p.customization)
      if (found) return prev.map((p) => p.productId === productId && !p.customization ? { ...p, quantity: p.quantity + qty } : p)
      return [...prev, { productId, quantity: qty }]
    })
  }
  const remove = (productId: string) => setItems((prev) => prev.filter((p) => p.productId !== productId))
  const update = (productId: string, qty: number) => setItems((prev) => prev.map((p) => p.productId === productId ? { ...p, quantity: qty } : p))
  const clear = () => setItems([])

  return <CartContext.Provider value={{ items, add, remove, update, clear }}>{children}</CartContext.Provider>
}

export const useCart = () => {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}