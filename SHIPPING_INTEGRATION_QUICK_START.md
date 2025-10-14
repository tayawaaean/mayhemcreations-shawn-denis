# Quick Start: Shipping Integration Implementation

## Overview
This guide provides step-by-step instructions to integrate shipping rate calculations into your checkout flow.

---

## Current vs. Proposed Flow

### ❌ Current Flow (Broken)
```
┌──────────┐    ┌─────────────────┐    ┌──────────────┐    ┌──────────────┐    ┌─────────┐
│   Cart   │───>│ Submit Review   │───>│ Admin Review │───>│ Checkout     │───>│ Payment │
│          │    │ (No Address!)   │    │              │    │ (Get Address)│    │         │
│ $0 Ship  │    │ Total: $50      │    │ Approves     │    │ Calc Ship    │    │ Total   │
└──────────┘    └─────────────────┘    └──────────────┘    └──────────────┘    └─────────┘
                                                                ↑
                                        PROBLEM: Customer sees shipping cost AFTER admin approval!
```

### ✅ Proposed Flow (Fixed)
```
┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌─────────┐
│   Cart   │───>│   Checkout   │───>│ Submit Review│───>│ Admin Review │───>│ Payment │
│          │    │ 1. Address   │    │ With Full    │    │              │    │         │
│ Est Ship │    │ 2. Calc Ship │    │ Details      │    │ Sees Total   │    │ Process │
└──────────┘    │ 3. Select    │    │              │    │ + Ship Info  │    │         │
                └──────────────┘    └──────────────┘    └──────────────┘    └─────────┘
                                            ↑
                            Customer knows EXACT total before submission!
```

---

## Implementation Steps

### Step 1: Update Database Schema (5 minutes)

Run this migration to add shipping fields to `order_reviews` table:

```sql
-- File: backend/src/scripts/add-shipping-fields.sql

ALTER TABLE order_reviews 
ADD COLUMN IF NOT EXISTS shipping_address JSONB,
ADD COLUMN IF NOT EXISTS billing_address JSONB,
ADD COLUMN IF NOT EXISTS shipping_method JSONB,
ADD COLUMN IF NOT EXISTS customer_notes TEXT,
ADD COLUMN IF NOT EXISTS shipping_carrier VARCHAR(50),
ADD COLUMN IF NOT EXISTS estimated_delivery_date DATE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_order_reviews_shipping_carrier 
ON order_reviews(shipping_carrier);

-- Verify columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'order_reviews' 
AND column_name IN ('shipping_address', 'shipping_method', 'customer_notes');
```

Run migration:
```powershell
# PowerShell
cd backend
psql -U your_username -d mayhem_creations -f src/scripts/add-shipping-fields.sql
```

### Step 2: Create Unified Checkout Component (30 minutes)

Create new file: `frontend/src/ecommerce/routes/UnifiedCheckout.tsx`

