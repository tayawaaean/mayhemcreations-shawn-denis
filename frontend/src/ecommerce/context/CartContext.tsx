import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import type { CartItem } from '../../types'
import { productApiService } from '../../shared/productApiService'
import { cartApiService } from '../../shared/cartApiService'
import { useAuth } from './AuthContext'

type CartContextType = {
  items: CartItem[]
  add: (productId: string, qty?: number, customization?: CartItem['customization']) => Promise<boolean>
  remove: (productId: string) => void
  update: (productId: string, qty: number) => Promise<boolean>
  clear: () => void
  validateStock: (productId: string, quantity: number) => Promise<{ valid: boolean; message?: string }>
  isLoading: boolean
  syncWithDatabase: () => Promise<void>
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const LOCAL_KEY = 'mayhem_cart_v1'

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoggedIn } = useAuth()
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY)
      if (raw) {
        const items = JSON.parse(raw)
        // Ensure all items have reviewStatus
        return items.map((item: any) => ({
          ...item,
          reviewStatus: item.reviewStatus || (item.customization ? 'pending' : 'approved')
        }))
      }
      return []
    } catch (e) {
      console.error('🛒 Error parsing cart from localStorage:', e)
      return []
    }
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isCleared, setIsCleared] = useState(false)
  const hasSyncedRef = useRef(false) // Track if we've already synced the cart

  /**
   * Load cart from database
   */
  const loadCartFromDatabase = useCallback(async () => {
    try {
      console.log('🛒 Attempting to load cart from database...')
      setIsLoading(true)
      const response = await cartApiService.getCart()
      
      console.log('🛒 Cart API response:', response)
      
      if (response.success && response.data) {
        // Transform backend cart items to frontend format
        const transformedItems = response.data.map(item => ({
          id: item.id,
          productId: item.productId,
          quantity: item.quantity,
          customization: item.customization,
          reviewStatus: item.reviewStatus || 'approved',
          product: item.product, // Include the full product data from database
        }))
        
        console.log('🛒 Transformed cart items:', transformedItems)
        setItems(transformedItems)
        
        // Also save to localStorage for offline access
        localStorage.setItem(LOCAL_KEY, JSON.stringify(transformedItems))
      } else {
        console.log('🛒 Cart API failed:', response.message)
      }
    } catch (error) {
      console.error('🛒 Error loading cart from database:', error)
      // Fallback to localStorage if database fails
      try {
        const raw = localStorage.getItem(LOCAL_KEY)
        if (raw) {
          const items = JSON.parse(raw)
          // Ensure all items have reviewStatus
          const itemsWithReviewStatus = items.map((item: any) => ({
            ...item,
            reviewStatus: item.reviewStatus || (item.customization ? 'pending' : 'approved')
          }))
          setItems(itemsWithReviewStatus)
        }
      } catch (e) {
        console.error('Error loading cart from localStorage:', e)
      }
    } finally {
      setIsLoading(false)
    }
  }, [isLoggedIn])

  /**
   * Sync cart with database
   */
  const syncWithDatabase = useCallback(async () => {
    if (!isLoggedIn) return

    try {
      setIsLoading(true)
      // Get current items from localStorage instead of state to avoid dependency loop
      const currentItems = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]')
      
      // Only sync if there are items in localStorage
      if (currentItems.length === 0) {
        return
      }
      
      const response = await cartApiService.syncCart(currentItems)
      
      if (response.success && response.data) {
        // Update items with database IDs and product data
        const updatedItems = response.data.map(item => ({
          id: item.id,
          productId: item.productId,
          quantity: item.quantity,
          customization: item.customization,
          reviewStatus: item.reviewStatus || 'approved',
          product: item.product, // Include the full product data from database
        }))
        
        setItems(updatedItems)
        localStorage.setItem(LOCAL_KEY, JSON.stringify(updatedItems))
      }
    } catch (error) {
      console.error('Error syncing cart with database:', error)
    } finally {
      setIsLoading(false)
    }
  }, [isLoggedIn]) // Removed items dependency to prevent infinite loop

  // Load cart from database when user logs in
  useEffect(() => {
    if (isLoggedIn && user && user.id && !isCleared && !hasSyncedRef.current) {
      hasSyncedRef.current = true // Mark as synced to prevent multiple syncs
      // First sync any localStorage items to database, then load from database
      syncWithDatabase().then(() => {
        loadCartFromDatabase()
      })
    } else if (!isLoggedIn) {
      // Clear cart when user logs out
      setItems([])
      setIsCleared(false)
      hasSyncedRef.current = false // Reset sync flag when user logs out
    }
  }, [isLoggedIn, user?.id, isCleared]) // Removed function dependencies to prevent infinite loop

  // Save to localStorage when items change (for guest users)
  useEffect(() => {
    if (!isLoggedIn) {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(items))
    }
  }, [items, isLoggedIn])

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
    // Skip stock validation for customized items (made-to-order)
    if (!customization) {
      const validation = await validateStock(productId, qty)
      if (!validation.valid) {
        alert(validation.message)
        return false
      }
    }

    if (isLoggedIn) {
      // Add to database
      try {
        const response = await cartApiService.addToCart(productId, qty, customization)
        if (response.success && response.data) {
          // Update local state with database response
          setItems((prev) => {
            const existingIndex = prev.findIndex((p) => p.productId === productId && !p.customization)
            if (existingIndex >= 0) {
              // Update existing item
              const updated = [...prev]
              updated[existingIndex] = {
                productId: response.data!.productId,
                quantity: response.data!.quantity,
                customization: response.data!.customization,
                reviewStatus: response.data!.reviewStatus || 'approved',
              }
              return updated
            } else {
              // Add new item
              return [...prev, {
                productId: response.data!.productId,
                quantity: response.data!.quantity,
                customization: response.data!.customization,
                reviewStatus: response.data!.reviewStatus || 'approved',
              }]
            }
          })
          setIsCleared(false) // Reset cleared flag when adding items
          return true
        }
        return false
      } catch (error) {
        console.error('Error adding to cart:', error)
        return false
      }
    } else {
      // Guest user - use localStorage
      setItems((prev) => {
        // For customized items, always add as new item (don't merge with existing)
        if (customization) {
          return [...prev, { 
            productId, 
            quantity: qty, 
            customization,
            reviewStatus: 'pending' as const // Customized items are always pending for guest users
          }]
        }
        
        // For regular items, merge quantities if same product
        const found = prev.find((p) => p.productId === productId && !p.customization)
        if (found) return prev.map((p) => p.productId === productId && !p.customization ? { ...p, quantity: p.quantity + qty } : p)
        return [...prev, { 
          productId, 
          quantity: qty,
          reviewStatus: 'approved' as const // Regular items are approved for guest users
        }]
      })
      setIsCleared(false) // Reset cleared flag when adding items
      return true
    }
  }

  const remove = async (productId: string) => {
    if (isLoggedIn) {
      // Find the cart item ID for database removal
      const item = items.find((p) => p.productId === productId)
      if (item && item.id) {
        try {
          await cartApiService.removeFromCart(item.id)
        } catch (error) {
          console.error('Error removing from cart:', error)
        }
      }
    }
    
    setItems((prev) => prev.filter((p) => p.productId !== productId))
  }
  
  const update = async (productId: string, qty: number): Promise<boolean> => {
    // Find the item to check if it's customized
    const item = items.find((p) => p.productId === productId)
    
    // Skip stock validation for customized items (made-to-order)
    if (!item?.customization) {
      const validation = await validateStock(productId, qty)
      if (!validation.valid) {
        alert(validation.message)
        return false
      }
    }

    if (isLoggedIn) {
      // Update in database
      try {
        const item = items.find((p) => p.productId === productId)
        if (item && item.id) {
          const response = await cartApiService.updateCartItem(item.id, qty, item.customization)
          if (response.success && response.data) {
            setItems((prev) => prev.map((p) => p.productId === productId ? {
              ...p,
              quantity: response.data!.quantity,
              customization: response.data!.customization,
            } : p))
            return true
          }
        }
        return false
      } catch (error) {
        console.error('Error updating cart:', error)
        return false
      }
    } else {
      // Guest user - use localStorage
      setItems((prev) => prev.map((p) => p.productId === productId ? { ...p, quantity: qty } : p))
      setIsCleared(false) // Reset cleared flag when updating items
      return true
    }
  }
  
  const clear = async () => {
    if (isLoggedIn) {
      try {
        await cartApiService.clearCart()
      } catch (error) {
        console.error('Error clearing cart:', error)
      }
    }
    
    setItems([])
    setIsCleared(true)
  }

  return <CartContext.Provider value={{ 
    items, 
    add, 
    remove, 
    update, 
    clear, 
    validateStock, 
    isLoading, 
    syncWithDatabase 
  }}>{children}</CartContext.Provider>
}

const useCart = () => {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}

export { useCart }