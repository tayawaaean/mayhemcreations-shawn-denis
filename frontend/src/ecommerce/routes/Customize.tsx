import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Upload, X, RotateCcw, Download, Check, ArrowRight, Move, ShoppingCart, Grip, Info, ArrowLeft, Ruler, Calculator, Eye } from 'lucide-react'
import { useCustomization, EmbroideryDesignData } from '../context/CustomizationContext'
import { useCart } from '../context/CartContext'
import { products } from '../../data/products'
import { productApiService } from '../../shared/productApiService'
import { MaterialPricingService, InputParameters, CostBreakdown } from '../../shared/materialPricingService'
import { fileToBase64, captureElementAsBase64 } from '../../shared/fileUtils'
import Button from '../../components/Button'
import StepByStepCustomization from '../components/StepByStepCustomization'
import MultiEmbroideryManager from '../components/MultiEmbroideryManager'
import DesignPositioningManager from '../components/DesignPositioningManager'
import PerDesignCustomization from '../components/PerDesignCustomization'
import ChatWidget from '../components/ChatWidget'

export default function Customize() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { 
    customizationData, 
    setCustomizationData, 
    uploadDesign, 
    removeDesign, 
    calculateTotalPrice,
    calculateDesignPrice,
    addDesign,
    removeDesignById,
    updateDesign,
    reorderDesigns,
    getDesignById,
    resetCustomization
  } = useCustomization()
  const { add: addToCart, syncWithDatabase } = useCart()
  const [currentStep, setCurrentStep] = useState(1)
  const [dragActive, setDragActive] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 })
  // Multi-design drag state
  const [draggedDesignId, setDraggedDesignId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  // Resize state
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<string | null>(null)
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [showGuidelines, setShowGuidelines] = useState(false)
  const [showFinalView, setShowFinalView] = useState(false)
  const [showFinalDesignModal, setShowFinalDesignModal] = useState(false)
  const [finalDesignImage, setFinalDesignImage] = useState<string | null>(null)
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCartConfirmation, setShowCartConfirmation] = useState(false)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const productRef = useRef<HTMLDivElement>(null)
  const initializedRef = useRef(false)
  
  // Embroidery pricing state
  const [embroideryWidth, setEmbroideryWidth] = useState<number>(3)
  const [embroideryHeight, setEmbroideryHeight] = useState<number>(3)
  const [embroideryPricing, setEmbroideryPricing] = useState<CostBreakdown | null>(null)
  const [pricingLoading, setPricingLoading] = useState(false)

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
      // Check if we're switching to a different product
      if (customizationData.productId && customizationData.productId !== product.id.toString()) {
        console.log('🔄 Switching to different product, clearing previous customization data')
        setCustomizationData({
          productId: product.id.toString(),
          productName: product.title,
          productImage: product.image,
          basePrice: product.price,
          design: null, // Clear previous design
          designs: [], // Clear previous designs
          mockup: undefined, // Clear previous mockup
          selectedStyles: {
            coverage: null,
            material: null,
            border: null,
            backing: null,
            threads: [],
            upgrades: [],
            cutting: null
          }
        })
      } else {
        // Same product or first time, just update basic info
      setCustomizationData({
        productId: product.id.toString(),
        productName: product.title,
        productImage: product.image,
        basePrice: product.price
      })
      }
      initializedRef.current = true
    }
  }, [product, setCustomizationData, customizationData.productId])

  useEffect(() => {
    initializeProduct()
  }, [initializeProduct])

  // Global drag and resize event listeners for multi-design interactions
  useEffect(() => {
    if ((isDragging || isResizing) && draggedDesignId) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (draggedDesignId) {
          if (isDragging) {
            handleMultiDesignMove(e as any)
          } else if (isResizing) {
            handleResizeMove(e as any)
          }
        }
      }

      const handleGlobalMouseUp = () => {
        if (isDragging) {
          handleMultiDesignEnd()
        } else if (isResizing) {
          handleResizeEnd()
        }
      }

      const handleGlobalTouchMove = (e: TouchEvent) => {
        if (draggedDesignId) {
          if (isDragging) {
            handleMultiDesignMove(e as any)
          } else if (isResizing) {
            handleResizeMove(e as any)
          }
        }
      }

      const handleGlobalTouchEnd = () => {
        if (isDragging) {
          handleMultiDesignEnd()
        } else if (isResizing) {
          handleResizeEnd()
        }
      }

      document.addEventListener('mousemove', handleGlobalMouseMove)
      document.addEventListener('mouseup', handleGlobalMouseUp)
      document.addEventListener('touchmove', handleGlobalTouchMove)
      document.addEventListener('touchend', handleGlobalTouchEnd)

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove)
        document.removeEventListener('mouseup', handleGlobalMouseUp)
        document.removeEventListener('touchmove', handleGlobalTouchMove)
        document.removeEventListener('touchend', handleGlobalTouchEnd)
      }
    }
  }, [isDragging, isResizing, draggedDesignId])

  // Calculate embroidery pricing when dimensions change
  useEffect(() => {
    const calculateEmbroideryPricing = async () => {
      if (embroideryWidth > 0 && embroideryHeight > 0) {
        setPricingLoading(true)
        try {
          const pricing = MaterialPricingService.calculateMaterialCosts({
            patchWidth: embroideryWidth,
            patchHeight: embroideryHeight
          })
          setEmbroideryPricing(pricing)
        } catch (error) {
          console.error('Error calculating embroidery pricing:', error)
        } finally {
          setPricingLoading(false)
        }
      } else {
        setEmbroideryPricing(null)
      }
    }

    calculateEmbroideryPricing()
  }, [embroideryWidth, embroideryHeight])

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

  // Helper function to check if all designs have required embroidery options
  const allDesignsHaveRequiredOptions = () => {
    if (customizationData.designs.length === 0) return false
    
    return customizationData.designs.every(design => {
      if (!design.selectedStyles) return false
      
      const { selectedStyles } = design
      // Check if required options are selected
      const hasRequiredOptions = selectedStyles.coverage !== null && 
                                selectedStyles.material !== null && 
                                selectedStyles.border !== null
      
      return hasRequiredOptions
    })
  }

  // Helper function to check if all designs have notes
  const allDesignsHaveNotes = () => {
    if (customizationData.designs.length === 0) return false
    
    return customizationData.designs.every(design => {
      return design.notes && design.notes.trim().length > 0
    })
  }

  // Helper function to get validation messages
  const getValidationMessage = () => {
    switch (currentStep) {
      case 1:
        if (!product?.hasSizing) return null
        if (customizationData.color === '') return "Please select a color"
        if (customizationData.size === '') return "Please select a size"
        return null
      case 2:
        if (customizationData.designs.length === 0 && customizationData.design === null) {
          return "Please upload at least one design file"
        }
        return null
      case 3:
        if (!allDesignsHaveNotes()) {
          const missingNotes = customizationData.designs.filter(design => !design.notes || design.notes.trim().length === 0)
          return `Please add notes for ${missingNotes.length} design${missingNotes.length > 1 ? 's' : ''} (e.g., "Place on front left chest")`
        }
        return null
      case 4:
        if (!allDesignsHaveRequiredOptions()) {
          const incompleteDesigns = customizationData.designs.filter(design => {
            if (!design.selectedStyles) return true
            const { selectedStyles } = design
            return !selectedStyles.coverage || !selectedStyles.material || !selectedStyles.border
          })
          return `Please select embroidery options for ${incompleteDesigns.length} design${incompleteDesigns.length > 1 ? 's' : ''}`
        }
        return null
      default:
        return null
    }
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
        // Allow proceeding if there are designs uploaded (either multi-design or legacy single design)
        return customizationData.designs.length > 0 || customizationData.design !== null
      case 3:
        // Step 3: Position & Notes - require notes for all designs
        return allDesignsHaveNotes()
      case 4:
        // Step 4: Embroidery Options - require all designs to have required options
        return allDesignsHaveRequiredOptions()
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

  // Multi-design drag handlers
  const handleMultiDesignStart = (e: React.MouseEvent | React.TouchEvent, designId: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!productRef.current) return
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    const rect = productRef.current.getBoundingClientRect()
    
    const design = getDesignById(designId)
    if (!design) return
    
    setDraggedDesignId(designId)
    setIsDragging(true)
    setDragStart({ x: clientX, y: clientY })
    setDragOffset({
      x: clientX - rect.left - design.position.x,
      y: clientY - rect.top - design.position.y
    })
  }

  const handleMultiDesignMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !draggedDesignId || !productRef.current) return

    e.preventDefault()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    const rect = productRef.current.getBoundingClientRect()
    const newX = Math.max(0, Math.min(rect.width - 100, clientX - rect.left - dragOffset.x))
    const newY = Math.max(0, Math.min(rect.height - 100, clientY - rect.top - dragOffset.y))

    // Update the design position immediately for visual feedback
    const currentDesign = getDesignById(draggedDesignId)
    if (currentDesign) {
    updateDesign(draggedDesignId, {
      position: {
          ...currentDesign.position, 
          x: newX, 
          y: newY,
          placement: currentDesign.position.placement || 'front'
        }
      })
    }
  }

  const handleMultiDesignEnd = () => {
    setIsDragging(false)
    setDraggedDesignId(null)
    setDragOffset({ x: 0, y: 0 })
  }

  const handleMultiDesignWheel = (e: React.WheelEvent, designId: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    const design = getDesignById(designId)
    if (!design) return
    
    if (e.ctrlKey || e.metaKey) {
      // Ctrl+scroll for rotation
      const rotationChange = e.deltaY > 0 ? -15 : 15
      const newRotation = (design.rotation + rotationChange) % 360
      updateDesign(designId, { 
        rotation: newRotation < 0 ? 360 + newRotation : newRotation 
      })
    } else {
      // Regular scroll for scaling
      const scaleChange = e.deltaY > 0 ? -0.1 : 0.1
      const newScale = Math.max(0.5, Math.min(2, design.scale + scaleChange))
      updateDesign(designId, { scale: newScale })
    }
  }

  // Resize handlers
  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent, designId: string, handle: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    const design = getDesignById(designId)
    if (!design || !productRef.current) return
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    setDraggedDesignId(designId)
    setIsResizing(true)
    setResizeHandle(handle)
    setResizeStart({
      x: clientX,
      y: clientY,
      width: design.dimensions.width,
      height: design.dimensions.height
    })
  }

  const handleResizeMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isResizing || !draggedDesignId || !resizeHandle) return

    e.preventDefault()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    const deltaX = clientX - resizeStart.x
    const deltaY = clientY - resizeStart.y
    const scaleFactor = 0.02 // Increased sensitivity for easier control

    const design = getDesignById(draggedDesignId)
    if (!design) return

    let newWidth = design.dimensions.width
    let newHeight = design.dimensions.height

    // Calculate new dimensions based on resize handle
    switch (resizeHandle) {
      case 'se': // Southeast (bottom-right)
        newWidth = Math.max(0.5, Math.min(12, resizeStart.width + deltaX * scaleFactor))
        newHeight = Math.max(0.5, Math.min(12, resizeStart.height + deltaY * scaleFactor))
        break
      case 'sw': // Southwest (bottom-left)
        newWidth = Math.max(0.5, Math.min(12, resizeStart.width - deltaX * scaleFactor))
        newHeight = Math.max(0.5, Math.min(12, resizeStart.height + deltaY * scaleFactor))
        break
      case 'ne': // Northeast (top-right)
        newWidth = Math.max(0.5, Math.min(12, resizeStart.width + deltaX * scaleFactor))
        newHeight = Math.max(0.5, Math.min(12, resizeStart.height - deltaY * scaleFactor))
        break
      case 'nw': // Northwest (top-left)
        newWidth = Math.max(0.5, Math.min(12, resizeStart.width - deltaX * scaleFactor))
        newHeight = Math.max(0.5, Math.min(12, resizeStart.height - deltaY * scaleFactor))
        break
      case 'e': // East (right edge)
        newWidth = Math.max(0.5, Math.min(12, resizeStart.width + deltaX * scaleFactor))
        break
      case 'w': // West (left edge)
        newWidth = Math.max(0.5, Math.min(12, resizeStart.width - deltaX * scaleFactor))
        break
      case 's': // South (bottom edge)
        newHeight = Math.max(0.5, Math.min(12, resizeStart.height + deltaY * scaleFactor))
        break
      case 'n': // North (top edge)
        newHeight = Math.max(0.5, Math.min(12, resizeStart.height - deltaY * scaleFactor))
        break
    }

    // Update design dimensions
    updateDesign(draggedDesignId, {
      dimensions: { width: newWidth, height: newHeight }
    })
  }

  const handleResizeEnd = () => {
    setIsResizing(false)
    setResizeHandle(null)
    setDraggedDesignId(null)
    setResizeStart({ x: 0, y: 0, width: 0, height: 0 })
  }


  const steps = [
    { number: 1, title: 'Pick Your Product', description: 'Choose the color and size you like' },
    { number: 2, title: 'Upload Design', description: 'Add your logo or artwork' },
    { number: 3, title: 'Position It', description: 'Show us where to put your design' },
    { number: 4, title: 'Customize Options', description: 'Pick how you want it embroidered' },
    { number: 5, title: 'Review & Add to Cart', description: 'Double-check everything looks perfect' }
  ]

  const getStepProgress = () => {
    return ((currentStep - 1) / (steps.length - 1)) * 100
  }

  const nextStep = async () => {
    // When leaving step 3, capture and save a high-quality mockup once
    if (currentStep === 3 && productRef.current) {
      try {
        // Show final view for clean capture
        const wasInFinalView = showFinalView
        if (!wasInFinalView) setShowFinalView(true)
        await new Promise(resolve => setTimeout(resolve, 100))
        const mockupBase64 = await captureElementAsBase64(productRef.current, { backgroundColor: '#ffffff' })
        setCustomizationData({ mockup: mockupBase64 })
        if (!wasInFinalView) setShowFinalView(false)
        console.log('💾 Mockup captured and saved to localStorage')
      } catch (e) {
        console.error('Failed to capture mockup at step 3:', e)
      }
    }

    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleAddToCart = async () => {
    // Guard against double submission
    if (isAddingToCart) {
      console.log('⚠️ Already adding to cart, ignoring duplicate request')
      return
    }
    
    if (!product) {
      console.error('❌ No product found for adding to cart')
      return
    }
    
    console.log('🛒 Starting add to cart process:', {
      productId: product.id,
      hasCustomization: !!customizationData,
      designsCount: customizationData.designs.length,
      hasLegacyDesign: !!customizationData.design,
      mockupExists: !!customizationData.mockup
    })
    
    setIsAddingToCart(true)
    
    try {
      // Convert design to base64 if it exists
      let designBase64 = null
      if (customizationData.design) {
        try {
          designBase64 = await fileToBase64(customizationData.design.file)
        } catch (error) {
          console.error('Error converting design to base64:', error)
          // Fallback to existing preview if conversion fails
          designBase64 = customizationData.design.preview
        }
      }

      // Use saved mockup from step 3 if available, otherwise capture new one
      let mockupBase64 = customizationData.mockup // Use saved mockup from step 3
      
      if (!mockupBase64 && customizationData.design && productRef.current) {
        try {
          console.log('🛒 No saved mockup found, capturing new mockup image...')
          // Ensure we're in final view for clean capture
          const wasInFinalView = showFinalView
          if (!wasInFinalView) {
            setShowFinalView(true)
            // Wait for UI to update
            await new Promise(resolve => setTimeout(resolve, 100))
          }
          
          mockupBase64 = await captureElementAsBase64(productRef.current, {
            backgroundColor: '#ffffff'
          })
          
          // Restore previous state if it was changed
          if (!wasInFinalView) {
            setShowFinalView(false)
          }
          console.log('🛒 New mockup captured successfully:', {
            hasMockup: !!mockupBase64,
            mockupLength: mockupBase64?.length,
            mockupSizeKB: mockupBase64 ? Math.round(mockupBase64.length / 1024) : 0
          })
        } catch (error) {
          console.error('❌ Error capturing mockup:', error)
        }
      } else if (mockupBase64) {
        console.log('🛒 Using saved mockup from step 3:', {
          hasMockup: !!mockupBase64,
          mockupLength: mockupBase64?.length,
          mockupSizeKB: mockupBase64 ? Math.round(mockupBase64.length / 1024) : 0
        })
      }

      // Add customized item to cart with stock validation
      console.log('🛒 Calling addToCart with:', {
        productId: product.id.toString(),
        quantity: customizationData.quantity,
        customization: {
          designsCount: customizationData.designs.length,
          hasLegacyDesign: !!customizationData.design,
          hasMockup: !!mockupBase64
        }
      })
      
      const success = await addToCart(product.id.toString(), customizationData.quantity, {
        // Legacy single design support
        design: customizationData.design ? {
          name: customizationData.design.name,
          size: customizationData.design.size,
          preview: designBase64 || customizationData.design.preview,
          base64: designBase64 || undefined // Store base64 for persistence
        } : null,
        
        // Multi-design support
        designs: customizationData.designs.length > 0 ? customizationData.designs.map(design => {
          // Calculate total price for this design
          let designTotalPrice = 0
          if (design.selectedStyles) {
            const { selectedStyles } = design
            if (selectedStyles.coverage) designTotalPrice += Number(selectedStyles.coverage.price) || 0
            if (selectedStyles.material) designTotalPrice += Number(selectedStyles.material.price) || 0
            if (selectedStyles.border) designTotalPrice += Number(selectedStyles.border.price) || 0
            if (selectedStyles.backing) designTotalPrice += Number(selectedStyles.backing.price) || 0
            if (selectedStyles.cutting) designTotalPrice += Number(selectedStyles.cutting.price) || 0
            
            if (selectedStyles.threads) {
              selectedStyles.threads.forEach((thread: any) => {
                designTotalPrice += Number(thread.price) || 0
              })
            }
            if (selectedStyles.upgrades) {
              selectedStyles.upgrades.forEach((upgrade: any) => {
                designTotalPrice += Number(upgrade.price) || 0
              })
            }
          }
          
          return {
            id: design.id,
            name: design.name,
            preview: design.preview,
            dimensions: design.dimensions,
            position: design.position,
            scale: design.scale,
            rotation: design.rotation,
            notes: design.notes,
            selectedStyles: design.selectedStyles,
            totalPrice: designTotalPrice // Include calculated total price
          }
        }) : null,
        
        mockup: mockupBase64, // Store mockup image
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
      
      console.log('🛒 addToCart result:', success)
      
      if (success) {
        console.log('✅ Successfully added to cart, showing confirmation')
        // Wait for state to fully update and sync across all components
        await new Promise(resolve => setTimeout(resolve, 300))
        setShowCartConfirmation(true)
        // Reset customization data after successful add
        resetCustomization()
      } else {
        console.error('❌ Failed to add item to cart')
        alert('Failed to add item to cart. Please try again.')
      }
    } catch (error) {
      console.error('Error adding to cart:', error)
    } finally {
      setIsAddingToCart(false)
    }
  }

  const handleViewCart = async () => {
    setShowCartConfirmation(false)
    // Force cart to sync to ensure the latest items are displayed
    await syncWithDatabase()
    // Small delay to ensure state propagation
    await new Promise(resolve => setTimeout(resolve, 100))
    navigate('/cart')
  }

  const handleContinueShopping = () => {
    setShowCartConfirmation(false)
    // Navigate to products page to browse more items
    navigate('/products')
  }

  const handleViewFinalDesign = async () => {
    if (!productRef.current) return

    try {
      // Show final view for clean capture (this hides all numbers, handles, and info)
      setShowFinalView(true)
      // Wait for UI to update
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const mockupBase64 = await captureElementAsBase64(productRef.current, {
        backgroundColor: '#ffffff'
      })
      
      // Restore editing state
      setShowFinalView(false)
      
      // Show the captured image in a modal
    setShowFinalDesignModal(true)
      setFinalDesignImage(mockupBase64)
      
      console.log('✅ High-quality design preview captured:', {
        hasImage: !!mockupBase64,
        imageSize: mockupBase64 ? Math.round(mockupBase64.length / 1024) : 0
      })
    } catch (error) {
      console.error('❌ Error capturing design:', error)
      // Make sure to restore editing state even on error
      setShowFinalView(false)
    }
  }

  const handleBackToEditing = () => {
    setShowFinalView(false)
  }

  // Calculate embroidery base cost for a design
  const calculateEmbroideryBaseCost = (design: EmbroideryDesignData) => {
    try {
      const pricing = MaterialPricingService.calculateMaterialCosts({
        patchWidth: design.dimensions.width * design.scale,
        patchHeight: design.dimensions.height * design.scale
      })
      return pricing.totalCost
    } catch (error) {
      console.error('Error calculating embroidery base cost:', error)
      return 0
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
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold mx-auto mb-2 ${
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
                  <p className={`text-xs ${
                    currentStep >= step.number ? 'text-gray-600' : 'text-gray-400'
                  }`}>
                    {step.description}
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
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold ${
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
                    <p className={`text-xs ${
                      currentStep >= step.number ? 'text-gray-600' : 'text-gray-400'
                    }`}>
                      {step.description}
                    </p>
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
          <div className="space-y-4 sm:space-y-6 flex flex-col items-center justify-start">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 w-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                {showFinalView ? 'Final Product Preview' : 'Product Preview'}
              </h3>
              
              {/* Product Image with Design Overlay */}
              <div className="flex justify-center items-center">
                <div className="relative max-w-2xl w-full" ref={productRef}>
                  <img
                    src={product.image}
                    alt={product.title}
                    className="w-full h-auto object-contain rounded-lg"
                    style={{ maxHeight: '600px', imageRendering: '-webkit-optimize-contrast' as any }}
                  />
                 {/* Render Multiple Designs */}
                 {customizationData.designs.map((design, index) => (
                   <div
                     key={design.id}
                     className={`absolute select-none ${
                       showFinalView || currentStep >= 4
                         ? 'cursor-default' 
                         : draggedDesignId === design.id
                           ? 'cursor-grabbing scale-105 z-20'
                           : 'cursor-grab hover:scale-105 transition-all duration-200'
                     }`}
                     style={{
                       left: `${design.position.x}px`,
                       top: `${design.position.y}px`,
                       transform: `scale(${design.scale}) rotate(${design.rotation}deg)`,
                       transformOrigin: 'center',
                       zIndex: draggedDesignId === design.id ? 20 : (10 + index)
                     }}
                     onMouseDown={!showFinalView && currentStep < 4 ? (e) => handleMultiDesignStart(e, design.id) : undefined}
                     onTouchStart={!showFinalView && currentStep < 4 ? (e) => handleMultiDesignStart(e, design.id) : undefined}
                   >
                     {/* Design Image with Enhanced Styling */}
                     <div className="relative group">
                       {/* Hover Background Highlight */}
                       {currentStep < 4 && (
                         <div className="absolute inset-0 bg-accent/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
                       )}
                       <img
                         src={design.preview}
                         alt={`Design ${index + 1} preview`}
                         className="drop-shadow-2xl rounded-lg transition-all duration-200"
                         style={{
                           width: `${design.dimensions.width * 20}px`,
                           height: `${design.dimensions.height * 20}px`,
                           objectFit: 'fill',
                           filter: showFinalView ? 'none' : 'none'
                         }}
                       />
                       
                      {/* Design Number Badge - Only show when not in final view */}
                      {!showFinalView && (
                        <div className="absolute -top-2 -left-2 bg-accent text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-lg">
                          {index + 1}
                        </div>
                      )}
                       
                       {/* Design Controls - Only show when not in final view */}
                       {!showFinalView && (
                         <>
                           {/* Drag Handle */}
                           <div className="absolute -top-2 -left-8 bg-gray-600 text-white p-1 rounded-full shadow-lg opacity-80 group-hover:opacity-100 transition-all duration-200">
                             <Grip className="w-3 h-3" />
                           </div>
                       
                       
                           {/* Large Corner Resize Handles */}
                           <div 
                             className="absolute -top-2 -left-2 w-6 h-6 bg-accent rounded-full border-3 border-white shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-nw-resize hover:scale-110"
                             onMouseDown={!showFinalView && currentStep < 4 ? (e) => handleResizeStart(e, design.id, 'nw') : undefined}
                             onTouchStart={!showFinalView && currentStep < 4 ? (e) => handleResizeStart(e, design.id, 'nw') : undefined}
                           ></div>
                           <div 
                             className="absolute -top-2 -right-2 w-6 h-6 bg-accent rounded-full border-3 border-white shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-ne-resize hover:scale-110"
                             onMouseDown={!showFinalView && currentStep < 4 ? (e) => handleResizeStart(e, design.id, 'ne') : undefined}
                             onTouchStart={!showFinalView && currentStep < 4 ? (e) => handleResizeStart(e, design.id, 'ne') : undefined}
                           ></div>
                           <div 
                             className="absolute -bottom-2 -left-2 w-6 h-6 bg-accent rounded-full border-3 border-white shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-sw-resize hover:scale-110"
                             onMouseDown={!showFinalView && currentStep < 4 ? (e) => handleResizeStart(e, design.id, 'sw') : undefined}
                             onTouchStart={!showFinalView && currentStep < 4 ? (e) => handleResizeStart(e, design.id, 'sw') : undefined}
                           ></div>
                           <div 
                             className="absolute -bottom-2 -right-2 w-6 h-6 bg-accent rounded-full border-3 border-white shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-se-resize hover:scale-110"
                             onMouseDown={!showFinalView && currentStep < 4 ? (e) => handleResizeStart(e, design.id, 'se') : undefined}
                             onTouchStart={!showFinalView && currentStep < 4 ? (e) => handleResizeStart(e, design.id, 'se') : undefined}
                           ></div>
                           
                           {/* Large Edge Resize Handles */}
                           <div 
                             className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-6 h-4 bg-accent rounded-full border-3 border-white shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-n-resize hover:scale-110"
                             onMouseDown={!showFinalView && currentStep < 4 ? (e) => handleResizeStart(e, design.id, 'n') : undefined}
                             onTouchStart={!showFinalView && currentStep < 4 ? (e) => handleResizeStart(e, design.id, 'n') : undefined}
                           ></div>
                           <div 
                             className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-6 h-4 bg-accent rounded-full border-3 border-white shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-s-resize hover:scale-110"
                             onMouseDown={!showFinalView && currentStep < 4 ? (e) => handleResizeStart(e, design.id, 's') : undefined}
                             onTouchStart={!showFinalView && currentStep < 4 ? (e) => handleResizeStart(e, design.id, 's') : undefined}
                           ></div>
                           <div 
                             className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-4 h-6 bg-accent rounded-full border-3 border-white shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-w-resize hover:scale-110"
                             onMouseDown={!showFinalView && currentStep < 4 ? (e) => handleResizeStart(e, design.id, 'w') : undefined}
                             onTouchStart={!showFinalView && currentStep < 4 ? (e) => handleResizeStart(e, design.id, 'w') : undefined}
                           ></div>
                           <div 
                             className="absolute -right-2 top-1/2 transform -translate-y-1/2 w-4 h-6 bg-accent rounded-full border-3 border-white shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-e-resize hover:scale-110"
                             onMouseDown={!showFinalView && currentStep < 4 ? (e) => handleResizeStart(e, design.id, 'e') : undefined}
                             onTouchStart={!showFinalView && currentStep < 4 ? (e) => handleResizeStart(e, design.id, 'e') : undefined}
                           ></div>
                       
                           {/* Rotation Handle */}
                           <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-accent rounded-full border border-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                           
                           {/* Enhanced Tooltip */}
                           {currentStep < 4 && (
                             <div className={`absolute -top-16 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap transition-all duration-200 ${
                               isDragging || isResizing ? 'opacity-100 scale-110' : 'opacity-0 group-hover:opacity-100'
                             }`}>
                               <div className="flex items-center space-x-2">
                                 <Grip className="w-3 h-3" />
                                 <span>Drag to move</span>
                                 <span className="text-gray-400">•</span>
                                 <span>Drag handles to resize</span>
                                 <span className="text-gray-400">•</span>
                                 <span>Ctrl+scroll to rotate</span>
                           </div>
                                 {/* Tooltip Arrow */}
                                 <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                         </div>
                           )}
                         
                         </>
                       )}
                     </div>
                   </div>
                 ))}

                 {/* Legacy Single Design Support */}
                 {customizationData.design && (
                   <div
                     className={`absolute select-none ${
                       showFinalView || currentStep >= 4
                         ? 'cursor-default' 
                         : isDragging 
                           ? 'cursor-grabbing scale-105 z-10' 
                           : customizationData.placement === 'manual' 
                             ? 'cursor-grab hover:scale-105 transition-all duration-200'
                             : 'cursor-default'
                     }`}
                           style={{
                       left: `${isDragging ? dragPosition.x : (customizationData.placement === 'manual' ? customizationData.designPosition.x : getAutomaticPosition(customizationData.placement).x)}px`,
                       top: `${isDragging ? dragPosition.y : (customizationData.placement === 'manual' ? customizationData.designPosition.y : getAutomaticPosition(customizationData.placement).y)}px`,
                       transform: `scale(${customizationData.designScale}) rotate(${customizationData.designRotation}deg)`,
                       transformOrigin: 'center',
                       zIndex: 5
                     }}
                     onMouseDown={!showFinalView && currentStep < 4 ? handleDesignStart : undefined}
                     onMouseMove={!showFinalView && currentStep < 4 ? handleDesignMove : undefined}
                     onMouseUp={!showFinalView && currentStep < 4 ? handleDesignEnd : undefined}
                     onMouseLeave={!showFinalView && currentStep < 4 ? handleDesignEnd : undefined}
                     onTouchStart={!showFinalView && currentStep < 4 ? handleDesignStart : undefined}
                     onTouchMove={!showFinalView && currentStep < 4 ? handleDesignMove : undefined}
                     onTouchEnd={!showFinalView && currentStep < 4 ? handleDesignEnd : undefined}
                     onWheel={!showFinalView && currentStep < 4 ? handleDesignWheel : undefined}
                   >
                     {/* Legacy Design Image */}
                     <div className="relative group">
                         <img
                           src={customizationData.design.preview}
                           alt="Design preview"
                           className="drop-shadow-2xl rounded-lg"
                           style={{
                             width: `${embroideryWidth * 20}px`,
                             height: `${embroideryHeight * 20}px`,
                             objectFit: 'fill',
                             filter: showFinalView ? 'none' : (isDragging ? 'brightness(1.1) contrast(1.1)' : 'none')
                           }}
                         />
                       
                      {/* Legacy Design Number Badge - Only show when not in final view */}
                      {!showFinalView && (
                        <div className="absolute -top-2 -left-2 bg-blue-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-lg">
                          L
                        </div>
                      )}
                       
                       {/* Legacy Design Controls - Only show when not in final view */}
                       {!showFinalView && (
                         <>
                           {/* Drag Handle */}
                           <div className="absolute -top-2 -left-8 bg-gray-600 text-white p-1 rounded-full shadow-lg opacity-80 group-hover:opacity-100 transition-all duration-200">
                             <Grip className="w-3 h-3" />
                           </div>
                       
                       
                           {/* Corner Resize Handles */}
                           <div className="absolute -top-1 -left-1 w-3 h-3 bg-accent rounded-full border-2 border-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                           <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full border-2 border-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                           <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-accent rounded-full border-2 border-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                           <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-accent rounded-full border-2 border-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                       
                           {/* Rotation Handle */}
                           <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-accent rounded-full border border-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                           
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
                     
                         </>
                       )}
                     </div>
                   </div>
                   )}
                </div>
              </div>
            </div>

            {customizationData.design && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 w-full">
                <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
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
              </div>
            )}

            {/* Design Controls */}
            {customizationData.design && currentStep === 3 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 w-full">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Embroidery Sizing</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Length (inches): {embroideryWidth.toFixed(1)}"
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="12"
                        step="0.1"
                        value={embroideryWidth}
                        onChange={(e) => setEmbroideryWidth(parseFloat(e.target.value))}
                        className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Height (inches): {embroideryHeight.toFixed(1)}"
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="12"
                        step="0.1"
                        value={embroideryHeight}
                        onChange={(e) => setEmbroideryHeight(parseFloat(e.target.value))}
                        className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
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
                      onClick={() => {
                        setCustomizationData({
                          designPosition: { x: 50, y: 50 },
                          designRotation: 0
                        })
                        setEmbroideryWidth(3)
                        setEmbroideryHeight(3)
                      }}
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

                 {/* Validation Message */}
                 {getValidationMessage() && (
                   <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                     <div className="flex items-center">
                       <Info className="w-5 h-5 text-amber-600 mr-2 flex-shrink-0" />
                       <p className="text-sm text-amber-800">{getValidationMessage()}</p>
                     </div>
                   </div>
                 )}
                 
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
                 
                 {/* Validation Message */}
                 {getValidationMessage() && (
                   <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                     <div className="flex items-center">
                       <Info className="w-5 h-5 text-amber-600 mr-2 flex-shrink-0" />
                       <p className="text-sm text-amber-800">{getValidationMessage()}</p>
                     </div>
                   </div>
                 )}
                 
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

             {/* Step 2: Upload Design */}
             {currentStep === 2 && (
               <div className="space-y-4 sm:space-y-6">
                 {/* Multi-Design Upload Section */}
                 <MultiEmbroideryManager />

                 {/* Embroidery Dimensions & Pricing */}
                 <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
                   <div className="flex items-center mb-4">
                     <Ruler className="w-5 h-5 text-gray-600 mr-2" />
                     <h3 className="text-lg font-semibold text-gray-900">Embroidery Dimensions</h3>
                   </div>
                   
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">
                         Width (inches)
                       </label>
                       <input
                         type="number"
                         min="0.5"
                         max="12"
                         step="0.1"
                         value={embroideryWidth || ''}
                         onChange={(e) => setEmbroideryWidth(parseFloat(e.target.value) || 0)}
                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
                         placeholder="Enter width"
                       />
                     </div>
                     
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">
                         Height (inches)
                       </label>
                       <input
                         type="number"
                         min="0.5"
                         max="12"
                         step="0.1"
                         value={embroideryHeight || ''}
                         onChange={(e) => setEmbroideryHeight(parseFloat(e.target.value) || 0)}
                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
                         placeholder="Enter height"
                       />
                     </div>
                   </div>

                   {/* Real-time Pricing Display */}
                   {embroideryWidth > 0 && embroideryHeight > 0 && (
                     <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
                       <div className="flex items-center justify-between mb-3">
                         <div className="flex items-center">
                           <Calculator className="w-5 h-5 text-gray-600 mr-2" />
                           <h4 className="font-semibold text-gray-900">Embroidery Base Price</h4>
                         </div>
                         {pricingLoading && (
                           <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent"></div>
                         )}
                       </div>
                       
                       {pricingLoading ? (
                         <div className="text-center py-4">
                           <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent mx-auto mb-2"></div>
                           <p className="text-sm text-gray-600">Calculating pricing...</p>
                         </div>
                       ) : embroideryPricing ? (
                         <div className="space-y-2">
                           <div className="flex items-center justify-between">
                             <span className="text-sm text-gray-600">Total Area:</span>
                             <span className="font-medium text-gray-900">
                               {(embroideryWidth * embroideryHeight).toFixed(2)} sq in
                             </span>
                           </div>
                           
                           <div className="border-t pt-2">
                             <div className="flex items-center justify-between text-lg font-bold">
                               <span>Base Material Cost:</span>
                               <span className="text-accent">${embroideryPricing.totalCost.toFixed(2)}</span>
                             </div>
                           </div>
                           
                           {/* Collapsible Material Breakdown */}
                           <details className="mt-3">
                             <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800 flex items-center">
                               <span>View Material Breakdown</span>
                               <ArrowRight className="w-3 h-3 ml-1 transform transition-transform" />
                             </summary>
                             <div className="mt-2 space-y-1 text-xs text-gray-600">
                               <div className="flex justify-between">
                                 <span>Fabric</span>
                                 <span>${embroideryPricing.fabricCost.toFixed(2)}</span>
                               </div>
                               <div className="flex justify-between">
                                 <span>Patch Attach</span>
                                 <span>${embroideryPricing.patchAttachCost.toFixed(2)}</span>
                               </div>
                               <div className="flex justify-between">
                                 <span>Thread</span>
                                 <span>${embroideryPricing.threadCost.toFixed(2)}</span>
                               </div>
                               <div className="flex justify-between">
                                 <span>Bobbin</span>
                                 <span>${embroideryPricing.bobbinCost.toFixed(2)}</span>
                               </div>
                               <div className="flex justify-between">
                                 <span>Cut-Away Stabilizer</span>
                                 <span>${embroideryPricing.cutAwayStabilizerCost.toFixed(2)}</span>
                               </div>
                               <div className="flex justify-between">
                                 <span>Wash-Away Stabilizer</span>
                                 <span>${embroideryPricing.washAwayStabilizerCost.toFixed(2)}</span>
                               </div>
                             </div>
                           </details>
                         </div>
                       ) : null}
                     </div>
                   )}
                 </div>
                 
                 {/* Navigation Buttons */}
                 {/* Validation Message */}
                 {getValidationMessage() && (
                   <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                     <div className="flex items-center">
                       <Info className="w-5 h-5 text-amber-600 mr-2 flex-shrink-0" />
                       <p className="text-sm text-amber-800">{getValidationMessage()}</p>
                     </div>
                   </div>
                 )}
                 
                 <div className="flex flex-col sm:flex-row justify-between space-y-3 sm:space-y-0">
                   <Button variant="outline" onClick={prevStep} className="w-full sm:w-auto">
                     <ArrowLeft className="w-4 h-4 mr-2" />
                     Previous
                         </Button>
                         <Button
                     onClick={nextStep} 
                     disabled={!canProceed()} 
                     className="w-full sm:w-auto"
                   >
                     Continue to Design Notes
                     <ArrowRight className="w-4 h-4 ml-2" />
                         </Button>
                       </div>
                     </div>
             )}

              {/* Step 3: Customize Position */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <DesignPositioningManager showFinalView={showFinalView} />
                  
                  {/* Validation Message */}
                  {getValidationMessage() && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-center">
                        <Info className="w-5 h-5 text-amber-600 mr-2 flex-shrink-0" />
                        <p className="text-sm text-amber-800">{getValidationMessage()}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-6 flex flex-col sm:flex-row justify-between space-y-3 sm:space-y-0">
                   <Button variant="outline" onClick={prevStep} className="w-full sm:w-auto">
                     Previous
                   </Button>
                   <Button onClick={nextStep} disabled={!canProceed()} className="w-full sm:w-auto">
                      Continue to Embroidery Options
                     <ArrowRight className="w-4 h-4 ml-2" />
                   </Button>
                 </div>
                </div>
              )}

            {/* Step 4: Choose Embroidery */}
            {currentStep === 4 && (
                <PerDesignCustomization 
                  onComplete={nextStep} 
                onBack={() => setCurrentStep(3)}
                />
            )}

            {/* Step 5: Review */}
             {currentStep === 5 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Your Order</h3>
                
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm sm:text-base text-gray-600">Product Base Price</span>
                    <span className="font-semibold text-sm sm:text-base">${(Number(customizationData.basePrice) || 0).toFixed(2)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm sm:text-base text-gray-600">Color</span>
                    <span className="font-semibold text-sm sm:text-base capitalize">{customizationData.color}</span>
                    </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm sm:text-base text-gray-600">Size</span>
                    <span className="font-semibold text-sm sm:text-base uppercase">{customizationData.size}</span>
                      </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm sm:text-base text-gray-600">Quantity</span>
                    <span className="font-semibold text-sm sm:text-base">{customizationData.quantity}</span>
                  </div>

                  {/* Multi-Design Embroidery Options */}
                  {customizationData.designs.length > 0 && (
                    <>
                      <div className="border-t pt-4">
                        <h4 className="text-md font-semibold text-gray-900 mb-3">Embroidery Designs</h4>
                  {customizationData.designs.map((design, index) => (
                          <div key={design.id} className="mb-4 p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-900">
                                Design {index + 1}: {design.name}
                              </span>
                              <span className="text-sm text-gray-600">
                                {design.dimensions.width}" × {design.dimensions.height}" @ {Math.round(design.scale * 100)}%
                              </span>
                      </div>
                  
                            {/* Embroidery Base Cost */}
                            <div className="flex items-center justify-between text-xs mb-2 pb-2 border-b border-gray-200">
                              <span className="text-gray-600">Embroidery Base Cost</span>
                              <span className="font-medium text-accent">${calculateEmbroideryBaseCost(design).toFixed(2)}</span>
                  </div>

                            {/* Individual Design Options */}
                        {design.selectedStyles.coverage && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600">{design.selectedStyles.coverage.name}</span>
                            <span className="font-medium">
                                  {design.selectedStyles.coverage.price === 0 ? 'Free' : `+$${(Number(design.selectedStyles.coverage.price) || 0).toFixed(2)}`}
                      </span>
                    </div>
                  )}
                            
                        {design.selectedStyles.material && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600">{design.selectedStyles.material.name}</span>
                            <span className="font-medium">
                                  {design.selectedStyles.material.price === 0 ? 'Free' : `+$${(Number(design.selectedStyles.material.price) || 0).toFixed(2)}`}
                      </span>
                    </div>
                  )}
                            
                        {design.selectedStyles.border && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600">{design.selectedStyles.border.name}</span>
                            <span className="font-medium">
                                  {design.selectedStyles.border.price === 0 ? 'Free' : `+$${(Number(design.selectedStyles.border.price) || 0).toFixed(2)}`}
                      </span>
                    </div>
                  )}
                            
                        {design.selectedStyles.threads.map((thread) => (
                              <div key={thread.id} className="flex items-center justify-between text-xs">
                                <span className="text-gray-600">{thread.name}</span>
                                <span className="font-medium">+${(Number(thread.price) || 0).toFixed(2)}</span>
                  </div>
                        ))}
                            
                        {design.selectedStyles.backing && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600">{design.selectedStyles.backing.name}</span>
                            <span className="font-medium">
                                  {design.selectedStyles.backing.price === 0 ? 'Free' : `+$${(Number(design.selectedStyles.backing.price) || 0).toFixed(2)}`}
                            </span>
                          </div>
                        )}
                            
                        {design.selectedStyles.upgrades.map((upgrade) => (
                              <div key={upgrade.id} className="flex items-center justify-between text-xs">
                                <span className="text-gray-600">{upgrade.name}</span>
                                <span className="font-medium">+${(Number(upgrade.price) || 0).toFixed(2)}</span>
                    </div>
                  ))}
                            
                        {design.selectedStyles.cutting && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600">{design.selectedStyles.cutting.name}</span>
                            <span className="font-medium">
                                  {design.selectedStyles.cutting.price === 0 ? 'Free' : `+$${(Number(design.selectedStyles.cutting.price) || 0).toFixed(2)}`}
                      </span>
                    </div>
                  )}
                            
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-900">Design {index + 1} Total</span>
                                <span className="font-semibold text-sm text-accent">${calculateDesignPrice(design.id).toFixed(2)}</span>
                              </div>
                      </div>
                    </div>
                  ))}
                    </div>
                    </>
                  )}
                  
                  {/* Legacy Single Design Support */}
                  {customizationData.designs.length === 0 && customizationData.design && (
                    <>
                  <div className="border-t pt-4">
                        <h4 className="text-md font-semibold text-gray-900 mb-3">Embroidery Design</h4>
                        
                        {embroideryPricing && (
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm sm:text-base text-gray-600">Embroidery Base Price ({embroideryWidth}" × {embroideryHeight}")</span>
                            <span className="font-semibold text-sm sm:text-base text-accent">${embroideryPricing.totalCost.toFixed(2)}</span>
                    </div>
                        )}
                        
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm sm:text-base text-gray-600">Placement</span>
                          <span className="font-semibold text-sm sm:text-base capitalize">
                            {customizationData.placement === 'manual' ? 'Manual Position' : customizationData.placement.replace('-', ' ')}
                        </span>
                      </div>
                        
                        {customizationData.selectedStyles.coverage && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm sm:text-base text-gray-600">{customizationData.selectedStyles.coverage.name}</span>
                            <span className="font-semibold text-sm sm:text-base">
                              {customizationData.selectedStyles.coverage.price === 0 ? 'Free' : `+$${(Number(customizationData.selectedStyles.coverage.price) || 0).toFixed(2)}`}
                            </span>
                      </div>
                        )}
                        
                        {customizationData.selectedStyles.material && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm sm:text-base text-gray-600">{customizationData.selectedStyles.material.name}</span>
                            <span className="font-semibold text-sm sm:text-base">
                              {customizationData.selectedStyles.material.price === 0 ? 'Free' : `+$${(Number(customizationData.selectedStyles.material.price) || 0).toFixed(2)}`}
                          </span>
                        </div>
                        )}
                        
                        {customizationData.selectedStyles.border && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm sm:text-base text-gray-600">{customizationData.selectedStyles.border.name}</span>
                            <span className="font-semibold text-sm sm:text-base">
                              {customizationData.selectedStyles.border.price === 0 ? 'Free' : `+$${(Number(customizationData.selectedStyles.border.price) || 0).toFixed(2)}`}
                            </span>
                      </div>
                        )}
                        
                        {customizationData.selectedStyles.threads.map((thread) => (
                          <div key={thread.id} className="flex items-center justify-between">
                            <span className="text-sm sm:text-base text-gray-600">{thread.name}</span>
                            <span className="font-semibold text-sm sm:text-base">+${(Number(thread.price) || 0).toFixed(2)}</span>
                    </div>
                        ))}
                        
                        {customizationData.selectedStyles.backing && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm sm:text-base text-gray-600">{customizationData.selectedStyles.backing.name}</span>
                            <span className="font-semibold text-sm sm:text-base">
                              {customizationData.selectedStyles.backing.price === 0 ? 'Free' : `+$${(Number(customizationData.selectedStyles.backing.price) || 0).toFixed(2)}`}
                            </span>
                  </div>
                        )}
                        
                        {customizationData.selectedStyles.upgrades.map((upgrade) => (
                          <div key={upgrade.id} className="flex items-center justify-between">
                            <span className="text-sm sm:text-base text-gray-600">{upgrade.name}</span>
                            <span className="font-semibold text-sm sm:text-base">+${(Number(upgrade.price) || 0).toFixed(2)}</span>
                          </div>
                        ))}
                        
                        {customizationData.selectedStyles.cutting && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm sm:text-base text-gray-600">{customizationData.selectedStyles.cutting.name}</span>
                            <span className="font-semibold text-sm sm:text-base">
                              {customizationData.selectedStyles.cutting.price === 0 ? 'Free' : `+$${(Number(customizationData.selectedStyles.cutting.price) || 0).toFixed(2)}`}
                            </span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between text-base sm:text-lg font-bold">
                      <span>Total</span>
                      <span>${calculateTotalPrice().toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row justify-between space-y-3 sm:space-y-0">
                  {showFinalView ? (
                    <>
                      <Button variant="outline" onClick={handleBackToEditing} className="w-full sm:w-auto">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Editing
                      </Button>
                      <Button 
                        variant="add-to-cart" 
                        onClick={handleAddToCart} 
                        disabled={isAddingToCart}
                        className="w-full sm:w-auto"
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        {isAddingToCart ? 'Adding to Cart...' : 'Add to Cart'}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" onClick={prevStep} className="w-full sm:w-auto">
                        Previous
                      </Button>
                      <Button 
                        variant="primary" 
                        onClick={handleViewFinalDesign} 
                        disabled={customizationData.designs.length === 0 && !customizationData.design}
                        className="w-full sm:w-auto"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View My Design
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
        </div>

        {/* Chat Widget - Positioned within responsive container */}
        <div className="fixed bottom-4 right-4 lg:bottom-6 lg:right-6 z-40">
          <ChatWidget />
        </div>
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

      {/* Cart Confirmation Modal */}
      {showCartConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Item Added to Cart!
              </h3>
              
              <p className="text-gray-600 mb-6">
                Your customized {product?.title} has been successfully added to your cart.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={handleContinueShopping}
                  className="w-full sm:w-auto"
                >
                  Continue Shopping
                </Button>
                
                <Button
                  variant="add-to-cart"
                  onClick={handleViewCart}
                  className="w-full sm:w-auto"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  View Cart
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Final Design Modal */}
      {showFinalDesignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Eye className="w-6 h-6 mr-2 text-accent" />
                  Your Final Design Preview
                </h2>
                <button
                  onClick={() => setShowFinalDesignModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Product with Design - Centered and Full Width */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">
                    {product?.title} - Final Product Preview
                  </h3>
                  <div className="flex justify-center items-center">
                    <div className="relative w-full max-w-3xl">
                      {finalDesignImage ? (
                        <img
                          src={finalDesignImage}
                          alt="Final design preview"
                          className="w-full h-auto object-contain rounded-lg shadow-2xl"
                          style={{ imageRendering: 'crisp-edges' as any, maxHeight: '600px' }}
                        />
                      ) : (
                        <img
                          src={product?.image}
                          alt={product?.title}
                          className="w-full h-auto object-contain rounded-lg shadow-2xl"
                          style={{ imageRendering: 'crisp-edges' as any, maxHeight: '600px' }}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Uploaded Design Images */}
                {(customizationData.designs.length > 0 || customizationData.design) && (
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center text-lg">
                      <Upload className="w-5 h-5 mr-2 text-accent" />
                      Your Original Design Files
                    </h4>
                    
                    {/* Multi-Design Images */}
                {customizationData.designs.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {customizationData.designs.map((design, index) => (
                          <div key={design.id} className="text-center">
                            <div className="bg-gray-50 rounded-xl p-4 mb-3 border border-gray-200 flex items-center justify-center" style={{ minHeight: '200px' }}>
                          <img
                            src={design.preview}
                                alt={`Design ${index + 1}`}
                                className="max-w-full max-h-48 object-contain rounded"
                                style={{ imageRendering: 'crisp-edges' as any }}
                          />
                          </div>
                            <div className="text-sm text-gray-700">
                              <div className="font-semibold mb-1">Design {index + 1}</div>
                              <div className="text-gray-500 truncate text-xs">{design.name}</div>
                              <div className="text-gray-400 text-xs mt-1">{design.dimensions.width}" × {design.dimensions.height}"</div>
                        </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Legacy Single Design Image */}
                    {customizationData.designs.length === 0 && customizationData.design && (
                      <div className="flex justify-center">
                        <div className="text-center max-w-md">
                          <div className="bg-gray-50 rounded-xl p-6 mb-4 border border-gray-200 flex items-center justify-center" style={{ minHeight: '300px' }}>
                            <img
                              src={customizationData.design.preview}
                              alt="Design"
                              className="max-w-full max-h-64 object-contain rounded"
                              style={{ imageRendering: 'crisp-edges' as any }}
                            />
                          </div>
                          <div className="text-sm text-gray-700">
                            <div className="font-semibold mb-1">{customizationData.design.name}</div>
                            <div className="text-gray-500 text-xs">{(customizationData.design.size / 1024 / 1024).toFixed(2)} MB</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Design Details */}
                {(customizationData.designs.length > 0 || customizationData.design) && (
                  <div className="space-y-6">
                    {/* Multi-Design Details */}
                    {customizationData.designs.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-900 text-lg">Custom Design Details</h4>
                        {customizationData.designs.map((design, index) => (
                          <div key={design.id} className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="font-medium text-gray-900">Design {index + 1}: {design.name}</h5>
                              <span className="text-sm text-gray-500">${calculateDesignPrice(design.id).toFixed(2)}</span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div className="space-y-2">
                        <div className="flex justify-between">
                                <span className="text-gray-600">Dimensions:</span>
                                <span className="font-medium">{design.dimensions.width}" × {design.dimensions.height}"</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Scale:</span>
                                <span className="font-medium">{Math.round(design.scale * 100)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Rotation:</span>
                                <span className="font-medium">{design.rotation}°</span>
                        </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Placement:</span>
                                  <span className="font-medium capitalize">{design.position.placement}</span>
                      </div>
                    </div>

                              <div className="space-y-2">
                                {design.notes && (
                          <div>
                                    <span className="text-gray-600 block mb-1">Notes:</span>
                                    <p className="text-sm bg-gray-50 p-2 rounded border">{design.notes}</p>
                                  </div>
                                )}
                                
                                {/* Selected Embroidery Options */}
                                <div>
                                  <span className="text-gray-600 block mb-1">Embroidery Options:</span>
                                  <div className="space-y-1 text-xs">
                              {design.selectedStyles.coverage && (
                                <div className="flex justify-between">
                                        <span>Coverage:</span>
                                        <span>{design.selectedStyles.coverage.name}</span>
                                </div>
                              )}
                              {design.selectedStyles.material && (
                                <div className="flex justify-between">
                                        <span>Material:</span>
                                        <span>{design.selectedStyles.material.name}</span>
                                </div>
                              )}
                                    {design.selectedStyles.threads.map((thread) => (
                                      <div key={thread.id} className="flex justify-between">
                                        <span>Thread:</span>
                                        <span>{thread.name}</span>
                                      </div>
                                    ))}
                                    {design.selectedStyles.backing && (
                                <div className="flex justify-between">
                                        <span>Backing:</span>
                                        <span>{design.selectedStyles.backing.name}</span>
                                </div>
                              )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                                </div>
                              )}

                    {/* Legacy Single Design Support */}
                    {customizationData.designs.length === 0 && customizationData.design && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-3">Design Information</h4>
                          <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                              <span className="text-gray-600">Design Name:</span>
                              <span className="font-medium">{customizationData.design.name}</span>
                                </div>
                                <div className="flex justify-between">
                              <span className="text-gray-600">File Size:</span>
                              <span className="font-medium">{(customizationData.design.size / 1024 / 1024).toFixed(2)} MB</span>
                                </div>
                                <div className="flex justify-between">
                              <span className="text-gray-600">Embroidery Size:</span>
                              <span className="font-medium">{embroideryWidth}" × {embroideryHeight}"</span>
                                </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Placement:</span>
                              <span className="font-medium capitalize">
                                {customizationData.placement === 'manual' ? 'Manual Position' : customizationData.placement.replace('-', ' ')}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Scale:</span>
                              <span className="font-medium">{Math.round(customizationData.designScale * 100)}%</span>
                          </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Rotation:</span>
                              <span className="font-medium">{customizationData.designRotation}°</span>
                        </div>
                          </div>
                      </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Product Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Product:</span>
                          <span className="font-medium">{product?.title}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Color:</span>
                          <span className="font-medium capitalize">{customizationData.color}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Size:</span>
                          <span className="font-medium uppercase">{customizationData.size}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Quantity:</span>
                          <span className="font-medium">{customizationData.quantity}</span>
                        </div>
                            {customizationData.notes && (
                              <div className="mt-3">
                                <span className="text-gray-600 block mb-1">Notes:</span>
                                <span className="text-sm bg-gray-50 p-2 rounded block">{customizationData.notes}</span>
                        </div>
                            )}
                          </div>
                        </div>
                          </div>
                        )}
                      </div>
                )}

                {/* Total Cost Summary */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Calculator className="w-5 h-5 text-green-600" />
                      <span className="text-lg font-semibold text-green-900">Total Order Cost</span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-900">
                        ${calculateTotalPrice().toFixed(2)}
                  </div>
                      <div className="text-sm text-green-600">
                        {customizationData.quantity} item{customizationData.quantity !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowFinalDesignModal(false)}
                    className="w-full sm:w-auto"
                  >
                    Close Preview
                  </Button>
                  <Button
                    variant="add-to-cart"
                    onClick={() => {
                      setShowFinalDesignModal(false)
                      handleAddToCart()
                    }}
                    disabled={isAddingToCart}
                    className="w-full sm:w-auto"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    {isAddingToCart ? 'Adding to Cart...' : 'Add to Cart'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}