```typescript
import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAlertModal } from '../context/AlertModalContext'
import { calculateShippingRates, ShippingRate } from '../../shared/shippingApiService'
import { orderReviewApiService } from '../../shared/orderReviewApiService'
import { products } from '../../data/products'
import { MaterialPricingService } from '../../shared/materialPricingService'
import Button from '../../components/Button'
import { MapPin, Truck, Package, CheckCircle, ArrowLeft } from 'lucide-react'

export default function UnifiedCheckout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { items, clear } = useCart()
  const { showError, showSuccess, showWarning } = useAlertModal()

  // Get cart items from location state or context
  const cartItems = location.state?.cartItems || items

  const [currentStep, setCurrentStep] = useState<1 | 2>(1) // 1: Shipping, 2: Review
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([])
  const [selectedShippingRate, setSelectedShippingRate] = useState<ShippingRate | null>(null)

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    apartment: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
    notes: ''
  })

  // Redirect if no items
  useEffect(() => {
    if (!cartItems || cartItems.length === 0) {
      showWarning('Your cart is empty', 'Empty Cart')
      navigate('/cart')
    }
  }, [cartItems, navigate, showWarning])

  // Calculate item price with customizations
  const calculateItemPrice = (item: any) => {
    const numericId = typeof item.productId === 'string' && !isNaN(Number(item.productId)) 
      ? Number(item.productId) 
      : item.productId
    const product = products.find(p => p.id === item.productId || p.id === numericId)
    if (!product) return 0

    let itemPrice = product.price

    // Add customization costs
    if (item.customization) {
      if (item.customization.designs && item.customization.designs.length > 0) {
        item.customization.designs.forEach((design: any) => {
          if (design.dimensions && design.dimensions.width > 0 && design.dimensions.height > 0) {
            try {
              const materialCosts = MaterialPricingService.calculateMaterialCosts({
                patchWidth: design.dimensions.width,
                patchHeight: design.dimensions.height
              })
              itemPrice += materialCosts.totalCost
            } catch (error) {
              console.warn('Failed to calculate material costs:', error)
            }
          }

          if (design.selectedStyles) {
            const { selectedStyles } = design
            if (selectedStyles.coverage) itemPrice += selectedStyles.coverage.price
            if (selectedStyles.material) itemPrice += selectedStyles.material.price
            if (selectedStyles.border) itemPrice += selectedStyles.border.price
            if (selectedStyles.backing) itemPrice += selectedStyles.backing.price
            if (selectedStyles.cutting) itemPrice += selectedStyles.cutting.price
            selectedStyles.threads?.forEach((thread: any) => itemPrice += thread.price)
            selectedStyles.upgrades?.forEach((upgrade: any) => itemPrice += upgrade.price)
          }
        })
      }
    }

    return itemPrice
  }

  const calculateSubtotal = () => {
    return cartItems.reduce((total: number, item: any) => {
      const itemPrice = calculateItemPrice(item)
      return total + (itemPrice * item.quantity)
    }, 0)
  }

  const calculateTax = () => calculateSubtotal() * 0.08 // 8% tax
  const calculateShipping = () => selectedShippingRate?.totalCost || 0
  const calculateTotal = () => calculateSubtotal() + calculateTax() + calculateShipping()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const validateAddressForm = () => {
    const required = ['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'state', 'zipCode']
    const missing = required.filter(field => !formData[field as keyof typeof formData])
    
    if (missing.length > 0) {
      showError(`Please fill in: ${missing.join(', ')}`, 'Missing Information')
      return false
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      showError('Please enter a valid email address', 'Invalid Email')
      return false
    }

    // Validate ZIP code
    const zipRegex = /^\d{5}(-\d{4})?$/
    if (!zipRegex.test(formData.zipCode)) {
      showError('Please enter a valid ZIP code', 'Invalid ZIP Code')
      return false
    }

    return true
  }

  const handleCalculateShipping = async () => {
    if (!validateAddressForm()) return

    setIsCalculatingShipping(true)

    try {
      // Prepare items for shipping calculation
      const shippingItems = cartItems.map((item: any) => {
        const numericId = typeof item.productId === 'string' && !isNaN(Number(item.productId)) 
          ? Number(item.productId) 
          : item.productId
        const product = products.find(p => p.id === item.productId || p.id === numericId)

        return {
          id: item.productId.toString(),
          name: product?.title || `Product ${item.productId}`,
          quantity: item.quantity,
          price: calculateItemPrice(item),
          weight: {
            value: product?.weight || 8, // Default 8 oz
            unit: 'ounce' as const
          }
        }
      })

      // Call ShipEngine API
      const response = await calculateShippingRates(
        {
          street1: formData.address,
          street2: formData.apartment,
          city: formData.city,
          state: formData.state,
          postalCode: formData.zipCode,
          country: 'US'
        },
        shippingItems
      )

      if (response.success && response.data) {
        setShippingRates(response.data.rates)
        setSelectedShippingRate(response.data.recommendedRate || response.data.rates[0])
        
        // Move to review step
        setCurrentStep(2)

        if (response.data.warning) {
          showWarning(response.data.warning, 'Shipping Notice')
        }
      } else {
        throw new Error(response.message || 'Failed to calculate shipping rates')
      }
    } catch (error) {
      console.error('Shipping calculation error:', error)
      showError(
        error instanceof Error ? error.message : 'Unable to calculate shipping rates',
        'Shipping Error'
      )
    } finally {
      setIsCalculatingShipping(false)
    }
  }

  const handleSubmitForReview = async () => {
    if (!selectedShippingRate) {
      showError('Please select a shipping method', 'Missing Selection')
      return
    }

    setIsSubmitting(true)

    try {
      const orderData = {
        items: cartItems.map((item: any, index: number) => {
          const numericId = typeof item.productId === 'string' && !isNaN(Number(item.productId)) 
            ? Number(item.productId) 
            : item.productId
          const product = products.find(p => p.id === item.productId || p.id === numericId)
          
          // Calculate pricing breakdown
          const baseProductPrice = Number(product?.price) || 0
          const itemPrice = calculateItemPrice(item)
          const embroideryPrice = itemPrice - baseProductPrice

          return {
            id: `${item.productId}-${Date.now()}-${index}`,
            productId: item.productId,
            quantity: item.quantity,
            customization: item.customization,
            reviewStatus: 'pending' as const,
            product: item.product || product,
            productName: product?.title || `Product ${item.productId}`,
            productSnapshot: product ? {
              id: product.id,
              title: product.title,
              price: product.price,
              image: product.image
            } : null,
            pricingBreakdown: {
              baseProductPrice,
              embroideryPrice,
              embroideryOptionsPrice: 0, // Could be broken down further
              totalPrice: itemPrice
            }
          }
        }),
        subtotal: calculateSubtotal(),
        shipping: selectedShippingRate.totalCost,
        tax: calculateTax(),
        total: calculateTotal(),
        submittedAt: new Date().toISOString(),
        
        // NEW: Shipping information
        shippingAddress: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          street: formData.address,
          apartment: formData.apartment,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          country: formData.country
        },
        shippingMethod: {
          serviceName: selectedShippingRate.serviceName,
          serviceCode: selectedShippingRate.serviceCode,
          carrier: selectedShippingRate.carrier,
          carrierCode: selectedShippingRate.carrierCode,
          cost: selectedShippingRate.totalCost,
          estimatedDeliveryDays: selectedShippingRate.estimatedDeliveryDays,
          estimatedDeliveryDate: selectedShippingRate.estimatedDeliveryDate
        },
        customerNotes: formData.notes
      }

      const response = await orderReviewApiService.submitForReview(orderData)

      if (response.success) {
        // Clear cart
        await clear()
        localStorage.removeItem('mayhem_cart_v1')

        showSuccess(
          `Your order has been submitted for review. Order ID: ${response.data?.orderReviewId}`,
          'Order Submitted'
        )

        // Navigate to orders page
        navigate('/my-orders', {
          state: {
            submissionSuccess: true,
            orderReviewId: response.data?.orderReviewId
          }
        })
      } else {
        showError(response.message || 'Failed to submit order', 'Submission Failed')
      }
    } catch (error) {
      console.error('Submit for review error:', error)
      showError('An error occurred while submitting your order', 'Error')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!cartItems || cartItems.length === 0) {
    return null // Will redirect via useEffect
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => navigate('/cart')}
            className="flex items-center mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Cart
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
          <p className="text-gray-600 mt-2">Complete your order</p>
        </div>

        {/* Progress Indicator */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between max-w-md mx-auto">
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                currentStep >= 1 ? 'bg-accent text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                1
              </div>
              <p className="text-sm mt-2 font-medium">Shipping</p>
            </div>
            <div className={`flex-1 h-1 mx-4 ${
              currentStep >= 2 ? 'bg-accent' : 'bg-gray-200'
            }`} />
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                currentStep >= 2 ? 'bg-accent text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
              <p className="text-sm mt-2 font-medium">Review</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Step 1: Shipping Address */}
            {currentStep === 1 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-accent" />
                  Shipping Address
                </h2>

                <div className="space-y-6">
                  {/* Personal Info */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name *
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                        placeholder="Doe"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                        placeholder="john@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone *
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                      placeholder="123 Main St"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Apartment, suite, etc. (optional)
                    </label>
                    <input
                      type="text"
                      name="apartment"
                      value={formData.apartment}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                      placeholder="Apt 4B"
                    />
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                        placeholder="New York"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State *
                      </label>
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        maxLength={2}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent uppercase"
                        placeholder="NY"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ZIP Code *
                      </label>
                      <input
                        type="text"
                        name="zipCode"
                        value={formData.zipCode}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                        placeholder="10001"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Instructions (optional)
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                      placeholder="Leave at front door..."
                    />
                  </div>

                  <Button
                    onClick={handleCalculateShipping}
                    disabled={isCalculatingShipping}
                    className="w-full"
                    size="lg"
                  >
                    {isCalculatingShipping ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Calculating Shipping...
                      </>
                    ) : (
                      <>
                        Continue to Shipping Options
                        <Truck className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Review Order */}
            {currentStep === 2 && (
              <div className="space-y-6">
                {/* Shipping Method Selection */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                      <Truck className="w-5 h-5 mr-2 text-accent" />
                      Select Shipping Method
                    </h2>
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="text-sm text-accent hover:underline"
                    >
                      Change Address
                    </button>
                  </div>

                  <div className="space-y-3">
                    {shippingRates.map((rate, index) => (
                      <div
                        key={index}
                        onClick={() => setSelectedShippingRate(rate)}
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                          selectedShippingRate?.serviceCode === rate.serviceCode
                            ? 'border-accent bg-accent/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center">
                              <h3 className="font-medium text-gray-900">{rate.serviceName}</h3>
                              {index === 0 && (
                                <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                                  Recommended
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {rate.carrier} • {rate.estimatedDeliveryDays ? `${rate.estimatedDeliveryDays} business days` : 'Standard delivery'}
                            </p>
                          </div>
                          <div className="flex items-center">
                            <span className="text-lg font-semibold text-gray-900 mr-4">
                              ${rate.totalCost.toFixed(2)}
                            </span>
                            <div className={`w-5 h-5 rounded-full border-2 ${
                              selectedShippingRate?.serviceCode === rate.serviceCode
                                ? 'border-accent bg-accent'
                                : 'border-gray-300'
                            }`}>
                              {selectedShippingRate?.serviceCode === rate.serviceCode && (
                                <div className="w-full h-full rounded-full bg-white scale-50"></div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Summary */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                    <Package className="w-5 h-5 mr-2 text-accent" />
                    Order Items
                  </h2>

                  <div className="space-y-4 mb-6">
                    {cartItems.map((item: any, index: number) => {
                      const numericId = typeof item.productId === 'string' && !isNaN(Number(item.productId)) 
                        ? Number(item.productId) 
                        : item.productId
                      const product = products.find(p => p.id === item.productId || p.id === numericId)
                      const itemPrice = calculateItemPrice(item)

                      return (
                        <div key={index} className="flex items-start space-x-4 pb-4 border-b">
                          <img
                            src={item.customization?.mockup || product?.image || ''}
                            alt={product?.title || ''}
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{product?.title}</h3>
                            <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                            {item.customization && (
                              <p className="text-xs text-accent mt-1">Customized</p>
                            )}
                          </div>
                          <p className="font-semibold text-gray-900">
                            ${(itemPrice * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      )
                    })}
                  </div>

                  <Button
                    onClick={handleSubmitForReview}
                    disabled={isSubmitting}
                    className="w-full"
                    size="lg"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit for Review
                        <CheckCircle className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-gray-600 text-center mt-4">
                    Your order will be reviewed by our team before processing
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">${calculateSubtotal().toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">
                    {currentStep === 2 && selectedShippingRate
                      ? `$${selectedShippingRate.totalCost.toFixed(2)}`
                      : 'Calculated next step'}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax (8%)</span>
                  <span className="font-medium">${calculateTax().toFixed(2)}</span>
                </div>

                <div className="border-t pt-3 flex justify-between">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="text-xl font-bold text-accent">
                    ${calculateTotal().toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
```

