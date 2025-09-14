import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Upload, X, RotateCcw, Download, Check, ArrowRight, Move, ShoppingCart, Grip, Info, ArrowLeft } from 'lucide-react'
import { useCustomization } from '../context/CustomizationContext'
import { useCart } from '../context/CartContext'
import { products } from '../../data/products'
import { productApiService } from '../../shared/productApiService'
import Button from '../../components/Button'
import StepByStepCustomization from '../components/StepByStepCustomization'
import ChatWidget from '../components/ChatWidget'

export default function Customize() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { customizationData, setCustomizationData, uploadDesign, removeDesign, calculateTotalPrice } = useCustomization()
  const { add: addToCart } = useCart()
  const [currentStep, setCurrentStep] = useState(1)
  const [dragActive, setDragActive] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 })
  const [showGuidelines, setShowGuidelines] = useState(false)
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const productRef = useRef<HTMLDivElement>(null)
  const initializedRef = useRef(false)

  // Fetch product data from API
  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return
      
      try {
        setLoading(true)
        setError(null)
        
        const response = await productApiService.getProductById(parseInt(id))
        setProduct(response.data)
      } catch (err) {
        setError('Product not found')
        console.error('Error fetching product:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [id])

  const initializeProduct = useCallback(() => {
    if (product && !initializedRef.current) {
      setCustomizationData({
        productId: product.id.toString(),
        productName: product.title,
        productImage: product.image,
        basePrice: product.price
      })
      initializedRef.current = true
    }
  }, [product, setCustomizationData])

  useEffect(() => {
    initializeProduct()
  }, [initializeProduct])

  // Get available colors from variants
  const getAvailableColors = () => {
    if (!product?.variants) return []
    
    const colors = product.variants
      .filter((variant: any) => variant.stock > 0 && variant.isActive)
      .map((variant: any) => variant.color)
      .filter((color: string, index: number, arr: string[]) => arr.indexOf(color) === index)
    
    return colors
  }

  // Get available sizes from variants
  const getAvailableSizes = () => {
    if (!product?.variants) return []
    
    const sizes = product.variants
      .filter((variant: any) => variant.stock > 0 && variant.isActive)
      .map((variant: any) => variant.size)
      .filter((size: string, index: number, arr: string[]) => arr.indexOf(size) === index)
    
    return sizes
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        // For non-sizing products, skip color/size validation
        if (!product?.hasSizing) {
          return true
        }
        return customizationData.color !== '' && customizationData.size !== ''
      case 2:
        return customizationData.design !== null
      case 3:
        return true // Customize position step
      case 4:
        // Step 4 is handled by StepByStepCustomization component
        return true
      case 5:
        return true // Review step
      default:
        return false
    }
  }

  // Function to get automatic positioning based on placement
  const getAutomaticPosition = (placement: string) => {
    const basePositions = {
      'front': { x: 150, y: 120 }, // Center of chest
      'back': { x: 150, y: 120 }, // Center of back
      'left-chest': { x: 100, y: 120 }, // Left side of chest
      'right-chest': { x: 200, y: 120 }, // Right side of chest
      'sleeve': { x: 50, y: 200 }, // On the sleeve
      'manual': customizationData.designPosition // Keep current position for manual
    }
    return basePositions[placement as keyof typeof basePositions] || { x: 150, y: 120 }
  }

  // Auto-position design when placement changes (except for manual)
  useEffect(() => {
    if (customizationData.placement && customizationData.placement !== 'manual' && customizationData.design) {
      const newPosition = getAutomaticPosition(customizationData.placement)
      setCustomizationData({ designPosition: newPosition })
    }
  }, [customizationData.placement])

  // Add global touch event listeners for mobile dragging
  useEffect(() => {
    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        e.preventDefault()
        const touch = e.touches[0]
        const newX = touch.clientX - dragStart.x
        const newY = touch.clientY - dragStart.y
        setDragPosition({ x: newX, y: newY })
      }
    }

    const handleGlobalTouchEnd = () => {
      if (isDragging) {
        setIsDragging(false)
        setDragActive(false)
      }
    }

    if (isDragging) {
      document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false })
      document.addEventListener('touchend', handleGlobalTouchEnd)
    }

    return () => {
      document.removeEventListener('touchmove', handleGlobalTouchMove)
      document.removeEventListener('touchend', handleGlobalTouchEnd)
    }
  }, [isDragging, dragStart])

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading product...</p>
        </div>
      </main>
    )
  }

  if (error || !product) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Product not found</h1>
          <Button onClick={() => navigate('/products')}>Back to Products</Button>
        </div>
      </main>
    )
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type.startsWith('image/')) {
        uploadDesign(file)
      }
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadDesign(e.target.files[0])
    }
  }

  const handleDesignStart = (e: React.MouseEvent | React.TouchEvent) => {
    // Only allow dragging in manual mode
    if (customizationData.placement !== 'manual') return
    
    e.preventDefault()
    setIsDragging(true)
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    setDragStart({
      x: clientX - customizationData.designPosition.x,
      y: clientY - customizationData.designPosition.y
    })
    setDragPosition(customizationData.designPosition)
  }

  const handleDesignMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !productRef.current) return

    e.preventDefault()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    const rect = productRef.current.getBoundingClientRect()
    const newX = Math.max(0, Math.min(rect.width - 100, clientX - dragStart.x))
    const newY = Math.max(0, Math.min(rect.height - 100, clientY - dragStart.y))

    // Update local state for immediate visual feedback
    setDragPosition({ x: newX, y: newY })
  }

  const handleDesignEnd = () => {
    setIsDragging(false)
    // Update the actual customization data when dragging ends
    setCustomizationData({
      designPosition: dragPosition
    })
  }

  const handleDesignWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    
    if (e.ctrlKey || e.metaKey) {
      // Ctrl+scroll for rotation
      const rotationChange = e.deltaY > 0 ? -15 : 15
      const newRotation = (customizationData.designRotation + rotationChange) % 360
      setCustomizationData({ designRotation: newRotation < 0 ? 360 + newRotation : newRotation })
    } else {
      // Regular scroll for scaling
      const scaleChange = e.deltaY > 0 ? -0.1 : 0.1
      const newScale = Math.max(0.5, Math.min(2, customizationData.designScale + scaleChange))
      setCustomizationData({ designScale: newScale })
    }
  }

  const steps = [
    { number: 1, title: 'Choose Color & Size', description: 'Select color and size' },
    { number: 2, title: 'Upload Design', description: 'Upload your design file' },
    { number: 3, title: 'Customize Position', description: 'Position and adjust your design' },
    { number: 4, title: 'Choose Embroidery', description: 'Select embroidery options' },
    { number: 5, title: 'Review', description: 'Review and checkout' }
  ]

  const getStepProgress = () => {
    return ((currentStep - 1) / (steps.length - 1)) * 100
  }

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }


  const handleCheckout = async () => {
    if (!product) return
    
    // Add customized item to cart with stock validation
    const success = await addToCart(product.id.toString(), customizationData.quantity, {
      design: customizationData.design ? {
        name: customizationData.design.name,
        size: customizationData.design.size,
        preview: customizationData.design.preview
      } : null,
      selectedStyles: {
        coverage: customizationData.selectedStyles.coverage,
        material: customizationData.selectedStyles.material,
        border: customizationData.selectedStyles.border,
        threads: customizationData.selectedStyles.threads,
        backing: customizationData.selectedStyles.backing,
        upgrades: customizationData.selectedStyles.upgrades,
        cutting: customizationData.selectedStyles.cutting
      },
      placement: customizationData.placement,
      size: customizationData.size || 'medium',
      color: customizationData.color,
      notes: customizationData.notes,
      designPosition: customizationData.designPosition,
      designScale: customizationData.designScale,
      designRotation: customizationData.designRotation
    })
    
    if (success) {
      console.log('Added customized item to cart:', customizationData)
      navigate('/checkout')
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              onClick={() => navigate('/products')}
              className="flex items-center text-sm sm:text-base"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Back to Products</span>
              <span className="sm:hidden">Back</span>
            </Button>
            <div className="flex-1"></div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Customize Your {product.title}</h1>
          <p className="text-sm sm:text-base text-gray-600">Create your perfect embroidered design</p>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
          {/* Mobile Progress - Horizontal Scroll */}
          <div className="block sm:hidden">
            <div className="flex items-center space-x-4 overflow-x-auto pb-2">
              {steps.map((step, index) => (
                <div key={step.number} className="flex-shrink-0 text-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold mx-auto mb-2 ${
                    currentStep >= step.number
                      ? 'bg-accent text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {currentStep > step.number ? <Check className="w-4 h-4" /> : step.number}
                  </div>
                  <p className={`text-xs font-medium ${
                    currentStep >= step.number ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </p>
                </div>
              ))}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
              <div 
                className="bg-accent h-2 rounded-full transition-all duration-300"
                style={{ width: `${getStepProgress()}%` }}
              />
            </div>
          </div>

          {/* Desktop Progress - Full Layout */}
          <div className="hidden sm:block">
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                    currentStep >= step.number
                      ? 'bg-accent text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {currentStep > step.number ? <Check className="w-5 h-5" /> : step.number}
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${
                      currentStep >= step.number ? 'text-gray-900' : 'text-gray-500'
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
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-accent h-2 rounded-full transition-all duration-300"
                style={{ width: `${getStepProgress()}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Left Side - Product Preview */}
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Preview</h3>
              
              {/* Product Image with Design Overlay */}
              <div className="relative" ref={productRef}>
                <img
                  src={product.image}
                  alt={product.title}
                  className="w-full h-64 sm:h-80 lg:h-96 object-cover rounded-lg"
                />
                 {customizationData.design && (
                   <div
                     className={`absolute select-none ${
                       isDragging 
                         ? 'cursor-grabbing scale-105 z-10' 
                         : customizationData.placement === 'manual' 
                           ? 'cursor-grab hover:scale-105 transition-all duration-200'
                           : 'cursor-default'
                     }`}
                     style={{
                       left: `${isDragging ? dragPosition.x : (customizationData.placement === 'manual' ? customizationData.designPosition.x : getAutomaticPosition(customizationData.placement).x)}px`,
                       top: `${isDragging ? dragPosition.y : (customizationData.placement === 'manual' ? customizationData.designPosition.y : getAutomaticPosition(customizationData.placement).y)}px`,
                       transform: `scale(${customizationData.designScale}) rotate(${customizationData.designRotation}deg)`,
                       transformOrigin: 'center'
                     }}
                     onMouseDown={handleDesignStart}
                     onMouseMove={handleDesignMove}
                     onMouseUp={handleDesignEnd}
                     onMouseLeave={handleDesignEnd}
                     onTouchStart={handleDesignStart}
                     onTouchMove={handleDesignMove}
                     onTouchEnd={handleDesignEnd}
                     onWheel={handleDesignWheel}
                   >
                     {/* Design Image with Enhanced Styling */}
                     <div className="relative group">
                       <img
                         src={customizationData.design.preview}
                         alt="Design preview"
                         className="w-24 h-24 object-contain drop-shadow-2xl border-2 border-white/50 rounded-lg"
                         style={{
                           filter: isDragging ? 'brightness(1.1) contrast(1.1)' : 'none'
                         }}
                       />
                       
                       {/* Drag Handle - Always Visible */}
                       <div className={`absolute -top-2 -left-2 bg-accent text-white p-1 rounded-full shadow-lg transition-all duration-200 ${
                         isDragging ? 'scale-110 opacity-100' : 'opacity-80 group-hover:opacity-100 group-hover:scale-110'
                       }`}>
                         <Grip className="w-3 h-3" />
                       </div>
                       
                       {/* Close/Remove Button */}
                       <button
                         className={`absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg transition-all duration-200 hover:bg-red-600 ${
                           isDragging ? 'scale-110 opacity-100' : 'opacity-80 group-hover:opacity-100 group-hover:scale-110'
                         }`}
                         onClick={(e) => {
                           e.stopPropagation()
                           removeDesign()
                         }}
                         title="Remove design"
                       >
                         <X className="w-3 h-3" />
                       </button>
                       
                       {/* Replace Design Button */}
                       <button
                         className={`absolute -bottom-2 -right-2 bg-blue-500 text-white p-1 rounded-full shadow-lg transition-all duration-200 hover:bg-blue-600 ${
                           isDragging ? 'scale-110 opacity-100' : 'opacity-80 group-hover:opacity-100 group-hover:scale-110'
                         }`}
                         onClick={(e) => {
                           e.stopPropagation()
                           const input = document.getElementById('design-upload') as HTMLInputElement
                           if (input) {
                             input.value = ''
                             input.click()
                           }
                         }}
                         title="Replace design"
                       >
                         <Upload className="w-3 h-3" />
                       </button>
                       
                       {/* Corner Resize Handles */}
                       <div className="absolute -top-1 -left-1 w-3 h-3 bg-accent rounded-full border-2 border-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                       <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full border-2 border-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                       <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-accent rounded-full border-2 border-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                       <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-accent rounded-full border-2 border-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                       
                       {/* Rotation Handle */}
                       <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-accent rounded-full border border-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                     </div>
                     
           {/* Enhanced Tooltip - Only show in manual mode */}
           {customizationData.placement === 'manual' && (
             <div className={`absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap transition-all duration-200 ${
               isDragging ? 'opacity-100 scale-110' : 'opacity-0 group-hover:opacity-100'
             }`}>
               <div className="flex items-center space-x-2">
                 <Grip className="w-3 h-3" />
                 <span>Drag handle to move</span>
                 <span className="text-gray-400">•</span>
                 <span>Scroll to resize</span>
                 <span className="text-gray-400">•</span>
                 <span>Ctrl+scroll to rotate</span>
               </div>
               {/* Tooltip Arrow */}
               <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
             </div>
           )}
                     
                     {/* Scale Indicator */}
                     <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded-full">
                       {Math.round(customizationData.designScale * 100)}%
                     </div>
                   </div>
                 )}
              </div>

              {customizationData.design && (
                <div className="mt-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                  {customizationData.placement === 'manual' ? (
                    <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-6 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Grip className="w-4 h-4 text-accent" />
                        <span>Drag handle to move</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-4 h-4 bg-accent rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">+</span>
                        </div>
                        <span>Scroll to resize</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-4 h-4 bg-accent rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">↻</span>
                        </div>
                        <span>Ctrl+scroll to rotate</span>
                      </div>
                      <div className="block sm:hidden text-xs text-accent font-medium">
                        💡 Touch and drag on mobile
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-sm text-gray-600">
                      <div className="flex items-center justify-center space-x-2">
                        <Check className="w-4 h-4 text-purple-500" />
                        <span>Design automatically positioned at {customizationData.placement.replace('-', ' ')}</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">Select "Manual" placement to drag and position freely</p>
                    </div>
                  )}
                </div>
              )}
            </div>

              {/* Design Controls */}
              {customizationData.design && currentStep === 3 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Design Controls</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Scale: {Math.round(customizationData.designScale * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={customizationData.designScale}
                      onChange={(e) => setCustomizationData({ designScale: parseFloat(e.target.value) })}
                      className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rotation: {customizationData.designRotation}°
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="15"
                      value={customizationData.designRotation}
                      onChange={(e) => setCustomizationData({ designRotation: parseInt(e.target.value) })}
                      className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCustomizationData({
                        designPosition: { x: 50, y: 50 },
                        designScale: 1,
                        designRotation: 0
                      })}
                      className="w-full sm:w-auto"
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Reset Position
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Side - Customization Options */}
          <div className="space-y-4 sm:space-y-6">
             {/* Step 1: Choose Color & Size */}
             {currentStep === 1 && product?.hasSizing && (
               <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
                 <h3 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Choose Color & Size</h3>
                 
                 <div className="space-y-6 sm:space-y-8">
                   {/* Color Selection */}
                   {getAvailableColors().length > 0 && (
                     <div>
                       <h4 className="text-md font-medium text-gray-900 mb-4">Select Color</h4>
                       <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                         {getAvailableColors().map((color: string) => (
                           <button
                             key={color}
                             onClick={() => setCustomizationData({ color })}
                             className={`p-2 sm:p-3 rounded-lg border-2 transition-all ${
                               customizationData.color === color
                                 ? 'border-accent bg-accent/10 text-accent'
                                 : 'border-gray-200 hover:border-gray-300 text-gray-700'
                             }`}
                           >
                             <div className="flex items-center space-x-2">
                               <div 
                                 className="w-3 h-3 sm:w-4 sm:h-4 rounded-full border border-gray-300"
                                 style={{ 
                                   backgroundColor: color.toLowerCase().includes('white') ? '#ffffff' :
                                                   color.toLowerCase().includes('black') ? '#000000' :
                                                   color.toLowerCase().includes('navy') ? '#1e3a8a' :
                                                   color.toLowerCase().includes('gray') ? '#6b7280' :
                                                   color.toLowerCase().includes('red') ? '#dc2626' :
                                                   color.toLowerCase().includes('green') ? '#7c3aed' :
                                                   color.toLowerCase().includes('blue') ? '#2563eb' :
                                                   color.toLowerCase().includes('maroon') ? '#7c2d12' :
                                                   color.toLowerCase().includes('burgundy') ? '#7c2d12' :
                                                   color.toLowerCase().includes('charcoal') ? '#374151' :
                                                   '#6b7280'
                                 }}
                               ></div>
                               <span className="text-xs sm:text-sm font-medium">{color}</span>
                             </div>
                           </button>
                         ))}
                       </div>
                     </div>
                   )}

                   {/* Size Selection */}
                   {getAvailableSizes().length > 0 && (
                     <div>
                       <h4 className="text-md font-medium text-gray-900 mb-4">Select Size</h4>
                       <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-3">
                         {getAvailableSizes().map((size: string) => (
                           <button
                             key={size}
                             onClick={() => setCustomizationData({ size: size.toLowerCase() as 'small' | 'medium' | 'large' | 'extra-large' })}
                             className={`p-2 sm:p-3 rounded-lg border-2 transition-all text-center ${
                               customizationData.size === size.toLowerCase()
                                 ? 'border-accent bg-accent text-white'
                                 : 'border-gray-200 hover:border-gray-300 text-gray-700'
                             }`}
                           >
                             <span className="text-xs sm:text-sm font-medium">{size}</span>
                           </button>
                         ))}
                       </div>
                     </div>
                   )}

                   {/* Size Guide - Only show if there are multiple sizes */}
                   {getAvailableSizes().length > 1 && (
                     <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                       <h5 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">Size Guide</h5>
                       <div className="text-xs sm:text-sm text-gray-600 space-y-1">
                         <p><strong>XS:</strong> Chest 32-34" | Length 26"</p>
                         <p><strong>S:</strong> Chest 34-36" | Length 27"</p>
                         <p><strong>M:</strong> Chest 36-38" | Length 28"</p>
                         <p><strong>L:</strong> Chest 38-40" | Length 29"</p>
                         <p><strong>XL:</strong> Chest 40-42" | Length 30"</p>
                         <p><strong>XXL:</strong> Chest 42-44" | Length 31"</p>
                       </div>
                     </div>
                   )}
                 </div>

                 <div className="mt-6 flex flex-col sm:flex-row justify-between space-y-3 sm:space-y-0">
                   <Button variant="outline" onClick={prevStep} className="w-full sm:w-auto">
                     Previous
                   </Button>
                   <Button onClick={nextStep} disabled={!canProceed()} className="w-full sm:w-auto">
                     Continue
                     <ArrowRight className="w-4 h-4 ml-2" />
                   </Button>
                 </div>
               </div>
             )}

             {/* Step 1: Skip Color & Size for Non-Sizing Products */}
             {currentStep === 1 && !product?.hasSizing && (
               <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
                 <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Details</h3>
                 <p className="text-sm sm:text-base text-gray-600 mb-6">
                   This product doesn't require color or size selection. You can proceed to upload your design.
                 </p>
                 
                 <div className="mt-6 flex flex-col sm:flex-row justify-between space-y-3 sm:space-y-0">
                   <Button variant="outline" onClick={prevStep} className="w-full sm:w-auto">
                     Previous
                   </Button>
                   <Button onClick={nextStep} className="w-full sm:w-auto">
                     Continue
                     <ArrowRight className="w-4 h-4 ml-2" />
                   </Button>
                 </div>
               </div>
             )}

             {/* Step 2: Upload Design */}
             {currentStep === 2 && (
               <div className="space-y-4 sm:space-y-6">
                 {/* Upload Section */}
                 <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
                   <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 space-y-2 sm:space-y-0">
                     <h3 className="text-lg font-semibold text-gray-900">Upload Your Design</h3>
                     <button
                       onClick={() => setShowGuidelines(true)}
                       className="flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium self-start sm:self-auto"
                     >
                       <Info className="w-4 h-4 mr-1" />
                       Design Guidelines
                     </button>
                   </div>
                
                {!customizationData.design ? (
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors ${
                      dragActive ? 'border-accent bg-accent/5' : 'border-gray-300'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                      Drag and drop your design here
                    </p>
                    <p className="text-sm sm:text-base text-gray-600 mb-4">
                      or click to browse files
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileInput}
                      className="hidden"
                      id="design-upload"
                    />
                    <label
                      htmlFor="design-upload"
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                    >
                      Choose File
                    </label>
                    <p className="text-xs text-gray-500 mt-2">
                      Supports PNG, JPG, SVG up to 10MB
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                      <img
                        src={customizationData.design.preview}
                        alt="Design preview"
                        className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{customizationData.design.name}</p>
                        <p className="text-xs sm:text-sm text-gray-600">
                          {(customizationData.design.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        onClick={removeDesign}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                     <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                       <Button
                         variant="outline"
                         onClick={() => {
                           const input = document.getElementById('design-upload') as HTMLInputElement
                           if (input) {
                             input.value = '' // Reset input to allow same file selection
                             input.click()
                           }
                         }}
                         className="w-full sm:w-auto"
                       >
                         Replace Design
                       </Button>
                       <Button
                         onClick={nextStep}
                         disabled={!canProceed()}
                         className="w-full sm:w-auto"
                       >
                         Continue
                         <ArrowRight className="w-4 h-4 ml-2" />
                       </Button>
                     </div>
                   </div>
                )}
                 </div>
               </div>
             )}

              {/* Step 3: Customize Position */}
              {currentStep === 3 && (
               <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
                 <h3 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Customize Your Design</h3>
                 
                 <div className="space-y-4 sm:space-y-6">
                   {/* Placement Selection */}
                   <div>
                     <h4 className="text-md font-medium text-gray-900 mb-4">Choose Placement</h4>
                     <p className="text-sm text-gray-600 mb-4">Select automatic positioning or choose manual for custom placement</p>
                     
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                       {[
                         { value: 'front', label: 'Front Center', description: 'Center of the chest' },
                         { value: 'back', label: 'Back Center', description: 'Center of the back' },
                         { value: 'left-chest', label: 'Left Chest', description: 'Left side of chest' },
                         { value: 'right-chest', label: 'Right Chest', description: 'Right side of chest' },
                         { value: 'sleeve', label: 'Sleeve', description: 'On the sleeve' },
                         { value: 'manual', label: 'Manual', description: 'Drag to position anywhere' }
                       ].map((option) => (
                         <div
                           key={option.value}
                           className={`border-2 rounded-lg p-3 sm:p-4 cursor-pointer transition-all relative ${
                             customizationData.placement === option.value
                               ? 'border-accent bg-accent/5'
                               : 'border-gray-200 hover:border-gray-300'
                           }`}
                           onClick={() => setCustomizationData({ placement: option.value as any })}
                         >
                           <div className="text-center">
                             <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-2 sm:mb-3">
                               {option.value === 'manual' ? (
                                 <Move className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                               ) : (
                                 <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-300 rounded"></div>
                               )}
                             </div>
                             <h4 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">{option.label}</h4>
                             <p className="text-xs sm:text-sm text-gray-600">{option.description}</p>
                           </div>
                           {customizationData.placement === option.value && (
                             <div className="absolute top-2 right-2 w-5 h-5 sm:w-6 sm:h-6 bg-accent rounded-full flex items-center justify-center">
                               <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                             </div>
                           )}
                         </div>
                       ))}
                     </div>
                   </div>

                   {/* Quantity and Notes */}
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                       <input
                         type="number"
                         min="1"
                         max="100"
                         value={customizationData.quantity}
                         onChange={(e) => setCustomizationData({ quantity: parseInt(e.target.value) })}
                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
                       />
                     </div>
                     
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                       <textarea
                         value={customizationData.notes}
                         onChange={(e) => setCustomizationData({ notes: e.target.value })}
                         placeholder="Any special instructions or requirements..."
                         rows={3}
                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
                       />
                     </div>
                   </div>
                 </div>

                 <div className="mt-6 flex flex-col sm:flex-row justify-between space-y-3 sm:space-y-0">
                   <Button variant="outline" onClick={prevStep} className="w-full sm:w-auto">
                     Previous
                   </Button>
                   <Button onClick={nextStep} disabled={!canProceed()} className="w-full sm:w-auto">
                     Continue
                     <ArrowRight className="w-4 h-4 ml-2" />
                   </Button>
                 </div>
                </div>
              )}

              {/* Step 4: Choose Embroidery */}
              {currentStep === 4 && (
                <StepByStepCustomization 
                  onComplete={nextStep} 
                  onBackToDesign={() => setCurrentStep(2)}
                />
              )}

              {/* Step 5: Review */}
             {currentStep === 5 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Your Order</h3>
                
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm sm:text-base text-gray-600">Base Price</span>
                    <span className="font-semibold text-sm sm:text-base">${customizationData.basePrice.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm sm:text-base text-gray-600">Color</span>
                    <span className="font-semibold text-sm sm:text-base capitalize">{customizationData.color}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm sm:text-base text-gray-600">Size</span>
                    <span className="font-semibold text-sm sm:text-base uppercase">{customizationData.size}</span>
                  </div>
                  
                  {customizationData.selectedStyles.coverage && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm sm:text-base text-gray-600">{customizationData.selectedStyles.coverage.name}</span>
                      <span className="font-semibold text-sm sm:text-base">
                        {customizationData.selectedStyles.coverage.price === 0 ? 'Free' : `+$${customizationData.selectedStyles.coverage.price.toFixed(2)}`}
                      </span>
                    </div>
                  )}
                  
                  {customizationData.selectedStyles.material && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm sm:text-base text-gray-600">{customizationData.selectedStyles.material.name}</span>
                      <span className="font-semibold text-sm sm:text-base">
                        {customizationData.selectedStyles.material.price === 0 ? 'Free' : `+$${customizationData.selectedStyles.material.price.toFixed(2)}`}
                      </span>
                    </div>
                  )}
                  
                  {customizationData.selectedStyles.border && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm sm:text-base text-gray-600">{customizationData.selectedStyles.border.name}</span>
                      <span className="font-semibold text-sm sm:text-base">
                        {customizationData.selectedStyles.border.price === 0 ? 'Free' : `+$${customizationData.selectedStyles.border.price.toFixed(2)}`}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm sm:text-base text-gray-600">Placement</span>
                    <span className="font-semibold text-sm sm:text-base capitalize">
                      {customizationData.placement === 'manual' ? 'Manual Position' : customizationData.placement.replace('-', ' ')}
                    </span>
                  </div>
                  
                  {customizationData.selectedStyles.threads.map((thread) => (
                    <div key={thread.id} className="flex items-center justify-between">
                      <span className="text-sm sm:text-base text-gray-600">{thread.name}</span>
                      <span className="font-semibold text-sm sm:text-base">+${thread.price.toFixed(2)}</span>
                    </div>
                  ))}
                  
                  {customizationData.selectedStyles.backing && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm sm:text-base text-gray-600">{customizationData.selectedStyles.backing.name}</span>
                      <span className="font-semibold text-sm sm:text-base">
                        {customizationData.selectedStyles.backing.price === 0 ? 'Free' : `+$${customizationData.selectedStyles.backing.price.toFixed(2)}`}
                      </span>
                    </div>
                  )}
                  
                  {customizationData.selectedStyles.upgrades.map((upgrade) => (
                    <div key={upgrade.id} className="flex items-center justify-between">
                      <span className="text-sm sm:text-base text-gray-600">{upgrade.name}</span>
                      <span className="font-semibold text-sm sm:text-base">+${upgrade.price.toFixed(2)}</span>
                    </div>
                  ))}
                  
                  {customizationData.selectedStyles.cutting && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm sm:text-base text-gray-600">{customizationData.selectedStyles.cutting.name}</span>
                      <span className="font-semibold text-sm sm:text-base">
                        {customizationData.selectedStyles.cutting.price === 0 ? 'Free' : `+$${customizationData.selectedStyles.cutting.price.toFixed(2)}`}
                      </span>
                    </div>
                  )}
                  
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between text-base sm:text-lg font-bold">
                      <span>Total</span>
                      <span>${calculateTotalPrice().toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row justify-between space-y-3 sm:space-y-0">
                  <Button variant="outline" onClick={prevStep} className="w-full sm:w-auto">
                    Previous
                  </Button>
                  <Button variant="add-to-cart" onClick={handleCheckout} className="w-full sm:w-auto">
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Proceed to Checkout
                  </Button>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Chat Widget - Positioned within responsive container */}
        <div className="fixed bottom-4 right-4 lg:bottom-6 lg:right-6 z-40">
          <ChatWidget />
        </div>
      </div>

      {/* Guidelines Modal */}
      {showGuidelines && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Info className="w-6 h-6 mr-2 text-blue-600" />
                  Design Guidelines
                </h2>
                <button
                  onClick={() => setShowGuidelines(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
                    <span className="text-lg mr-2">🎨</span>
                    Design Requirements
                  </h3>
                  <ul className="text-sm text-blue-800 space-y-2">
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span><strong>No Background:</strong> Your design should have a transparent background (PNG format recommended)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span><strong>High Resolution:</strong> Upload at least 300 DPI for best embroidery quality</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span><strong>Clear Contrast:</strong> Ensure your design has good contrast against the garment color</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span><strong>Simple Details:</strong> Avoid very fine details that may not embroider well</span>
                    </li>
                  </ul>
                </div>
                
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <h3 className="font-semibold text-purple-900 mb-3 flex items-center">
                    <span className="text-lg mr-2">📏</span>
                    Size Guidelines
                  </h3>
                  <ul className="text-sm text-purple-800 space-y-2">
                    <li className="flex items-start">
                      <span className="text-purple-500 mr-2">•</span>
                      <span><strong>Minimum Size:</strong> At least 2 inches (5cm) in width or height</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-500 mr-2">•</span>
                      <span><strong>Maximum Size:</strong> Up to 8 inches (20cm) for most garments</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-500 mr-2">•</span>
                      <span><strong>File Size:</strong> Keep under 10MB for best performance</span>
                    </li>
                  </ul>
                </div>
                
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <h3 className="font-semibold text-purple-900 mb-3 flex items-center">
                    <span className="text-lg mr-2">💡</span>
                    Pro Tips
                  </h3>
                  <ul className="text-sm text-purple-800 space-y-2">
                    <li className="flex items-start">
                      <span className="text-purple-500 mr-2">•</span>
                      <span>Use vector graphics (SVG, AI, EPS) for crisp results at any size</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-500 mr-2">•</span>
                      <span>Test your design on a white background to check transparency</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-500 mr-2">•</span>
                      <span>Consider how the design will look on different garment colors</span>
                    </li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={() => setShowGuidelines(false)}
                  className="px-6"
                >
                  Got it!
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}