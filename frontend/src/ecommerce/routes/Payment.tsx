import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  CreditCard, 
  Smartphone, 
  CheckCircle,
  Shield,
  Lock,
  Truck,
  AlertCircle,
  MapPin,
  Package,
  DollarSign
} from 'lucide-react'
import Button from '../../components/Button'
import { orderReviewApiService } from '../../shared/orderReviewApiService'
import { useAlertModal } from '../context/AlertModalContext'
import { useAuth } from '../context/AuthContext'
import { products } from '../../data/products'
import { MaterialPricingService } from '../../shared/materialPricingService'
import { paymentsApiService } from '../../shared/paymentsApiService'
import { PaymentResult } from '../../shared/paymentService'

// Interface for the order data loaded from database
interface OrderData {
  id: number
  orderNumber: string
  items: any[]
  shippingAddress: {
    firstName: string
    lastName: string
    email: string
    phone: string
    address: string
    apartment?: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  shippingMethod: {
    serviceName: string
    carrier: string
    cost: number
    estimatedDeliveryDays?: number
  }
  subtotal: number
  shipping: number
  tax: number
  total: number
}

export default function Payment() {
  const navigate = useNavigate()
  const location = useLocation()
  const { showError, showSuccess } = useAlertModal()
  const { user, isLoggedIn } = useAuth()
  
  // State for loaded order data
  const [orderData, setOrderData] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  
  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal' | null>(null)
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null)

  // Get order ID from URL or location state
  const orderId = new URLSearchParams(location.search).get('orderId') || location.state?.orderId
  
  // Debug: Log component mount and URL params
  console.log('💳 Payment component mounted/updated:', {
    orderId,
    fullURL: window.location.href,
    search: window.location.search,
    locationState: location.state
  })

  // Backend products state (for pricing calculations)
  const [backendProducts, setBackendProducts] = useState<any[]>([])

  // Load backend products for accurate pricing
  useEffect(() => {
    const loadBackendProducts = async () => {
      try {
        const response = await fetch(`${(import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:5001/api/v1'}/products`, {
          credentials: 'include'
        })
        const data = await response.json()
        if (data.success && data.data) {
          setBackendProducts(data.data)
          console.log('📦 Loaded backend products:', data.data.length)
        }
      } catch (error) {
        console.error('Error loading backend products:', error)
      }
    }
    loadBackendProducts()
  }, [])

  // Helper function to get pricing breakdown (matches MyOrders implementation)
  const getPricingBreakdown = (item: any): {
    baseProductPrice: number
    embroideryPrice: number
    embroideryOptionsPrice: number
    totalPrice: number
  } => {
    // Use stored pricing breakdown if available
    if (item.pricingBreakdown && typeof item.pricingBreakdown === 'object') {
      let storedBasePrice = Number(item.pricingBreakdown.baseProductPrice) || 0
      const storedEmbroideryPrice = Number(item.pricingBreakdown.embroideryPrice) || 0
      const storedOptionsPrice = Number(item.pricingBreakdown.embroideryOptionsPrice) || 0
      const storedTotalPrice = Number(item.pricingBreakdown.totalPrice) || 0
      
      // If base product price is 0 but we have embroidery costs, calculate it
      let baseProductPrice = storedBasePrice
      if (baseProductPrice === 0 && (storedEmbroideryPrice > 0 || storedOptionsPrice > 0)) {
        baseProductPrice = storedTotalPrice - storedEmbroideryPrice - storedOptionsPrice
        
        // If still not positive, fallback to catalog lookup
        if (!(baseProductPrice > 0)) {
          const numericId = typeof item.productId === 'string' && !isNaN(Number(item.productId)) ? Number(item.productId) : item.productId
          let catalogProduct = backendProducts.find((p: any) => p.id === numericId)
          
          if (!catalogProduct) {
            catalogProduct = products.find((p: any) => p.id === item.productId || p.id === numericId)
          }
          
          if (catalogProduct?.price) {
            baseProductPrice = Number(catalogProduct.price) || 0
          }
        }
      }
      
      // Recalculate total price with the corrected base price
      const correctTotalPrice = baseProductPrice + storedEmbroideryPrice + storedOptionsPrice
      
      return {
        baseProductPrice,
        embroideryPrice: storedEmbroideryPrice,
        embroideryOptionsPrice: storedOptionsPrice,
        totalPrice: correctTotalPrice
      }
    }

    // Fallback to item.price
    return {
      baseProductPrice: 0,
      embroideryPrice: 0,
      embroideryOptionsPrice: 0,
      totalPrice: Number(item.price) || 0
    }
  }