### Step 3: Update Cart Component (10 minutes)

Update `frontend/src/ecommerce/routes/Cart.tsx`:

```typescript
// Around line 680-695, replace the "Submit for Review" button with:

<Button 
  size="lg" 
  className="w-full bg-blue-600 hover:bg-blue-700"
  onClick={() => navigate('/checkout', { 
    state: { 
      cartItems: enriched,
      source: 'cart' 
    }
  })}
>
  Proceed to Checkout
</Button>

<div className="text-center mt-4">
  <span className="text-xs sm:text-sm text-gray-600">
    You'll see shipping costs in checkout before review
  </span>
</div>
```

### Step 4: Update Backend Controller (15 minutes)

Update `backend/src/controllers/orderReviewController.ts`:

```typescript
export const submitForReview = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id
    const { 
      items, 
      subtotal, 
      shipping, 
      tax, 
      total, 
      shippingAddress,    // NEW
      shippingMethod,     // NEW
      customerNotes       // NEW
    } = req.body

    // Validate user authentication
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      })
      return
    }

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Order items are required',
        code: 'MISSING_ITEMS'
      })
      return
    }

    // NEW: Validate shipping information
    if (!shippingAddress || !shippingAddress.street || !shippingAddress.city) {
      res.status(400).json({
        success: false,
        message: 'Complete shipping address is required',
        code: 'MISSING_SHIPPING_ADDRESS'
      })
      return
    }

    if (!shippingMethod || shipping === undefined || shipping < 0) {
      res.status(400).json({
        success: false,
        message: 'Valid shipping method must be selected',
        code: 'MISSING_SHIPPING_METHOD'
      })
      return
    }

    // Validate amounts
    if (subtotal === undefined || tax === undefined || total === undefined) {
      res.status(400).json({
        success: false,
        message: 'Order amounts are required',
        code: 'MISSING_AMOUNTS'
      })
      return
    }

    // Create order review with shipping information
    const orderReview = await OrderReview.create({
      userId,
      orderData: { items },
      subtotal,
      shipping, // Now has actual calculated value
      tax,
      total, // Now includes shipping
      status: 'pending',
      submittedAt: new Date(),
      shippingAddress, // NEW: Store customer's shipping address
      shippingMethod, // NEW: Store selected shipping method details
      customerNotes, // NEW: Store any delivery instructions
      orderNumber: `MC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`
    })

    logger.info('Order review submitted with shipping info', {
      userId,
      orderReviewId: orderReview.id,
      shipping: shipping,
      shippingCarrier: shippingMethod.carrier,
      total
    })

    res.status(201).json({
      success: true,
      data: {
        orderReviewId: orderReview.id,
        orderNumber: orderReview.orderNumber,
        total: orderReview.total,
        shipping: orderReview.shipping,
        shippingMethod: orderReview.shippingMethod,
        estimatedDelivery: shippingMethod.estimatedDeliveryDate || 
          (shippingMethod.estimatedDeliveryDays 
            ? new Date(Date.now() + shippingMethod.estimatedDeliveryDays * 24 * 60 * 60 * 1000).toISOString()
            : null)
      },
      message: 'Order submitted for review successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    logger.error('Submit for review error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to submit order for review',
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}
```

