import React, { useState } from 'react'
import { useCart } from '../context/CartContext'
import { products } from '../data/products'
import { Link, useNavigate } from 'react-router-dom'
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, Eye, X, CheckCircle } from 'lucide-react'
import Button from '../components/Button'

export default function Cart() {
  const navigate = useNavigate()
  const { items, update, remove, clear } = useCart()
  const [selectedItem, setSelectedItem] = useState<typeof enriched[0] | null>(null)
  const enriched = items.map((it) => ({ ...it, product: products.find((p) => p.id === it.productId)! }))
  
  const calculateItemPrice = (item: typeof enriched[0]) => {
    let itemPrice = item.product.price
    
    // Add customization costs if present
    if (item.customization) {
      const { selectedStyles } = item.customization
      if (selectedStyles.coverage) itemPrice += selectedStyles.coverage.price
      if (selectedStyles.material) itemPrice += selectedStyles.material.price
      if (selectedStyles.border) itemPrice += selectedStyles.border.price
      if (selectedStyles.backing) itemPrice += selectedStyles.backing.price
      if (selectedStyles.cutting) itemPrice += selectedStyles.cutting.price
      
      selectedStyles.threads.forEach(thread => itemPrice += thread.price)
      selectedStyles.upgrades.forEach(upgrade => itemPrice += upgrade.price)
    }
    
    return itemPrice
  }
  
  const subtotal = enriched.reduce((s, e) => s + (calculateItemPrice(e) * e.quantity), 0)
  const shipping = subtotal > 50 ? 0 : 9.99
  const tax = subtotal * 0.08
  const total = subtotal + shipping + tax

  return (
    <main className="py-8">
      <div className="container">
        <div className="mb-8">
          <Link to="/products" className="inline-flex items-center text-accent hover:text-accent/80 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Continue Shopping
          </Link>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">Shopping Cart</h1>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="w-24 h-24 text-gray-300 mx-auto mb-6" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Your cart is empty</h2>
            <p className="text-gray-600 mb-8">Looks like you haven't added any items to your cart yet.</p>
            <Link to="/products">
              <Button size="lg">Start Shopping</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {enriched.map((item) => (
                <div key={item.productId} className="card">
                  <div className="flex items-center space-x-4 p-4">
                    <img 
                      src={item.product.image} 
                      alt={item.product.alt} 
                      className="w-20 h-20 object-cover rounded-md" 
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{item.product.title}</h3>
                      <p className="text-sm text-gray-600">{item.product.description}</p>
                      
                      {item.customization && (
                        <div className="mt-2 space-y-1">
                          <p className="text-sm font-medium text-accent">Customized Item</p>
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
                      
                      <div className="text-lg font-bold text-gray-900 mt-1">
                        ${calculateItemPrice(item).toFixed(2)}
                        {item.customization && (
                          <span className="text-sm font-normal text-gray-500 ml-1">
                            (includes customization)
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center border border-gray-300 rounded-md">
                        <button
                          onClick={() => update(item.productId, Math.max(1, item.quantity - 1))}
                          className="p-2 hover:bg-gray-50 transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="px-4 py-2 text-sm font-medium min-w-[3rem] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => update(item.productId, item.quantity + 1)}
                          className="p-2 hover:bg-gray-50 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
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
              <div className="card sticky top-24">
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Order Summary</h2>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-medium">${subtotal.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Shipping</span>
                      <span className="font-medium">
                        {shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax</span>
                      <span className="font-medium">${tax.toFixed(2)}</span>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex justify-between text-lg font-semibold">
                        <span>Total</span>
                        <span>${total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <Button 
                      size="lg" 
                      className="w-full"
                      onClick={() => navigate('/checkout')}
                    >
                      Proceed to Checkout
                    </Button>
                    
                    <div className="text-center">
                      <span className="text-sm text-gray-600">
                        {shipping === 0 ? 'You qualify for free shipping!' : `Add $${(50 - subtotal).toFixed(2)} more for free shipping`}
                      </span>
                    </div>
                  </div>

                  {/* Security Badges */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Secure Checkout</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <CheckCircle className="w-6 h-6 mr-2 text-accent" />
                  Order Details
                </h2>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Product Info */}
                <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                  <img
                    src={selectedItem.product.image}
                    alt={selectedItem.product.title}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{selectedItem.product.title}</h3>
                    <p className="text-gray-600">{selectedItem.product.description}</p>
                    <p className="text-sm text-gray-500 mt-1">Quantity: {selectedItem.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900">
                      ${calculateItemPrice(selectedItem).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500">per item</p>
                  </div>
                </div>

                {/* Design Upload */}
                {selectedItem.customization?.design && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <span className="w-2 h-2 bg-accent rounded-full mr-2"></span>
                      Uploaded Design
                    </h4>
                    <div className="flex items-center space-x-4">
                      <img
                        src={selectedItem.customization.design.preview}
                        alt="Design preview"
                        className="w-16 h-16 object-contain border border-gray-200 rounded-lg"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{selectedItem.customization.design.name}</p>
                        <p className="text-sm text-gray-600">
                          {(selectedItem.customization.design.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Customization Details */}
                {selectedItem.customization && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 flex items-center">
                      <span className="w-2 h-2 bg-accent rounded-full mr-2"></span>
                      Customization Options
                    </h4>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Basic Info */}
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Placement:</span>
                          <span className="font-medium capitalize">{selectedItem.customization.placement.replace('-', ' ')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Size:</span>
                          <span className="font-medium capitalize">{selectedItem.customization.size}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Color:</span>
                          <span className="font-medium">{selectedItem.customization.color}</span>
                        </div>
                        {selectedItem.customization.notes && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Notes:</span>
                            <span className="font-medium text-right max-w-48">{selectedItem.customization.notes}</span>
                          </div>
                        )}
                      </div>

                      {/* Design Position */}
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Design Scale:</span>
                          <span className="font-medium">{Math.round(selectedItem.customization.designScale * 100)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Rotation:</span>
                          <span className="font-medium">{selectedItem.customization.designRotation}°</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Position:</span>
                          <span className="font-medium">
                            X: {Math.round(selectedItem.customization.designPosition.x)}, 
                            Y: {Math.round(selectedItem.customization.designPosition.y)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Selected Styles */}
                    <div className="space-y-4">
                      <h5 className="font-medium text-gray-900">Selected Styles & Pricing</h5>
                      
                      <div className="space-y-3">
                        {/* Coverage */}
                        {selectedItem.customization.selectedStyles.coverage && (
                          <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                            <div>
                              <p className="font-medium text-blue-900">Coverage Level</p>
                              <p className="text-sm text-blue-700">{selectedItem.customization.selectedStyles.coverage.name}</p>
                            </div>
                            <span className="font-semibold text-blue-900">
                              +${selectedItem.customization.selectedStyles.coverage.price.toFixed(2)}
                            </span>
                          </div>
                        )}

                        {/* Material */}
                        {selectedItem.customization.selectedStyles.material && (
                          <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                            <div>
                              <p className="font-medium text-green-900">Base Material</p>
                              <p className="text-sm text-green-700">{selectedItem.customization.selectedStyles.material.name}</p>
                            </div>
                            <span className="font-semibold text-green-900">
                              +${selectedItem.customization.selectedStyles.material.price.toFixed(2)}
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
                              +${selectedItem.customization.selectedStyles.border.price.toFixed(2)}
                            </span>
                          </div>
                        )}

                        {/* Threads */}
                        {selectedItem.customization.selectedStyles.threads.length > 0 && (
                          <div className="p-3 bg-yellow-50 rounded-lg">
                            <p className="font-medium text-yellow-900 mb-2">Thread Options</p>
                            <div className="space-y-1">
                              {selectedItem.customization.selectedStyles.threads.map((thread, index) => (
                                <div key={index} className="flex justify-between items-center">
                                  <span className="text-sm text-yellow-700">{thread.name}</span>
                                  <span className="text-sm font-semibold text-yellow-900">
                                    +${thread.price.toFixed(2)}
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
                              +${selectedItem.customization.selectedStyles.backing.price.toFixed(2)}
                            </span>
                          </div>
                        )}

                        {/* Upgrades */}
                        {selectedItem.customization.selectedStyles.upgrades.length > 0 && (
                          <div className="p-3 bg-pink-50 rounded-lg">
                            <p className="font-medium text-pink-900 mb-2">Upgrades</p>
                            <div className="space-y-1">
                              {selectedItem.customization.selectedStyles.upgrades.map((upgrade, index) => (
                                <div key={index} className="flex justify-between items-center">
                                  <span className="text-sm text-pink-700">{upgrade.name}</span>
                                  <span className="text-sm font-semibold text-pink-900">
                                    +${upgrade.price.toFixed(2)}
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
                              +${selectedItem.customization.selectedStyles.cutting.price.toFixed(2)}
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
                      <span className="font-medium">${selectedItem.product.price.toFixed(2)}</span>
                    </div>
                    {selectedItem.customization && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Customization Total:</span>
                          <span className="font-medium">
                            +${(calculateItemPrice(selectedItem) - selectedItem.product.price).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Per Item Total:</span>
                          <span className="font-medium">${calculateItemPrice(selectedItem).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-semibold border-t pt-2">
                          <span>Total ({selectedItem.quantity} items):</span>
                          <span>${(calculateItemPrice(selectedItem) * selectedItem.quantity).toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={() => setSelectedItem(null)}
                  className="px-6"
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