  // Handle Stripe/PayPal return redirects
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get('success')
    const canceled = urlParams.get('canceled')
    const paypalToken = urlParams.get('token')
    const payerId = urlParams.get('PayerID')

    console.log('🔍 Payment return detected:', { 
      success, 
      canceled, 
      paypalToken, 
      payerId,
      orderData: orderData ? 'loaded' : 'not loaded',
      loading 
    })

    // Handle Stripe success
    if (success === 'true' && orderId) {
      console.log('✅ Stripe payment success')
      navigate('/my-orders', {
        state: {
          paymentSuccess: true,
          paymentMethod: 'stripe',
          orderId: orderId
        }
      })
    }
    // Handle Stripe cancel
    else if (canceled === 'true') {
      showError('Payment was canceled. You can try again.')
      window.history.replaceState({}, document.title, window.location.pathname)
    }
    // Handle PayPal success - ONLY after order data is loaded
    else if (paypalToken && payerId) {
      console.log('🔍 PayPal return detected, checking orderData...')
      
      if (!orderData && loading) {
        console.log('⏳ Waiting for order data to load...')
        return // Wait for orderData to load
      }
      
      if (orderData && !loading) {
        console.log('✅ PayPal payment success, capturing payment...')
        handlePayPalReturn(paypalToken)
      } else if (!orderData && !loading) {
        console.error('❌ Order data failed to load')
        showError('Failed to load order information. Please contact support.')
      }
    }
  }, [orderId, orderData, loading, navigate, showError])

  // Load order data from database on mount
  useEffect(() => {
    const loadOrderData = async () => {
      if (!orderId) {
        showError('No order ID provided')
        navigate('/my-orders')
        return
      }

      try {
        setLoading(true)
        
        // Fetch order details from the backend
        const response = await orderReviewApiService.getUserReviewOrders()
        
        if (response.success && response.data) {
          // Find the specific order by ID
          const order = response.data.find((o: any) => o.id === Number(orderId))
          
          if (!order) {
            showError('Order not found')
            navigate('/my-orders')
            return
          }

          // Check if order is approved and ready for payment
          if (order.status !== 'pending-payment' && order.status !== 'approved-processing') {
            showError('This order is not ready for payment')
            navigate('/my-orders')
            return
          }

          // Parse order data
          const orderItems = Array.isArray(order.order_data) 
            ? order.order_data 
            : JSON.parse(order.order_data as string)

          // Parse shipping address
          let shippingAddr = typeof order.shipping_address === 'string'
            ? JSON.parse(order.shipping_address)
            : order.shipping_address
          
          console.log('🔍 Raw shipping address from DB:', shippingAddr)
          console.log('🔍 Address field names:', shippingAddr ? Object.keys(shippingAddr) : 'null')
          
          // Normalize address field names (handle different formats)
          if (shippingAddr) {
            shippingAddr = {
              firstName: shippingAddr.firstName || shippingAddr.first_name || '',
              lastName: shippingAddr.lastName || shippingAddr.last_name || '',
              email: shippingAddr.email || '',
              phone: shippingAddr.phone || '',
              address: shippingAddr.address || shippingAddr.street || shippingAddr.line1 || '',
              apartment: shippingAddr.apartment || shippingAddr.line2 || '',
              city: shippingAddr.city || '',
              state: shippingAddr.state || '',
              zipCode: shippingAddr.zipCode || shippingAddr.zip_code || shippingAddr.postal_code || '',
              country: shippingAddr.country || 'US'
            }
            
            console.log('📍 Normalized shipping address:', shippingAddr)
            console.log('📍 Address field value:', shippingAddr.address)
            
            // Validate critical address fields
            if (!shippingAddr.address || !shippingAddr.city || !shippingAddr.state || !shippingAddr.zipCode) {
              console.error('⚠️ Incomplete shipping address detected:', {
                hasAddress: !!shippingAddr.address,
                hasCity: !!shippingAddr.city,
                hasState: !!shippingAddr.state,
                hasZipCode: !!shippingAddr.zipCode
              })
              showError('Shipping address is incomplete. Please contact support.')
              navigate('/my-orders')
              return
            }
          }

          // Parse shipping method
          const shippingMethod = typeof (order as any).shipping_method === 'string'
            ? JSON.parse((order as any).shipping_method)
            : (order as any).shipping_method

          // Calculate subtotal from items using getPricingBreakdown for accuracy
          const subtotal = orderItems.reduce((total: number, item: any) => {
            const pricing = getPricingBreakdown(item)
            return total + (pricing.totalPrice * (item.quantity || 1))
          }, 0)

          setOrderData({
            id: order.id,
            orderNumber: `MC-${order.id}`,
            items: orderItems,
            shippingAddress: shippingAddr,
            shippingMethod: shippingMethod,
            subtotal: subtotal,
            shipping: Number(order.shipping) || 0,
            tax: Number(order.tax) || 0,
            total: Number(order.total) || (subtotal + Number(order.shipping || 0) + Number(order.tax || 0))
          })
          
          console.log('✅ Order data loaded for payment:', {
            orderId: order.id,
            status: order.status,
            total: order.total,
            itemsCount: orderItems.length
          })
        }
      } catch (error) {
        console.error('Error loading order data:', error)
        showError('Failed to load order details')
        navigate('/my-orders')
      } finally {
        setLoading(false)
      }
    }

    loadOrderData()
  }, [orderId, navigate, showError])

  // Validate payment method
  const canProceed = () => {
    if (currentStep === 1) {
      // Both Stripe and PayPal are ready to proceed (hosted checkouts)
      return paymentMethod !== null
    }
    if (currentStep === 2) {
      // Ready to pay
      return true
    }
    return false
  }

  // Handle next step
  const handleNext = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1)
    }
  }

  // Handle previous step
  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Calculate correct items subtotal (recalculate with accurate pricing)
  const getCorrectSubtotal = (order: OrderData): number => {
    const itemsSubtotal = order.items.reduce((total, item) => {
      const pricing = getPricingBreakdown(item)
      return total + (pricing.totalPrice * item.quantity)
    }, 0)
    return itemsSubtotal
  }

  // Calculate correct order total (recalculate items subtotal with accurate pricing)
  const getCorrectOrderTotal = (order: OrderData): number => {
    // Recalculate items subtotal using getPricingBreakdown
    const itemsSubtotal = getCorrectSubtotal(order)
    
    // Add shipping and tax to get the correct total
    const correctTotal = itemsSubtotal + order.shipping + order.tax
    
    console.log('💰 Order total calculation:', {
      itemsSubtotal: itemsSubtotal.toFixed(2),
      shipping: order.shipping.toFixed(2),
      tax: order.tax.toFixed(2),
      correctTotal: correctTotal.toFixed(2),
      storedTotal: order.total.toFixed(2)
    })
    
    return correctTotal
  }

  // Handle Stripe Checkout (hosted flow with redirect)
  const handleStripeCheckout = async () => {
    if (!orderData) return

    try {
      setIsProcessing(true)
      
      // Build Stripe Checkout line items
      const lineItems = orderData.items.map((item) => {
        const product = findProductById(item.productId)
        // Use getPricingBreakdown for accurate pricing
        const pricing = getPricingBreakdown(item)
        const itemPrice = pricing.totalPrice
        
        return {
          price_data: {
            currency: 'usd',
            product_data: {
              name: product?.title || item.productName || 'Custom Product',
              description: `Qty ${item.quantity}`,
              images: product?.image ? [product.image] : undefined,
            },
            unit_amount: Math.round(itemPrice * 100), // Stripe expects amount in cents
          },
          quantity: item.quantity,
        }
      })

      const successUrl = `${window.location.origin}/payment?success=true&orderId=${orderData.id}`
      const cancelUrl = `${window.location.origin}/payment?canceled=true&orderId=${orderData.id}`
      
      console.log('💳 Starting Stripe checkout with address:', {
        orderId: orderData.id,
        orderNumber: orderData.orderNumber,
        shippingAddress: orderData.shippingAddress
      })

      const response = await paymentsApiService.createCheckoutSession({
        lineItems,
        successUrl,
        cancelUrl,
        customerInfo: {
          name: `${orderData.shippingAddress.firstName} ${orderData.shippingAddress.lastName}`,
          email: orderData.shippingAddress.email,
          phone: orderData.shippingAddress.phone,
        },
        shippingAddress: {
          line1: orderData.shippingAddress.address,
          line2: orderData.shippingAddress.apartment || '',
          city: orderData.shippingAddress.city,
          state: orderData.shippingAddress.state,
          postal_code: orderData.shippingAddress.zipCode,
          country: 'US',
        },
        shippingCost: orderData.shipping,
        taxAmount: orderData.tax,
        metadata: {
          orderId: String(orderData.id),
          customerEmail: orderData.shippingAddress.email,
          subtotal: String(getCorrectSubtotal(orderData).toFixed(2)),
          shipping: String(orderData.shipping.toFixed(2)),
          tax: String(orderData.tax.toFixed(2)),
          total: String(getCorrectOrderTotal(orderData).toFixed(2)),
        },
      })

      if (response.success && response.data?.url) {
        // Redirect to hosted Stripe Checkout
        window.location.href = response.data.url
        return
      }

      showError(response.message || 'Failed to create checkout session')
      setIsProcessing(false)
    } catch (error) {
      console.error('Stripe payment error:', error)
      showError('Failed to process payment. Please try again.')
      setIsProcessing(false)
    }
  }

  // Handle PayPal Checkout (hosted flow with redirect)
  const handlePayPalCheckout = async () => {
    if (!orderData) return

    try {
      setIsProcessing(true)
      
      console.log('💳 Starting PayPal checkout with order data:', {
        orderId: orderData.id,
        orderNumber: orderData.orderNumber,
        shippingAddress: orderData.shippingAddress
      })
      
      // Build PayPal order items
      const items = orderData.items.map((item) => {
        const product = findProductById(item.productId)
        // Use getPricingBreakdown for accurate pricing
        const pricing = getPricingBreakdown(item)
        const itemPrice = pricing.totalPrice
        
        return {
          name: product?.title || item.productName || 'Custom Product',
          quantity: item.quantity,
          unitAmount: itemPrice,
          currency: 'usd'
        }
      })
      
      const paypalPayload = {
        amount: getCorrectOrderTotal(orderData),
        currency: 'usd',
        description: `Order ${orderData.orderNumber} - ${orderData.items.length} item(s)`,
        items,
        customerInfo: {
          name: `${orderData.shippingAddress.firstName} ${orderData.shippingAddress.lastName}`,
          email: orderData.shippingAddress.email,
          phone: orderData.shippingAddress.phone,
        },
        shippingAddress: {
          line1: orderData.shippingAddress.address,
          line2: orderData.shippingAddress.apartment || '',
          city: orderData.shippingAddress.city,
          state: orderData.shippingAddress.state,
          postal_code: orderData.shippingAddress.zipCode,
          country: 'US',
        },
        metadata: {
          orderId: String(orderData.id),
          customerEmail: orderData.shippingAddress.email,
          subtotal: String(getCorrectSubtotal(orderData).toFixed(2)),
          shipping: String(orderData.shipping.toFixed(2)),
          tax: String(orderData.tax.toFixed(2)),
          total: String(getCorrectOrderTotal(orderData).toFixed(2)),
        },
        returnUrl: `${window.location.origin}/payment?token=PAYPAL_TOKEN&orderId=${orderData.id}`,
        cancelUrl: `${window.location.origin}/payment?paypal_canceled=true&orderId=${orderData.id}`,
      }
      
      console.log('📦 PayPal payload being sent:', {
        amount: paypalPayload.amount,
        shippingAddress: paypalPayload.shippingAddress,
        customerInfo: paypalPayload.customerInfo,
        itemsCount: paypalPayload.items.length
      })

      const response = await paymentsApiService.createPayPalOrder(paypalPayload)
      
      console.log('📦 PayPal API response:', response)

      if (response.success && response.data?.approvalUrl) {
        console.log('✅ PayPal order created:', {
          paypalOrderId: response.data.id,
          approvalUrl: response.data.approvalUrl,
          ourOrderId: orderData.id
        })
        
        // Store PayPal order ID and flags to bypass auth check when returning from PayPal
        // The PayPal order ID is needed to capture the payment
        // The token in the return URL is different from the order ID
        sessionStorage.setItem('paypal_order_id', response.data.id) // ✅ Store actual PayPal order ID
        sessionStorage.setItem('paypal_return_expected', String(orderData.id))
        sessionStorage.setItem('paypal_return_timestamp', String(Date.now()))
        console.log('💾 Saved PayPal order ID and return flags:', {
          paypalOrderId: response.data.id,
          ourOrderId: orderData.id
        })
        
        // Redirect to PayPal for approval
        window.location.href = response.data.approvalUrl
        return
      }

      // Show detailed error messages if validation errors exist
      console.error('❌ PayPal order creation failed:', {
        success: response.success,
        errors: response.errors,
        message: response.message
      })
      
      if (response.errors && Array.isArray(response.errors) && response.errors.length > 0) {
        const errorMessage = response.errors.join('\n')
        showError(errorMessage)
      } else {
        showError(response.message || 'Failed to create PayPal order')
      }
      setIsProcessing(false)
    } catch (error: any) {
      console.error('PayPal payment error:', error)
      // Check if error response has validation errors
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        const errorMessage = error.response.data.errors.join('\n')
        showError(errorMessage)
      } else {
        showError('Failed to process payment. Please try again.')
      }
      setIsProcessing(false)
    }
  }

  // Handle PayPal return after user approves payment
  const handlePayPalReturn = async (paypalToken: string) => {
    try {
      setIsProcessing(true)
      
      // Get the actual PayPal order ID from sessionStorage
      // The token in the URL is NOT the order ID - we need the ID we saved before redirect
      const paypalOrderId = sessionStorage.getItem('paypal_order_id')
      
      console.log('🔄 Capturing PayPal payment...', { 
        urlToken: paypalToken, 
        paypalOrderId: paypalOrderId,
        orderId: orderData?.id,
        orderNumber: orderData?.orderNumber,
        total: getCorrectOrderTotal(orderData!)
      })

      if (!paypalOrderId) {
        console.error('❌ PayPal order ID not found in sessionStorage')
        showError('PayPal order information missing. Please try again.')
        navigate('/my-orders')
        return
      }

      if (!orderData) {
        console.error('❌ Order data not available for PayPal capture')
        showError('Order information not loaded')
        navigate('/my-orders')
        return
      }

      // Capture the PayPal order using the actual PayPal order ID
      console.log('📤 Sending capture request to backend with PayPal order ID:', paypalOrderId)
      const response = await paymentsApiService.capturePayPalOrder({
        orderId: paypalOrderId, // ✅ Use the actual PayPal order ID, not the token
        metadata: {
          orderId: String(orderData.id),
          customerEmail: orderData.shippingAddress.email,
          total: String(getCorrectOrderTotal(orderData).toFixed(2)),
          firstName: orderData.shippingAddress.firstName,
          lastName: orderData.shippingAddress.lastName,
          phone: orderData.shippingAddress.phone,
          street: orderData.shippingAddress.address,
          apartment: orderData.shippingAddress.apartment || '',
          city: orderData.shippingAddress.city,
          state: orderData.shippingAddress.state,
          zipCode: orderData.shippingAddress.zipCode,
          country: orderData.shippingAddress.country || 'US',
        }
      })

      console.log('📦 PayPal capture response:', response)

      if (response.success) {
        console.log('✅ PayPal payment captured successfully, redirecting to My Orders...')
        
        // Clear PayPal return flags and order ID after successful capture
        sessionStorage.removeItem('paypal_order_id')
        sessionStorage.removeItem('paypal_return_expected')
        sessionStorage.removeItem('paypal_return_timestamp')
        console.log('🧹 Cleared PayPal sessionStorage data')
        
        navigate('/my-orders', {
          state: {
            paymentSuccess: true,
            paymentMethod: 'paypal',
            orderId: orderData.id
          }
        })
      } else {
        console.error('❌ PayPal capture failed:', response.message)
        showError(response.message || 'Failed to capture PayPal payment')
        // Don't navigate away on error - let user retry
      }
    } catch (error: any) {
      console.error('❌ PayPal capture error:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data
      })
      showError('Failed to complete PayPal payment. Please contact support.')
      // Don't navigate away on error - let user retry
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle payment processing based on selected method
  const handleProcessPayment = async () => {
    if (!orderData) return

    setIsProcessing(true)

    try {
      if (paymentMethod === 'stripe') {
        await handleStripeCheckout()
      } else if (paymentMethod === 'paypal') {
        await handlePayPalCheckout()
      } else {
        showError('Please select a payment method')
        setIsProcessing(false)
      }
    } catch (error) {
      console.error('Payment processing error:', error)
      showError('Payment failed. Please try again.')
      setIsProcessing(false)
    }
  }

  // Helper function to find product by ID with comprehensive matching (matches MyOrders.tsx logic)
  const findProductById = (productId: string | number) => {
    // First try to find in backend products by numeric ID (priority #1)
    const numericId = typeof productId === 'string' && !isNaN(Number(productId)) ? Number(productId) : productId
    let product = backendProducts.find((p: any) => p.id === numericId)
    
    // If not found in backend products, try frontend products as fallback
    if (!product) {
      product = products.find((p: any) => p.id === productId || p.id === numericId)
    }
    
    // If still not found and productId is numeric, try mayhem-XXX format
    if (!product && typeof productId === 'string' && !isNaN(Number(productId))) {
      const paddedId = `mayhem-${productId.padStart(3, '0')}`
      product = products.find((p: any) => p.id === paddedId)
    }
    
    // If still not found and productId is mayhem-XXX, try numeric format
    if (!product && typeof productId === 'string' && productId.startsWith('mayhem-')) {
      const numId = parseInt(productId.replace('mayhem-', ''), 10)
      product = products.find((p: any) => p.id === numId || p.id === numId.toString())
    }
    
    return product
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    )
  }

  if (!orderData) {
    return null
  }

  const steps = [
    { number: 1, title: 'Payment Method', description: 'Choose how to pay' },
    { number: 2, title: 'Review & Pay', description: 'Complete your order' }
  ]

  return (
    <main className="min-h-screen bg-gray-50 py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Complete Payment</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            Order {orderData.orderNumber} - Ready for Payment
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <div className="flex-1 flex items-center">
                  <div className="flex items-center">
                    <div
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                        currentStep >= step.number
                          ? 'bg-accent text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {currentStep > step.number ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        step.number
                      )}
                    </div>
                    <div className="ml-3 hidden sm:block">
                      <p className={`text-sm font-medium ${currentStep >= step.number ? 'text-accent' : 'text-gray-600'}`}>
                        {step.title}
                      </p>
                      <p className="text-xs text-gray-500">{step.description}</p>
                    </div>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 sm:mx-4 transition-colors ${currentStep > step.number ? 'bg-accent' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Select Payment Method */}
            {currentStep === 1 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2 text-accent" />
                  Select Payment Method
                </h2>

                <div className="space-y-4">
                  {/* Stripe Payment Option */}
                  <button
                    onClick={() => setPaymentMethod('stripe')}
                    className={`w-full p-4 rounded-lg border-2 transition-all ${
                      paymentMethod === 'stripe'
                        ? 'border-accent bg-accent/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <CreditCard className={`w-6 h-6 ${paymentMethod === 'stripe' ? 'text-accent' : 'text-gray-600'}`} />
                        <div className="text-left">
                          <p className="font-medium text-gray-900">Credit / Debit Card</p>
                          <p className="text-sm text-gray-600">Secure checkout powered by Stripe</p>
                        </div>
                      </div>
                      {paymentMethod === 'stripe' && (
                        <CheckCircle className="w-6 h-6 text-accent" />
                      )}
                    </div>
                  </button>

                  {/* PayPal Option */}
                  <button
                    onClick={() => setPaymentMethod('paypal')}
                    className={`w-full p-4 rounded-lg border-2 transition-all ${
                      paymentMethod === 'paypal'
                        ? 'border-accent bg-accent/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Smartphone className={`w-6 h-6 ${paymentMethod === 'paypal' ? 'text-accent' : 'text-gray-600'}`} />
                        <div className="text-left">
                          <p className="font-medium text-gray-900">PayPal</p>
                          <p className="text-sm text-gray-600">Fast and secure PayPal checkout</p>
                        </div>
                      </div>
                      {paymentMethod === 'paypal' && (
                        <CheckCircle className="w-6 h-6 text-accent" />
                      )}
                    </div>
                  </button>
                </div>

                {/* Payment Info Notice */}
                {paymentMethod === 'stripe' && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start">
                      <Shield className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-blue-900 font-medium">Secure Stripe Checkout</p>
                        <p className="text-xs text-blue-700 mt-1">
                          You'll be redirected to Stripe's secure payment page to enter your card details.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === 'paypal' && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start">
                      <Shield className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-blue-900 font-medium">PayPal Checkout</p>
                        <p className="text-xs text-blue-700 mt-1">
                          You'll be redirected to PayPal to complete your payment securely.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="mt-6 flex justify-end">
                  <Button
                    onClick={handleNext}
                    disabled={!canProceed()}
                    className="w-full sm:w-auto"
                  >
                    Continue to Review
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Review & Pay */}
            {currentStep === 2 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-accent" />
                  Review Your Order
                </h2>

                <div className="space-y-6">
                  {/* Shipping Address */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                      <MapPin className="w-5 h-5 mr-2 text-accent" />
                      Shipping Address
                    </h3>
                    <div className="text-sm text-gray-700 space-y-1">
                      <p className="font-medium">
                        {orderData.shippingAddress.firstName} {orderData.shippingAddress.lastName}
                      </p>
                      <p>{orderData.shippingAddress.address}</p>
                      {orderData.shippingAddress.apartment && (
                        <p>{orderData.shippingAddress.apartment}</p>
                      )}
                      <p>
                        {orderData.shippingAddress.city}, {orderData.shippingAddress.state} {orderData.shippingAddress.zipCode}
                      </p>
                      <p>{orderData.shippingAddress.country}</p>
                      <p className="pt-2">Email: {orderData.shippingAddress.email}</p>
                      <p>Phone: {orderData.shippingAddress.phone}</p>
                    </div>
                  </div>

                  {/* Shipping Method */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                      <Truck className="w-5 h-5 mr-2 text-accent" />
                      Shipping Method
                    </h3>
                    <div className="text-sm text-gray-700">
                      <p className="font-medium">{orderData.shippingMethod.serviceName}</p>
                      <p className="text-gray-600">
                        {orderData.shippingMethod.carrier}
                        {orderData.shippingMethod.estimatedDeliveryDays && (
                          <span> • {orderData.shippingMethod.estimatedDeliveryDays} business days</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                      <Package className="w-5 h-5 mr-2 text-accent" />
                      Order Items ({orderData.items.length})
                    </h3>
                    <div className="space-y-3">
                      {orderData.items.map((item: any, index: number) => {
                        const product = findProductById(item.productId)
                        
                        if (!product) {
                          return (
                            <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-3">
                              <p className="text-red-800 text-sm">Product not found: {item.productId}</p>
                            </div>
                          )
                        }

                        // Use getPricingBreakdown for accurate pricing
                        const pricing = getPricingBreakdown(item)
                        const itemPrice = pricing.totalPrice

                        return (
                          <div key={index} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-start space-x-4">
                              <img
                                src={item.customization?.mockup || product.image}
                                alt={product.title}
                                className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                              />
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">{product.title}</h4>
                                <p className="text-sm text-gray-600 mt-1">Qty: {item.quantity}</p>
                                {item.customization && (
                                  <div className="mt-2 inline-flex items-center px-2 py-1 bg-accent/10 text-accent text-xs font-medium rounded-full">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Customized
                                    {item.customization.designs && (
                                      <span className="ml-1">• {item.customization.designs.length} design{item.customization.designs.length > 1 ? 's' : ''}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-accent">${(itemPrice * item.quantity).toFixed(2)}</p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Payment Method Selected */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                      <DollarSign className="w-5 h-5 mr-2 text-accent" />
                      Payment Method
                    </h3>
                    <div className="text-sm text-gray-700">
                      {paymentMethod === 'stripe' ? (
                        <div>
                          <p className="font-medium">Credit / Debit Card via Stripe</p>
                          <p className="text-gray-600">Secure payment processing</p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium">PayPal</p>
                          <p className="text-gray-600">Fast and secure PayPal checkout</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Security Notice */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <Shield className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-blue-900">Secure Payment</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Your payment information is encrypted and secure. We never store your complete card details.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex justify-between mt-6">
                  <Button variant="outline" onClick={handlePrev}>
                    Previous
                  </Button>
                  <Button
                    onClick={handleProcessPayment}
                    disabled={!canProceed() || isProcessing}
                    isLoading={isProcessing}
                    variant="add-to-cart"
                  >
                    {isProcessing ? 'Processing...' : `Pay $${getCorrectOrderTotal(orderData).toFixed(2)}`}
                    <Lock className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
              
              {/* Order Number */}
              <div className="mb-4 pb-4 border-b border-gray-200">
                <p className="text-sm text-gray-600">Order Number</p>
                <p className="text-lg font-semibold text-gray-900">{orderData.orderNumber}</p>
              </div>

              {/* Items List */}
              <div className="mb-4 space-y-3 max-h-64 overflow-y-auto">
                {orderData.items.map((item: any, index: number) => {
                  const product = findProductById(item.productId)
                  if (!product) return null
                  
                  // Use getPricingBreakdown for accurate pricing
                  const pricing = getPricingBreakdown(item)
                  const itemPrice = pricing.totalPrice
                  
                  return (
                    <div key={index} className="flex items-start space-x-3 pb-3 border-b border-gray-100 last:border-0">
                      <img
                        src={item.customization?.mockup || product.image}
                        alt={product.title}
                        className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-medium text-gray-900 line-clamp-2">{product.title}</h4>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-gray-600">Qty: {item.quantity}</span>
                          <span className="text-xs font-semibold text-accent">${(itemPrice * item.quantity).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Price Summary */}
              <div className="space-y-3 pt-3 border-t-2 border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">${getCorrectSubtotal(orderData).toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping:</span>
                  <span className="font-medium">${orderData.shipping.toFixed(2)}</span>
                </div>
                
                <div className="text-xs text-gray-500 ml-4">
                  {orderData.shippingMethod.serviceName} • {orderData.shippingMethod.carrier}
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax (8%):</span>
                  <span className="font-medium">${orderData.tax.toFixed(2)}</span>
                </div>
                
                <div className="border-t-2 border-gray-300 pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-gray-900">Order Total:</span>
                    <span className="text-accent">${getCorrectOrderTotal(orderData).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Security Badges */}
              <div className="mt-6 space-y-3">
                <div className="flex items-center text-xs text-gray-600">
                  <Shield className="w-4 h-4 mr-2" />
                  <span>256-bit SSL encryption</span>
                </div>
                <div className="flex items-center text-xs text-gray-600">
                  <Lock className="w-4 h-4 mr-2" />
                  <span>Secure payment processing</span>
                </div>
                <div className="flex items-center text-xs text-gray-600">
                  <Truck className="w-4 h-4 mr-2" />
                  <span>Fast & reliable delivery</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

