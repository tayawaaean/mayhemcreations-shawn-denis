import React, { createContext, useContext, useEffect, useState } from 'react'
import type { CartItem } from '../types'
import { productApiService } from '../../shared/productApiService'

type CartContextType = {
  items: CartItem[]
  add: (productId: string, qty?: number, customization?: CartItem['customization']) => Promise<boolean>
  remove: (productId: string) => void
  update: (productId: string, qty: number) => Promise<boolean>
  clear: () => void
  validateStock: (productId: string, quantity: number) => Promise<{ valid: boolean; message?: string }>
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

  const validateStock = async (productId: string, quantity: number): Promise<{ valid: boolean; message?: string }> => {
    try {
      const response = await productApiService.getProductById(parseInt(productId))
      const product = response.data
      
      // Calculate total stock from variants
      const totalStock = product.variants?.reduce((sum: number, variant: any) => sum + (variant.stock || 0), 0) || 0
      
      if (totalStock === 0) {
        return { valid: false, message: 'This product is out of stock' }
      }
      
      if (totalStock < quantity) {
        return { valid: false, message: `Only ${totalStock} items available in stock` }
      }
      
      return { valid: true }
    } catch (error) {
      console.error('Error validating stock:', error)
      return { valid: false, message: 'Unable to verify stock availability' }
    }
  }

  const add = async (productId: string, qty = 1, customization?: CartItem['customization']): Promise<boolean> => {
    const validation = await validateStock(productId, qty)
    if (!validation.valid) {
      alert(validation.message)
      return false
    }

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
    return true
  }

  const remove = (productId: string) => setItems((prev) => prev.filter((p) => p.productId !== productId))
  
  const update = async (productId: string, qty: number): Promise<boolean> => {
    const validation = await validateStock(productId, qty)
    if (!validation.valid) {
      alert(validation.message)
      return false
    }

    setItems((prev) => prev.map((p) => p.productId === productId ? { ...p, quantity: qty } : p))
    return true
  }
  
  const clear = () => setItems([])

  return <CartContext.Provider value={{ items, add, remove, update, clear, validateStock }}>{children}</CartContext.Provider>
}

export const useCart = () => {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}