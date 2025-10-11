import React, { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon, Ruler, Calculator, Palette, CheckCircle, ArrowRight, ArrowLeft, Star, DollarSign, ShoppingCart } from 'lucide-react'
import Button from '../../components/Button'
import { embroideryOptionApiService, EmbroideryOption } from '../../shared/embroideryOptionApiService'
import { MaterialPricingService, CostBreakdown } from '../../shared/materialPricingService'
import { useCart } from '../context/CartContext'

interface DesignUploadProps {
  onPriceUpdate?: (totalPrice: number, basePrice: number, optionsPrice: number) => void
  onDesignUpdate?: (design: File | null, preview: string | null) => void
}

const stepCategories = [
  { key: 'coverage', title: 'Coverage Level', description: 'Select one option', required: true },
  { key: 'material', title: 'Base Material', description: 'Select one option', required: true },
  { key: 'border', title: 'Border & Edge', description: 'Select one option', required: true },
  { key: 'threads', title: 'Thread Options', description: 'Select as many as needed (optional)', required: false },
  { key: 'backing', title: 'Backing', description: 'Select one option (optional)', required: false },
  { key: 'upgrades', title: 'Upgrades', description: 'Select as many as needed (optional)', required: false },
  { key: 'cutting', title: 'Cut to Shape Method', description: 'Select one option (optional)', required: false }
] as const