### Step 5: Update Routes (5 minutes)

Add new route in `frontend/src/main.tsx` or your routing file:

```typescript
import UnifiedCheckout from './ecommerce/routes/UnifiedCheckout'

// Add route
<Route path="/checkout" element={<UnifiedCheckout />} />
```

### Step 6: Test the Flow (15 minutes)

1. **Add items to cart**
```
Navigate to /products → Add items → View cart
```

2. **Start checkout**
```
Click "Proceed to Checkout" → Should go to /checkout
```

3. **Enter shipping address**
```
Fill in all address fields → Click "Continue to Shipping Options"
Should see loading spinner → Then see 3-5 shipping options
```

4. **Select shipping & submit**
```
Select a shipping method → Click "Submit for Review"
Should clear cart → Navigate to /my-orders with success message
```

5. **Verify in admin**
```
Login as admin → View order reviews → Should see:
- Complete shipping address
- Selected shipping method
- Accurate total with shipping included
```

---

## Common Issues & Solutions

### Issue: "Shipping rates not loading"
**Solution:** Check ShipEngine API key in `.env`:
```env
SHIPENGINE_API_KEY=your_key_here
SHIPENGINE_ORIGIN_STREET=128 Persimmon Dr
SHIPENGINE_ORIGIN_CITY=Newark
SHIPENGINE_ORIGIN_STATE=OH
SHIPENGINE_ORIGIN_ZIP=43055
```

### Issue: "Address validation fails"
**Solution:** Ensure ZIP code and state are valid US values:
```typescript
// Add validation
const zipRegex = /^\d{5}(-\d{4})?$/
const stateRegex = /^[A-Z]{2}$/
```

### Issue: "Total calculation mismatch"
**Solution:** Verify all price calculations include customizations:
```typescript
console.log({
  subtotal: calculateSubtotal(),
  shipping: calculateShipping(),
  tax: calculateTax(),
  total: calculateTotal()
})
```

---

## Next Steps

After basic implementation works:

1. **Add address validation** (Week 2)
2. **Implement product weights** (Week 2)
3. **Add shipping insurance option** (Week 3)
4. **Create admin shipping override** (Week 3)
5. **Add international shipping** (Week 4)

---

## Support

If you encounter issues:
1. Check browser console for errors
2. Review backend logs in `backend/logs/combined.log`
3. Test ShipEngine connection: `GET /api/v1/shipping/shipengine/status`
4. Refer to `CODE_REVIEW_SHIPPING_INTEGRATION.md` for detailed analysis

---

**Estimated Total Implementation Time: 1.5 hours**

Good luck! 🚀

