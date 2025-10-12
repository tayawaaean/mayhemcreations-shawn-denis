import React, { useState } from 'react'
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
import { useCart } from '../context/CartContext'
import { products } from '../../data/products'
import { MaterialPricingService } from '../../shared/materialPricingService'
import Button from '../../components/Button'
import StripePaymentForm from '../../components/StripePaymentForm'
import PayPalButton from '../../components/PayPalButton'
import { paymentService, PaymentData, PaymentResult } from '../../shared/paymentService'
import { calculateShippingRates, ShippingRate } from '../../shared/shippingApiService'

export default function Checkout() {
  const navigate = useNavigate()
  const { items, clear } = useCart()
  const [currentStep, setCurrentStep] = useState(1)
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal' | 'google'>('stripe')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null)
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false)
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([])
  const [selectedShippingRate, setSelectedShippingRate] = useState<ShippingRate | null>(null)
  const [shippingError, setShippingError] = useState<string | null>(null)

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  // Helper function to calculate item price including customization costs
  const calculateItemPrice = (item: any) => {
    // Handle both numeric and string product IDs
    const numericId = typeof item.productId === 'string' && !isNaN(Number(item.productId)) ? Number(item.productId) : item.productId;
    const product = products.find(p => {
      // Check both string and numeric ID matches
      return p.id === item.productId || p.id === numericId;
    });
    if (!product) return 0
    
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
    return items.reduce((total, item) => {
      const itemPrice = calculateItemPrice(item)
      return total + (itemPrice * item.quantity)
    }, 0)
  }

  const calculateTax = () => calculateSubtotal() * 0.08 // 8% tax
  const calculateShipping = () => {
    // Use selected shipping rate if available
    if (selectedShippingRate) return selectedShippingRate.totalCost
    // Otherwise use default
    return calculateSubtotal() > 50 ? 0 : 9.99
  }
  const calculateTotal = () => calculateSubtotal() + calculateTax() + calculateShipping()

  // Calculate shipping rates via backend API
  const calculateShippingRate = async () => {
    console.log('🚚 Starting shipping calculation...')
    setIsCalculatingShipping(true)
    setShippingError(null)
    setPaymentError(null)
    
    // Small delay to ensure state update is processed before API call
    await new Promise(resolve => setTimeout(resolve, 100))
    
    try {
      console.log('🚚 Calculating shipping rates via API... (state should be loading now)')
      
      // Prepare cart items for shipping calculation
      const cartItems = items.map((item) => {
        const numericId = typeof item.productId === 'string' && !isNaN(Number(item.productId)) ? Number(item.productId) : item.productId;
        const product = products.find(p => p.id === item.productId || p.id === numericId);
        const itemPrice = calculateItemPrice(item)
        
        return {
          id: item.productId.toString(),
          name: product?.name || `Product ${item.productId}`,
          quantity: item.quantity,
          price: itemPrice,
          weight: {
            value: 8, // Default 8 ounces per item
            units: 'ounces' as const
          }
        }
      })

      // Call backend API to get shipping rates
      const response = await calculateShippingRates(
        {
          street1: formData.address,
          street2: formData.apartment,
          city: formData.city,
          state: formData.state,
          postalCode: formData.zipCode,
          country: formData.country
        },
        cartItems
      )

      console.log('✅ Shipping rates response:', response)

      if (response.success && response.data) {
        setShippingRates(response.data.rates)
        
        // Auto-select recommended rate
        if (response.data.recommendedRate) {
          setSelectedShippingRate(response.data.recommendedRate)
          console.log('✅ Selected recommended shipping rate:', response.data.recommendedRate)
        } else if (response.data.rates.length > 0) {
          setSelectedShippingRate(response.data.rates[0])
          console.log('✅ Selected first available shipping rate:', response.data.rates[0])
        }

        if (response.data.warning) {
          setShippingError(response.data.warning)
        }
      } else {
        throw new Error(response.message || 'Failed to calculate shipping rates')
      }
    } catch (error) {
      console.error('❌ Shipping calculation error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to calculate shipping rate'
      setShippingError(errorMessage)
      
      // Set a fallback rate
      const fallbackRate: ShippingRate = {
        serviceName: 'Standard Shipping',
        serviceCode: 'standard',
        shipmentCost: 9.99,
        otherCost: 0,
        totalCost: 9.99,
        estimatedDeliveryDays: 5,
        carrier: 'USPS'
      }
      setShippingRates([fallbackRate])
      setSelectedShippingRate(fallbackRate)
      console.log('⚠️ Using fallback shipping rate:', fallbackRate)
    } finally {
      console.log('🚚 Shipping calculation complete, hiding loading screen')
      setIsCalculatingShipping(false)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.firstName && formData.lastName && formData.email && 
               formData.phone && formData.address && formData.city && 
               formData.state && formData.zipCode
      case 2:
        if (paymentMethod === 'stripe') {
          return formData.cardNumber && formData.expiryDate && formData.cvv && formData.cardName
        }
        return true // PayPal and Google Pay don't need card details
      case 3:
        return true
      default:
        return false
    }
  }

  const handleNext = async () => {
    if (currentStep < 3) {
      // Calculate shipping rate when moving from step 1 (shipping info) to step 2 (payment)
      if (currentStep === 1) {
        console.log('📦 Moving from step 1 to step 2, calculating shipping...')
        // Set loading state first and force a render before starting calculation
        setIsCalculatingShipping(true)
        // Small delay to ensure the loading modal renders before calculation starts
        await new Promise(resolve => setTimeout(resolve, 150))
        await calculateShippingRate()
        console.log('📦 Shipping calculated, now moving to step 2')
      }
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handlePlaceOrder = async () => {
    console.log('💳 Starting payment processing...')
    setIsProcessing(true)
    setPaymentError(null)
    
    // Small delay to ensure state update is processed
    await new Promise(resolve => setTimeout(resolve, 100))
    
    try {
      console.log('💳 Processing payment... (loading screen should be visible)')
      // Prepare payment data
      const paymentData: PaymentData = {
        amount: Math.round(calculateTotal() * 100), // Convert to cents
        currency: 'usd',
        customerEmail: formData.email,
        customerName: `${formData.firstName} ${formData.lastName}`,
        description: `Order for ${items.length} item(s)`,
        billingAddress: {
          line1: formData.address,
          line2: formData.apartment,
          city: formData.city,
          state: formData.state,
          postal_code: formData.zipCode,
          country: formData.country
        },
        items: items.map((item, index) => {
          // Handle both numeric and string product IDs
          const numericId = typeof item.productId === 'string' && !isNaN(Number(item.productId)) ? Number(item.productId) : item.productId;
          const product = products.find(p => {
            // Check both string and numeric ID matches
            return p.id === item.productId || p.id === numericId;
          });
          const itemPrice = calculateItemPrice(item)
          
          return {
            name: product?.name || `Product ${item.productId}`,
            quantity: item.quantity,
            price: itemPrice,
            currency: 'usd'
          }
        }),
        metadata: {
          orderId: `order-${Date.now()}`,
          customerPhone: formData.phone,
          notes: formData.notes
        }
      }

      // Process payment
      const result = await paymentService.processPayment(paymentMethod, paymentData)
      setPaymentResult(result)

      if (result.success) {
        // Create order with payment information
        const orderData = {
          id: `order-${Date.now()}`,
          orderNumber: `MC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
          status: 'processing',
          orderDate: new Date().toISOString().split('T')[0],
          estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          total: calculateTotal(),
          items: items.map((item, index) => ({
            id: `item-${index}`,
            productId: item.productId,
            productName: `Product ${item.productId}`,
            productImage: 'https://via.placeholder.com/400x400/f3f4f6/9ca3af?text=Product',
            quantity: item.quantity,
            price: item.price,
            customization: item.customization
          })),
          shippingAddress: {
            name: `${formData.firstName} ${formData.lastName}`,
            street: formData.address,
            city: formData.city,
            state: formData.state,
            zipCode: formData.zipCode
          },
          paymentMethod: paymentMethod === 'stripe' ? 'Credit Card' : 
                        paymentMethod === 'paypal' ? 'PayPal' : 
                        paymentMethod === 'google' ? 'Google Pay' : 'Credit Card',
          paymentStatus: 'completed',
          paymentProvider: paymentMethod,
          paymentDetails: {
            transactionId: result.paymentId || `txn_${Date.now()}`,
            providerTransactionId: result.paymentId || `${paymentMethod}_${Date.now()}`,
            processedAt: new Date().toISOString(),
            ...(result.payerEmail && { payerEmail: result.payerEmail }),
            ...(result.payerName && { payerName: result.payerName })
          }
        }
        
        // In a real app, this would be sent to your backend
        console.log('Order created:', orderData)
        
        setIsComplete(true)
        
        // Clear cart after successful order
        setTimeout(() => {
          clear()
          navigate('/')
        }, 3000)
      } else {
        setPaymentError(result.error || 'Payment failed')
      }
    } catch (error) {
      console.error('Payment processing error:', error)
      setPaymentError(error instanceof Error ? error.message : 'Payment processing failed')
    } finally {
      console.log('💳 Payment processing complete, hiding loading screen')
      setIsProcessing(false)
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

  if (isComplete) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Placed Successfully!</h1>
          <p className="text-gray-600 mb-6">
            Your order has been confirmed and will be processed shortly. 
            You'll receive an email confirmation soon.
          </p>
          <div className="space-y-2 text-sm text-gray-500">
            <p>Order ID: #MAY-{Date.now().toString().slice(-6)}</p>
            <p>Payment Method: {paymentMethod === 'stripe' ? 'Credit Card' : 
                               paymentMethod === 'paypal' ? 'PayPal' : 
                               paymentMethod === 'google' ? 'Google Pay' : 'Credit Card'}</p>
            <p>Payment Status: {paymentResult?.success ? 'Completed' : 'Failed'}</p>
            {paymentResult?.paymentId && (
              <p>Transaction ID: {paymentResult.paymentId}</p>
            )}
            {paymentResult?.payerEmail && (
              <p>Payer Email: {paymentResult.payerEmail}</p>
            )}
            <p>Estimated delivery: 3-5 business days</p>
          </div>
        </div>
      </main>
    )
  }

  // Loading screen for shipping calculation
  if (isCalculatingShipping) {
    console.log('🎨 Rendering shipping calculation loading screen')
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Calculating Shipping</h2>
          <p className="text-gray-600">
            We're finding the best shipping rates for your delivery address...
          </p>
          <div className="mt-6 space-y-2 text-sm text-gray-500">
            <div className="flex items-center justify-center">
              <Truck className="w-4 h-4 mr-2" />
              <span>Checking carrier rates</span>
            </div>
            <div className="flex items-center justify-center">
              <MapPin className="w-4 h-4 mr-2" />
              <span>Validating delivery address</span>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // Loading screen for payment processing
  if (isProcessing) {
    console.log('🎨 Rendering payment processing loading screen')
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing Payment</h2>
          <p className="text-gray-600">
            Please wait while we securely process your payment...
          </p>
          <div className="mt-6 space-y-2 text-sm text-gray-500">
            <div className="flex items-center justify-center">
              <Lock className="w-4 h-4 mr-2" />
              <span>Securing transaction</span>
            </div>
            <div className="flex items-center justify-center">
              <Shield className="w-4 h-4 mr-2" />
              <span>Verifying payment details</span>
            </div>
            <div className="flex items-center justify-center">
              <CreditCard className="w-4 h-4 mr-2" />
              <span>Confirming order</span>
            </div>
          </div>
          <p className="mt-6 text-xs text-gray-500">
            Do not refresh or close this page
          </p>
        </div>
      </main>
    )
  }

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h1>
          <Button onClick={() => navigate('/products')}>
            Continue Shopping
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 w-full">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-8 w-full">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <Button
            variant="outline"
            onClick={() => navigate('/cart')}
            className="flex items-center mb-4 sm:mb-6 text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Cart
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Checkout</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">Complete your order securely</p>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-lg sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
          {/* Desktop Progress Steps */}
          <div className="hidden md:flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                  currentStep >= step.number 
                    ? 'bg-accent text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step.number}
                </div>
                <div className="ml-3">
                  <p className={`font-medium ${
                    currentStep >= step.number ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </p>
                  <p className="text-sm text-gray-500">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-4 ${
                    currentStep > step.number ? 'bg-accent' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          
          {/* Mobile Progress Steps - Compact View */}
          <div className="md:hidden flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex flex-col items-center flex-1">
                <div className="flex items-center w-full">
                  {index > 0 && (
                    <div className={`flex-1 h-0.5 ${
                      currentStep > index ? 'bg-accent' : 'bg-gray-200'
                    }`} />
                  )}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold mx-1 ${
                    currentStep >= step.number 
                      ? 'bg-accent text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step.number}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 ${
                      currentStep > step.number ? 'bg-accent' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
                <p className={`text-xs mt-2 text-center ${
                  currentStep >= step.number ? 'text-gray-900 font-medium' : 'text-gray-500'
                }`}>
                  {step.title}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6 min-w-0">
            {/* Step 1: Shipping Information */}
            {currentStep === 1 && (
              <div className="bg-white rounded-lg sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-accent" />
                  Shipping Information
                </h2>
                
                <div className="space-y-4 sm:space-y-6">
                  {/* Personal Information */}
                  <div>
                    <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Personal Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          First Name *
                        </label>
                        <input
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-base"
                          placeholder="Enter your first name"
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
                          className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-base"
                          placeholder="Enter your last name"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-base"
                          placeholder="Enter your email"
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
                          className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-base"
                          placeholder="Enter your phone number"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Address Information */}
                  <div>
                    <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Delivery Address</h3>
                    <div className="space-y-3 sm:space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Street Address *
                        </label>
                        <input
                          type="text"
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-base"
                          placeholder="Enter your street address"
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
                          className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-base"
                          placeholder="Apartment, suite, unit, etc."
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            City *
                          </label>
                          <input
                            type="text"
                            name="city"
                            value={formData.city}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-base"
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
                            className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-base"
                            placeholder="Enter state"
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
                            className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-base"
                            placeholder="Enter ZIP code"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Country
                        </label>
                        <select
                          name="country"
                          value={formData.country}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-base"
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
              <div className="bg-white rounded-lg sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2 text-accent" />
                  Payment Method
                </h2>
                
                <div className="space-y-4 sm:space-y-6">
                  {/* Payment Options */}
                  <div className="space-y-3 sm:space-y-4">
                    <h3 className="text-base sm:text-lg font-medium text-gray-900">Choose Payment Method</h3>
                    
                    {/* Stripe */}
                    <div 
                      className={`border-2 rounded-lg p-3 sm:p-4 cursor-pointer transition-all ${
                        paymentMethod === 'stripe' 
                          ? 'border-accent bg-accent/5' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setPaymentMethod('stripe')}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3 sm:mr-4">
                            <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                          </div>
                          <div>
                            <h4 className="text-sm sm:text-base font-medium text-gray-900">Credit/Debit Card</h4>
                            <p className="text-xs sm:text-sm text-gray-600">Visa, Mastercard, American Express</p>
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
                      className={`border-2 rounded-lg p-3 sm:p-4 cursor-pointer transition-all ${
                        paymentMethod === 'paypal' 
                          ? 'border-accent bg-accent/5' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setPaymentMethod('paypal')}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-500 rounded-lg flex items-center justify-center mr-3 sm:mr-4">
                            <span className="text-white font-bold text-xs sm:text-sm">PP</span>
                          </div>
                          <div>
                            <h4 className="text-sm sm:text-base font-medium text-gray-900">PayPal</h4>
                            <p className="text-xs sm:text-sm text-gray-600">Pay with your PayPal account</p>
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

                    {/* Google Pay */}
                    <div 
                      className={`border-2 rounded-lg p-3 sm:p-4 cursor-pointer transition-all ${
                        paymentMethod === 'google' 
                          ? 'border-accent bg-accent/5' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setPaymentMethod('google')}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gray-900 rounded-lg flex items-center justify-center mr-3 sm:mr-4">
                            <span className="text-white font-bold text-xs sm:text-sm">G</span>
                          </div>
                          <div>
                            <h4 className="text-sm sm:text-base font-medium text-gray-900">Google Pay</h4>
                            <p className="text-xs sm:text-sm text-gray-600">Pay with Google Pay</p>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 ${
                          paymentMethod === 'google' 
                            ? 'border-accent bg-accent' 
                            : 'border-gray-300'
                        }`}>
                          {paymentMethod === 'google' && (
                            <div className="w-full h-full rounded-full bg-white scale-50"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Forms */}
                  {paymentMethod === 'stripe' && (
                    <div className="border-t pt-4 sm:pt-6">
                      <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Card Details</h3>
                      <StripePaymentForm
                        paymentData={{
                          amount: Math.round(calculateTotal() * 100),
                          currency: 'usd',
                          customerEmail: formData.email,
                          customerName: `${formData.firstName} ${formData.lastName}`,
                          billingAddress: {
                            line1: formData.address,
                            line2: formData.apartment,
                            city: formData.city,
                            state: formData.state,
                            postal_code: formData.zipCode,
                            country: formData.country
                          },
                          metadata: {
                            orderId: `order-${Date.now()}`,
                            customerPhone: formData.phone,
                            notes: formData.notes
                          }
                        }}
                        onSuccess={handlePaymentSuccess}
                        onError={handlePaymentError}
                        disabled={isProcessing}
                      />
                    </div>
                  )}

                  {paymentMethod === 'paypal' && (
                    <div className="border-t pt-4 sm:pt-6">
                      <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">PayPal Payment</h3>
                      <PayPalButton
                        paymentData={{
                          amount: calculateTotal(),
                          currency: 'usd',
                          description: `Order for ${items.length} item(s)`,
                          customerEmail: formData.email,
                          customerName: `${formData.firstName} ${formData.lastName}`,
                          items: items.map((item, index) => {
                            // Handle both numeric and string product IDs
                            const numericId = typeof item.productId === 'string' && !isNaN(Number(item.productId)) ? Number(item.productId) : item.productId;
                            const product = products.find(p => {
                              // Check both string and numeric ID matches
                              return p.id === item.productId || p.id === numericId;
                            });
                            const itemPrice = calculateItemPrice(item)
                            
                            return {
                              name: product?.name || `Product ${item.productId}`,
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

                  {paymentMethod === 'google' && (
                    <div className="border-t pt-4 sm:pt-6">
                      <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Google Pay</h3>
                      <div className="p-6 bg-gray-50 rounded-lg text-center">
                        <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                          <span className="text-white font-bold text-xl">G</span>
                        </div>
                        <p className="text-gray-600 mb-4">Google Pay integration coming soon</p>
                        <p className="text-sm text-gray-500">
                          For now, please use Credit Card or PayPal payment methods.
                        </p>
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
              <div className="bg-white rounded-lg sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-accent" />
                  Order Review
                </h2>
                
                <div className="space-y-4 sm:space-y-6">
                  {/* Order Summary */}
                  <div>
                    <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Order Summary</h3>
                    <div className="space-y-3 sm:space-y-4">
                      {items.map((item, index) => {
                        // Handle both numeric and string product IDs
                        const numericId = typeof item.productId === 'string' && !isNaN(Number(item.productId)) ? Number(item.productId) : item.productId;
                        const product = products.find(p => {
                          // Check both string and numeric ID matches
                          return p.id === item.productId || p.id === numericId;
                        });
                        if (!product) return null
                        
                        // Calculate item price including customization costs
                        const itemPrice = calculateItemPrice(item)
                        
                        return (
                          <div key={index} className="border border-gray-200 rounded-lg p-3 sm:p-4">
                            <div className="flex items-start space-x-3 sm:space-x-4">
                              <img
                                src={product.image}
                                alt={product.title}
                                className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-lg flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm sm:text-base font-medium text-gray-900 truncate">{product.title}</h4>
                                <p className="text-xs sm:text-sm text-gray-600">Quantity: {item.quantity}</p>
                                
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
                      })}
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
            <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 sm:gap-0">
              <Button
                variant="outline"
                onClick={handlePrev}
                disabled={currentStep === 1}
                className="w-full sm:w-auto"
              >
                Previous
              </Button>
              
              {currentStep < 3 ? (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed() || isCalculatingShipping}
                  isLoading={isCalculatingShipping}
                  className="w-full sm:w-auto"
                >
                  {isCalculatingShipping ? 'Calculating...' : 'Continue'}
                  {!isCalculatingShipping && <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />}
                </Button>
              ) : (
                <Button
                  variant="add-to-cart"
                  onClick={handlePlaceOrder}
                  disabled={!canProceed() || isProcessing}
                  isLoading={isProcessing}
                  className="w-full sm:w-auto"
                >
                  {isProcessing ? 'Processing...' : 'Place Order'}
                  <Lock className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1 min-w-0">
            <div className="bg-white rounded-lg sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 lg:sticky lg:top-8 w-full">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Order Summary</h3>
              
                <div className="space-y-3 sm:space-y-4">
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">${calculateSubtotal().toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-600">Tax (8%)</span>
                  <span className="font-medium">${calculateTax().toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium text-right ml-2 flex-shrink-0">
                    {selectedShippingRate === null ? 'TBD' : 
                     selectedShippingRate.totalCost === 0 ? 'Free' : 
                     `$${selectedShippingRate.totalCost.toFixed(2)}`}
                  </span>
                </div>
                
                {selectedShippingRate && selectedShippingRate.serviceName && (
                  <div className="flex items-center text-xs text-gray-500 flex-wrap">
                    <Truck className="w-3 h-3 mr-1 flex-shrink-0" />
                    <span className="break-words">{selectedShippingRate.serviceName}</span>
                    {selectedShippingRate.estimatedDeliveryDays && (
                      <span className="ml-1 whitespace-nowrap">({selectedShippingRate.estimatedDeliveryDays} days)</span>
                    )}
                  </div>
                )}
                
                {shippingError && (
                  <div className="flex items-start text-xs text-amber-600">
                    <AlertCircle className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                    <span className="break-words">{shippingError}</span>
                  </div>
                )}
                
                <div className="border-t pt-3 sm:pt-4">
                  <div className="flex justify-between text-base sm:text-lg font-semibold">
                    <span>Total</span>
                    <span>${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Security Badges */}
              <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-3">
                <div className="flex items-center text-xs sm:text-sm text-gray-600">
                  <Shield className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                  <span className="break-words">256-bit SSL encryption</span>
                </div>
                <div className="flex items-center text-xs sm:text-sm text-gray-600">
                  <Lock className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                  <span className="break-words">Secure payment processing</span>
                </div>
                <div className="flex items-center text-xs sm:text-sm text-gray-600">
                  <Truck className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                  <span className="break-words">Fast & reliable delivery</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
