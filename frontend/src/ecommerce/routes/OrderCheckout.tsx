/**
 * Order Checkout Component
 * Handles checkout for specific orders (not cart-based)
 */

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  CreditCard, 
  Smartphone, 
  MapPin, 
  User, 
  Phone, 
  Mail,
  Lock,
  CheckCircle,
  Shield,
  Truck,
  AlertCircle
} from 'lucide-react'
import { products } from '../../data/products'
import Button from '../../components/Button'
// StripePaymentForm removed for hosted Checkout flow
import PayPalButton from '../../components/PayPalButton'
import { paymentService, PaymentData, PaymentResult } from '../../shared/paymentService'
import { paymentsApiService } from '../../shared/paymentsApiService'

interface OrderItem {
  id: string
  productId: string
  productName: string
  productImage: string
  quantity: number
  price: number
  customization?: any
}

interface Order {
  id: string | number
  items: OrderItem[]
  total: number
  status: string
}

export default function OrderCheckout() {
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal' | 'google'>('stripe')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null)

  // Form states
  const [formData, setFormData] = useState({
    // Personal Info
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    
    // Address
    address: '',
    apartment: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
    
    // Payment
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardName: '',
    
    // Additional
    notes: '',
    saveInfo: false
  })

  const steps = [
    { number: 1, title: 'Shipping', description: 'Delivery information' },
    { number: 2, title: 'Payment', description: 'Payment method' },
    { number: 3, title: 'Review', description: 'Order summary' }
  ]

  // Load order from sessionStorage on component mount
  useEffect(() => {
    const orderData = sessionStorage.getItem('checkoutOrder')
    console.log('🔍 Loading order data from sessionStorage:', orderData)
    
    if (orderData) {
      try {
        const parsedOrder = JSON.parse(orderData)
        console.log('✅ Parsed order data:', parsedOrder)
        setOrder(parsedOrder)
      } catch (error) {
        console.error('❌ Error parsing order data:', error)
        navigate('/my-orders')
      }
    } else {
      console.log('❌ No order data found in sessionStorage')
      // No order data found, redirect to orders page
      navigate('/my-orders')
    }
  }, [navigate])

  // Handle Stripe Checkout success/cancel redirects
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get('success')
    const canceled = urlParams.get('canceled')
    const orderId = urlParams.get('orderId')

    if (success === 'true' && orderId) {
      // Payment successful
      setPaymentResult({
        success: true,
        paymentId: `stripe_${Date.now()}`,
        payerEmail: formData.email
      })
      setIsComplete(true)
      sessionStorage.removeItem('checkoutOrder')
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (canceled === 'true') {
      // Payment canceled
      setPaymentError('Payment was canceled. You can try again or choose a different payment method.')
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [formData.email])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  // Helper function to calculate item price including customization costs
  const calculateItemPrice = (item: OrderItem) => {
    const product = products.find(p => p.id === item.productId)
    if (!product) return item.price // Use stored price if product not found
    
    let itemPrice = product.price
    
    // Add customization costs if present
    if (item.customization) {
      const { selectedStyles } = item.customization
      if (selectedStyles.coverage) itemPrice += selectedStyles.coverage.price
      if (selectedStyles.material) itemPrice += selectedStyles.material.price
      if (selectedStyles.border) itemPrice += selectedStyles.border.price
      if (selectedStyles.backing) itemPrice += selectedStyles.backing.price
      if (selectedStyles.cutting) itemPrice += selectedStyles.cutting.price
      
      selectedStyles.threads?.forEach((thread: any) => itemPrice += thread.price)
      selectedStyles.upgrades?.forEach((upgrade: any) => itemPrice += upgrade.price)
    }
    
    return itemPrice
  }

  const calculateSubtotal = () => {
    return order.items.reduce((total, item) => {
      const itemPrice = calculateItemPrice(item)
      return total + (itemPrice * item.quantity)
    }, 0)
  }

  const calculateTax = () => calculateSubtotal() * 0.08 // 8% tax
  const calculateShipping = () => calculateSubtotal() > 50 ? 0 : 9.99 // Free shipping over $50
  const calculateTotal = () => calculateSubtotal() + calculateTax() + calculateShipping()

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.firstName && formData.lastName && formData.email && 
               formData.phone && formData.address && formData.city && 
               formData.state && formData.zipCode
      case 2:
        return true // Both Stripe and PayPal are ready to proceed
      case 3:
        return true
      default:
        return false
    }
  }

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handlePlaceOrder = async () => {
    setIsProcessing(true)
    setPaymentError(null)
    
    try {
      if (paymentMethod === 'stripe') {
        // Use Stripe Checkout for Stripe payments
        await handleStripeCheckout()
      } else {
        // Use existing payment service for PayPal
        const paymentData: PaymentData = {
          amount: Math.round(calculateTotal() * 100), // Convert to cents
          currency: 'usd',
          customerEmail: formData.email,
          customerName: `${formData.firstName} ${formData.lastName}`,
          description: `Order ${order.id} - ${order.items.length} item(s)`,
          billingAddress: {
            line1: formData.address,
            line2: formData.apartment,
            city: formData.city,
            state: formData.state,
            postal_code: formData.zipCode,
            country: formData.country
          },
          items: order.items.map((item) => {
            const product = products.find(p => p.id === item.productId)
            const itemPrice = calculateItemPrice(item)
            
            return {
              name: product?.name || item.productName,
              quantity: item.quantity,
              price: itemPrice,
              currency: 'usd'
            }
          }),
          metadata: {
            orderId: order.id,
            customerPhone: formData.phone,
            notes: formData.notes
          }
        }

        // Process payment
        const result = await paymentService.processPayment(paymentMethod, paymentData)
        setPaymentResult(result)

        if (result.success) {
          setIsComplete(true)
          // Clear sessionStorage after successful payment
          sessionStorage.removeItem('checkoutOrder')
        } else {
          setPaymentError(result.error || 'Payment failed')
        }
      }
    } catch (error) {
      console.error('Payment processing error:', error)
      setPaymentError(error instanceof Error ? error.message : 'Payment processing failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleStripeCheckout = async () => {
    try {
      // Build Stripe Checkout line items
      const lineItems = order.items.map((item) => {
        const product = products.find(p => p.id === item.productId)
        const itemPrice = calculateItemPrice(item)
        return {
          price_data: {
            currency: 'usd',
            product_data: {
              name: product?.title || item.productName,
              description: `Qty ${item.quantity}`,
              images: product?.image ? [product.image] : undefined,
            },
            unit_amount: Math.round(itemPrice * 100),
          },
          quantity: item.quantity,
        }
      })

      const successUrl = `${window.location.origin}/order-checkout?success=true&orderId=${order.id}`
      const cancelUrl = `${window.location.origin}/order-checkout?canceled=true`

      const response = await paymentsApiService.createCheckoutSession({
        lineItems,
        successUrl,
        cancelUrl,
        metadata: {
          orderId: String(order.id),
          customerEmail: formData.email,
        },
      })

      if (response.success && response.data?.url) {
        // Redirect to hosted Stripe Checkout
        window.location.href = response.data.url
        return
      }

      setPaymentError(response.message || 'Failed to create checkout session')
    } catch (error) {
      console.error('Stripe payment error:', error)
      setPaymentError('Failed to process payment. Please try again.')
    }
  }

  const handlePaymentSuccess = (result: PaymentResult) => {
    setPaymentResult(result)
    if (result.success) {
      handlePlaceOrder()
    } else {
      setPaymentError(result.error || 'Payment failed')
    }
  }

  const handlePaymentError = (error: any) => {
    console.error('Payment error:', error)
    setPaymentError(error instanceof Error ? error.message : 'Payment failed')
  }

  // Show loading state while order is being loaded
  if (!order) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </main>
    )
  }

  if (isComplete) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-gray-600 mb-6">
            Your payment has been processed successfully. 
            Your order will be processed shortly.
          </p>
          <div className="space-y-2 text-sm text-gray-500">
            <p>Order ID: {order.id}</p>
            <p>Payment Method: {paymentMethod === 'stripe' ? 'Credit Card' : 
                               paymentMethod === 'paypal' ? 'PayPal' : 
                               paymentMethod === 'google' ? 'Google Pay' : 'Credit Card'}</p>
            <p>Payment Status: {paymentResult?.success ? 'Completed' : 'Failed'}</p>
            {paymentResult?.paymentId && (
              <p>Transaction ID: {paymentResult.paymentId}</p>
            )}
            <p>Estimated delivery: 3-5 business days</p>
          </div>
          <div className="mt-6">
            <Button onClick={() => navigate('/my-orders')}>
              View My Orders
            </Button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => navigate('/my-orders')}
            className="flex items-center mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
          <p className="text-gray-600 mt-2">Complete your order for Order #{order.id}</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Steps */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                {steps.map((step, index) => (
                  <div key={step.number} className="flex items-center">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                      currentStep >= step.number
                        ? 'bg-accent text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {step.number}
                    </div>
                    <div className="ml-3">
                      <p className={`text-sm font-medium ${
                        currentStep >= step.number ? 'text-accent' : 'text-gray-600'
                      }`}>
                        {step.title}
                      </p>
                      <p className="text-xs text-gray-500">{step.description}</p>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`w-16 h-0.5 mx-4 ${
                        currentStep > step.number ? 'bg-accent' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Step 1: Shipping Information */}
            {currentStep === 1 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-accent" />
                  Shipping Information
                </h2>
                
                <div className="space-y-6">
                  {/* Personal Information */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
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
                          placeholder="Enter first name"
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
                          placeholder="Enter last name"
                        />
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                          placeholder="Enter email address"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                          placeholder="Enter phone number"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Address Information */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Delivery Address</h3>
                    <div className="space-y-4">
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
                          placeholder="Enter street address"
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
                          placeholder="Apartment, suite, etc."
                        />
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
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
                            placeholder="Enter city"
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                            placeholder="Enter state"
                          />
                        </div>
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
                          placeholder="Enter ZIP code"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Country
                        </label>
                        <select
                          name="country"
                          value={formData.country}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                        >
                          <option value="United States">United States</option>
                          <option value="Canada">Canada</option>
                          <option value="United Kingdom">United Kingdom</option>
                          <option value="Australia">Australia</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Additional Notes */}
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
                      placeholder="Any special delivery instructions..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Payment Method */}
            {currentStep === 2 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2 text-accent" />
                  Payment Method
                </h2>
                
                <div className="space-y-6">
                  {/* Payment Options */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Choose Payment Method</h3>
                    
                    {/* Stripe Checkout */}
                    <div 
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        paymentMethod === 'stripe' 
                          ? 'border-accent bg-accent/5' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setPaymentMethod('stripe')}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
                            <CreditCard className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">Credit/Debit Card</h4>
                            <p className="text-sm text-gray-600">Secure checkout with Stripe</p>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 ${
                          paymentMethod === 'stripe' 
                            ? 'border-accent bg-accent' 
                            : 'border-gray-300'
                        }`}>
                          {paymentMethod === 'stripe' && (
                            <div className="w-full h-full rounded-full bg-white scale-50"></div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* PayPal */}
                    <div 
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        paymentMethod === 'paypal' 
                          ? 'border-accent bg-accent/5' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setPaymentMethod('paypal')}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mr-4">
                            <span className="text-white font-bold text-sm">PP</span>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">PayPal</h4>
                            <p className="text-sm text-gray-600">Pay with your PayPal account</p>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 ${
                          paymentMethod === 'paypal' 
                            ? 'border-accent bg-accent' 
                            : 'border-gray-300'
                        }`}>
                          {paymentMethod === 'paypal' && (
                            <div className="w-full h-full rounded-full bg-white scale-50"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hosted Checkout notice for Stripe */}
                  {paymentMethod === 'stripe' && (
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Stripe Checkout</h3>
                      <p className="text-sm text-gray-600">
                        You’ll securely complete your payment on Stripe’s hosted checkout page after the review step.
                      </p>
                    </div>
                  )}

                  {paymentMethod === 'paypal' && (
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">PayPal Payment</h3>
                      <PayPalButton
                        paymentData={{
                          amount: calculateTotal(),
                          currency: 'usd',
                          description: `Order ${order.id} - ${order.items.length} item(s)`,
                          customerEmail: formData.email,
                          customerName: `${formData.firstName} ${formData.lastName}`,
                          items: order.items.map((item) => {
                            const product = products.find(p => p.id === item.productId)
                            const itemPrice = calculateItemPrice(item)
                            
                            return {
                              name: product?.name || item.productName,
                              quantity: item.quantity,
                              price: itemPrice,
                              currency: 'usd'
                            }
                          })
                        }}
                        onSuccess={handlePaymentSuccess}
                        onError={handlePaymentError}
                        onCancel={(data) => console.log('PayPal payment cancelled:', data)}
                        disabled={isProcessing}
                        style={{
                          layout: 'vertical',
                          color: 'blue',
                          shape: 'rect',
                          label: 'paypal',
                          height: 50
                        }}
                      />
                    </div>
                  )}

                  {/* Payment Error Display */}
                  {paymentError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                        <div>
                          <h4 className="font-medium text-red-900">Payment Error</h4>
                          <p className="text-sm text-red-700 mt-1">{paymentError}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Security Notice */}
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <Shield className="w-5 h-5 text-purple-600 mt-0.5 mr-3" />
                      <div>
                        <h4 className="font-medium text-purple-900">Secure Payment</h4>
                        <p className="text-sm text-purple-700 mt-1">
                          Your payment information is encrypted and secure. We never store your card details.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Order Review */}
            {currentStep === 3 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-accent" />
                  Order Review
                </h2>
                
                <div className="space-y-6">
                  {/* Order Summary */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h3>
                    <div className="space-y-4">
                      {console.log('🔍 Order items for summary:', order?.items)}
                      {order?.items?.length > 0 ? (
                        order.items.map((item, index) => {
                          const product = products.find(p => p.id === item.productId)
                          console.log('🔍 Item details:', { item, product })
                          if (!product) {
                            console.log('❌ Product not found for item:', item.productId)
                            return null
                          }
                          
                          // Calculate item price including customization costs
                          const itemPrice = calculateItemPrice(item)
                          
                          return (
                            <div key={index} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex items-start space-x-4">
                                <img
                                  src={product.image}
                                  alt={product.title}
                                  className="w-16 h-16 object-cover rounded-lg"
                                />
                                <div className="flex-1">
                                  <h4 className="font-medium text-gray-900">{product.title}</h4>
                                  <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                                  
                                  {item.customization && (
                                    <div className="mt-2 space-y-1">
                                      <p className="text-sm font-medium text-gray-700">Customization:</p>
                                      {item.customization.design && (
                                        <p className="text-xs text-gray-600">
                                          Design: {item.customization.design.name}
                                        </p>
                                      )}
                                      <p className="text-xs text-gray-600">
                                        Placement: {item.customization.placement}
                                      </p>
                                      <p className="text-xs text-gray-600">
                                        Size: {item.customization.size}
                                      </p>
                                      <p className="text-xs text-gray-600">
                                        Color: {item.customization.color}
                                      </p>
                                    </div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="font-medium text-gray-900">
                                    ${(itemPrice * item.quantity).toFixed(2)}
                                  </p>
                                  {item.customization && (
                                    <p className="text-xs text-gray-500">
                                      ${itemPrice.toFixed(2)} each
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-500">No items found in order</p>
                          <p className="text-sm text-gray-400 mt-2">
                            Order ID: {order?.id || 'Unknown'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Terms and Conditions */}
                  <div className="border-t pt-6">
                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        id="terms"
                        className="mt-1 mr-3"
                        required
                      />
                      <label htmlFor="terms" className="text-sm text-gray-600">
                        I agree to the{' '}
                        <a href="#" className="text-accent hover:underline">Terms of Service</a>
                        {' '}and{' '}
                        <a href="#" className="text-accent hover:underline">Privacy Policy</a>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={handlePrev}
                disabled={currentStep === 1}
              >
                Previous
              </Button>
              
              {currentStep < 3 ? (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed()}
                >
                  Continue
                  <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                </Button>
              ) : (
                <Button
                  onClick={handlePlaceOrder}
                  disabled={isProcessing}
                  className="bg-accent hover:bg-accent/90"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Complete Payment
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Total</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">${calculateSubtotal().toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-medium">${calculateTax().toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">
                    {calculateShipping() === 0 ? 'Free' : `$${calculateShipping().toFixed(2)}`}
                  </span>
                </div>
                
                {calculateShipping() > 0 && (
                  <div className="text-sm text-accent">
                    Add ${(50 - calculateSubtotal()).toFixed(2)} more for free shipping
                  </div>
                )}
                
                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span>${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Security Badges */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <div className="flex items-center">
                    <Shield className="w-4 h-4 mr-1" />
                    <span>Secure</span>
                  </div>
                  <div className="flex items-center">
                    <Truck className="w-4 h-4 mr-1" />
                    <span>Fast Delivery</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