const DesignUpload: React.FC<DesignUploadProps> = ({ onPriceUpdate, onDesignUpdate }) => {
  const { add: addToCart } = useCart()
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 })
  const [embroideryOptions, setEmbroideryOptions] = useState<EmbroideryOption[]>([])
  const [loading, setLoading] = useState(false)
  const [materialCosts, setMaterialCosts] = useState<CostBreakdown | null>(null)
  const [showReview, setShowReview] = useState(false)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [selectedStyles, setSelectedStyles] = useState<{
    coverage: EmbroideryOption | null
    material: EmbroideryOption | null
    border: EmbroideryOption | null
    threads: EmbroideryOption[]
    backing: EmbroideryOption | null
    upgrades: EmbroideryOption[]
    cutting: EmbroideryOption | null
  }>({
    coverage: null,
    material: null,
    border: null,
    threads: [],
    backing: null,
    upgrades: [],
    cutting: null
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load embroidery options and material costs on component mount
  React.useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        
        // Load embroidery options
        const embroideryResponse = await embroideryOptionApiService.getEmbroideryOptions({
          isActive: true,
          limit: 50
        })
        setEmbroideryOptions(embroideryResponse.data)
        
        // Load dynamic material costs from API
        await MaterialPricingService.loadMaterialsFromAPI()
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Calculate pricing when size or options change
  React.useEffect(() => {
    if (size.width > 0 && size.height > 0) {
      calculatePricing()
    }
  }, [size, selectedStyles, embroideryOptions])

  // Calculate base material costs immediately when dimensions are entered
  React.useEffect(() => {
    if (size.width > 0 && size.height > 0) {
      // Calculate just the material costs without embroidery options
      const materialCosts = MaterialPricingService.calculateMaterialCosts({
        patchWidth: size.width,
        patchHeight: size.height
      })
      setMaterialCosts(materialCosts)
    }
  }, [size])

  const calculatePricing = () => {
    // Collect all selected options
    const allSelectedOptions = [
      selectedStyles.coverage,
      selectedStyles.material,
      selectedStyles.border,
      selectedStyles.backing,
      selectedStyles.cutting,
      ...selectedStyles.threads,
      ...selectedStyles.upgrades
    ].filter(Boolean) as EmbroideryOption[]

    const selectedEmbroideryOptions = allSelectedOptions.map(option => {
      const price = option.price || 0
      return {
        id: option.id,
        price: typeof price === 'string' ? parseFloat(price) || 0 : price,
        name: option.name || ''
      }
    })

    const pricingResult = MaterialPricingService.calculateTotalPrice(
      size.width,
      size.height,
      selectedEmbroideryOptions
    )
    
    setMaterialCosts(pricingResult.materialCosts)
    onPriceUpdate?.(pricingResult.totalPrice, pricingResult.materialCosts.totalCost, pricingResult.optionsPrice)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file')
        return
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB')
        return
      }

      setUploadedFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setPreview(result)
        onDesignUpdate?.(file, result)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeFile = () => {
    setUploadedFile(null)
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onDesignUpdate?.(null, null)
  }

  const handleSizeChange = (field: 'width' | 'height', value: string) => {
    setSize(prev => ({
      ...prev,
      [field]: Number(value) || 0
    }))
  }

  // Handle selecting/deselecting an option for a specific category
  const handleStyleSelect = (style: EmbroideryOption, categoryKey: string) => {
    if (categoryKey === 'threads' || categoryKey === 'upgrades') {
      // Toggle for multi-select categories
      setSelectedStyles(prev => ({
        ...prev,
        [categoryKey]: prev[categoryKey as keyof typeof prev].includes(style)
          ? (prev[categoryKey as keyof typeof prev] as EmbroideryOption[]).filter(s => s.id !== style.id)
          : [...(prev[categoryKey as keyof typeof prev] as EmbroideryOption[]), style]
      }))
    } else {
      // Toggle for single-select categories (allow unselecting)
      const currentSelected = selectedStyles[categoryKey as keyof typeof selectedStyles] as EmbroideryOption
      setSelectedStyles(prev => ({
        ...prev,
        [categoryKey]: currentSelected?.id === style.id ? null : style
      }))
    }
  }

  // Check if a specific style is selected
  const isStyleSelected = (style: EmbroideryOption, categoryKey: string) => {
    if (categoryKey === 'threads' || categoryKey === 'upgrades') {
      return (selectedStyles[categoryKey as keyof typeof selectedStyles] as EmbroideryOption[]).some(s => s.id === style.id)
    } else {
      return (selectedStyles[categoryKey as keyof typeof selectedStyles] as EmbroideryOption)?.id === style.id
    }
  }

  // Check if all required categories are selected for final review
  const canProceedToReview = () => {
    // Check all required categories
    const requiredCategories = stepCategories.filter(cat => cat.required)
    
    for (const category of requiredCategories) {
      const selected = selectedStyles[category.key as keyof typeof selectedStyles]
      if (!selected || (Array.isArray(selected) && selected.length === 0)) {
        return false
      }
    }
    
    return true
  }

  const formatPrice = (price: number | string) => MaterialPricingService.formatPrice(price)

  const handleAddToCart = async () => {
    if (!uploadedFile || !materialCosts || !preview) {
      alert('Please upload a design and ensure all required fields are completed')
      return
    }

    setIsAddingToCart(true)
    try {
      // Convert file to base64 for storage
      const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.readAsDataURL(file)
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = error => reject(error)
        })
      }

      const designBase64 = await fileToBase64(uploadedFile)

      // Calculate total price
      const allSelectedOptions = [
        selectedStyles.coverage,
        selectedStyles.material,
        selectedStyles.border,
        selectedStyles.backing,
        selectedStyles.cutting,
        ...selectedStyles.threads,
        ...selectedStyles.upgrades
      ].filter(Boolean) as EmbroideryOption[]

      const optionsPrice = allSelectedOptions.reduce((sum, option) => {
        const price = typeof option.price === 'string' ? parseFloat(option.price) || 0 : option.price
        return sum + price
      }, 0)

      const totalPrice = materialCosts.totalCost + optionsPrice

      // Create customization data for cart
      const customization = {
        design: {
          name: uploadedFile.name,
          size: uploadedFile.size,
          preview: preview,
          base64: designBase64
        },
        mockup: preview,
        selectedStyles: {
          coverage: selectedStyles.coverage ? {
            id: selectedStyles.coverage.id.toString(),
            name: selectedStyles.coverage.name,
            price: typeof selectedStyles.coverage.price === 'string' ? parseFloat(selectedStyles.coverage.price) || 0 : selectedStyles.coverage.price
          } : null,
          material: selectedStyles.material ? {
            id: selectedStyles.material.id.toString(),
            name: selectedStyles.material.name,
            price: typeof selectedStyles.material.price === 'string' ? parseFloat(selectedStyles.material.price) || 0 : selectedStyles.material.price
          } : null,
          border: selectedStyles.border ? {
            id: selectedStyles.border.id.toString(),
            name: selectedStyles.border.name,
            price: typeof selectedStyles.border.price === 'string' ? parseFloat(selectedStyles.border.price) || 0 : selectedStyles.border.price
          } : null,
          threads: selectedStyles.threads.map(thread => ({
            id: thread.id.toString(),
            name: thread.name,
            price: typeof thread.price === 'string' ? parseFloat(thread.price) || 0 : thread.price
          })),
          backing: selectedStyles.backing ? {
            id: selectedStyles.backing.id.toString(),
            name: selectedStyles.backing.name,
            price: typeof selectedStyles.backing.price === 'string' ? parseFloat(selectedStyles.backing.price) || 0 : selectedStyles.backing.price
          } : null,
          upgrades: selectedStyles.upgrades.map(upgrade => ({
            id: upgrade.id.toString(),
            name: upgrade.name,
            price: typeof upgrade.price === 'string' ? parseFloat(upgrade.price) || 0 : upgrade.price
          })),
          cutting: selectedStyles.cutting ? {
            id: selectedStyles.cutting.id.toString(),
            name: selectedStyles.cutting.name,
            price: typeof selectedStyles.cutting.price === 'string' ? parseFloat(selectedStyles.cutting.price) || 0 : selectedStyles.cutting.price
          } : null
        },
        placement: 'front' as const,
        size: 'medium' as const,
        color: '#000000',
        notes: `Custom embroidery: ${size.width}" × ${size.height}" - ${uploadedFile.name}`,
        designPosition: { x: 50, y: 50 },
        designScale: 1,
        designRotation: 0,
        // Add embroidery-specific data
        embroideryData: {
          dimensions: {
            width: size.width,
            height: size.height
          },
          materialCosts: materialCosts,
          optionsPrice: optionsPrice,
          totalPrice: totalPrice,
          designImage: designBase64, // Store the design image
          reviewStatus: 'pending' // Initial review status
        }
      }

      // Add to cart using a special product ID for custom embroidery
      const success = await addToCart('custom-embroidery', 1, customization)
      
      if (success) {
        alert('Custom embroidery added to cart successfully! It will be reviewed before checkout.')
        setShowReview(false)
        // Reset form
        setUploadedFile(null)
        setPreview(null)
        setSize({ width: 0, height: 0 })
        setSelectedStyles({
          coverage: null,
          material: null,
          border: null,
          threads: [],
          backing: null,
          upgrades: [],
          cutting: null
        })
        setCurrentStep(0)
        setMaterialCosts(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      } else {
        alert('Failed to add to cart. Please try again.')
      }
    } catch (error) {
      console.error('Error adding custom embroidery to cart:', error)
      alert('An error occurred while adding to cart. Please try again.')
    } finally {
      setIsAddingToCart(false)
    }
  }

  if (showReview) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Review Your Selections</h3>

          <div className="space-y-6">
            {stepCategories.map((category) => {
              const selected = selectedStyles[category.key as keyof typeof selectedStyles]
              if (!selected || (Array.isArray(selected) && selected.length === 0)) return null

              return (
                <div key={category.key} className="border-b border-gray-200 pb-4">
                  <h4 className="font-semibold text-gray-900 mb-3">{category.title}</h4>
                  <div className="space-y-2">
                    {Array.isArray(selected) ? (
                      selected.map((style) => (
                        <div key={style.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                              <CheckCircle className="w-4 h-4 text-purple-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{style.name}</p>
                              <p className="text-sm text-gray-600">{style.description}</p>
                            </div>
                          </div>
                          <p className="font-semibold text-accent">
                            {style.price === 0 ? 'Free' : `+${formatPrice(style.price)}`}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{selected.name}</p>
                            <p className="text-sm text-gray-600">{selected.description}</p>
                          </div>
                        </div>
                        <p className="font-semibold text-accent">
                          {selected.price === 0 ? 'Free' : `+${formatPrice(selected.price)}`}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-8 flex flex-col sm:flex-row justify-between space-y-3 sm:space-y-0">
            <Button
              variant="outline"
              onClick={() => setShowReview(false)}
              className="w-full sm:w-auto"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Edit
            </Button>
            <Button
              onClick={handleAddToCart}
              disabled={!uploadedFile || !materialCosts || materialCosts.totalCost === 0 || isAddingToCart}
              className="w-full sm:w-auto group"
            >
              {isAddingToCart ? 'Adding to Cart...' : 'Add to Cart'}
              <ShoppingCart className="ml-2 w-4 h-4 group-hover:scale-110 transition-transform" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Main Content with Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Design Upload and Options */}
        <div className="lg:col-span-2 space-y-6">
          {/* Design Upload and Size Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2 flex items-center">
                <Palette className="w-5 h-5 mr-2 text-accent" />
                Upload Your Design
              </h3>
              <p className="text-gray-600">Upload your design file and specify the embroidery size to get a quote.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Design File
                </label>
                {!uploadedFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-accent hover:bg-accent/5 transition-colors cursor-pointer"
                  >
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-900 mb-2">Upload your design</p>
                    <p className="text-sm text-gray-500 mb-4">
                      PNG, JPG, SVG, or PDF files up to 10MB
                    </p>
                    <Button variant="outline" size="sm">
                      Choose File
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <ImageIcon className="w-8 h-8 text-accent" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {uploadedFile.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <button
                          onClick={removeFile}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    {preview && (
                      <div className="mt-4">
                        <img
                          src={preview}
                          alt="Design preview"
                          className="w-full h-48 object-contain border border-gray-200 rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.svg"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Size Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <Ruler className="w-4 h-4 inline mr-1" />
                  Embroidery Size (Inches)
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Width (inches)</label>
                    <input
                      type="number"
                      value={size.width || ''}
                      onChange={(e) => handleSizeChange('width', e.target.value)}
                      placeholder="0"
                      min="0"
                      step="0.1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-accent focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Height (inches)</label>
                    <input
                      type="number"
                      value={size.height || ''}
                      onChange={(e) => handleSizeChange('height', e.target.value)}
                      placeholder="0"
                      min="0"
                      step="0.1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-accent focus:border-accent"
                    />
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  <p>Size: {size.width > 0 && size.height > 0 ? `${size.width}" × ${size.height}"` : 'Enter dimensions'}</p>
                  <p>Area: {size.width > 0 && size.height > 0 ? `${(size.width * size.height).toFixed(2)} sq in` : '0 sq in'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* All Embroidery Options - Displayed At Once */}
          {uploadedFile && size.width > 0 && size.height > 0 && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">
                  Embroidery Options
                </h3>
                
                {stepCategories.map((category) => {
                  const categoryStyles = embroideryOptions.filter(
                    (opt) => opt.category === category.key && opt.isActive
                  )
                  
                  if (categoryStyles.length === 0) return null

                  return (
                    <div key={category.key} className="mb-8 pb-8 border-b border-gray-200 last:border-b-0">
                      {/* Category Header */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-lg font-semibold text-gray-900">
                            {category.title}
                          </h4>
                          <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                            category.required 
                              ? 'bg-red-100 text-red-800 border border-red-200' 
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}>
                            {category.required ? 'REQUIRED' : 'OPTIONAL'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {category.key === 'threads' || category.key === 'upgrades' 
                            ? 'Select as many as needed' 
                            : category.required ? 'Choose one option' : 'Choose one option (optional)'}
                        </p>
                      </div>

                      {/* Options Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {categoryStyles.map((style) => (
                          <div
                            key={style.id}
                            className={`border-2 rounded-lg p-4 cursor-pointer transition-all relative group ${
                              isStyleSelected(style, category.key)
                                ? 'border-accent bg-accent/5 hover:bg-accent/10'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => handleStyleSelect(style, category.key)}
                          >
                            {style.isPopular && (
                              <div className="absolute -top-2 -left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full flex items-center z-10">
                                <Star className="w-3 h-3 mr-1" />
                                Most Popular
                              </div>
                            )}

                            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                              <Palette className="w-8 h-8 text-gray-400" />
                            </div>

                            <h5 className="font-semibold text-gray-900 text-center mb-2 text-sm">
                              {style.name}
                            </h5>

                            <p className="text-xs text-gray-600 text-center mb-3 min-h-[2.5rem]">
                              {style.description}
                            </p>

                            <div className="text-center">
                              <p className="text-sm font-bold text-accent">
                                {Number(style.price) === 0 ? 'Free' : `+${formatPrice(style.price)}`}
                              </p>
                              {style.estimatedTime !== '0 days' && (
                                <p className="text-xs text-gray-500">{style.estimatedTime}</p>
                              )}
                            </div>

                            {isStyleSelected(style, category.key) && (
                              <div className="absolute top-2 right-2 w-6 h-6 bg-accent rounded-full flex items-center justify-center transition-colors" title="Selected">
                                <CheckCircle className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}

                {/* Review Button */}
                <div className="mt-8 flex justify-center">
                  <Button
                    onClick={() => setShowReview(true)}
                    disabled={!canProceedToReview()}
                    className="px-8 py-3"
                    size="lg"
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Review & Add to Cart
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Pricing Card */}
        <div className="lg:col-span-1">
          <div className="sticky top-4">
            {/* Real-time Pricing Card */}
            {size.width > 0 && size.height > 0 && materialCosts ? (
              <div className="bg-gradient-to-br from-accent/5 to-accent/10 rounded-xl shadow-sm border border-accent/20 p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2 text-accent" />
                  Real-time Pricing
                </h4>
                
                {/* Base Material Cost - Prominent Display */}
                <div className="bg-white rounded-lg p-4 mb-4 border border-accent/20">
                  <div className="text-center">
                    <div className="text-sm text-gray-600 mb-1">Base Material Cost</div>
                    <div className="text-3xl font-bold text-accent">{formatPrice(materialCosts.totalCost)}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {size.width}" × {size.height}" = {(size.width * size.height).toFixed(2)} sq in
                    </div>
                  </div>
                </div>

                {/* Material Cost Breakdown - Collapsible */}
                <details className="mb-4">
                  <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-accent">
                    View Material Breakdown
                  </summary>
                  <div className="mt-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fabric</span>
                      <span className="font-medium">{formatPrice(materialCosts.fabricCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Patch Attach</span>
                      <span className="font-medium">{formatPrice(materialCosts.patchAttachCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Thread</span>
                      <span className="font-medium">{formatPrice(materialCosts.threadCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Bobbin</span>
                      <span className="font-medium">{formatPrice(materialCosts.bobbinCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cut-Away Stabilizer</span>
                      <span className="font-medium">{formatPrice(materialCosts.cutAwayStabilizerCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Wash-Away Stabilizer</span>
                      <span className="font-medium">{formatPrice(materialCosts.washAwayStabilizerCost)}</span>
                    </div>
                  </div>
                </details>

                {/* Options Cost */}
                {(() => {
                  const allSelectedOptions = [
                    selectedStyles.coverage,
                    selectedStyles.material,
                    selectedStyles.border,
                    selectedStyles.backing,
                    selectedStyles.cutting,
                    ...selectedStyles.threads,
                    ...selectedStyles.upgrades
                  ].filter(Boolean) as EmbroideryOption[]

                  const optionsPrice = allSelectedOptions.reduce((sum, option) => {
                    const price = typeof option.price === 'string' ? parseFloat(option.price) || 0 : option.price
                    return sum + price
                  }, 0)

                  const totalPrice = materialCosts.totalCost + optionsPrice

                  return (
                    <div className="space-y-3">
                      {optionsPrice > 0 ? (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Embroidery Options</span>
                            <span className="font-medium text-green-600">+{formatPrice(optionsPrice)}</span>
                          </div>
                          <div className="border-t border-gray-300 pt-3">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-lg text-gray-900">Total Price</span>
                              <span className="font-bold text-2xl text-accent">{formatPrice(totalPrice)}</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center text-sm text-gray-500 py-2">
                          Select embroidery options to see total price
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 text-center">
                <Calculator className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h4 className="font-semibold text-gray-700 mb-2">Enter Dimensions</h4>
                <p className="text-sm text-gray-500">
                  Enter width and height to see real-time pricing
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DesignUpload
