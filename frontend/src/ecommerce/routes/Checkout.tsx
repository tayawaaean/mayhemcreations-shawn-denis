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
import { useCart } from '../context/CartContext'
import { products } from '../../data/products'
import { MaterialPricingService } from '../../shared/materialPricingService'
import Button from '../../components/Button'
import { calculateShippingRates, ShippingRate } from '../../shared/shippingApiService'
import { orderReviewApiService } from '../../shared/orderReviewApiService'
import { useAlertModal } from '../context/AlertModalContext'
import { useAuth } from '../context/AuthContext'

export default function Checkout() {
  const navigate = useNavigate()
  const { items, clear } = useCart()
  const { showError, showSuccess, showWarning } = useAlertModal()
  const { user, isLoggedIn } = useAuth()

  // Helper function to find product by ID (handles different ID formats)
  const findProductById = (productId: string | number) => {
    let product = null
    
    // Try direct match first
    product = products.find(p => p.id === productId)
    
    // If not found, try numeric conversion
    if (!product) {
      const numericId = typeof productId === 'string' && !isNaN(Number(productId)) ? Number(productId) : productId
      product = products.find(p => p.id === numericId)
    }
    
    // If still not found, try mapping numeric IDs to mayhem IDs
    if (!product && typeof productId === 'string' && !isNaN(Number(productId))) {
      const numId = Number(productId)
      const mayhemId = `mayhem-${String(numId).padStart(3, '0')}` // Convert 9 to "mayhem-009"
      product = products.find(p => p.id === mayhemId)
    }
    
    return product
  }
  const [currentStep, setCurrentStep] = useState(1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false)
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([])
  const [selectedShippingRate, setSelectedShippingRate] = useState<ShippingRate | null>(null)
  const [shippingError, setShippingError] = useState<string | null>(null)

  // Debug cart items on mount
  useEffect(() => {
    console.log('🛒 Checkout: Cart items loaded:', items.length)
    console.log('🛒 Checkout: Cart items (full details):', JSON.stringify(items, null, 2))
    if (items.length > 0) {
      const subtotal = calculateSubtotal()
      console.log('💰 Checkout: Calculated subtotal:', subtotal)
      items.forEach((item, index) => {
        const price = calculateItemPrice(item)
        console.log(`💰 Item ${index + 1}:`, {
          productId: item.productId,
          quantity: item.quantity,
          storedPrice: (item as any).price,
          hasProduct: !!item.product,
          productTitle: item.product?.title || 'Not found',
          calculatedPrice: price,
          total: price * item.quantity
        })
      })
    } else {
      console.warn('⚠️ No cart items found in Checkout!')
    }
  }, [items])

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
    { number: 1, title: 'Shipping', description: 'Address & shipping method' },
    { number: 2, title: 'Review Order', description: 'Verify all details' },
    { number: 3, title: 'Submit', description: 'Submit for review' }
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
    // For custom embroidery items, use the total price from embroideryData
    if (item.productId === 'custom-embroidery' && item.customization?.embroideryData) {
      return Number(item.customization.embroideryData.totalPrice) || 0;
    }
    
    // If pricingBreakdown exists (from cart or previous calculation), use it directly
    if (item.pricingBreakdown && item.pricingBreakdown.totalPrice) {
      console.log('✅ Using existing pricingBreakdown for item:', {
        productId: item.productId,
        totalPrice: item.pricingBreakdown.totalPrice
      });
      return Number(item.pricingBreakdown.totalPrice) || 0;
    }
    
    // Try to get product from item first (if it was stored with the cart item)
    let product = item.product;
    
    // If no product in item, search by productId
    if (!product) {
      // Convert productId to string for comparison (products have string IDs like 'mayhem-001')
      const productIdStr = String(item.productId);
      product = products.find(p => {
        // Compare as strings
        return String(p.id) === productIdStr || p.id === item.productId;
      });
    }
    
    if (!product) {
      console.error('❌ Product not found for item:', {
        productId: item.productId,
        productIdType: typeof item.productId,
        itemKeys: Object.keys(item),
        hasProduct: !!item.product,
        storedPrice: item.price,
        pricingBreakdown: item.pricingBreakdown,
        availableProductIds: products.slice(0, 3).map(p => ({ id: p.id, type: typeof p.id }))
      });
      // Fallback: Use pricingBreakdown totalPrice if available
      if (item.pricingBreakdown && item.pricingBreakdown.totalPrice) {
        console.warn('⚠️ Using pricingBreakdown totalPrice as fallback:', item.pricingBreakdown.totalPrice);
        return Number(item.pricingBreakdown.totalPrice) || 0;
      }
      // Fallback: Use stored price if available
      if (item.price && typeof item.price === 'number') {
        console.warn('⚠️ Using stored price as fallback:', item.price);
        return item.price;
      }
      return 0;
    }
    
    // Use Number() wrapper to prevent NaN issues
    let itemPrice = Number(product.price || 0) || 0
    
    // Add customization costs if present
    if (item.customization) {
      // Handle multiple designs (new format)
      if (item.customization.designs && item.customization.designs.length > 0) {
        item.customization.designs.forEach((design: any) => {
          // Check if totalPrice is already calculated for this design
          if (design.totalPrice) {
            itemPrice += Number(design.totalPrice) || 0
          } else if (design.selectedStyles) {
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
          
            // Calculate design-specific pricing
            const { selectedStyles } = design;
            // All selected styles are embroidery options, not material costs
            if (selectedStyles.coverage) itemPrice += Number(selectedStyles.coverage.price) || 0;
            if (selectedStyles.material) itemPrice += Number(selectedStyles.material.price) || 0;
            if (selectedStyles.border) itemPrice += Number(selectedStyles.border.price) || 0;
            if (selectedStyles.backing) itemPrice += Number(selectedStyles.backing.price) || 0;
            if (selectedStyles.cutting) itemPrice += Number(selectedStyles.cutting.price) || 0;
            
            if (selectedStyles.threads) {
              selectedStyles.threads.forEach((thread: any) => {
                itemPrice += Number(thread.price) || 0;
              });
            }
            if (selectedStyles.upgrades) {
              selectedStyles.upgrades.forEach((upgrade: any) => {
                itemPrice += Number(upgrade.price) || 0;
              });
            }
          }
        });
      } else {
        // Legacy single design format
        const { selectedStyles } = item.customization;
        if (selectedStyles.coverage) itemPrice += Number(selectedStyles.coverage.price) || 0;
        if (selectedStyles.material) itemPrice += Number(selectedStyles.material.price) || 0;
        if (selectedStyles.border) itemPrice += Number(selectedStyles.border.price) || 0;
        if (selectedStyles.backing) itemPrice += Number(selectedStyles.backing.price) || 0;
        if (selectedStyles.cutting) itemPrice += Number(selectedStyles.cutting.price) || 0;
        
        if (selectedStyles.threads) {
          selectedStyles.threads.forEach((thread: any) => {
            itemPrice += Number(thread.price) || 0;
          });
        }
        if (selectedStyles.upgrades) {
          selectedStyles.upgrades.forEach((upgrade: any) => {
            itemPrice += Number(upgrade.price) || 0;
          });
        }
      }
    }
    
    return itemPrice
  }

  const calculateSubtotal = () => {
    return items.reduce((total, item) => {
      const itemPrice = calculateItemPrice(item)
      const itemTotal = (Number(itemPrice) || 0) * (Number(item.quantity) || 0)
      return total + itemTotal
    }, 0)
  }

  const calculateTax = () => {
    const subtotal = calculateSubtotal()
    return (Number(subtotal) || 0) * 0.08 // 8% tax
  }
  
  const calculateShipping = () => {
    // Use selected shipping rate if available
    if (selectedShippingRate) return Number(selectedShippingRate.totalCost) || 0
    // Otherwise use default
    const subtotal = calculateSubtotal()
    return (Number(subtotal) || 0) > 50 ? 0 : 9.99
  }
  
  const calculateTotal = () => {
    const subtotal = calculateSubtotal()
    const tax = calculateTax()
    const shipping = calculateShipping()
    return (Number(subtotal) || 0) + (Number(tax) || 0) + (Number(shipping) || 0)
  }

  // Calculate shipping rates via backend API
  const calculateShippingRate = async () => {
    console.log('🚚 Starting shipping calculation...')
    console.log('👤 User Authentication Status:', {
      isLoggedIn,
      userId: user?.id,
      userEmail: user?.email,
      userRole: user?.role
    })
    console.log('📦 Form Data:', formData)
    console.log('📦 Cart Items:', items)
    
    // Check if user is authenticated
    if (!isLoggedIn) {
      console.error('❌ User not authenticated! Shipping API requires authentication.')
      showError('Please log in to calculate shipping rates', 'Authentication Required')
      setIsCalculatingShipping(false)
      return
    }
    
    setIsCalculatingShipping(true)
    setShippingError(null)
    setPaymentError(null)
    
    // Small delay to ensure state update is processed before API call
    await new Promise(resolve => setTimeout(resolve, 100))
    
    try {
      console.log('🚚 Calculating shipping rates via API... (state should be loading now)')
      
      // Prepare shipping address with ALL required fields
      const shippingAddress = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        phone: formData.phone,
        street: formData.address,
        street1: formData.address,
        apartment: formData.apartment,
        street2: formData.apartment,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        postalCode: formData.zipCode,
        country: 'US'
      }
      
      console.log('📍 Shipping Address Being Sent:', shippingAddress)
      
      // Validate address has required fields
      if (!shippingAddress.street1 || !shippingAddress.city || !shippingAddress.state || !shippingAddress.postalCode) {
        console.error('❌ Missing required address fields:', {
          hasFirstName: !!shippingAddress.firstName,
          hasLastName: !!shippingAddress.lastName,
          hasName: !!shippingAddress.name,
          hasStreet: !!shippingAddress.street1,
          hasCity: !!shippingAddress.city,
          hasState: !!shippingAddress.state,
          hasZip: !!shippingAddress.postalCode
        })
      }
      
      console.log('📝 Full Name for ShipEngine:', shippingAddress.name)
      console.log('📫 Full Address for ShipEngine:', `${shippingAddress.street1}${shippingAddress.street2 ? ' ' + shippingAddress.street2 : ''}, ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postalCode}`)
      
      // Prepare cart items for shipping calculation
      const cartItems = items.map((item) => {
        const numericId = typeof item.productId === 'string' && !isNaN(Number(item.productId)) ? Number(item.productId) : item.productId;
        const product = products.find(p => p.id === item.productId || p.id === numericId);
        const itemPrice = calculateItemPrice(item)
        
        return {
          id: item.productId.toString(),
          name: product?.title || `Product ${item.productId}`,
          quantity: item.quantity,
          price: itemPrice,
          weight: {
            value: 8, // Default 8 ounces per item
            units: 'ounces' as const
          }
        }
      })
      
      console.log('📦 Cart Items Being Sent:', cartItems)
      console.log('📦 Total items:', cartItems.length)
      console.log('📦 Total quantity:', cartItems.reduce((sum, item) => sum + item.quantity, 0))

      console.log('🌐 Calling ShipEngine API with:', {
        address: shippingAddress,
        items: cartItems
      })

      // Call backend API to get shipping rates
      const response = await calculateShippingRates(shippingAddress, cartItems)

      console.log('✅ Shipping rates response:', response)
      console.log('📊 Response structure:', {
        success: response.success,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
        ratesCount: response.data?.rates?.length || 0,
        hasRecommendedRate: !!response.data?.recommendedRate,
        message: response.message,
        error: response.error
      })

      if (response.success && response.data) {
        console.log('✅ API call successful, processing rates...')
        console.log('📋 Available rates:', response.data.rates)
        
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
          console.warn('⚠️ API returned warning:', response.data.warning)
          // Show warning but don't block progress (we have rates)
          if (response.data.warning.includes('carriers unavailable')) {
            setShippingError(`Note: ${response.data.warning}. Showing available options.`)
          }
        }
      } else {
        console.error('❌ API returned unsuccessful response:', {
          success: response.success,
          message: response.message,
          error: response.error,
          fullResponse: response
        })
        throw new Error(response.message || response.error || 'Failed to calculate shipping rates')
      }
    } catch (error: any) {
      console.error('❌ Shipping calculation error (FULL DETAILS):')
      console.error('Error type:', typeof error)
      console.error('Error instance:', error)
      console.error('Error message:', error?.message)
      console.error('Error details:', error?.errorDetails)
      console.error('Error status code:', error?.statusCode)
      
      // Build user-friendly error message
      let userMessage = error?.message || 'Failed to calculate shipping rates. Please try again.';
      
      // Add specific guidance based on error type
      if (error?.statusCode === 401) {
        userMessage = 'You must be logged in to calculate shipping rates. Please log in and try again.';
        showError(userMessage, 'Authentication Required');
      } else if (error?.statusCode === 400 && error?.errorDetails) {
        userMessage = `${error.message}\n\nDetails: ${error.errorDetails}`;
        showError(userMessage, 'Invalid Address');
      } else if (error?.statusCode === 500) {
        userMessage = 'Our shipping service is temporarily unavailable. Please try again in a few moments.';
        showError(userMessage, 'Service Error');
      } else if (error?.message?.includes('address')) {
        showError(error.message, 'Address Validation Failed');
      } else {
        showError(userMessage, 'Shipping Error');
      }
      
      console.error('📝 Showing error to user:', userMessage)
      setShippingError(userMessage)
      
      // Clear shipping rates - force user to fix the issue
      setShippingRates([])
      setSelectedShippingRate(null)
      
      // Keep user on Step 1 so they can fix the address
      setCurrentStep(1)
      
      console.error('❌ NO FALLBACK RATES - User must fix the error')
    } finally {
      console.log('🚚 Shipping calculation complete, hiding loading screen')
      setIsCalculatingShipping(false)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        // Step 1: Only validate form fields are filled (shipping will be calculated when clicking Continue)
        return formData.firstName && formData.lastName && formData.email && 
               formData.phone && formData.address && formData.city && 
               formData.state && formData.zipCode
      case 2:
        // Step 2: Must have shipping rate selected to proceed to final review
        return selectedShippingRate !== null
      case 3:
        // Step 3: Ready to submit (all previous validation passed)
        return true
      default:
        return false
    }
  }

  const handleNext = async () => {
    if (currentStep < steps.length) {
      // Calculate shipping rate when moving from step 1 (shipping info) to step 2 (review)
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
    console.log('📦 Starting order submission for review...')
    setIsProcessing(true)
    setPaymentError(null)
    
    // Small delay to ensure state update is processed
    await new Promise(resolve => setTimeout(resolve, 100))
    
    try {
      console.log('📦 Submitting order for review... (loading screen should be visible)')
      
      // Prepare order data for review
      const orderData = {
        items: items.map((item, index) => {
          const numericId = typeof item.productId === 'string' && !isNaN(Number(item.productId)) ? Number(item.productId) : item.productId
          const product = products.find(p => p.id === item.productId || p.id === numericId)
          
          // Calculate pricing breakdown (matches Cart.tsx structure)
          const baseProductPrice = Number(product?.price) || 0;
          let embroideryPrice = 0;  // Material costs from dimensions
          let embroideryOptionsPrice = 0;  // Style options (coverage, material, border, etc.)
          
          // Custom embroidery pricing
          if (item.productId === 'custom-embroidery' && item.customization?.embroideryData) {
            embroideryPrice = Number(item.customization.embroideryData.materialCosts?.totalCost) || 0;
            embroideryOptionsPrice = Number(item.customization.embroideryData.optionsPrice) || 0;
          }
          // Multi-design pricing (new format)
          else if (item.customization?.designs && item.customization.designs.length > 0) {
            // Calculate total embroidery price and options from all designs
            item.customization.designs.forEach((design: any) => {
              // Calculate material costs for this design if dimensions are available
              if (design.dimensions && design.dimensions.width > 0 && design.dimensions.height > 0) {
                try {
                  const materialCosts = MaterialPricingService.calculateMaterialCosts({
                    patchWidth: design.dimensions.width,
                    patchHeight: design.dimensions.height
                  });
                  embroideryPrice += materialCosts.totalCost;
                  console.log('🔧 Checkout: Calculated material cost for design:', {
                    designName: design.name,
                    dimensions: design.dimensions,
                    materialCost: materialCosts.totalCost
                  });
                } catch (error) {
                  console.warn('Failed to calculate material costs for design:', design.name, error);
                }
              }
              
              if (design.selectedStyles) {
                const { selectedStyles } = design;
                // All selected styles are embroidery options, not material costs
                if (selectedStyles.coverage) embroideryOptionsPrice += Number(selectedStyles.coverage.price) || 0;
                if (selectedStyles.material) embroideryOptionsPrice += Number(selectedStyles.material.price) || 0;
                
                // Embroidery options: border, backing, cutting, threads, upgrades
                if (selectedStyles.border) embroideryOptionsPrice += Number(selectedStyles.border.price) || 0;
                if (selectedStyles.backing) embroideryOptionsPrice += Number(selectedStyles.backing.price) || 0;
                if (selectedStyles.cutting) embroideryOptionsPrice += Number(selectedStyles.cutting.price) || 0;
                
                if (selectedStyles.threads) {
                  selectedStyles.threads.forEach((thread: any) => {
                    embroideryOptionsPrice += Number(thread.price) || 0;
                  });
                }
                if (selectedStyles.upgrades) {
                  selectedStyles.upgrades.forEach((upgrade: any) => {
                    embroideryOptionsPrice += Number(upgrade.price) || 0;
                  });
                }
              }
            });
          }
          // Legacy single design format
          else if (item.customization?.selectedStyles) {
            const { selectedStyles } = item.customization;
            if (selectedStyles.coverage) embroideryOptionsPrice += Number(selectedStyles.coverage.price) || 0;
            if (selectedStyles.material) embroideryOptionsPrice += Number(selectedStyles.material.price) || 0;
            if (selectedStyles.border) embroideryOptionsPrice += Number(selectedStyles.border.price) || 0;
            if (selectedStyles.backing) embroideryOptionsPrice += Number(selectedStyles.backing.price) || 0;
            if (selectedStyles.cutting) embroideryOptionsPrice += Number(selectedStyles.cutting.price) || 0;
            
            if (selectedStyles.threads) {
              selectedStyles.threads.forEach((thread: any) => {
                embroideryOptionsPrice += Number(thread.price) || 0;
              });
            }
            if (selectedStyles.upgrades) {
              selectedStyles.upgrades.forEach((upgrade: any) => {
                embroideryOptionsPrice += Number(upgrade.price) || 0;
              });
            }
          }
          
          const totalPrice = baseProductPrice + embroideryPrice + embroideryOptionsPrice;
          
          console.log(`📊 Checkout: Item ${index + 1} pricing:`, {
            baseProductPrice,
            embroideryPrice,
            embroideryOptionsPrice,
            totalPrice
          });
          
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
              embroideryOptionsPrice,
              totalPrice
            }
          }
        }),
        subtotal: calculateSubtotal(),
        shipping: selectedShippingRate?.totalCost || 0,
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
          country: 'United States' // Hardcoded to US only
        },
        shippingMethod: selectedShippingRate ? {
          serviceName: selectedShippingRate.serviceName,
          serviceCode: selectedShippingRate.serviceCode,
          carrier: selectedShippingRate.carrier,
          cost: selectedShippingRate.totalCost,
          estimatedDeliveryDays: selectedShippingRate.estimatedDeliveryDays,
          estimatedDeliveryDate: selectedShippingRate.estimatedDeliveryDays 
            ? new Date(Date.now() + selectedShippingRate.estimatedDeliveryDays * 24 * 60 * 60 * 1000).toISOString()
            : null
        } : null,
        customerNotes: formData.notes
      }

      // Submit for review via API
      const response = await orderReviewApiService.submitForReview(orderData)
      
      if (response.success) {
        setIsComplete(true)
        
        // Clear cart after successful submission
        await clear()
        localStorage.removeItem('mayhem_cart_v1')
        
        showSuccess(
          `Your order has been submitted for review. Order ID: ${response.data?.orderReviewId}`,
          'Order Submitted Successfully'
        )
        
        // Navigate to orders page
        setTimeout(() => {
          navigate('/my-orders', {
            state: {
              submissionSuccess: true,
              orderReviewId: response.data?.orderReviewId
            }
          })
        }, 2000)
      } else {
        setPaymentError(response.message || 'Failed to submit order for review')
        showError(response.message || 'Failed to submit order', 'Submission Failed')
      }
    } catch (error) {
      console.error('Order submission error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Order submission failed'
      setPaymentError(errorMessage)
      showError(errorMessage, 'Error')
    } finally {
      console.log('📦 Order submission complete, hiding loading screen')
      setIsProcessing(false)
    }
  }


  if (isComplete) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Submitted for Review!</h1>
          <p className="text-gray-600 mb-6">
            Your order has been submitted and will be reviewed by our team. 
            You'll be notified once it's approved and ready for payment.
          </p>
          <div className="space-y-2 text-sm text-gray-500">
            <p>Subtotal: ${calculateSubtotal().toFixed(2)}</p>
            <p>Shipping: ${calculateShipping().toFixed(2)} ({selectedShippingRate?.serviceName})</p>
            <p>Tax: ${calculateTax().toFixed(2)}</p>
            <p className="font-semibold text-gray-900">Total: ${calculateTotal().toFixed(2)}</p>
            {selectedShippingRate?.estimatedDeliveryDays && (
              <p>Estimated delivery: {selectedShippingRate.estimatedDeliveryDays} business days after approval</p>
            )}
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

  // Loading screen for order submission
  if (isProcessing) {
    console.log('🎨 Rendering order submission loading screen')
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Submitting Order</h2>
          <p className="text-gray-600">
            Please wait while we submit your order for review...
          </p>
          <div className="mt-6 space-y-2 text-sm text-gray-500">
            <div className="flex items-center justify-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              <span>Preparing order details</span>
            </div>
            <div className="flex items-center justify-center">
              <Shield className="w-4 h-4 mr-2" />
              <span>Securing your information</span>
            </div>
            <div className="flex items-center justify-center">
              <Truck className="w-4 h-4 mr-2" />
              <span>Confirming shipping details</span>
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
                        <input
                          type="text"
                          name="country"
                          value="United States"
                          disabled
                          className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed text-base"
                        />
                        <p className="mt-1 text-xs text-gray-500">Currently shipping to United States only</p>
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

                  {/* Shipping Error/Warning Display */}
                  {shippingError && (
                    <div className={`border-2 rounded-lg p-4 ${
                      shippingError.includes('Note:') || shippingError.includes('carriers unavailable')
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-start">
                        <AlertCircle className={`w-6 h-6 mt-0.5 mr-3 flex-shrink-0 ${
                          shippingError.includes('Note:') || shippingError.includes('carriers unavailable')
                            ? 'text-amber-600'
                            : 'text-red-600'
                        }`} />
                        <div className="flex-1">
                          <h4 className={`font-semibold mb-1 ${
                            shippingError.includes('Note:') || shippingError.includes('carriers unavailable')
                              ? 'text-amber-900'
                              : 'text-red-900'
                          }`}>
                            {shippingError.includes('Note:') || shippingError.includes('carriers unavailable')
                              ? 'Information'
                              : 'Shipping Calculation Failed'}
                          </h4>
                          <p className={`text-sm whitespace-pre-line ${
                            shippingError.includes('Note:') || shippingError.includes('carriers unavailable')
                              ? 'text-amber-700'
                              : 'text-red-700'
                          }`}>{shippingError}</p>
                          
                          {/* Only show verification checklist for actual errors, not warnings */}
                          {!shippingError.includes('Note:') && !shippingError.includes('carriers unavailable') && (
                            <div className="mt-3 space-y-2">
                              <p className="text-sm text-red-800 font-medium">Please verify:</p>
                              <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                                <li>Street address is complete and correct</li>
                                <li>City and state match the ZIP code</li>
                                <li>ZIP code is valid (5 digits)</li>
                                <li>Address is a real US location</li>
                              </ul>
                          </div>
                          )}
                          
                          <button
                            onClick={() => {
                              setShippingError(null)
                              console.log('🔄 User dismissed message')
                            }}
                            className={`mt-3 px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors ${
                              shippingError.includes('Note:') || shippingError.includes('carriers unavailable')
                                ? 'bg-amber-600 hover:bg-amber-700'
                                : 'bg-red-600 hover:bg-red-700'
                            }`}
                          >
                            {shippingError.includes('Note:') || shippingError.includes('carriers unavailable')
                              ? 'Got It'
                              : 'Dismiss & Try Again'}
                          </button>
                          </div>
                          </div>
                        </div>
                          )}
                </div>
              </div>
            )}

            {/* Step 2: Review Order & Submit */}
            {currentStep === 2 && (
              <div className="bg-white rounded-lg sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-accent" />
                  Review Order
                </h2>
                
                <div className="space-y-4 sm:space-y-6">
                  {/* Shipping Method Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base sm:text-lg font-medium text-gray-900 flex items-center">
                        <Truck className="w-5 h-5 mr-2 text-accent" />
                        Selected Shipping Method
                      </h3>
                      <button
                        onClick={() => setCurrentStep(1)}
                        className="text-sm text-accent hover:underline"
                      >
                        Change Address
                      </button>
                          </div>
                    
                    {selectedShippingRate && (
                      <div className="border-2 border-accent bg-accent/5 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{selectedShippingRate.serviceName}</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {selectedShippingRate.carrier} • {selectedShippingRate.estimatedDeliveryDays ? `${selectedShippingRate.estimatedDeliveryDays} business days` : 'Standard delivery'}
                        </p>
                          </div>
                          <span className="text-lg font-semibold text-gray-900">
                            ${selectedShippingRate.totalCost.toFixed(2)}
                          </span>
                        </div>
                        </div>
                  )}

                    {shippingError && (
                      <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-sm text-amber-800">{shippingError}</p>
                          </div>
            )}
                    </div>

                  {/* Order Items Review */}
                          <div>
                    <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Order Items</h3>
                    <div className="space-y-3 sm:space-y-4">
                      {items.map((item, index) => {
                        const product = findProductById(item.productId)
                        if (!product) return null
                        
                        const itemPrice = calculateItemPrice(item)
                        
                        return (
                          <div key={index} className="border-2 border-gray-300 rounded-lg p-3 sm:p-4 bg-gradient-to-br from-white to-gray-50">
                            {/* Product Header */}
                            <div className="flex items-start space-x-3 sm:space-x-4 mb-3">
                              <img
                                src={item.customization?.mockup || product.image}
                                alt={product.title}
                                className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg flex-shrink-0 border-2 border-accent"
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm sm:text-base font-semibold text-gray-900">{product.title}</h4>
                                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                                  Quantity: <span className="font-medium">{item.quantity}</span>
                                </p>
                                {item.customization && (
                                  <div className="mt-2 inline-flex items-center px-2 py-1 bg-accent/10 text-accent text-xs font-medium rounded-full">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Customized Product
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-xs sm:text-sm text-gray-600">Item Total</p>
                                <p className="font-bold text-lg text-accent">
                                  ${(itemPrice * item.quantity).toFixed(2)}
                                </p>
                              </div>
                            </div>

                            {/* Customization Details */}
                            {item.customization && (
                              <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                                {/* Color and Size */}
                                {(item.customization.color || item.customization.size) && (
                                  <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                                    {item.customization.color && (
                                      <div>
                                        <span className="text-gray-600">Color: </span>
                                        <span className="font-medium capitalize">{item.customization.color}</span>
                                      </div>
                                    )}
                                    {item.customization.size && (
                                      <div>
                                        <span className="text-gray-600">Size: </span>
                                        <span className="font-medium uppercase">{item.customization.size}</span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Designs Count */}
                                {item.customization.designs && item.customization.designs.length > 0 && (
                                  <div className="text-xs sm:text-sm">
                                    <span className="text-gray-600">Embroidery Designs: </span>
                                    <span className="font-medium">{item.customization.designs.length} design{item.customization.designs.length > 1 ? 's' : ''}</span>
                                  </div>
                                )}

                                {/* Price Breakdown */}
                                <div className="bg-white rounded-lg p-3 space-y-2 text-xs sm:text-sm">
                                  <div className="font-medium text-gray-900 mb-2">Price Breakdown</div>
                                  <div className="flex justify-between text-gray-600">
                                    <span>Base Price:</span>
                                    <span className="font-medium">${Number(product.price || 0).toFixed(2)}</span>
                                  </div>
                                  
                                  {/* Embroidery Details */}
                                  {item.customization.designs && item.customization.designs.map((design: any, designIndex: number) => {
                                    // Calculate material cost
                                    let materialCost = 0
                                    if (design.dimensions) {
                                      try {
                                        const pricing = MaterialPricingService.calculateMaterialCosts({
                                          patchWidth: design.dimensions.width * (design.scale || 1),
                                          patchHeight: design.dimensions.height * (design.scale || 1)
                                        })
                                        materialCost = pricing.totalCost
                                      } catch (e) {
                                        console.error('Error calculating material cost:', e)
                                      }
                                    }

                                    // Calculate style options cost
                                    let stylesCost = 0
                                    if (design.selectedStyles) {
                                      const styles = design.selectedStyles
                                      if (styles.coverage) stylesCost += Number(styles.coverage.price) || 0
                                      if (styles.material) stylesCost += Number(styles.material.price) || 0
                                      if (styles.border) stylesCost += Number(styles.border.price) || 0
                                      if (styles.backing) stylesCost += Number(styles.backing.price) || 0
                                      if (styles.cutting) stylesCost += Number(styles.cutting.price) || 0
                                      if (styles.threads) styles.threads.forEach((t: any) => stylesCost += Number(t.price) || 0)
                                      if (styles.upgrades) styles.upgrades.forEach((u: any) => stylesCost += Number(u.price) || 0)
                                    }

                                    const designTotal = materialCost + stylesCost

                                    return (
                                      <div key={designIndex} className="pl-3 border-l-2 border-accent/30 space-y-1">
                                        <div className="text-gray-700 font-medium">Design {designIndex + 1}: {design.name}</div>
                                        <div className="flex justify-between text-gray-600 text-xs">
                                          <span>Material Cost:</span>
                                          <span>${materialCost.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-gray-600 text-xs">
                                          <span>Style Options:</span>
                                          <span>${stylesCost.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between font-medium text-xs">
                                          <span>Design Total:</span>
                                          <span className="text-accent">${designTotal.toFixed(2)}</span>
                                        </div>
                                      </div>
                                    )
                                  })}

                                  <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold text-sm">
                                    <span>Unit Price:</span>
                                    <span className="text-accent">${itemPrice.toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    </div>

                  {/* Important Notice */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-blue-900">Order Review Process</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Your order will be submitted for admin review. Once approved, you'll receive a notification and can proceed to payment.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Error Display */}
                  {paymentError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                        <div>
                          <h4 className="font-medium text-red-900">Submission Error</h4>
                          <p className="text-sm text-red-700 mt-1">{paymentError}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Final Order Summary & Submit */}
            {currentStep === 3 && (
              <div className="bg-white rounded-lg sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-accent" />
                  Order Summary
                </h2>
                
                <div className="space-y-6">
                  {/* Order Items Section - Always show */}
                  <div>
                    <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Order Items ({items.length})</h3>
                    
                    
                    <div className="space-y-4">
                      {items.length === 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <p className="text-yellow-800">⚠️ No items found in cart</p>
                        </div>
                      )}
                      
                      {items.map((item, index) => {
                    const product = findProductById(item.productId)
                        
                        if (!product) {
                          return (
                            <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
                              <p className="text-red-800">❌ Product not found: {item.productId}</p>
                            </div>
                          )
                        }
                        
                    return (
                      <div key={index} className="border-2 border-gray-300 rounded-lg p-4 bg-gradient-to-br from-white to-gray-50 shadow-md">
                        {/* Product Header with Image */}
                        <div className="flex items-start space-x-3 sm:space-x-4 mb-3">
                          {/* Product/Design Image */}
                          <div className="flex-shrink-0">
                            {(() => {
                              // PRIORITY 1: Show final product mockup if available
                              if (item.customization?.mockup) {
                                return (
                                  <div className="relative">
                                    <img
                                      src={item.customization.mockup}
                                      alt="Final Product"
                                      className="w-24 h-24 object-cover rounded-lg border-2 border-accent"
                                    />
                                    <div className="absolute -top-2 -right-2 bg-accent text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                                      ✓
                                    </div>
                                  </div>
                                );
                              }
                              
                              // PRIORITY 2: For multiple designs - show first design preview with count
                              if (item.customization?.designs && item.customization.designs.length > 0) {
                                const firstDesign = item.customization.designs[0];
                        return (
                                  <div className="relative">
                                    <img
                                      src={firstDesign.preview || product.image}
                                      alt={firstDesign.name || 'Design 1'}
                                      className="w-24 h-24 object-cover rounded-lg border-2 border-accent"
                                    />
                                    {item.customization.designs.length > 1 && (
                                      <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                                        +{item.customization.designs.length - 1}
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              
                              // PRIORITY 3: For custom embroidery - show uploaded design
                              if (item.productId === 'custom-embroidery' && item.customization?.embroideryData) {
                                const embroideryData = item.customization.embroideryData as any;
                                if (embroideryData.designImage) {
                                  return (
                                    <img
                                      src={embroideryData.designImage}
                                      alt="Uploaded Design"
                                      className="w-24 h-24 object-cover rounded-lg border-2 border-accent"
                                    />
                                  );
                                }
                              }
                              
                              // PRIORITY 4: Regular product image
                              return (
                              <img
                                src={product.image}
                                alt={product.title}
                                  className="w-24 h-24 object-cover rounded-lg border-2 border-gray-300"
                              />
                              );
                            })()}
                          </div>
                          
                          {/* Product Title and Quantity */}
                              <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 text-lg mb-1">
                              {product.title}
                            </h3>
                            <p className="text-sm text-gray-600 mb-2">
                              Quantity: <span className="font-medium">{item.quantity}</span>
                            </p>
                            
                            {/* Customization Badge */}
                            {item.customization && (
                              <div className="mt-2 inline-flex items-center px-2 py-1 bg-accent/10 text-accent text-xs font-medium rounded-full">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Customized Product
                                {item.customization.designs && item.customization.designs.length > 0 && (
                                  <span className="ml-1">• {item.customization.designs.length} design{item.customization.designs.length > 1 ? 's' : ''}</span>
                                )}
                              </div>
                            )}
                            
                            {/* Design Names List */}
                            {item.customization?.designs && item.customization.designs.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                {item.customization.designs.map((design: any, designIndex: number) => (
                                  <div key={designIndex} className="flex items-center text-xs text-gray-600">
                                    <span className="inline-block w-2 h-2 bg-accent rounded-full mr-2"></span>
                                    <span className="font-medium">{design.name || `Design ${designIndex + 1}`}</span>
                                    {design.dimensions && (
                                      <span className="ml-2 text-gray-400">
                                        ({design.dimensions.width.toFixed(2)}" × {design.dimensions.height.toFixed(2)}")
                                      </span>
                                    )}
                                  </div>
                                ))}
                                  </div>
                                )}
                              </div>
                              
                              {/* Item Total Display */}
                              <div className="text-right flex-shrink-0">
                                <p className="text-xs sm:text-sm text-gray-600">Item Total</p>
                                <p className="font-bold text-lg sm:text-xl text-accent">
                                  ${(calculateItemPrice(item) * item.quantity).toFixed(2)}
                                </p>
                              </div>
                        </div>
                        
                        {/* Color and Size Info */}
                        {item.customization && (item.customization.color || item.customization.size) && (
                          <div className="border-t border-gray-200 pt-3 mt-3">
                            <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                              {item.customization.color && (
                                <div>
                                  <span className="text-gray-600">Color: </span>
                                  <span className="font-medium capitalize">{item.customization.color}</span>
                                </div>
                              )}
                              {item.customization.size && (
                                <div>
                                  <span className="text-gray-600">Size: </span>
                                  <span className="font-medium uppercase">{item.customization.size}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Pricing Breakdown */}
                        <div className="border-t border-gray-200 pt-4 mt-3 space-y-2 text-sm">
                          <div className="font-medium text-gray-900 mb-3 text-base">Detailed Price Breakdown</div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Base Product Price:</span>
                            <span className="font-medium">${Number(product.price).toFixed(2)}</span>
                          </div>
                          
                          {/* Customization Breakdown */}
                          {item.customization?.designs && item.customization.designs.length > 0 && (
                            <>
                              {/* All Design Previews Gallery */}
                              {item.customization.designs.length > 1 && (
                                <div className="mb-3 pb-3 border-b border-gray-200">
                                  <p className="text-xs font-medium text-gray-700 mb-2">All Designs:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {item.customization.designs.map((design: any, designIndex: number) => (
                                      <div key={designIndex} className="relative group">
                                        <img
                                          src={design.preview}
                                          alt={design.name || `Design ${designIndex + 1}`}
                                          className="w-16 h-16 object-cover rounded border-2 border-gray-300 group-hover:border-accent transition-colors"
                                        />
                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity rounded flex items-center justify-center">
                                          <span className="text-white text-xs font-bold opacity-0 group-hover:opacity-100">
                                            {designIndex + 1}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Individual Design Pricing */}
                              <div className="space-y-3 mt-3">
                                {item.customization.designs.map((design: any, designIndex: number) => {
                                  // Calculate material cost
                                  let materialCost = 0;
                                  if (design.dimensions && design.dimensions.width > 0 && design.dimensions.height > 0) {
                                    try {
                                      const materialCosts = MaterialPricingService.calculateMaterialCosts({
                                        patchWidth: design.dimensions.width * (design.scale || 1),
                                        patchHeight: design.dimensions.height * (design.scale || 1)
                                      });
                                      materialCost = materialCosts.totalCost;
                                    } catch (error) {
                                      console.warn('Failed to calculate material costs:', error);
                                    }
                                  }
                                  
                                  // Calculate style options cost
                                  let stylesCost = 0
                                  if (design.selectedStyles) {
                                    const styles = design.selectedStyles
                                    if (styles.coverage) stylesCost += Number(styles.coverage.price) || 0
                                    if (styles.material) stylesCost += Number(styles.material.price) || 0
                                    if (styles.border) stylesCost += Number(styles.border.price) || 0
                                    if (styles.backing) stylesCost += Number(styles.backing.price) || 0
                                    if (styles.cutting) stylesCost += Number(styles.cutting.price) || 0
                                    if (styles.threads) styles.threads.forEach((t: any) => stylesCost += Number(t.price) || 0)
                                    if (styles.upgrades) styles.upgrades.forEach((u: any) => stylesCost += Number(u.price) || 0)
                                  }
                                  
                                  const designTotal = materialCost + stylesCost
                                  
                                  return (
                                    <div key={designIndex} className="pl-3 border-l-2 border-accent/30 bg-white rounded-lg p-3 space-y-2">
                                      {/* Design Header */}
                                      <div className="text-gray-700 font-semibold text-sm mb-2">
                                        Design {designIndex + 1}: {design.name}
                                      </div>
                                    
                                      {/* Material Cost */}
                                      <div className="flex justify-between text-gray-600 text-xs">
                                        <span>Material Cost:</span>
                                        <span>${materialCost.toFixed(2)}</span>
                                      </div>
                                      
                                      {/* Style Options Cost */}
                                      <div className="flex justify-between text-gray-600 text-xs">
                                        <span>Style Options:</span>
                                        <span>${stylesCost.toFixed(2)}</span>
                                      </div>
                                      
                                      {/* Design Total */}
                                      <div className="flex justify-between font-medium text-xs pt-2 border-t border-gray-200">
                                        <span>Design Total:</span>
                                        <span className="text-accent">${designTotal.toFixed(2)}</span>
                                      </div>
                                    </div>
                                );
                      })}
                    </div>
                            </>
                          )}
                          
                          {/* Unit Price */}
                          <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold text-sm mt-2">
                            <span>Unit Price:</span>
                            <span className="text-accent">${calculateItemPrice(item).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                      
                    </div>
                  </div>
                  
                  {/* Final Totals */}
                  <div className="border-t-2 border-gray-300 pt-4 space-y-2">
                    <div className="flex justify-between text-base">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">${calculateSubtotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-base">
                      <span className="text-gray-600">Shipping:</span>
                      <span className="font-medium">${(selectedShippingRate?.totalCost || 0).toFixed(2)}</span>
                    </div>
                    {selectedShippingRate && (
                      <div className="text-sm text-gray-500 ml-4">
                        {selectedShippingRate.serviceName} • {selectedShippingRate.carrier}
                      </div>
                    )}
                    <div className="flex justify-between text-base">
                      <span className="text-gray-600">Tax (8%):</span>
                      <span className="font-medium">${calculateTax().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold pt-2 border-t">
                      <span className="text-gray-900">Order Total:</span>
                      <span className="text-accent">${calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                  
                  {/* Important Notice */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-blue-900">Ready to Submit?</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          By clicking "Submit for Review", your order will be sent to our team for approval. Once approved, you'll receive a notification and can proceed to payment.
                        </p>
                    </div>
                  </div>
                  </div>
                  
                  {/* Error Display */}
                  {paymentError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                        <div>
                          <h4 className="font-medium text-red-900">Submission Error</h4>
                          <p className="text-sm text-red-700 mt-1">{paymentError}</p>
                        </div>
                      </div>
                    </div>
                  )}
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
                  {currentStep === 1 && isCalculatingShipping ? 'Calculating...' : 
                   currentStep === 1 ? 'Continue to Shipping' :
                   'Review Order Summary'}
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
                  {isProcessing ? 'Submitting...' : 'Submit for Review'}
                  <CheckCircle className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1 min-w-0">
            <div className="bg-white rounded-lg sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 lg:sticky lg:top-8 w-full">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Order Summary</h3>
              
              {/* Order Items List */}
              <div className="mb-4 space-y-3 max-h-64 overflow-y-auto">
                {items.map((item, index) => {
                  const product = findProductById(item.productId)
                  if (!product) return null
                  
                  const itemPrice = calculateItemPrice(item)
                  
                  return (
                    <div key={index} className="flex items-start space-x-3 pb-3 border-b border-gray-100 last:border-0">
                      <img
                        src={item.customization?.mockup || product.image}
                        alt={product.title}
                        className="w-12 h-12 object-cover rounded-lg flex-shrink-0 border border-gray-200"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-medium text-gray-900 line-clamp-2">{product.title}</h4>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-gray-600">Qty: {item.quantity}</span>
                          <span className="text-xs font-semibold text-accent">${(itemPrice * item.quantity).toFixed(2)}</span>
                        </div>
                        {item.customization && (
                          <div className="mt-1 flex items-center text-xs text-accent">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            <span>Customized</span>
                          </div>
                        )}
                        {item.customization?.designs && item.customization.designs.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            {item.customization.designs.length} embroidery design{item.customization.designs.length > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Price Summary */}
                <div className="space-y-3 sm:space-y-4 pt-3 border-t-2 border-gray-200">
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">${calculateSubtotal().toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-600">Shipping:</span>
                  <span className="font-medium text-right ml-2 flex-shrink-0">
                    {selectedShippingRate === null ? 'TBD' : 
                     selectedShippingRate.totalCost === 0 ? 'Free' : 
                     `$${selectedShippingRate.totalCost.toFixed(2)}`}
                  </span>
                </div>
                
                {selectedShippingRate && selectedShippingRate.serviceName && (
                  <div className="flex items-center text-xs text-gray-500 flex-wrap -mt-2">
                    <Truck className="w-3 h-3 mr-1 flex-shrink-0" />
                    <span className="break-words">{selectedShippingRate.serviceName}</span>
                    {selectedShippingRate.carrier && (
                      <span className="ml-1">• {selectedShippingRate.carrier}</span>
                    )}
                  </div>
                )}
                
                {shippingError && (
                  <div className="flex items-start text-xs text-amber-600">
                    <AlertCircle className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                    <span className="break-words">{shippingError}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-600">Tax (8%):</span>
                  <span className="font-medium">${calculateTax().toFixed(2)}</span>
                </div>
                
                <div className="border-t-2 border-gray-300 pt-3 sm:pt-4">
                  <div className="flex justify-between text-base sm:text-lg font-bold">
                    <span className="text-gray-900">Order Total:</span>
                    <span className="text-accent">${calculateTotal().toFixed(2)}</span>
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
