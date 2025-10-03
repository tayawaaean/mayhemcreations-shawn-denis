import React, { useState } from 'react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { products } from '../../data/products'
import { Link, useNavigate } from 'react-router-dom'
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, Eye, X, CheckCircle } from 'lucide-react'
import Button from '../../components/Button'
import { orderReviewApiService } from '../../shared/orderReviewApiService'

export default function Cart() {
  const navigate = useNavigate()
  const { items, update, remove, clear } = useCart()
  const [selectedItem, setSelectedItem] = useState<typeof enriched[0] | null>(null)
  const [showFinalProductModal, setShowFinalProductModal] = useState(false)
  const [showSubmissionSuccessModal, setShowSubmissionSuccessModal] = useState(false)
  const [submissionData, setSubmissionData] = useState<{orderId: number | string | null}>({orderId: null})
  
  // Import useAuth to check login status
  const { isLoggedIn, user } = useAuth()
  
  // Debug logging
  console.log('🛒 Cart component - Raw items:', items)
  console.log('🛒 Cart component - Items length:', items.length)
  console.log('🛒 Cart component - User logged in:', isLoggedIn)
  console.log('🛒 Cart component - User:', user)
  
  // Check localStorage
  const localStorageCart = localStorage.getItem('mayhem_cart_v1')
  console.log('🛒 localStorage cart data:', localStorageCart)
  if (localStorageCart) {
    try {
      const parsedCart = JSON.parse(localStorageCart)
      console.log('🛒 Parsed localStorage cart:', parsedCart)
    } catch (e) {
      console.error('🛒 Error parsing localStorage cart:', e)
    }
  }
  // Create virtual product for custom embroidery
  const customEmbroideryProduct = {
    id: 'custom-embroidery',
    title: 'Custom Embroidery Design',
    price: 0, // Price will be calculated from customization data
    description: 'Custom embroidered design with your specifications',
    image: '/demo-images/custom-embroidery.jpg', // You can add a placeholder image
    alt: 'Custom embroidery design',
    category: 'embroidery' as const
  }

  const enriched = items.map((it) => {
    let product = it.product; // Use product data from cart item
    
    console.log('🛒 Processing item:', { 
      productId: it.productId, 
      hasProduct: !!it.product,
      productTitle: it.product?.title || 'No product'
    })
    
    // Handle custom embroidery product
    if (it.productId === 'custom-embroidery') {
      product = customEmbroideryProduct;
      console.log('🛒 Using custom embroidery product')
    } else if (!product) {
      // Fallback: try to find product if it's missing from cart item
      product = products.find((p) => p.id === it.productId);
      if (product) {
        console.log('🛒 Found product via fallback lookup:', product.id, product.title)
      } else {
        console.log('🛒 No product found for ID:', it.productId)
        console.log('🛒 Available product IDs:', products.map(p => ({ id: p.id, type: typeof p.id })))
      }
    }
    
    return {
      ...it,
      product
    };
  }).filter(item => {
    const hasProduct = !!item.product;
    console.log('🛒 Item has product:', hasProduct, item.productId)
    return hasProduct;
  }) // Filter out items without product data
  
  console.log('🛒 Enriched items after processing:', enriched)
  console.log('🛒 Enriched items length:', enriched.length)
  
  const calculateItemPrice = (item: typeof enriched[0]) => {
    // For custom embroidery items, use the total price from embroideryData
    if (item.productId === 'custom-embroidery' && item.customization?.embroideryData) {
        return Number(item.customization.embroideryData.totalPrice) || 0
    }
    
    // For regular items, calculate base price + customization costs
    let itemPrice = Number(item.product?.price || 0) || 0
    
    // Add customization costs if present
    if (item.customization) {
        // Handle multiple designs (new format)
        if (item.customization.designs && item.customization.designs.length > 0) {
          // Calculate total price for all designs
          item.customization.designs.forEach((design: any) => {
            if (design.totalPrice) {
              itemPrice += Number(design.totalPrice) || 0
            } else if (design.selectedStyles) {
              // Calculate design-specific pricing if totalPrice is not available
              const { selectedStyles } = design
              if (selectedStyles.coverage) itemPrice += Number(selectedStyles.coverage.price) || 0
              if (selectedStyles.material) itemPrice += Number(selectedStyles.material.price) || 0
              if (selectedStyles.border) itemPrice += Number(selectedStyles.border.price) || 0
              if (selectedStyles.backing) itemPrice += Number(selectedStyles.backing.price) || 0
              if (selectedStyles.cutting) itemPrice += Number(selectedStyles.cutting.price) || 0
              
              if (selectedStyles.threads) {
                selectedStyles.threads.forEach((thread: { id: string; name: string; price: number }) => {
                  itemPrice += Number(thread.price) || 0
                })
              }
              if (selectedStyles.upgrades) {
                selectedStyles.upgrades.forEach((upgrade: { id: string; name: string; price: number }) => {
                  itemPrice += Number(upgrade.price) || 0
                })
              }
            }
          })
        } else {
          // Handle legacy single design format
          const { selectedStyles } = item.customization
          if (selectedStyles.coverage) itemPrice += Number(selectedStyles.coverage.price) || 0
          if (selectedStyles.material) itemPrice += Number(selectedStyles.material.price) || 0
          if (selectedStyles.border) itemPrice += Number(selectedStyles.border.price) || 0
          if (selectedStyles.backing) itemPrice += Number(selectedStyles.backing.price) || 0
          if (selectedStyles.cutting) itemPrice += Number(selectedStyles.cutting.price) || 0
          
          if (selectedStyles.threads) {
              selectedStyles.threads.forEach((thread: { id: string; name: string; price: number }) => {
                itemPrice += Number(thread.price) || 0
              })
            }
          if (selectedStyles.upgrades) {
              selectedStyles.upgrades.forEach((upgrade: { id: string; name: string; price: number }) => {
                itemPrice += Number(upgrade.price) || 0
              })
          }
        }
    }
    
    return itemPrice
  }
  
  const subtotal = enriched.reduce((s, e) => s + (calculateItemPrice(e) * e.quantity), 0)
  // Shipping will be calculated based on location during checkout
  const shipping = 0 // Will be calculated in checkout based on location
  const total = subtotal + shipping

  // Helper function to safely format prices
  const formatPrice = (price: number | undefined | null): string => {
    const numPrice = Number(price) || 0
    return numPrice.toFixed(2)
  }

  // Handle submit for review
  const handleSubmitForReview = async () => {
    try {
      // Get all pending items
      const pendingItems = enriched.filter(item => item.reviewStatus === 'pending')
      
      if (pendingItems.length === 0) {
        alert('No items to submit for review')
        return
      }

      // Create order data for admin review
      const orderData = {
        items: pendingItems.map(item => {
          // Debug: Log the customization data being submitted
          console.log('🔍 Cart submission - Item customization data:', {
            productId: item.productId,
            hasCustomization: !!item.customization,
            hasDesigns: !!item.customization?.designs?.length,
            designsCount: item.customization?.designs?.length || 0,
            firstDesignKeys: item.customization?.designs?.[0] ? Object.keys(item.customization.designs[0]) : [],
            firstDesignPreview: item.customization?.designs?.[0]?.preview?.substring(0, 50) + '...' || 'none',
            hasMockup: !!item.customization?.mockup,
            mockupLength: item.customization?.mockup?.length || 0
          });
          
          return {
            productId: item.productId,
            quantity: item.quantity,
            customization: item.customization,
            reviewStatus: 'pending' as const,
            product: products.find(p => {
              // Handle both numeric and string product IDs
              const numericId = typeof item.productId === 'string' && !isNaN(Number(item.productId)) ? Number(item.productId) : item.productId;
              return p.id === item.productId || p.id === numericId;
            })
          };
        }),
        subtotal: subtotal,
        shipping: shipping, // Will be calculated at checkout
        total: total,
        submittedAt: new Date().toISOString()
      }

      // Submit for review via API
      const response = await orderReviewApiService.submitForReview(orderData)
      
      if (response.success) {
        // Show success modal
        setSubmissionData({orderId: response.data?.orderReviewId || null})
        setShowSubmissionSuccessModal(true)
        
        // Clear the cart after successful submission
        await clear()
        
        // Clear localStorage as well to prevent reloading
        localStorage.removeItem('mayhem_cart_v1')
      } else {
        alert('Failed to submit for review. Please try again.')
      }
      
    } catch (error) {
      console.error('Error submitting for review:', error)
      alert('Failed to submit for review. Please try again.')
    }
  }

  return (
    <main className="py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 sm:mb-8">
          <Link to="/products" className="inline-flex items-center text-accent hover:text-accent/80 transition-colors mb-4 text-sm sm:text-base">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Continue Shopping
          </Link>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Shopping Cart</h1>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-12 sm:py-16">
            <ShoppingBag className="w-20 h-20 sm:w-24 sm:h-24 text-gray-300 mx-auto mb-4 sm:mb-6" />
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-3 sm:mb-4">Your cart is empty</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8 px-4">Looks like you haven't added any items to your cart yet.</p>
            <Link to="/products">
              <Button size="lg" className="w-full sm:w-auto">Start Shopping</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {enriched.map((item) => (
                <div key={item.productId} className="bg-white rounded-2xl shadow-sm border border-gray-200">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 p-4 sm:p-6">
                    <img 
                      src={item.customization?.mockup || item.product?.image || ''} 
                      alt={item.product?.alt || ''} 
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-md flex-shrink-0" 
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{item.product?.title || ''}</h3>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">{item.product?.description || ''}</p>
                      
                      {/* Review Status for All Items */}
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            item.reviewStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            item.reviewStatus === 'approved' ? 'bg-green-100 text-green-800' :
                            item.reviewStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {item.reviewStatus === 'pending' && 'Pending Review'}
                            {item.reviewStatus === 'approved' && '✅ Approved'}
                            {item.reviewStatus === 'rejected' && '❌ Needs Changes'}
                            {item.reviewStatus === 'needs-changes' && '📝 Needs Changes'}
                          </span>
                        </div>
                      </div>

                      {item.customization && (
                        <div className="mt-2 space-y-1">
                          {item.productId === 'custom-embroidery' ? (
                            <>
                              <p className="text-xs sm:text-sm font-medium text-accent">Custom Embroidery Design</p>
                                  {item.customization.design && (
                                    <p className="text-xs text-gray-600">
                                      Design: {item.customization.design.name}
                                    </p>
                                  )}
                                  {item.customization.embroideryData && (
                                    <p className="text-xs text-gray-600">
                                      Size: {item.customization.embroideryData.dimensions.width}" × {item.customization.embroideryData.dimensions.height}"
                                    </p>
                              )}
                            </>
                          ) : (
                            <>
                              <p className="text-xs sm:text-sm font-medium text-accent">Customized Item</p>
                                  {item.customization.design && (
                                    <p className="text-xs text-gray-600">
                                      Design: {item.customization.design.name}
                                    </p>
                                  )}
                                  <p className="text-xs text-gray-600">
                                    Placement: {item.customization.placement} • Size: {item.customization.size} • Color: {item.customization.color}
                                  </p>
                            </>
                          )}
                        </div>
                      )}
                      
                      <div className="text-base sm:text-lg font-bold text-gray-900 mt-2">
                        ${formatPrice(calculateItemPrice(item))}
                        {item.customization && (
                          <span className="text-xs sm:text-sm font-normal text-gray-500 ml-1">
                            {item.productId === 'custom-embroidery' ? '(includes materials & options)' : '(includes customization)'}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
                      {item.reviewStatus === 'pending' ? (
                        // Items pending review have fixed quantity
                        <div className="flex items-center border border-gray-300 rounded-md bg-gray-50">
                          <span className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium min-w-[2.5rem] sm:min-w-[3rem] text-center text-gray-600">
                            {item.quantity}
                          </span>
                        </div>
                      ) : (
                        // Approved items can have quantity changed
                        <div className="flex items-center border border-gray-300 rounded-md">
                          <button
                            onClick={() => update(item.productId, Math.max(1, item.quantity - 1))}
                            className="p-2 hover:bg-gray-50 transition-colors"
                          >
                            <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                          <span className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium min-w-[2.5rem] sm:min-w-[3rem] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => update(item.productId, item.quantity + 1)}
                            className="p-2 hover:bg-gray-50 transition-colors"
                          >
                            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      )}
                      
                      {item.customization && (
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="px-3 py-2 text-xs sm:text-sm text-accent hover:bg-accent/10 rounded-md transition-colors font-medium"
                          title="View order details"
                        >
                          Order Details
                        </button>
                      )}
                      
                      <button
                        onClick={() => remove(item.productId)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Clear Cart */}
              <div className="text-right">
                <button 
                  onClick={() => clear()} 
                  className="text-sm text-gray-600 hover:text-red-600 transition-colors"
                >
                  Clear cart
                </button>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 sticky top-4 sm:top-24">
                <div className="p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Order Summary</h2>
                  
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-medium">${formatPrice(subtotal)}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Shipping</span>
                      <span className="font-medium">
                        Calculated at checkout
                      </span>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-3 sm:pt-4">
                      <div className="flex justify-between text-base sm:text-lg font-semibold">
                        <span>Total</span>
                        <span>${formatPrice(total)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 sm:mt-6 space-y-3">
                    {/* Submit for review - this is the only action in cart */}
                    <div className="space-y-3">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                          All items require admin review before processing. 
                          Submit your order for review and approval.
                        </p>
                      </div>
                      <Button 
                        size="lg" 
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        onClick={handleSubmitForReview}
                      >
                        Submit for Review
                      </Button>
                    </div>
                    
                    <div className="text-center">
                      <span className="text-xs sm:text-sm text-gray-600">
                        Shipping will be calculated based on your location during checkout
                      </span>
                    </div>
                  </div>

                  {/* Security Badges */}
                  <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
                    <div className="flex items-center justify-center space-x-3 sm:space-x-4 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span>Secure Checkout</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span>SSL Encrypted</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-accent" />
                  Order Details
                </h2>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
              
              <div className="space-y-4 sm:space-y-6">
                {/* Product Info */}
                <div className="flex flex-col sm:flex-row items-start space-y-3 sm:space-y-0 sm:space-x-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <img
                    src={selectedItem.customization?.mockup || selectedItem.product?.image || ''}
                            alt={selectedItem.product?.title || ''}
                    className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">{selectedItem.product?.title || ''}</h3>
                    <p className="text-sm text-gray-600 mt-1">{selectedItem.product?.description || ''}</p>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">Quantity: {selectedItem.quantity}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-lg sm:text-xl font-bold text-gray-900">
                      ${formatPrice(calculateItemPrice(selectedItem))}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500">per item</p>
                  </div>
                </div>

                {/* Design Upload */}
                {selectedItem.customization?.design && (
                  <div className="border border-gray-200 rounded-lg p-3 sm:p-4">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center text-sm sm:text-base">
                      <span className="w-2 h-2 bg-accent rounded-full mr-2"></span>
                      Uploaded Design
                    </h4>
                    <div className="flex items-center space-x-3 sm:space-x-4">
                      <img
                        src={selectedItem.customization.design.base64 || selectedItem.customization.design.preview}
                        alt="Design preview"
                        className="w-12 h-12 sm:w-16 sm:h-16 object-contain border border-gray-200 rounded-lg flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{selectedItem.customization.design.name}</p>
                        <p className="text-xs sm:text-sm text-gray-600">
                          {selectedItem.customization.design.base64 
                            ? `${(selectedItem.customization.design.base64.length / 1024 / 1024).toFixed(2)} MB`
                            : `${(selectedItem.customization.design.size / 1024 / 1024).toFixed(2)} MB`
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Customization Details */}
                {selectedItem.customization && (
                      <div className="space-y-3 sm:space-y-4">
                        <h4 className="font-semibold text-gray-900 flex items-center text-sm sm:text-base">
                          <span className="w-2 h-2 bg-accent rounded-full mr-2"></span>
                          Customization Options
                        </h4>
                        
                          {/* Basic Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div className="space-y-2 sm:space-y-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Placement:</span>
                              <span className="font-medium capitalize">{selectedItem.customization.placement.replace('-', ' ')}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Size:</span>
                              <span className="font-medium capitalize">{selectedItem.customization.size}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Color:</span>
                              <span className="font-medium">{selectedItem.customization.color}</span>
                            </div>
                            {selectedItem.customization.notes && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Notes:</span>
                                <span className="font-medium text-right max-w-32 sm:max-w-48 text-xs sm:text-sm">{selectedItem.customization.notes}</span>
                              </div>
                            )}
                          </div>

                          {/* Design Info - Legacy or Multi-Design */}
                          <div className="space-y-2 sm:space-y-3">
                            {/* Multi-Design Support */}
                            {selectedItem.customization.designs && selectedItem.customization.designs.length > 0 ? (
                              <>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">Designs:</span>
                                  <span className="font-medium">{selectedItem.customization.designs.length} design{selectedItem.customization.designs.length !== 1 ? 's' : ''}</span>
                                </div>
                                {selectedItem.customization.designs.map((design: any, index: number) => (
                                  <div key={design.id} className="text-xs bg-gray-50 p-2 rounded">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Design {index + 1}:</span>
                                      <span className="font-medium">{design.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Size:</span>
                                      <span className="font-medium">{design.dimensions.width}" × {design.dimensions.height}"</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Scale:</span>
                                      <span className="font-medium">{Math.round(design.scale * 100)}%</span>
                                    </div>
                                    {design.notes && (
                                      <div className="mt-1">
                                        <span className="text-gray-600">Notes:</span>
                                        <span className="font-medium text-xs block">{design.notes}</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </>
                            ) : (
                              /* Legacy Single Design Support */
                              <>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Design Scale:</span>
                                  <span className="font-medium">{Math.round(selectedItem.customization.designScale * 100)}%</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Rotation:</span>
                                  <span className="font-medium">{selectedItem.customization.designRotation}°</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Position:</span>
                              <span className="font-medium text-xs sm:text-sm">
                                    X: {Math.round(selectedItem.customization.designPosition.x)}, 
                                    Y: {Math.round(selectedItem.customization.designPosition.y)}
                              </span>
                            </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Selected Styles - Multi-Design or Legacy */}
                        <div className="space-y-3 sm:space-y-4">
                          <h5 className="font-medium text-gray-900 text-sm sm:text-base">Selected Styles & Pricing</h5>
                          
                          {/* Multi-Design Styles */}
                          {selectedItem.customization.designs && selectedItem.customization.designs.length > 0 ? (
                            <div className="space-y-4">
                              {selectedItem.customization.designs.map((design: any, index: number) => (
                                <div key={design.id} className="border border-gray-200 rounded-lg p-3">
                                  <div className="flex items-center justify-between mb-3">
                                    <h6 className="font-medium text-gray-900">Design {index + 1}: {design.name}</h6>
                                    <span className="text-sm text-gray-600">
                                      {design.dimensions.width}" × {design.dimensions.height}" @ {Math.round(design.scale * 100)}%
                                    </span>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    {/* Individual Design Styles */}
                                    {design.selectedStyles.coverage && (
                                      <div className="flex justify-between items-center p-2 bg-blue-50 rounded text-xs">
                                        <span className="text-blue-700">{design.selectedStyles.coverage.name}</span>
                                        <span className="font-semibold text-blue-900">
                                          +${formatPrice(design.selectedStyles.coverage.price)}
                                        </span>
                                      </div>
                                    )}
                                    
                                    {design.selectedStyles.material && (
                                      <div className="flex justify-between items-center p-2 bg-purple-50 rounded text-xs">
                                        <span className="text-purple-700">{design.selectedStyles.material.name}</span>
                                        <span className="font-semibold text-purple-900">
                                          +${formatPrice(design.selectedStyles.material.price)}
                                        </span>
                                      </div>
                                    )}
                                    
                                    {design.selectedStyles.border && (
                                      <div className="flex justify-between items-center p-2 bg-purple-50 rounded text-xs">
                                        <span className="text-purple-700">{design.selectedStyles.border.name}</span>
                                        <span className="font-semibold text-purple-900">
                                          +${formatPrice(design.selectedStyles.border.price)}
                                        </span>
                                      </div>
                                    )}
                                    
                                    {design.selectedStyles.threads.map((thread: any, threadIndex: number) => (
                                      <div key={threadIndex} className="flex justify-between items-center p-2 bg-yellow-50 rounded text-xs">
                                        <span className="text-yellow-700">{thread.name}</span>
                                        <span className="font-semibold text-yellow-900">
                                          +${formatPrice(thread.price)}
                                        </span>
                                      </div>
                                    ))}
                                    
                                    {design.selectedStyles.backing && (
                                      <div className="flex justify-between items-center p-2 bg-indigo-50 rounded text-xs">
                                        <span className="text-indigo-700">{design.selectedStyles.backing.name}</span>
                                        <span className="font-semibold text-indigo-900">
                                          +${formatPrice(design.selectedStyles.backing.price)}
                                        </span>
                                      </div>
                                    )}
                                    
                                    {design.selectedStyles.upgrades.map((upgrade: any, upgradeIndex: number) => (
                                      <div key={upgradeIndex} className="flex justify-between items-center p-2 bg-pink-50 rounded text-xs">
                                        <span className="text-pink-700">{upgrade.name}</span>
                                        <span className="font-semibold text-pink-900">
                                          +${formatPrice(upgrade.price)}
                                        </span>
                                      </div>
                                    ))}
                                    
                                    {design.selectedStyles.cutting && (
                                      <div className="flex justify-between items-center p-2 bg-gray-50 rounded text-xs">
                                        <span className="text-gray-700">{design.selectedStyles.cutting.name}</span>
                                        <span className="font-semibold text-gray-900">
                                          +${formatPrice(design.selectedStyles.cutting.price)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            /* Legacy Single Design Styles */
                          <div className="space-y-3">
                            {/* Coverage */}
                              {selectedItem.customization.selectedStyles.coverage && (
                              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                                <div>
                                  <p className="font-medium text-blue-900">Coverage Level</p>
                                  <p className="text-sm text-blue-700">{selectedItem.customization.selectedStyles.coverage.name}</p>
                                </div>
                                <span className="font-semibold text-blue-900">
                                  +${formatPrice(selectedItem.customization.selectedStyles.coverage.price)}
                                </span>
                              </div>
                            )}

                            {/* Material */}
                              {selectedItem.customization.selectedStyles.material && (
                              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                                <div>
                                  <p className="font-medium text-purple-900">Base Material</p>
                                  <p className="text-sm text-purple-700">{selectedItem.customization.selectedStyles.material.name}</p>
                                </div>
                                <span className="font-semibold text-purple-900">
                                  +${formatPrice(selectedItem.customization.selectedStyles.material.price)}
                                </span>
                              </div>
                            )}

                            {/* Border */}
                              {selectedItem.customization.selectedStyles.border && (
                              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                                <div>
                                  <p className="font-medium text-purple-900">Border & Edge</p>
                                  <p className="text-sm text-purple-700">{selectedItem.customization.selectedStyles.border.name}</p>
                                </div>
                                <span className="font-semibold text-purple-900">
                                  +${formatPrice(selectedItem.customization.selectedStyles.border.price)}
                                </span>
                              </div>
                            )}

                            {/* Threads */}
                              {selectedItem.customization.selectedStyles.threads.length > 0 && (
                              <div className="p-3 bg-yellow-50 rounded-lg">
                                <p className="font-medium text-yellow-900 mb-2">Thread Options</p>
                                <div className="space-y-1">
                                  {selectedItem.customization.selectedStyles.threads.map((thread: { id: string; name: string; price: number }, index: number) => (
                                    <div key={index} className="flex justify-between items-center">
                                      <span className="text-sm text-yellow-700">{thread.name}</span>
                                      <span className="text-sm font-semibold text-yellow-900">
                                        +${formatPrice(thread.price)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Backing */}
                              {selectedItem.customization.selectedStyles.backing && (
                              <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg">
                                <div>
                                  <p className="font-medium text-indigo-900">Backing</p>
                                  <p className="text-sm text-indigo-700">{selectedItem.customization.selectedStyles.backing.name}</p>
                                </div>
                                <span className="font-semibold text-indigo-900">
                                  +${formatPrice(selectedItem.customization.selectedStyles.backing.price)}
                                </span>
                              </div>
                            )}

                            {/* Upgrades */}
                              {selectedItem.customization.selectedStyles.upgrades.length > 0 && (
                              <div className="p-3 bg-pink-50 rounded-lg">
                                <p className="font-medium text-pink-900 mb-2">Upgrades</p>
                                <div className="space-y-1">
                                  {selectedItem.customization.selectedStyles.upgrades.map((upgrade: { id: string; name: string; price: number }, index: number) => (
                                    <div key={index} className="flex justify-between items-center">
                                      <span className="text-sm text-pink-700">{upgrade.name}</span>
                                      <span className="text-sm font-semibold text-pink-900">
                                        +${formatPrice(upgrade.price)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Cutting */}
                              {selectedItem.customization.selectedStyles.cutting && (
                              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <div>
                                  <p className="font-medium text-gray-900">Cut to Shape Method</p>
                                  <p className="text-sm text-gray-700">{selectedItem.customization.selectedStyles.cutting.name}</p>
                                </div>
                                <span className="font-semibold text-gray-900">
                                  +${formatPrice(selectedItem.customization.selectedStyles.cutting.price)}
                                </span>
                              </div>
                            )}
                      </div>
                    )}
                    </div>
                  </div>
                )}

                {/* Price Breakdown */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Price Breakdown</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Base Product Price:</span>
                      <span className="font-medium">${formatPrice(selectedItem.product?.price || 0)}</span>
                    </div>
                    {selectedItem.customization && (
                      <>
                        {/* Multiple Designs Pricing */}
                        {selectedItem.customization.designs && selectedItem.customization.designs.length > 0 ? (
                          <>
                            {selectedItem.customization.designs.map((design: any, index: number) => (
                              <div key={design.id || index} className="ml-4 space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">Design {index + 1}: {design.name}</span>
                                  <span className="font-medium">
                                    ${formatPrice(design.totalPrice || 0)}
                                  </span>
                                </div>
                                {design.selectedStyles && (
                                  <div className="ml-4 space-y-1">
                                    {design.selectedStyles.coverage && (
                                      <div className="flex justify-between text-xs">
                                        <span className="text-gray-500">Coverage:</span>
                                        <span>+${formatPrice(design.selectedStyles.coverage.price)}</span>
                                      </div>
                                    )}
                                    {design.selectedStyles.material && (
                                      <div className="flex justify-between text-xs">
                                        <span className="text-gray-500">Material:</span>
                                        <span>+${formatPrice(design.selectedStyles.material.price)}</span>
                                      </div>
                                    )}
                                    {design.selectedStyles.threads && design.selectedStyles.threads.length > 0 && (
                                      <div className="flex justify-between text-xs">
                                        <span className="text-gray-500">Threads:</span>
                                        <span>+${formatPrice(design.selectedStyles.threads.reduce((sum: number, thread: any) => sum + (thread.price || 0), 0))}</span>
                                      </div>
                                    )}
                                    {design.selectedStyles.upgrades && design.selectedStyles.upgrades.length > 0 && (
                                      <div className="flex justify-between text-xs">
                                        <span className="text-gray-500">Upgrades:</span>
                                        <span>+${formatPrice(design.selectedStyles.upgrades.reduce((sum: number, upgrade: any) => sum + (upgrade.price || 0), 0))}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                            <div className="flex justify-between">
                              <span className="text-gray-600">All Designs Total:</span>
                              <span className="font-medium">
                                ${formatPrice(calculateItemPrice(selectedItem) - Number(selectedItem.product?.price || 0))}
                              </span>
                            </div>
                          </>
                        ) : (
                          /* Legacy Single Design Pricing */
                          <div className="flex justify-between">
                            <span className="text-gray-600">Customization Total:</span>
                            <span className="font-medium">
                              +${formatPrice(calculateItemPrice(selectedItem) - Number(selectedItem.product?.price || 0))}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-600">Per Item Total:</span>
                          <span className="font-medium">${formatPrice(calculateItemPrice(selectedItem))}</span>
                        </div>
                        <div className="flex justify-between text-lg font-semibold border-t pt-2">
                          <span>Total ({selectedItem.quantity} items):</span>
                          <span>${formatPrice(calculateItemPrice(selectedItem) * selectedItem.quantity)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setSelectedItem(null)}
                  className="px-4 sm:px-6 w-full sm:w-auto"
                >
                  Close
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    setShowFinalProductModal(true)
                  }}
                  className="px-4 sm:px-6 w-full sm:w-auto flex items-center justify-center"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Final Product
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Final Product Modal */}
      {showFinalProductModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Eye className="w-6 h-6 mr-2 text-accent" />
                  Final Product Preview
                </h2>
                <button
                  onClick={() => {
                    setShowFinalProductModal(false)
                    setSelectedItem(null)
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Product with Design */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                    {selectedItem.product?.title || ''} - Final Product
                  </h3>
                  {/* Debug info */}
                  <div className="text-xs text-gray-500 mb-2 text-center">
                    {selectedItem.customization?.mockup ? 
                      `Mockup available (${Math.round(selectedItem.customization.mockup.length / 1024)}KB)` : 
                      'No mockup available - showing base product'
                    }
                  </div>
                  <div className="flex justify-center">
                    <div className="relative max-w-md w-full">
                      {/* Use mockup image if available (shows final product with design), otherwise show base product */}
                      {selectedItem.customization?.mockup ? (
                        <img
                          src={selectedItem.customization.mockup}
                          alt={`${selectedItem.product?.title || ''} - Final Product`}
                          className="w-full h-80 object-contain rounded-lg shadow-lg"
                        />
                      ) : (
                        <>
                          <img
                            src={selectedItem.product?.image || ''}
                            alt={selectedItem.product?.title || ''}
                            className="w-full h-80 object-cover rounded-lg shadow-lg"
                          />
                          {selectedItem.customization?.design && (
                            <div
                              className="absolute select-none"
                              style={{
                                left: `${selectedItem.customization.designPosition?.x || 150}px`,
                                top: `${selectedItem.customization.designPosition?.y || 120}px`,
                                transform: `scale(${selectedItem.customization.designScale || 1}) rotate(${selectedItem.customization.designRotation || 0}deg)`,
                                transformOrigin: 'center'
                              }}
                            >
                              <img
                                src={selectedItem.customization.design.preview || selectedItem.customization.design.base64}
                                alt="Design preview"
                                className="drop-shadow-2xl border-2 border-white/50 rounded-lg"
                                style={{
                                  width: '60px',
                                  height: '60px',
                                  objectFit: 'fill'
                                }}
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Design Details */}
                {selectedItem.customization && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">
                        {selectedItem.productId === 'custom-embroidery' ? 'Embroidery Information' : 'Design Information'}
                      </h4>
                      <div className="space-y-2 text-sm">
                        {selectedItem.customization.design && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Design Name:</span>
                              <span className="font-medium">{selectedItem.customization.design.name}</span>
                                      </div>
                            {selectedItem.customization.design.size && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">File Size:</span>
                                <span className="font-medium">{(selectedItem.customization.design.size / 1024 / 1024).toFixed(2)} MB</span>
                              </div>
                            )}
                                      </>
                                    )}
                        {selectedItem.productId === 'custom-embroidery' && selectedItem.customization.embroideryData ? (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Dimensions:</span>
                              <span className="font-medium">
                                {selectedItem.customization.embroideryData.dimensions.width}" × {selectedItem.customization.embroideryData.dimensions.height}"
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Review Status:</span>
                              <span className={`font-medium ${
                                selectedItem.customization.embroideryData.reviewStatus === 'pending' ? 'text-yellow-600' :
                                selectedItem.customization.embroideryData.reviewStatus === 'approved' ? 'text-green-600' :
                                selectedItem.customization.embroideryData.reviewStatus === 'rejected' ? 'text-red-600' :
                                'text-blue-600'
                              }`}>
                                {selectedItem.customization.embroideryData.reviewStatus.charAt(0).toUpperCase() + selectedItem.customization.embroideryData.reviewStatus.slice(1)}
                              </span>
                    </div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Placement:</span>
                              <span className="font-medium capitalize">
                                {selectedItem.customization.placement === 'manual' ? 'Manual Position' : (selectedItem.customization.placement || '').replace('-', ' ')}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Scale:</span>
                              <span className="font-medium">{Math.round((selectedItem.customization.designScale || 1) * 100)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Rotation:</span>
                              <span className="font-medium">{selectedItem.customization.designRotation || 0}°</span>
                            </div>
                          </>
                        )}
                          </div>
                        </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Product Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Product:</span>
                          <span className="font-medium">{selectedItem.product?.title || ''}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Color:</span>
                          <span className="font-medium capitalize">{selectedItem.customization.color}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Size:</span>
                          <span className="font-medium uppercase">{selectedItem.customization.size}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Quantity:</span>
                          <span className="font-medium">{selectedItem.quantity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Price:</span>
                          <span className="font-medium">${formatPrice(calculateItemPrice(selectedItem))}</span>
                        </div>
                        {selectedItem.customization.notes && (
                          <div className="mt-3">
                            <span className="text-gray-600 block mb-1">Notes:</span>
                            <span className="text-sm bg-gray-50 p-2 rounded block">{selectedItem.customization.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Pricing Breakdown for Custom Embroidery */}
                {selectedItem.productId === 'custom-embroidery' && selectedItem.customization?.embroideryData && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Pricing Breakdown</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Base Material Cost:</span>
                        <span className="font-medium">${formatPrice(selectedItem.customization.embroideryData.materialCosts.totalCost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Embroidery Options:</span>
                        <span className="font-medium">${formatPrice(selectedItem.customization.embroideryData.optionsPrice)}</span>
                      </div>
                      <div className="border-t border-gray-200 pt-2 mt-2">
                        <div className="flex justify-between font-semibold">
                          <span>Total Price:</span>
                          <span className="text-lg">${formatPrice(selectedItem.customization.embroideryData.totalPrice)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowFinalProductModal(false)
                      setSelectedItem(null)
                    }}
                    className="w-full sm:w-auto"
                  >
                    Close Preview
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Submission Success Modal */}
      {showSubmissionSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>
              
              <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
                Order Submitted Successfully!
              </h2>
              
              <p className="text-gray-600 text-center mb-4">
                Your order has been submitted for review.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                <p className="text-sm text-blue-800 text-center">
                  <strong>Order ID:</strong> {submissionData.orderId}
                </p>
                <p className="text-sm text-blue-800 text-center mt-1">
                  You will be notified once the admin reviews your items.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowSubmissionSuccessModal(false)}
                  className="flex-1"
                >
                  Continue Shopping
                </Button>
                
                <Button
                  variant="primary"
                  onClick={() => {
                    setShowSubmissionSuccessModal(false)
                    window.location.href = '/my-orders'
                  }}
                  className="flex-1"
                >
                  View My Orders
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}