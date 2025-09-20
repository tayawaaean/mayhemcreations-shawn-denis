import React, { useState } from 'react'
import { useCart } from '../context/CartContext'
import { products } from '../../data/products'
import { Link, useNavigate } from 'react-router-dom'
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, Eye, X, CheckCircle } from 'lucide-react'
import Button from '../../components/Button'

export default function Cart() {
  const navigate = useNavigate()
  const { items, update, remove, clear } = useCart()
  const [selectedItem, setSelectedItem] = useState<typeof enriched[0] | null>(null)
  const enriched = items.map((it) => ({ 
    ...it, 
    product: it.product || products.find((p) => p.id === it.productId) 
  })).filter(item => item.product) // Filter out items without product data
  
  const calculateItemPrice = (item: typeof enriched[0]) => {
    // Ensure we have a valid number for the base price
    let itemPrice = Number(item.product.price) || 0
    
    // Add customization costs if present
    if (item.customization) {
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
    
    return itemPrice
  }
  
  const subtotal = enriched.reduce((s, e) => s + (calculateItemPrice(e) * e.quantity), 0)
  const shipping = subtotal > 50 ? 0 : 9.99
  const tax = subtotal * 0.08
  const total = subtotal + shipping + tax

  // Helper function to safely format prices
  const formatPrice = (price: number | undefined | null): string => {
    const numPrice = Number(price) || 0
    return numPrice.toFixed(2)
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
                      src={item.product.image} 
                      alt={item.product.alt} 
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-md flex-shrink-0" 
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{item.product.title}</h3>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">{item.product.description}</p>
                      
                      {item.customization && (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs sm:text-sm font-medium text-accent">Customized Item</p>
                          {item.customization.design && (
                            <p className="text-xs text-gray-600">
                              Design: {item.customization.design.name}
                            </p>
                          )}
                          <p className="text-xs text-gray-600">
                            Placement: {item.customization.placement} • Size: {item.customization.size} • Color: {item.customization.color}
                          </p>
                        </div>
                      )}
                      
                      <div className="text-base sm:text-lg font-bold text-gray-900 mt-2">
                        ${formatPrice(calculateItemPrice(item))}
                        {item.customization && (
                          <span className="text-xs sm:text-sm font-normal text-gray-500 ml-1">
                            (includes customization)
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
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
                      
                      {item.customization && (
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="p-2 text-accent hover:bg-accent/10 rounded-md transition-colors"
                          title="View customization details"
                        >
                          <Eye className="w-4 h-4" />
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
                        {shipping === 0 ? 'Free' : `$${formatPrice(shipping)}`}
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax</span>
                      <span className="font-medium">${formatPrice(tax)}</span>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-3 sm:pt-4">
                      <div className="flex justify-between text-base sm:text-lg font-semibold">
                        <span>Total</span>
                        <span>${formatPrice(total)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 sm:mt-6 space-y-3">
                    <Button 
                      size="lg" 
                      className="w-full"
                      onClick={() => navigate('/checkout')}
                    >
                      Proceed to Checkout
                    </Button>
                    
                    <div className="text-center">
                      <span className="text-xs sm:text-sm text-gray-600">
                        {shipping === 0 ? 'You qualify for free shipping!' : `Add $${formatPrice(50 - subtotal)} more for free shipping`}
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
                    src={selectedItem.product.image}
                    alt={selectedItem.product.title}
                    className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">{selectedItem.product.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{selectedItem.product.description}</p>
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
                        src={selectedItem.customization.design.preview}
                        alt="Design preview"
                        className="w-12 h-12 sm:w-16 sm:h-16 object-contain border border-gray-200 rounded-lg flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{selectedItem.customization.design.name}</p>
                        <p className="text-xs sm:text-sm text-gray-600">
                          {(selectedItem.customization.design.size / 1024 / 1024).toFixed(2)} MB
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
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {/* Basic Info */}
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

                      {/* Design Position */}
                      <div className="space-y-2 sm:space-y-3">
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
                      </div>
                    </div>

                    {/* Selected Styles */}
                    <div className="space-y-3 sm:space-y-4">
                      <h5 className="font-medium text-gray-900 text-sm sm:text-base">Selected Styles & Pricing</h5>
                      
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
                    </div>
                  </div>
                )}

                {/* Price Breakdown */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Price Breakdown</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Base Product Price:</span>
                      <span className="font-medium">${formatPrice(selectedItem.product.price)}</span>
                    </div>
                    {selectedItem.customization && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Customization Total:</span>
                          <span className="font-medium">
                            +${formatPrice(calculateItemPrice(selectedItem) - Number(selectedItem.product.price))}
                          </span>
                        </div>
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
              
              <div className="mt-4 sm:mt-6 flex justify-end">
                <Button
                  onClick={() => setSelectedItem(null)}
                  className="px-4 sm:px-6 w-full sm:w-auto"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}