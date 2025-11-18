import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import type { CartItem } from '../../types'
import { productApiService } from '../../shared/productApiService'
import { cartApiService } from '../../shared/cartApiService'
import { useAuth } from './AuthContext'
import { useAlertModal } from './AlertModalContext'
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
  refreshCart: () => Promise<void>
  // New error state properties
  cartLoadError: string | null
  cartSyncError: string | null
  reloadCart: () => Promise<void>
  isSyncing: boolean
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const LOCAL_KEY = 'mayhem_cart_v1'

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoggedIn, isLoading: isAuthLoading } = useAuth()
  const { showError, showWarning, showInfo } = useAlertModal()
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY)
      if (raw) {
        const items = JSON.parse(raw)
        // Ensure all items have reviewStatus and product data
        const validItems = items.map((item: any) => {
          // Find the product data if it's missing
          let product = item.product
          if (!product && item.productId) {
            product = products.find(p => p.id === item.productId)
          }
          
          return {
            ...item,
            reviewStatus: item.reviewStatus || (item.customization ? 'pending' : 'approved'),
            product: product // Ensure product data is included
          }
        })
        
        return validItems
      }
      return []
    } catch (e) {
      // Error parsing cart from localStorage - silently fail and return empty cart
      return []
    }
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isCleared, setIsCleared] = useState(false)
  const hasSyncedRef = useRef(false) // Track if we've already synced the cart
  
  // Error state management
  const [cartLoadError, setCartLoadError] = useState<string | null>(null)
  const [cartSyncError, setCartSyncError] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  /**
   * Load cart from database
   */
  const loadCartFromDatabase = useCallback(async () => {
    // Only load cart if user is logged in - don't call API when not logged in
    if (!isLoggedIn || !user || !user.id) {
      return
    }
    
    // Skip cart loading for admin/seller users - they don't have carts
    if (user.role && (user.role === 'admin' || user.role === 'seller')) {
      return
    }
    
    try {
      setIsLoading(true)
      setCartLoadError(null) // Clear previous errors
      
      const response = await cartApiService.getCart()
      
      // Silently handle 401 errors (session expired) - axios interceptor handles cleanup
      if (!response.success && (response as any).status === 401) {
        setIsLoading(false)
        return
      }
      
      if (response.success && response.data) {
        // Transform backend cart items to frontend format
        const transformedItems = await Promise.all(response.data.map(async (item: any) => {
          // Find the product data if it's missing from the response
          let product = item.product
          if (!product && item.productId) {
            // First try static products array
            product = products.find(p => p.id === item.productId)
            
            // If not found in static array and productId is numeric, fetch from API
            if (!product && typeof item.productId === 'string' && !isNaN(Number(item.productId))) {
              try {
                const productResponse = await productApiService.getProductById(Number(item.productId))
                if (productResponse.success && productResponse.data) {
                  product = productResponse.data
                }
              } catch (error) {
                console.warn(`Failed to fetch product ${item.productId} from API:`, error)
              }
            }
          }
          
          return {
            id: item.id,
            productId: item.productId,
            quantity: item.quantity,
            customization: item.customization,
            reviewStatus: item.reviewStatus || (item.customization ? 'pending' : 'approved'),
            product: product, // Include the full product data
          }
        }))
        
        setItems(transformedItems)
        
        // Also save to localStorage for offline access
        try {
          const compressedItems = compressCartData(transformedItems)
          localStorage.setItem(LOCAL_KEY, JSON.stringify(compressedItems))
        } catch (error) {
          console.warn('🛒 Could not save to localStorage:', error)
        }
      } else {
        // Set error but don't throw - use localStorage as fallback
        const errorMsg = response.message || 'Failed to load cart from server'
        const responseStatus = (response as any).status
        
        // Silently handle 401/403 errors - they're expected for admin/seller users or expired sessions
        // Don't show warnings for expected authentication/authorization errors
        if (responseStatus === 401 || responseStatus === 403) {
          setCartLoadError(null) // Clear error for expected auth errors
          setIsLoading(false)
          return
        }
        
        setCartLoadError(errorMsg)
        // Don't show warnings - session issues are handled by axiosConfig 401 handler
      }
    } catch (error: any) {
      // Silently handle 401/403 errors - they're expected for admin/seller users or expired sessions
      const isAuthError = error?.response?.status === 401 || error?.response?.status === 403
      
      if (isAuthError) {
        // Expected auth errors - don't show warnings or set errors
        setCartLoadError(null)
        setIsLoading(false)
        return
      }
      
      // Categorize error for user notification (only for unexpected errors)
      let errorMessage = 'Failed to load cart from server. '
      
      if (error?.message?.includes('timeout') || error?.code === 'ECONNABORTED') {
        errorMessage = 'Connection timeout while loading cart. Using cached data.'
      } else if (!navigator.onLine) {
        errorMessage = 'No internet connection. Showing cached cart items.'
      } else if (error?.response?.status >= 500) {
        errorMessage = 'Server error while loading cart. Using cached data.'
      } else {
        errorMessage += 'Using cached cart data.'
      }
      
      setCartLoadError(errorMessage)
      // Don't show warnings - 401 errors are handled by axiosConfig to clear data and redirect to login
      
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
        showError('Failed to load cart. Please refresh the page.', 'Cart Error')
      }
    } finally {
      setIsLoading(false)
    }
  }, [isLoggedIn, user?.id, user?.role]) // Added user.id to ensure user is fully loaded

  /**
   * Sync cart with database
   */
  const syncWithDatabase = useCallback(async () => {
    // Skip cart sync for admin/seller users - they don't have carts
    if (!isLoggedIn || !user || (user.role === 'admin' || user.role === 'seller')) {
      return
    }

    try {
      setIsSyncing(true)
      setCartSyncError(null) // Clear previous sync errors
      
      // Use the current items from state instead of compressed localStorage data
      // This ensures we sync the full customization data including preview images
      const currentItems = items
      
      // Only sync if there are items
      if (currentItems.length === 0) {
        return
      }
      
      const response = await cartApiService.syncCart(currentItems as any)
      
      if (response.success && response.data) {
        // Update items with database IDs and product data
        const updatedItems = response.data.map(item => {
          // Find the product data if it's missing from the response
          let product = item.product
          if (!product && item.productId) {
            product = products.find(p => p.id === item.productId)
          }
          
          return {
            id: item.id,
            productId: item.productId,
            quantity: item.quantity,
            customization: item.customization,
            reviewStatus: item.reviewStatus || (item.customization ? 'pending' : 'approved'),
            product: product, // Include the full product data
          }
        })
        
        setItems(updatedItems)
        try {
          const compressedItems = compressCartData(updatedItems)
          localStorage.setItem(LOCAL_KEY, JSON.stringify(compressedItems))
        } catch (error) {
          console.warn('🛒 Could not save to localStorage:', error)
        }
        
      } else {
        // Sync failed but don't throw - cart is still usable locally
        const errorMsg = response.message || 'Cart sync failed'
        const responseStatus = (response as any).status
        
        // Silently handle 401/403 errors - they're expected for admin/seller users or expired sessions
        if (responseStatus === 401 || responseStatus === 403) {
          setCartSyncError(null)
          setIsSyncing(false)
          return
        }
        
        setCartSyncError(errorMsg)
        // Don't show warnings - session issues are handled by axiosConfig 401 handler
      }
    } catch (error: any) {
      // Silently handle 401/403 errors - they're expected for admin/seller users or expired sessions
      const isAuthError = error?.response?.status === 401 || error?.response?.status === 403
      
      if (isAuthError) {
        // Expected auth errors - don't show warnings or set errors
        setCartSyncError(null)
        setIsSyncing(false)
        return
      }
      
      // Categorize sync error for user notification (only for unexpected errors)
      let errorMessage = 'Failed to sync cart with server. '
      
      if (error?.message?.includes('timeout') || error?.code === 'ECONNABORTED') {
        errorMessage = 'Sync timeout. Your cart is saved locally but may not sync across devices.'
      } else if (!navigator.onLine) {
        errorMessage = 'No internet. Your cart is saved locally and will sync when connection is restored.'
      } else if (error?.response?.status >= 500) {
        errorMessage = 'Server error. Your cart is saved locally but may not sync until server recovers.'
      } else {
        errorMessage += 'Your cart is saved locally but may not sync across devices.'
      }
      
      setCartSyncError(errorMessage)
      // Don't show sync status - 401 errors are handled by axiosConfig to clear data and redirect to login
    } finally {
      setIsSyncing(false)
    }
  }, [isLoggedIn, user?.role, items]) // Added user.role to dependencies

  // Load cart from database when user logs in (only for customers)
  // Only run when explicitly logged in with a valid user ID - don't call API when not logged in
  useEffect(() => {
    // Wait for auth to finish initializing - don't run while auth is loading
    if (isAuthLoading) {
      return
    }
    
    // Don't run if user is not logged in or user data is not yet loaded
    if (!isLoggedIn || !user || !user.id) {
      // Clear cart when user logs out (only if we were previously logged in)
      if (hasSyncedRef.current) {
        setItems([])
        setIsCleared(false)
        hasSyncedRef.current = false // Reset sync flag when user logs out
      }
      return
    }
    
    // Skip cart operations for admin/seller users - they don't have carts
    if (user.role && (user.role === 'admin' || user.role === 'seller')) {
      return // Admin/seller users don't have carts
    }
    
    // Only load cart once per login session - use ref to prevent multiple calls
    if (!isCleared && !hasSyncedRef.current) {
      hasSyncedRef.current = true // Mark as synced to prevent multiple syncs
      // First sync any localStorage items to database, then load from database
      // Call functions directly without including in dependencies (they're stable callbacks)
      syncWithDatabase().then(() => {
        loadCartFromDatabase()
      }).catch(() => {
        // If sync fails, still try to load cart (might be empty)
        loadCartFromDatabase()
      })
    }
  }, [isLoggedIn, user?.id, user?.role, isCleared, isAuthLoading, syncWithDatabase, loadCartFromDatabase]) // Include all dependencies

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
        product: item.product, // Keep essential product data for display
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
            totalPrice: design.totalPrice,
            materialCosts: design.materialCosts
          })),
          // Keep legacy design data with size limits
          design: item.customization.design ? {
            ...item.customization.design,
            preview: item.customization.design.preview && item.customization.design.preview.length < 50000 ? item.customization.design.preview : undefined,
          } : undefined,
          // Keep embroidery data with size limits
          embroideryData: item.customization.embroideryData ? {
            ...item.customization.embroideryData,
          } : undefined
        } : undefined
      }
      
      return compressedItem
    })
  }

  // Save to localStorage when items change (for both guest and logged-in users)
  useEffect(() => {
    try {
      const compressedItems = compressCartData(items)
      const cartData = JSON.stringify(compressedItems)
      
      // Check if data is too large (localStorage has ~5-10MB limit)
      // Use 3MB as safe limit to account for other localStorage data
      if (cartData.length > 3 * 1024 * 1024) { // 3MB limit
        const sizeMB = (cartData.length / 1024 / 1024).toFixed(2)
        console.warn('🛒 Cart data too large for localStorage, skipping save')
        console.warn('🛒 Cart data size:', sizeMB, 'MB')
        
        showError(
          `Your cart has too many custom designs (${sizeMB}MB). To save your cart, please:\n\n` +
          `1. Complete checkout for current items\n` +
          `2. Or remove some customized items\n` +
          `3. Sign in to sync cart to your account\n\n` +
          `Your cart will be lost if you close this page without signing in.`,
          'Cart Storage Full'
        )
        return
      }
      
      localStorage.setItem(LOCAL_KEY, cartData)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.error('🛒 localStorage quota exceeded, cart data too large')
        console.error('🛒 Cart items:', items.length, 'items')
        
        // Provide specific guidance to user
        showError(
          `Cart storage full! Your cart has too many items or large custom designs.\n\n` +
          `To save your cart:\n` +
          `1. Sign in to sync cart to your account (recommended)\n` +
          `2. Complete checkout to free up space\n` +
          `3. Remove some customized items\n\n` +
          `Without action, your cart may be lost on page refresh.`,
          'Storage Quota Exceeded'
        )
        
        // Try to at least save essential cart info without large files
        try {
          const minimalItems = items.map(item => ({
            id: item.id,
            productId: item.productId,
            quantity: item.quantity,
            reviewStatus: item.reviewStatus,
            product: item.product,
            customization: item.customization ? {
              ...item.customization,
              mockup: undefined, // Remove large mockup
              designs: item.customization.designs?.map((design: any) => ({
                ...design,
                preview: undefined, // Remove large preview
                file: undefined // Remove large file
              }))
            } : undefined
          }))
          localStorage.setItem(LOCAL_KEY, JSON.stringify(minimalItems))
        } catch (retryError) {
          console.error('🛒 Failed to save even minimal cart data:', retryError)
        }
      } else {
        // Silently fail - localStorage errors don't need user notification
      }
    }
  }, [items])

  // Validate stock for a product, optionally checking a specific variant
  const validateStock = async (
    productId: string, 
    quantity: number, 
    variantId?: number
  ): Promise<{ valid: boolean; message?: string }> => {
    try {
      const response = await productApiService.getProductById(parseInt(productId))
      const product = response.data
      
      // If a specific variant is requested, check that variant's stock
      if (variantId && product?.variants) {
        const variant = product.variants.find((v: any) => v.id === variantId)
        
        if (!variant) {
          return { valid: false, message: 'Selected variant not found' }
        }
        
        if (!variant.isActive) {
          return { valid: false, message: 'This variant is no longer available' }
        }
        
        if (variant.stock === 0) {
          return { valid: false, message: `This ${variant.color} / ${variant.size} variant is out of stock` }
        }
        
        if (variant.stock < quantity) {
          return { valid: false, message: `Only ${variant.stock} items available for ${variant.color} / ${variant.size}` }
        }
        
        return { valid: true }
      }
      
      // Otherwise, calculate total stock from all active variants
      const totalStock = product?.variants?.reduce((sum: number, variant: any) => {
        return sum + (variant.isActive ? (variant.stock || 0) : 0)
      }, 0) || 0
      
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
    // console.log('🛒 Adding to cart:', {
    //   productId,
    //   qty,
    //   hasCustomization: !!customization,
    //   isLoggedIn,
    //   currentItemsCount: items.length
    // })

    // Check if user is logged in before allowing add to cart
    if (!isLoggedIn) {
      showInfo('Please sign in to add items to your cart', 'Sign In Required')
      return false
    }

    // Skip stock validation for special product IDs like 'custom-embroidery'
    // These don't exist in the products database
    if (productId !== 'custom-embroidery') {
      // Validate stock - check specific variant if one was selected
      const selectedVariantId = customization?.selectedVariant?.id
      
      // Always validate stock, even for customized items with variants
      const validation = await validateStock(productId, qty, selectedVariantId)
      if (!validation.valid) {
        showWarning(validation.message || 'Product is out of stock', 'Stock Unavailable')
        return false
      }
    }

    // Find the product to include in cart item - try static array first, then API
    let product = products.find(p => p.id === productId)
    
    // If not found in static array and productId is numeric, fetch from API
    if (!product && typeof productId === 'string' && !isNaN(Number(productId))) {
      try {
        const productResponse = await productApiService.getProductById(Number(productId))
        if (productResponse.success && productResponse.data) {
          product = productResponse.data
        }
      } catch (error) {
        console.warn(`Failed to fetch product ${productId} from API:`, error)
      }
    }

    // Add to database
    try {
      const response = await cartApiService.addToCart(productId, qty, customization)
      
      if (response.success && response.data) {
        // Update local state with database response
        const newItems = ((prev: CartItem[]) => {
          
          // For customized items, always add as new item (don't merge with existing)
          if (customization) {
            const newItem = {
              id: response.data!.id,
              productId: response.data!.productId,
              quantity: response.data!.quantity,
              customization: response.data!.customization,
              reviewStatus: response.data!.reviewStatus || (response.data!.customization ? 'pending' : 'approved'),
              product: product // Include the full product data
            }
            return [...prev, newItem]
          }
          
          // For regular items, find existing item without customization
          const existingIndex = prev.findIndex((p) => p.productId === productId && !p.customization)
          if (existingIndex >= 0) {
            // Update existing item
            const updated = [...prev]
            updated[existingIndex] = {
              id: response.data!.id,
              productId: response.data!.productId,
              quantity: response.data!.quantity,
              customization: response.data!.customization,
              reviewStatus: response.data!.reviewStatus || (response.data!.customization ? 'pending' : 'approved'),
              product: product // Include the full product data
            }
            return updated
          } else {
            // Add new item
            return [...prev, {
              id: response.data!.id,
              productId: response.data!.productId,
              quantity: response.data!.quantity,
              customization: response.data!.customization,
              reviewStatus: response.data!.reviewStatus || (response.data!.customization ? 'pending' : 'approved'),
              product: product // Include the full product data
            }]
          }
        })(items)
        
        // Update state with new items
        setItems(newItems)
        
        // Force synchronous localStorage update to ensure it's available immediately
        try {
          const compressedItems = compressCartData(newItems)
          localStorage.setItem(LOCAL_KEY, JSON.stringify(compressedItems))
        } catch (error) {
          console.warn('🛒 Could not save to localStorage:', error)
        }
        
        setIsCleared(false) // Reset cleared flag when adding items
        return true
      } else {
        // If database add failed but user is still logged in, fall back to localStorage
        // This prevents losing the item if there's a temporary API issue
        setItems((prev) => {
          // For customized items, always add as new item (don't merge with existing)
          if (customization) {
            return [...prev, { 
              productId, 
              quantity: qty, 
              customization,
              reviewStatus: 'pending' as const,
              product: product
            }]
          }
          
          // For regular items, merge quantities if same product
          const found = prev.find((p) => p.productId === productId && !p.customization)
          if (found) return prev.map((p) => p.productId === productId && !p.customization ? { ...p, quantity: p.quantity + qty } : p)
          return [...prev, { 
            productId, 
            quantity: qty,
            reviewStatus: 'approved' as const,
            product: product
          }]
        })
        setIsCleared(false)
        return true
      }
    } catch (error: any) {
      console.error('❌ Error adding to cart:', error)
      
      // Check if the error is an authentication error
      // If so, don't fail the add to cart - fall back to localStorage
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        setItems((prev) => {
          if (customization) {
            return [...prev, { 
              productId, 
              quantity: qty, 
              customization,
              reviewStatus: 'pending' as const,
              product: product
            }]
          }
          const found = prev.find((p) => p.productId === productId && !p.customization)
          if (found) return prev.map((p) => p.productId === productId && !p.customization ? { ...p, quantity: p.quantity + qty } : p)
          return [...prev, { 
            productId, 
            quantity: qty,
            reviewStatus: 'approved' as const,
            product: product
          }]
        })
        setIsCleared(false)
        return true
      }
      
      // For other errors, return false to indicate failure
      return false
    }
  }

  const remove = async (productId: string) => {
    if (isLoggedIn) {
      // Find the cart item ID for database removal
      const item = items.find((p) => p.productId === productId)
      if (item && item.id) {
        try {
          await cartApiService.removeFromCart(typeof item.id === 'string' ? parseInt(item.id) : item.id)
        } catch (error) {
          console.error('❌ Error removing from cart:', error)
        }
      }
    }
    
    const updatedItems = items.filter((p) => p.productId !== productId)
    setItems(updatedItems)
    
    // Update localStorage for both logged-in and guest users
    try {
      const compressedItems = compressCartData(updatedItems)
      localStorage.setItem(LOCAL_KEY, JSON.stringify(compressedItems))
    } catch (error) {
      console.warn('🛒 Could not save to localStorage:', error)
    }
  }
  
  const update = async (productId: string, qty: number): Promise<boolean> => {
    // Check if user is logged in
    if (!isLoggedIn) {
      showInfo('Please sign in to update cart items', 'Sign In Required')
      return false
    }

    // Find the item to get variant information
    const item = items.find((p) => p.productId === productId)
    
    // Skip stock validation for special product IDs like 'custom-embroidery'
    // These are made-to-order and don't have inventory constraints
    if (productId !== 'custom-embroidery') {
      const selectedVariantId = item?.customization?.selectedVariant?.id
      
      // Validate stock for regular items, even customized items with variants
      const validation = await validateStock(productId, qty, selectedVariantId)
      if (!validation.valid) {
        showWarning(validation.message || 'Product is out of stock', 'Stock Unavailable')
        return false
      }
    }

    // Update in database
    try {
      const item = items.find((p) => p.productId === productId)
      if (item && item.id) {
        const response = await cartApiService.updateCartItem(typeof item.id === 'string' ? parseInt(item.id) : item.id, qty, item.customization)
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
  }
  
  const clear = async () => {
    if (isLoggedIn) {
      try {
        await cartApiService.clearCart()
      } catch (error) {
        console.error('❌ Error clearing cart:', error)
      }
    }
    
    setItems([])
    setIsCleared(true)
    
    // Clear localStorage for both logged-in and guest users
    localStorage.removeItem(LOCAL_KEY)
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

  const cleanupInvalidItems = async () => {
    // First identify invalid items
    const invalidItems: CartItem[] = []
    const validItems: CartItem[] = []
    
    items.forEach(item => {
      // Keep custom embroidery items
      if (item.productId === 'custom-embroidery') {
        validItems.push(item)
        return
      }
      
      // For other items, validate they exist in products
      const productExists = products.some((p: any) => p.id === item.productId)
      
      if (productExists) {
        validItems.push(item)
      } else {
        console.warn(`🧹 Found invalid item with productId: ${item.productId}`)
        invalidItems.push(item)
      }
    })
    
    // If no invalid items, nothing to do
    if (invalidItems.length === 0) {
      return
    }
    
    // Show confirmation modal before removing items
    const invalidItemNames = invalidItems.map(item => 
      item.product?.name || `Product ID: ${item.productId}`
    ).join('\n• ')
    
    const shouldRemove = window.confirm(
      `Found ${invalidItems.length} invalid item(s) in your cart that are no longer available:\n\n` +
      `• ${invalidItemNames}\n\n` +
      `Would you like to remove them from your cart?\n\n` +
      `Click OK to remove, or Cancel to keep them for now.`
    )
    
    if (shouldRemove) {
      setItems(validItems)
      
      // Update localStorage with cleaned items
      try {
        const compressedItems = compressCartData(validItems)
        localStorage.setItem(LOCAL_KEY, JSON.stringify(compressedItems))
      } catch (error) {
        console.warn('🛒 Could not save to localStorage:', error)
      }
      
      // If logged in, sync with database
      if (isLoggedIn) {
        try {
          await syncWithDatabase()
        } catch (error) {
          console.error('Failed to sync cleaned cart with database:', error)
        }
      }
      
      showInfo(`Removed ${invalidItems.length} unavailable item(s) from your cart`, 'Cart Updated')
    } else {
      showInfo('Invalid items kept in cart. They may cause issues at checkout.', 'Cart Cleanup Skipped')
    }
  }

  // Method to refresh cart from database (can be called from components)
  const refreshCart = useCallback(async () => {
    if (isLoggedIn && user && user.id) {
      await loadCartFromDatabase()
    }
  }, [isLoggedIn, user?.id, loadCartFromDatabase])

  // Method to manually reload cart (exposed to components for error recovery)
  const reloadCart = useCallback(async () => {
    setCartLoadError(null)
    setCartSyncError(null)
    
    if (isLoggedIn && user && user.id) {
      await loadCartFromDatabase()
    } else {
      // For guest users, just reload from localStorage
      try {
        const raw = localStorage.getItem(LOCAL_KEY)
        if (raw) {
          const items = JSON.parse(raw)
          const itemsWithReviewStatus = items.map((item: any) => ({
            ...item,
            reviewStatus: item.reviewStatus || (item.customization ? 'pending' : 'approved')
          }))
          setItems(itemsWithReviewStatus)
          showInfo('Cart reloaded from local storage', 'Cart Reloaded')
        }
      } catch (e) {
        console.error('Error reloading cart from localStorage:', e)
        showError('Failed to reload cart. Please refresh the page.', 'Reload Failed')
      }
    }
  }, [isLoggedIn, user?.id, loadCartFromDatabase, showInfo, showError])

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
    clearLocalStorageIfNeeded,
    refreshCart,
    cartLoadError,
    cartSyncError,
    reloadCart,
    isSyncing
  }}>{children}</CartContext.Provider>
}

const useCart = () => {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}

export { useCart }