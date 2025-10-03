import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import type { CartItem } from '../../types'
import { productApiService } from '../../shared/productApiService'
import { cartApiService } from '../../shared/cartApiService'
import { useAuth } from './AuthContext'
import { products } from '../../data/products'

type CartContextType = {
  items: CartItem[]
  add: (productId: string, qty?: number, customization?: CartItem['customization']) => Promise<boolean>
  remove: (productId: string) => void
  update: (productId: string, qty: number) => Promise<boolean>
  clear: () => void
  validateStock: (productId: string, quantity: number) => Promise<{ valid: boolean; message?: string }>
  isLoading: boolean
  syncWithDatabase: () => Promise<void>
  cleanupInvalidItems: () => void
  clearLocalStorageIfNeeded: () => void
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
        const validItems = items.map((item: any) => ({
          ...item,
          reviewStatus: item.reviewStatus || (item.customization ? 'pending' : 'approved')
        }))
        
        // Log cart loading for debugging
        console.log('🛒 Loading cart from localStorage:', validItems.length, 'items')
        console.log('🛒 Note: Large files/previews not loaded from localStorage to prevent quota issues')
        return validItems
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
          reviewStatus: item.reviewStatus || (item.customization ? 'pending' : 'approved'),
          product: item.product, // Include the full product data from database
        }))
        
        console.log('🛒 Transformed cart items:', transformedItems)
        setItems(transformedItems)
        
        // Also save to localStorage for offline access
        try {
          const compressedItems = compressCartData(transformedItems)
          localStorage.setItem(LOCAL_KEY, JSON.stringify(compressedItems))
        } catch (error) {
          console.warn('🛒 Could not save to localStorage:', error)
        }
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
          reviewStatus: item.reviewStatus || (item.customization ? 'pending' : 'approved'),
          product: item.product, // Include the full product data from database
        }))
        
        setItems(updatedItems)
        try {
          const compressedItems = compressCartData(updatedItems)
          localStorage.setItem(LOCAL_KEY, JSON.stringify(compressedItems))
        } catch (error) {
          console.warn('🛒 Could not save to localStorage:', error)
        }
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

  // Check localStorage usage on mount
  useEffect(() => {
    clearLocalStorageIfNeeded()
  }, [])

  // Helper function to compress cart data for localStorage
  const compressCartData = (cartItems: CartItem[]) => {
    return cartItems.map(item => {
      // Create a compressed version of the item
      const compressedItem = {
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        reviewStatus: item.reviewStatus,
        customization: item.customization ? {
          // Keep all customization data - it's essential for cart functionality
          ...item.customization,
          // Keep mockup data with size limits (important for order display)
          mockup: item.customization.mockup && item.customization.mockup.length < 200000 ? item.customization.mockup : undefined,
          // For designs, keep essential data but limit file size
          designs: item.customization.designs?.map((design: any) => ({
            id: design.id,
            name: design.name,
            dimensions: design.dimensions,
            position: design.position,
            scale: design.scale,
            rotation: design.rotation,
            notes: design.notes,
            selectedStyles: design.selectedStyles,
            // Keep preview and file data but limit size
            preview: design.preview && design.preview.length < 50000 ? design.preview : undefined, // Limit to ~50KB
            file: design.file && typeof design.file === 'string' && design.file.length < 50000 ? design.file : undefined, // Limit base64 strings
            totalPrice: design.totalPrice,
            materialCosts: design.materialCosts
          })),
          // Keep legacy design data with size limits
          design: item.customization.design ? {
            ...item.customization.design,
            preview: item.customization.design.preview && item.customization.design.preview.length < 50000 ? item.customization.design.preview : undefined,
            file: item.customization.design.file && typeof item.customization.design.file === 'string' && item.customization.design.file.length < 50000 ? item.customization.design.file : undefined,
          } : undefined,
          // Keep embroidery data with size limits
          embroideryData: item.customization.embroideryData ? {
            ...item.customization.embroideryData,
            designImage: item.customization.embroideryData.designImage && item.customization.embroideryData.designImage.length < 50000 ? item.customization.embroideryData.designImage : undefined,
          } : undefined
        } : undefined
      }
      
      // Remove the product object which can be large (this gets re-added from products array)
      delete (compressedItem as any).product
      
      return compressedItem
    })
  }

  // Save to localStorage when items change (for both guest and logged-in users)
  useEffect(() => {
    try {
      const compressedItems = compressCartData(items)
      const cartData = JSON.stringify(compressedItems)
      
      // Check if data is too large (localStorage has ~5-10MB limit)
      if (cartData.length > 4 * 1024 * 1024) { // 4MB limit
        console.warn('🛒 Cart data too large for localStorage, skipping save')
        console.warn('🛒 Cart data size:', (cartData.length / 1024 / 1024).toFixed(2), 'MB')
        return
      }
      
      localStorage.setItem(LOCAL_KEY, cartData)
      console.log('🛒 Saved items to localStorage:', items.length, 'items, size:', (cartData.length / 1024).toFixed(2), 'KB')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.error('🛒 localStorage quota exceeded, cart data too large')
        console.error('🛒 Cart items:', items.length, 'items')
        // Optionally clear old data or show warning to user
        alert('Cart data is too large to save locally. Some items may not persist after refresh.')
      } else {
        console.error('🛒 Error saving cart to localStorage:', error)
      }
    }
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
          console.log('🛒 Database response for addToCart:', {
            productId: response.data.productId,
            hasCustomization: !!response.data.customization,
            hasMockup: !!response.data.customization?.mockup,
            mockupSize: response.data.customization?.mockup ? Math.round(response.data.customization.mockup.length / 1024) : 0,
            customizationKeys: response.data.customization ? Object.keys(response.data.customization) : []
          })
          
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
                reviewStatus: response.data!.reviewStatus || (response.data!.customization ? 'pending' : 'approved'),
              }
              return updated
            } else {
              // Add new item
              return [...prev, {
                productId: response.data!.productId,
                quantity: response.data!.quantity,
                customization: response.data!.customization,
                reviewStatus: response.data!.reviewStatus || (response.data!.customization ? 'pending' : 'approved'),
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
    console.log('🗑️ Removing item:', productId)
    
    if (isLoggedIn) {
      // Find the cart item ID for database removal
      const item = items.find((p) => p.productId === productId)
      if (item && item.id) {
        try {
          console.log('🗑️ Removing from database:', item.id)
          await cartApiService.removeFromCart(item.id)
          console.log('✅ Successfully removed from database')
        } catch (error) {
          console.error('❌ Error removing from cart:', error)
        }
      }
    }
    
    const updatedItems = items.filter((p) => p.productId !== productId)
    console.log('🗑️ Updated items:', updatedItems.length)
    
    setItems(updatedItems)
    
    // Update localStorage for both logged-in and guest users
    try {
      const compressedItems = compressCartData(updatedItems)
      localStorage.setItem(LOCAL_KEY, JSON.stringify(compressedItems))
      console.log('🗑️ Updated localStorage')
    } catch (error) {
      console.warn('🛒 Could not save to localStorage:', error)
    }
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
    console.log('🧹 Clearing cart...')
    
    if (isLoggedIn) {
      try {
        console.log('🧹 Clearing database cart...')
        await cartApiService.clearCart()
        console.log('✅ Successfully cleared database cart')
      } catch (error) {
        console.error('❌ Error clearing cart:', error)
      }
    }
    
    setItems([])
    setIsCleared(true)
    
    // Clear localStorage for both logged-in and guest users
    localStorage.removeItem(LOCAL_KEY)
    console.log('🧹 Cleared localStorage and state')
  }

  const clearLocalStorageIfNeeded = () => {
    try {
      // Check localStorage usage
      let totalSize = 0
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalSize += localStorage[key].length
        }
      }
      
      const sizeInMB = totalSize / 1024 / 1024
      console.log('🛒 Current localStorage usage:', sizeInMB.toFixed(2), 'MB')
      
      // If localStorage is getting full (>3MB), clear some old data
      if (sizeInMB > 3) {
        console.warn('🛒 localStorage getting full, clearing old cart data')
        localStorage.removeItem(LOCAL_KEY)
        // Could also clear other old data here
      }
    } catch (error) {
      console.warn('🛒 Could not check localStorage usage:', error)
    }
  }

  const cleanupInvalidItems = () => {
    console.log('🧹 Cleaning up invalid cart items...')
    setItems(prevItems => {
      const validItems = prevItems.filter(item => {
        // Keep custom embroidery items
        if (item.productId === 'custom-embroidery') {
          return true;
        }
        
        // For other items, we need to validate they exist in products
        const productExists = products.some((p: any) => p.id === item.productId);
        
        if (!productExists) {
          console.warn(`🧹 Removing invalid item with productId: ${item.productId}`);
        }
        
        return productExists;
      });
      
      if (validItems.length !== prevItems.length) {
        console.log(`🧹 Cleaned up ${prevItems.length - validItems.length} invalid items`);
        // Update localStorage with cleaned items
        try {
          const compressedItems = compressCartData(validItems)
          localStorage.setItem(LOCAL_KEY, JSON.stringify(compressedItems));
        } catch (error) {
          console.warn('🛒 Could not save to localStorage:', error)
        }
      }
      
      return validItems;
    });
  }

  return <CartContext.Provider value={{ 
    items, 
    add, 
    remove, 
    update, 
    clear, 
    validateStock, 
    isLoading, 
    syncWithDatabase,
    cleanupInvalidItems,
    clearLocalStorageIfNeeded
  }}>{children}</CartContext.Provider>
}

const useCart = () => {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}

export { useCart }