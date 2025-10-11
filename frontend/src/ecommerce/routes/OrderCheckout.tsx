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
import { MaterialPricingService } from '../../shared/materialPricingService'
import Button from '../../components/Button'
// Payment integrations now use hosted checkout flows (Stripe/PayPal)
import { PaymentResult } from '../../shared/paymentService'
import { paymentsApiService } from '../../shared/paymentsApiService'
import { calculateShippingRates, ShippingRate } from '../../shared/shippingApiService'
import { useAuth } from '../context/AuthContext'

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
  const [termsAccepted, setTermsAccepted] = useState(false)
  
  // Shipping rates state
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([])
  const [selectedShippingRate, setSelectedShippingRate] = useState<ShippingRate | null>(null)
  const [isLoadingShipping, setIsLoadingShipping] = useState(false)
  const [shippingError, setShippingError] = useState<string | null>(null)

  // Get user info from auth context
  const { user: authUser } = useAuth()

  // Form states
  const [formData, setFormData] = useState({
    // Personal Info - Pre-filled with user data but editable
    firstName: authUser?.firstName || '',
    lastName: authUser?.lastName || '',
    email: authUser?.email || '',
    phone: authUser?.phone || '',
    
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
        
        // Also load saved form data if returning from PayPal
        const savedFormData = sessionStorage.getItem('checkoutFormData')
        if (savedFormData) {
          try {
            const parsedFormData = JSON.parse(savedFormData)
            setFormData(parsedFormData)
            console.log('✅ Restored form data from sessionStorage')
          } catch (error) {
            console.error('❌ Error parsing form data:', error)
          }
        }
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

  // Handle Stripe/PayPal Checkout success/cancel redirects
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get('success')
    const canceled = urlParams.get('canceled')
    const paypalSuccess = urlParams.get('paypal_success')
    const paypalCanceled = urlParams.get('paypal_canceled')
    const orderId = urlParams.get('orderId')
    const paypalToken = urlParams.get('token')

    // Handle Stripe success
    if (success === 'true' && orderId) {
      setPaymentMethod('stripe')
      setPaymentResult({
        success: true,
        paymentId: `stripe_${Date.now()}`,
        payerEmail: formData.email
      })
      setIsComplete(true)
      sessionStorage.removeItem('checkoutOrder')
      sessionStorage.removeItem('checkoutFormData')
      window.history.replaceState({}, document.title, window.location.pathname)
    } 
    // Handle Stripe cancel
    else if (canceled === 'true') {
      setPaymentError('Payment was canceled. You can try again or choose a different payment method.')
      window.history.replaceState({}, document.title, window.location.pathname)
    }
    // Handle PayPal success
    else if (paypalSuccess === 'true' && paypalToken) {
      setPaymentMethod('paypal')
      handlePayPalReturn(paypalToken, formData.email)
    }
    // Handle PayPal cancel
    else if (paypalCanceled === 'true') {
      setPaymentError('PayPal payment was canceled. You can try again or choose a different payment method.')
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  // Helper function to calculate item price including customization costs
  const calculateItemPrice = (item: OrderItem) => {
    // Handle both numeric and string product IDs
    const numericId = typeof item.productId === 'string' && !isNaN(Number(item.productId)) ? Number(item.productId) : item.productId;
    const product = products.find(p => {
      // Check both string and numeric ID matches
      return p.id === item.productId || p.id === numericId;
    });
    if (!product) return item.price // Use stored price if product not found
    
    let itemPrice = product.price
    
    // Add customization costs if present
    if (item.customization) {
      // Handle multiple designs (new format)
      if (item.customization.designs && item.customization.designs.length > 0) {
        item.customization.designs.forEach((design: any) => {
          // Calculate material costs for this design if dimensions are available
          if (design.dimensions && design.dimensions.width > 0 && design.dimensions.height > 0) {
            try {
              const materialCosts = MaterialPricingService.calculateMaterialCosts({
                patchWidth: design.dimensions.width,
                patchHeight: design.dimensions.height
              });
              itemPrice += materialCosts.totalCost;
            } catch (error) {
              console.warn('Failed to calculate material costs for design:', design.name, error);
            }
          }
          
          if (design.selectedStyles) {
            const { selectedStyles } = design;
            // All selected styles are embroidery options, not material costs
            if (selectedStyles.coverage) itemPrice += selectedStyles.coverage.price;
            if (selectedStyles.material) itemPrice += selectedStyles.material.price;
            if (selectedStyles.border) itemPrice += selectedStyles.border.price;
            if (selectedStyles.backing) itemPrice += selectedStyles.backing.price;
            if (selectedStyles.cutting) itemPrice += selectedStyles.cutting.price;
            
            selectedStyles.threads?.forEach((thread: any) => itemPrice += thread.price);
            selectedStyles.upgrades?.forEach((upgrade: any) => itemPrice += upgrade.price);
          }
        });
      } else {
        // Legacy single design format
        const { selectedStyles } = item.customization;
        if (selectedStyles.coverage) itemPrice += selectedStyles.coverage.price;
        if (selectedStyles.material) itemPrice += selectedStyles.material.price;
        if (selectedStyles.border) itemPrice += selectedStyles.border.price;
        if (selectedStyles.backing) itemPrice += selectedStyles.backing.price;
        if (selectedStyles.cutting) itemPrice += selectedStyles.cutting.price;
        
        selectedStyles.threads?.forEach((thread: any) => itemPrice += thread.price);
        selectedStyles.upgrades?.forEach((upgrade: any) => itemPrice += upgrade.price);
      }
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
  const calculateShipping = () => {
    // Use selected shipping rate if available, otherwise use default
    if (selectedShippingRate) {
      return selectedShippingRate.totalCost
    }
    // Fallback: Free shipping over $50, otherwise $9.99
    return calculateSubtotal() > 50 ? 0 : 9.99
  }
  const calculateTotal = () => calculateSubtotal() + calculateTax() + calculateShipping()
  
  // Fetch shipping rates when address is complete
  const fetchShippingRates = async () => {
    if (!formData.address || !formData.city || !formData.state || !formData.zipCode) {
      return
    }
    
    if (!order || !order.items) {
      return
    }
    
    setIsLoadingShipping(true)
    setShippingError(null)
    
    try {
      const response = await calculateShippingRates(
        {
          street1: formData.address,
          street2: formData.apartment,
          city: formData.city,
          state: formData.state,
          postalCode: formData.zipCode,
          country: 'US',
        },
        order.items.map(item => ({
          id: item.id,
          name: item.productName,
          quantity: item.quantity,
          price: calculateItemPrice(item),
        }))
      )
      
      if (response.success && response.data) {
        setShippingRates(response.data.rates)
        setSelectedShippingRate(response.data.recommendedRate)
        
        if (response.data.warning) {
          setShippingError(response.data.warning)
        }
        
        console.log('✅ Shipping rates fetched:', response.data.rates)
      } else {
        setShippingError('Unable to fetch shipping rates. Using estimated rates.')
        // Set default fallback rate
        const fallbackRate = {
          serviceName: 'Standard Shipping',
          serviceCode: 'standard',
          shipmentCost: 9.99,
          otherCost: 0,
          totalCost: 9.99,
          estimatedDeliveryDays: 5,
          carrier: 'USPS',
        }
        setShippingRates([fallbackRate])
        setSelectedShippingRate(fallbackRate)
      }
    } catch (error) {
      console.error('Error fetching shipping rates:', error)
      setShippingError('Unable to fetch shipping rates. Using estimated rates.')
      // Set default fallback rate
      const fallbackRate = {
        serviceName: 'Standard Shipping',
        serviceCode: 'standard',
        shipmentCost: 9.99,
        otherCost: 0,
        totalCost: 9.99,
        estimatedDeliveryDays: 5,
        carrier: 'USPS',
      }
      setShippingRates([fallbackRate])
      setSelectedShippingRate(fallbackRate)
    } finally {
      setIsLoadingShipping(false)
    }
  }

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

  const handleNext = async () => {
    if (currentStep === 1) {
      // Fetch shipping rates when moving from shipping to payment step
      await fetchShippingRates()
    }
    
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
        // Use Stripe Checkout (hosted, with redirect)
        await handleStripeCheckout()
      } else if (paymentMethod === 'paypal') {
        // Use PayPal Checkout (hosted, with redirect)
        await handlePayPalCheckout()
      } else {
        setPaymentError('Payment method not supported')
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
        // Handle both numeric and string product IDs
        const numericId = typeof item.productId === 'string' && !isNaN(Number(item.productId)) ? Number(item.productId) : item.productId;
        const product = products.find(p => {
          // Check both string and numeric ID matches
          return p.id === item.productId || p.id === numericId;
        });
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
        customerInfo: {
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          phone: formData.phone,
        },
        shippingAddress: {
          line1: formData.address,
          line2: formData.apartment,
          city: formData.city,
          state: formData.state,
          postal_code: formData.zipCode,
          country: 'US',
        },
        metadata: {
          orderId: String(order.id),
          customerEmail: formData.email,
        },
      })

      if (response.success && response.data?.url) {
        // Save form data to sessionStorage before redirect
        sessionStorage.setItem('checkoutFormData', JSON.stringify(formData))
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

  const handlePayPalCheckout = async () => {
    try {
      // Build PayPal order items
      const items = order.items.map((item) => {
        const numericId = typeof item.productId === 'string' && !isNaN(Number(item.productId)) ? Number(item.productId) : item.productId;
        const product = products.find(p => {
          return p.id === item.productId || p.id === numericId;
        });
        const itemPrice = calculateItemPrice(item)
        return {
          name: product?.title || item.productName,
          quantity: item.quantity,
          unitAmount: itemPrice,
          currency: 'usd'
        }
      })

      const response = await paymentsApiService.createPayPalOrder({
        amount: calculateTotal(),
        currency: 'usd',
        description: `Order ${order.id} - ${order.items.length} item(s)`,
        items,
        customerInfo: {
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          phone: formData.phone,
        },
        shippingAddress: {
          line1: formData.address,
          line2: formData.apartment,
          city: formData.city,
          state: formData.state,
          postal_code: formData.zipCode,
          country: 'US',
        },
        metadata: {
          orderId: String(order.id),
          customerEmail: formData.email,
          customerName: `${formData.firstName} ${formData.lastName}`,
        },
        returnUrl: `${window.location.origin}/order-checkout?paypal_success=true&orderId=${order.id}`,
        cancelUrl: `${window.location.origin}/order-checkout?paypal_canceled=true`,
      })

      if (response.success && response.data?.approvalUrl) {
        // Save form data to sessionStorage before redirect
        sessionStorage.setItem('checkoutFormData', JSON.stringify(formData))
        // Redirect to PayPal for approval
        window.location.href = response.data.approvalUrl
        return
      }

      setPaymentError(response.message || 'Failed to create PayPal order')
    } catch (error) {
      console.error('PayPal payment error:', error)
      setPaymentError('Failed to process payment. Please try again.')
    }
  }

  const handlePayPalReturn = async (paypalToken: string, customerEmail: string) => {
    try {
      setIsProcessing(true)
      console.log('Capturing PayPal payment for token:', paypalToken)

      // Capture the PayPal order
      const response = await paymentsApiService.capturePayPalOrder({
        orderId: paypalToken,
        metadata: {
          customerEmail: formData.email,
          customerName: `${formData.firstName} ${formData.lastName}`,
        }
      })

      if (response.success) {
        setPaymentResult({
          success: true,
          paymentId: response.data?.id || paypalToken,
          payerEmail: customerEmail
        })
        setIsComplete(true)
        sessionStorage.removeItem('checkoutOrder')
        sessionStorage.removeItem('checkoutFormData')
        window.history.replaceState({}, document.title, window.location.pathname)
      } else {
        setPaymentError(response.message || 'Failed to capture PayPal payment')
      }
    } catch (error) {
      console.error('PayPal capture error:', error)
      setPaymentError('Failed to complete PayPal payment. Please contact support.')
    } finally {
      setIsProcessing(false)
    }
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
                        <div className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                          🇺🇸 United States
                        </div>
                        <input type="hidden" name="country" value="United States" />
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
                      placeholder="Any special delivery instructions for the carrier..."
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
                  {/* Shipping Options */}
                  <div className="space-y-4 pb-6 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                      <Truck className="w-5 h-5 mr-2 text-accent" />
                      Shipping Options
                    </h3>
                    
                    {isLoadingShipping ? (
                      <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                        <p className="text-sm text-gray-600 mt-2">Calculating shipping rates...</p>
                      </div>
                    ) : shippingError ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start">
                        <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-yellow-800">{shippingError}</p>
                        </div>
                      </div>
                    ) : shippingRates.length > 0 ? (
                      <div className="space-y-3">
                        {shippingRates.map((rate, index) => (
                          <div
                            key={index}
                            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                              selectedShippingRate?.serviceCode === rate.serviceCode
                                ? 'border-accent bg-accent/5'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => setSelectedShippingRate(rate)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center">
                                  <h4 className="font-medium text-gray-900">{rate.serviceName}</h4>
                                  {index === 0 && (
                                    <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                                      Recommended
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                  {rate.carrier} • {rate.estimatedDeliveryDays ? `${rate.estimatedDeliveryDays}-day delivery` : 'Standard delivery'}
                                </p>
                              </div>
                              <div className="flex items-center ml-4">
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
                    ) : (
                      <div className="text-center py-6 text-gray-500">
                        <Truck className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No shipping rates available</p>
                      </div>
                    )}
                  </div>

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
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <svg className="h-6 w-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M20.067 8.478c.492.88.556 2.014.3 3.327-.74 3.806-3.276 5.12-6.514 5.12h-.5a.805.805 0 0 0-.794.68l-.04.22-.63 3.993-.032.17a.804.804 0 0 1-.794.679H7.72a.483.483 0 0 1-.477-.558L7.418 21h1.518l.95-6.02h1.385c4.678 0 7.75-2.203 8.796-6.502z"/>
                              <path d="M2.778 21.813a.483.483 0 0 1-.478-.558l2.001-12.689A.965.965 0 0 1 5.25 7.75h6.326c1.663 0 2.982.29 3.926 1.036.9.71 1.372 1.728 1.372 2.955 0 .308-.03.623-.088.944-.74 3.806-3.276 5.12-6.514 5.12h-.5a.805.805 0 0 0-.794.68l-.04.22-.63 3.993-.032.17a.804.804 0 0 1-.794.679H2.778z"/>
                            </svg>
                          </div>
                          <div className="ml-3 flex-1">
                            <p className="text-sm text-blue-800">
                              Click "Place Order" below to continue to PayPal's secure checkout.
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                              You'll be redirected to PayPal to complete your payment.
                            </p>
                          </div>
                        </div>
                      </div>
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
                  Review Your Order
                </h2>
                
                <div className="space-y-6">
                  {/* Shipping Information Review */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Shipping Information</h3>
                      <button
                        onClick={() => setCurrentStep(1)}
                        className="text-sm text-accent hover:text-accent/80 font-medium flex items-center"
                      >
                        Edit
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <div className="flex items-start">
                        <User className="w-4 h-4 text-gray-500 mt-0.5 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {formData.firstName} {formData.lastName}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <Mail className="w-4 h-4 text-gray-500 mt-0.5 mr-2" />
                        <p className="text-sm text-gray-700">{formData.email}</p>
                      </div>
                      <div className="flex items-start">
                        <Phone className="w-4 h-4 text-gray-500 mt-0.5 mr-2" />
                        <p className="text-sm text-gray-700">{formData.phone || 'Not provided'}</p>
                      </div>
                      <div className="flex items-start">
                        <MapPin className="w-4 h-4 text-gray-500 mt-0.5 mr-2" />
                        <div>
                          <p className="text-sm text-gray-700">{formData.address}</p>
                          {formData.apartment && (
                            <p className="text-sm text-gray-700">{formData.apartment}</p>
                          )}
                          <p className="text-sm text-gray-700">
                            {formData.city}, {formData.state} {formData.zipCode}
                          </p>
                          <p className="text-sm text-gray-700">{formData.country}</p>
                        </div>
                      </div>
                      {formData.notes && (
                        <div className="flex items-start pt-2 border-t border-gray-200">
                          <AlertCircle className="w-4 h-4 text-gray-500 mt-0.5 mr-2" />
                          <div>
                            <p className="text-xs font-medium text-gray-600">Delivery Instructions:</p>
                            <p className="text-sm text-gray-700">{formData.notes}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment Method Review */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Payment Method</h3>
                      <button
                        onClick={() => setCurrentStep(2)}
                        className="text-sm text-accent hover:text-accent/80 font-medium flex items-center"
                      >
                        Edit
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center">
                        <CreditCard className="w-5 h-5 text-gray-500 mr-2" />
                        <p className="text-sm font-medium text-gray-900">
                          {paymentMethod === 'stripe' && 'Credit Card (via Stripe)'}
                          {paymentMethod === 'paypal' && 'PayPal'}
                          {paymentMethod === 'google' && 'Google Pay'}
                        </p>
                      </div>
                      <p className="text-xs text-gray-600 mt-2">
                        {paymentMethod === 'stripe' && 'You will be redirected to Stripe\'s secure checkout to complete payment.'}
                        {paymentMethod === 'paypal' && 'You will be redirected to PayPal to complete payment.'}
                        {paymentMethod === 'google' && 'You will be redirected to Google Pay to complete payment.'}
                      </p>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Order Items</h3>
                    <div className="space-y-4">
                      {order?.items?.length > 0 ? (
                        order.items.map((item, index) => {
                          console.log('📦 Order item:', item);
                          
                          // Use item's embedded product data first, then try to find in products array
                          const displayImage = item.productImage || item.customization?.mockup || (item.product?.images?.[0]) || 'https://via.placeholder.com/100';
                          const displayName = item.productName || (item.product?.title) || `Product #${item.productId}`;
                          const itemPrice = item.price || calculateItemPrice(item);
                          
                          console.log('📦 Display data:', { displayImage, displayName, itemPrice });
                          
                          return (
                            <div key={index} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex items-start space-x-4">
                                <img
                                  src={displayImage}
                                  alt={displayName}
                                  className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                                />
                                <div className="flex-1">
                                  <h4 className="font-medium text-gray-900">{displayName}</h4>
                                  <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                                  
                                  {item.customization && (
                                    <div className="mt-2 p-2 bg-purple-50 rounded border border-purple-100">
                                      <p className="text-xs font-medium text-purple-900 mb-1">✨ Customized</p>
                                      <div className="space-y-0.5 text-xs text-gray-600">
                                        {item.customization.designs?.length > 0 && (
                                          <p>• {item.customization.designs.length} design(s)</p>
                                        )}
                                        {item.customization.selectedStyles && (
                                          <>
                                            {item.customization.selectedStyles.color && (
                                              <p>• Color: {item.customization.selectedStyles.color}</p>
                                            )}
                                            {item.customization.selectedStyles.size && (
                                              <p>• Size: {item.customization.selectedStyles.size}</p>
                                            )}
                                          </>
                                        )}
                                        {item.customization.placement && (
                                          <p>• Placement: {item.customization.placement}</p>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-gray-900 text-lg">
                                    ${(itemPrice * item.quantity).toFixed(2)}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    ${itemPrice.toFixed(2)} × {item.quantity}
                                    </p>
                                </div>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                          <p className="text-gray-500 font-medium">No items found in order</p>
                          <p className="text-sm text-gray-400 mt-2">
                            Please go back and add items to your cart
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Order Summary Totals */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="font-medium text-gray-900">${calculateSubtotal().toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <div className="flex flex-col">
                          <span className="text-gray-600">Shipping</span>
                          {selectedShippingRate && (
                            <span className="text-xs text-gray-500 mt-0.5">
                              {selectedShippingRate.serviceName}
                              {selectedShippingRate.estimatedDeliveryDays && ` (${selectedShippingRate.estimatedDeliveryDays} days)`}
                            </span>
                          )}
                        </div>
                        <span className="font-medium text-gray-900">
                          {calculateShipping() === 0 ? 'FREE' : `$${calculateShipping().toFixed(2)}`}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tax (8%)</span>
                        <span className="font-medium text-gray-900">${calculateTax().toFixed(2)}</span>
                      </div>
                      <div className="border-t border-gray-300 pt-3 flex justify-between">
                        <span className="text-base font-semibold text-gray-900">Total</span>
                        <span className="text-xl font-bold text-accent">${calculateTotal().toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Terms and Conditions */}
                  <div className="border-t pt-6">
                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        id="terms"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="mt-1 mr-3 w-4 h-4 text-accent border-gray-300 rounded focus:ring-accent"
                        required
                      />
                      <label htmlFor="terms" className="text-sm text-gray-600 cursor-pointer">
                        I agree to the{' '}
                        <a href="#" className="text-accent hover:underline" onClick={(e) => e.stopPropagation()}>
                          Terms of Service
                        </a>
                        {' '}and{' '}
                        <a href="#" className="text-accent hover:underline" onClick={(e) => e.stopPropagation()}>
                          Privacy Policy
                        </a>
                      </label>
                    </div>
                    {!termsAccepted && (
                      <p className="text-xs text-red-600 mt-2">
                        You must accept the terms and conditions to place your order
                      </p>
                    )}
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
                  disabled={isProcessing || !termsAccepted}
                  className="bg-accent hover:bg-accent/90"
                  title={!termsAccepted ? 'Please accept the terms and conditions' : ''}
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
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium text-gray-900">${calculateSubtotal().toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <div className="flex flex-col">
                    <span className="text-gray-600">Shipping</span>
                    {selectedShippingRate && currentStep >= 2 && (
                      <span className="text-xs text-gray-500 mt-0.5">
                        {selectedShippingRate.serviceName}
                      </span>
                    )}
                  </div>
                  <span className="font-medium text-gray-900">
                    {currentStep >= 2 ? (
                      calculateShipping() === 0 ? 'FREE' : `$${calculateShipping().toFixed(2)}`
                    ) : (
                      <span className="text-xs text-gray-500">Calculated at checkout</span>
                    )}
                  </span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax (8%)</span>
                  <span className="font-medium text-gray-900">${calculateTax().toFixed(2)}</span>
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-semibold">
                    <span className="text-gray-900">Total</span>
                    <span className="text-accent">
                      {currentStep >= 2 ? `$${calculateTotal().toFixed(2)}` : `$${(calculateSubtotal() + calculateTax()).toFixed(2)}+`}
                    </span>
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
