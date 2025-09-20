import React, { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon, Ruler, Calculator, Palette, CheckCircle, ArrowRight, ArrowLeft, Star, DollarSign } from 'lucide-react'
import Button from '../../components/Button'
import { embroideryOptionApiService, EmbroideryOption } from '../../shared/embroideryOptionApiService'
import { MaterialPricingService, CostBreakdown } from '../../shared/materialPricingService'

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
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 })
  const [embroideryOptions, setEmbroideryOptions] = useState<EmbroideryOption[]>([])
  const [loading, setLoading] = useState(false)
  const [materialCosts, setMaterialCosts] = useState<CostBreakdown | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [showReview, setShowReview] = useState(false)
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

  // Load embroidery options on component mount
  React.useEffect(() => {
    const loadEmbroideryOptions = async () => {
      try {
        setLoading(true)
        const response = await embroideryOptionApiService.getEmbroideryOptions({
          isActive: true,
          limit: 50
        })
        setEmbroideryOptions(response.data)
      } catch (error) {
        console.error('Error loading embroidery options:', error)
      } finally {
        setLoading(false)
      }
    }

    loadEmbroideryOptions()
  }, [])

  // Calculate pricing when size or options change
  React.useEffect(() => {
    if (size.width > 0 && size.height > 0) {
      calculatePricing()
    }
  }, [size, selectedStyles, embroideryOptions])

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

  const currentCategory = stepCategories[currentStep]
  const categoryStyles = embroideryOptions.filter(style => style.category === currentCategory.key)

  const handleStyleSelect = (style: EmbroideryOption) => {
    if (currentCategory.key === 'threads' || currentCategory.key === 'upgrades') {
      // Toggle for multi-select categories
      setSelectedStyles(prev => ({
        ...prev,
        [currentCategory.key]: prev[currentCategory.key as keyof typeof prev].includes(style)
          ? (prev[currentCategory.key as keyof typeof prev] as EmbroideryOption[]).filter(s => s.id !== style.id)
          : [...(prev[currentCategory.key as keyof typeof prev] as EmbroideryOption[]), style]
      }))
    } else {
      // Toggle for single-select categories (allow unselecting)
      const currentSelected = selectedStyles[currentCategory.key as keyof typeof selectedStyles] as EmbroideryOption
      setSelectedStyles(prev => ({
        ...prev,
        [currentCategory.key]: currentSelected?.id === style.id ? null : style
      }))
    }
  }

  const isStyleSelected = (style: EmbroideryOption) => {
    if (currentCategory.key === 'threads' || currentCategory.key === 'upgrades') {
      return (selectedStyles[currentCategory.key as keyof typeof selectedStyles] as EmbroideryOption[]).some(s => s.id === style.id)
    } else {
      return (selectedStyles[currentCategory.key as keyof typeof selectedStyles] as EmbroideryOption)?.id === style.id
    }
  }

  const canProceed = () => {
    if (currentCategory.required) {
      if (currentCategory.key === 'threads' || currentCategory.key === 'upgrades' || currentCategory.key === 'cutting') {
        return true // Optional categories
      }
      // For required single-select categories, check if something is selected
      const selected = selectedStyles[currentCategory.key as keyof typeof selectedStyles]
      return selected !== null && selected !== undefined
    }
    return true
  }

  const nextStep = () => {
    if (currentStep < stepCategories.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      setShowReview(true)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const getStepProgress = () => {
    return ((currentStep + 1) / stepCategories.length) * 100
  }

  const formatPrice = (price: number | string) => MaterialPricingService.formatPrice(price)

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
              disabled={!uploadedFile || !pricing || pricing.totalPrice === 0}
              className="w-full sm:w-auto group"
            >
              Get Quote
              <CheckCircle className="ml-2 w-4 h-4 group-hover:scale-110 transition-transform" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Design Upload and Size Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2 flex items-center">
            <Palette className="w-5 h-5 mr-2 text-accent" />
            Upload Your Design
          </h3>
          <p className="text-gray-600">Upload your design file and specify the embroidery size to get a quote.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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

      {/* Step-by-Step Embroidery Options */}
      {uploadedFile && size.width > 0 && size.height > 0 && (
        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Step {currentStep + 1} of {stepCategories.length}: {currentCategory.title}
              </h3>
              <span className="text-sm text-gray-500">{currentCategory.description}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-accent h-2 rounded-full transition-all duration-300"
                style={{ width: `${getStepProgress()}%` }}
              />
            </div>
          </div>

          {/* Style Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="mb-4 text-sm text-gray-600 text-center">
              {currentCategory.key === 'threads' || currentCategory.key === 'upgrades' 
                ? 'Click to select/deselect multiple options' 
                : 'Click to select, click again to deselect'
              }
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryStyles.map((style) => (
                <div
                  key={style.id}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all relative group ${
                    isStyleSelected(style)
                      ? 'border-accent bg-accent/5 hover:bg-accent/10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleStyleSelect(style)}
                >
                  {style.isPopular && (
                    <div className="absolute -top-2 -left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full flex items-center">
                      <Star className="w-3 h-3 mr-1" />
                      Most Popular
                    </div>
                  )}

                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <div className="w-8 h-8 bg-gray-300 rounded"></div>
                  </div>

                  <h4 className="font-semibold text-gray-900 text-center mb-2 text-sm">
                    {style.name}
                  </h4>

                  <p className="text-xs text-gray-600 text-center mb-3">
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

                  {isStyleSelected(style) && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-accent rounded-full flex items-center justify-center group-hover:bg-red-500 transition-colors" title="Click to deselect">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Navigation */}
            <div className="mt-8 flex flex-col sm:flex-row justify-between space-y-3 sm:space-y-0">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
                className="w-full sm:w-auto"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowReview(true)}
                  className="w-full sm:w-auto"
                >
                  Review All
                </Button>
                <Button
                  onClick={nextStep}
                  disabled={!canProceed()}
                  className="w-full sm:w-auto"
                >
                  {currentStep === stepCategories.length - 1 ? 'Review' : 'Next'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>

          {/* Real-time Pricing Card */}
          {materialCosts && (
            <div className="bg-gradient-to-br from-accent/5 to-accent/10 rounded-xl shadow-sm border border-accent/20 p-6">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-accent" />
                Real-time Pricing
              </h4>
              
              {/* Material Cost Breakdown */}
              <div className="space-y-3 mb-4">
                <h5 className="text-sm font-medium text-gray-700 mb-2">Material Costs</h5>
                <div className="space-y-1 text-sm">
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
                <div className="border-t border-gray-300 pt-2 flex justify-between">
                  <span className="font-semibold text-gray-900">Base Material Cost</span>
                  <span className="font-bold text-accent">{formatPrice(materialCosts.totalCost)}</span>
                </div>
              </div>

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
                  <div className="space-y-2">
                    {optionsPrice > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Embroidery Options</span>
                        <span className="font-medium">+{formatPrice(optionsPrice)}</span>
                      </div>
                    )}
                    <div className="border-t border-gray-300 pt-2 flex justify-between">
                      <span className="font-bold text-lg text-gray-900">Total Price</span>
                      <span className="font-bold text-xl text-accent">{formatPrice(totalPrice)}</span>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default DesignUpload
