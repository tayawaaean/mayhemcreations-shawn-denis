import React, { useState } from 'react'
import { Check, Copy, Settings, Calculator, ArrowRight, ArrowLeft, Info, AlertCircle } from 'lucide-react'
import { useCustomization, EmbroideryDesignData, EmbroideryStyle } from '../context/CustomizationContext'
import Button from '../../components/Button'

interface PerDesignCustomizationProps {
  onComplete: () => void
  onBack: () => void
}

const PerDesignCustomization: React.FC<PerDesignCustomizationProps> = ({ onComplete, onBack }) => {
  const { 
    customizationData, 
    embroideryStyles,
    selectStyleForDesign,
    toggleStyleForDesign,
    copyEmbroideryOptions,
    calculateDesignPrice
  } = useCustomization()
  
  const [activeDesignId, setActiveDesignId] = useState<string | null>(
    customizationData.designs.length > 0 ? customizationData.designs[0].id : null
  )
  const [copyFromDesignId, setCopyFromDesignId] = useState<string | null>(null)

  const activeDesign = activeDesignId ? customizationData.designs.find(d => d.id === activeDesignId) : null

  const handleCopyOptions = () => {
    if (copyFromDesignId && activeDesignId && copyFromDesignId !== activeDesignId) {
      copyEmbroideryOptions(copyFromDesignId, activeDesignId)
      setCopyFromDesignId(null)
    }
  }

  const getStyleOptions = (category: keyof EmbroideryStyle) => {
    return embroideryStyles.filter(style => style.category === category)
  }

  const getSimplifiedCategoryInfo = (category: keyof EmbroideryStyle) => {
    const info = {
      coverage: { 
        question: "How much of your design should we embroider?",
        help: "This affects how detailed the final embroidery will be"
      },
      material: {
        question: "What type of thread material?",
        help: "Different materials have different looks and durability"
      },
      border: {
        question: "How should the edges look?",
        help: "This affects the finishing around your design"
      },
      threads: {
        question: "Any special thread colors or effects?",
        help: "Optional - add special threads for extra style"
      },
      backing: {
        question: "Do you need extra support backing?",
        help: "Optional - adds durability for frequently washed items"
      },
      upgrades: {
        question: "Want any special effects?",
        help: "Optional - make your design stand out even more"
      },
      cutting: {
        question: "How should we finish the edges?",
        help: "Optional - choose how the design is cut and finished"
      }
    }
    return info[category] || { question: title, help: description }
  }

  const renderStyleSelector = (
    category: keyof EmbroideryStyle,
    title: string,
    description: string,
    isArray: boolean = false
  ) => {
    if (!activeDesign) return null

    const currentStyles = activeDesign.selectedStyles[category]
    const options = getStyleOptions(category)

    if (options.length === 0) return null

    const categoryInfo = getSimplifiedCategoryInfo(category)
    const isRequired = ['coverage', 'material', 'border'].includes(category)

    return (
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-gray-900">{categoryInfo.question}</h4>
              {isRequired && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Required</span>}
              {!isRequired && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Optional</span>}
            </div>
            <p className="text-sm text-gray-600">{categoryInfo.help}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {options.map((style) => {
            const isSelected = isArray 
              ? Array.isArray(currentStyles) && currentStyles.some(s => s.id === style.id)
              : currentStyles && (currentStyles as EmbroideryStyle).id === style.id

            return (
              <button
                key={style.id}
                onClick={() => {
                  if (isArray) {
                    toggleStyleForDesign(activeDesignId!, category as 'threads' | 'upgrades', style)
                  } else {
                    selectStyleForDesign(activeDesignId!, category, style)
                  }
                }}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  isSelected
                    ? 'border-accent bg-accent/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{style.name}</div>
                    <div className="text-sm text-gray-600">{style.description}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {style.price === 0 ? 'Free' : `+$${style.price.toFixed(2)}`}
                    </div>
                    {isSelected && (
                      <div className="mt-1">
                        <Check className="w-4 h-4 text-accent" />
                      </div>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Design Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center">
            <Settings className="w-6 h-6 mr-2 text-accent" />
            Step 4: How Do You Want It Embroidered?
          </h3>
          <p className="text-gray-600">Choose the style and options for each design - don't worry, we'll explain what everything means!</p>
        </div>
        
        {customizationData.designs.length > 0 ? (
          <div className="space-y-4">
            {/* Design Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-gray-200">
              {customizationData.designs.map((design, index) => (
                <button
                  key={design.id}
                  onClick={() => setActiveDesignId(design.id)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeDesignId === design.id
                      ? 'border-accent text-accent'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 bg-accent text-white rounded-full flex items-center justify-center text-xs">
                      {index + 1}
                    </span>
                    <span className="truncate max-w-[100px]">{design.name}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Active Design Options */}
            {activeDesign && (
              <div className="space-y-6">
                {/* Design Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-4">
                    <img
                      src={activeDesign.preview}
                      alt={activeDesign.name}
                      className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{activeDesign.name}</h4>
                      <p className="text-sm text-gray-600">
                        {activeDesign.dimensions.width}" × {activeDesign.dimensions.height}" @ {Math.round(activeDesign.scale * 100)}%
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-accent">
                        ${calculateDesignPrice(activeDesign.id).toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600">Design Cost</div>
                    </div>
                  </div>
                </div>

                {/* Copy Options */}
                {customizationData.designs.length > 1 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h5 className="font-medium text-blue-900 mb-2">Copy Options from Another Design</h5>
                    <div className="flex items-center space-x-3">
                      <select
                        value={copyFromDesignId || ''}
                        onChange={(e) => setCopyFromDesignId(e.target.value || null)}
                        className="px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select design to copy from</option>
                        {customizationData.designs
                          .filter(d => d.id !== activeDesignId)
                          .map((design, index) => (
                            <option key={design.id} value={design.id}>
                              Design {index + 1}: {design.name}
                            </option>
                          ))}
                      </select>
                      <button
                        onClick={handleCopyOptions}
                        disabled={!copyFromDesignId}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </button>
                    </div>
                  </div>
                )}

                {/* Embroidery Options */}
                <div className="space-y-6">
                  {renderStyleSelector('coverage', 'Coverage', 'Choose the coverage type for this design')}
                  {renderStyleSelector('material', 'Material', 'Select the base material')}
                  {renderStyleSelector('border', 'Border', 'Choose border style')}
                  {renderStyleSelector('threads', 'Thread Colors', 'Select thread colors (multiple allowed)', true)}
                  {renderStyleSelector('backing', 'Backing', 'Choose backing material')}
                  {renderStyleSelector('upgrades', 'Upgrades', 'Select additional upgrades (multiple allowed)', true)}
                  {renderStyleSelector('cutting', 'Cutting', 'Choose cutting style')}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Settings className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-lg font-medium text-gray-700 mb-2">No designs to customize yet</p>
            <p className="text-sm text-gray-500">You'll need to upload at least one design in Step 2 before choosing embroidery options.</p>
          </div>
        )}
      </div>

      {/* Help Section */}
      {customizationData.designs.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-5">
          <h4 className="font-semibold text-purple-900 mb-3 flex items-center">
            <Info className="w-5 h-5 mr-2" />
            Quick Tips for Choosing Options
          </h4>
          <div className="space-y-2 text-sm text-purple-800">
            <p>• <strong>Not sure what to pick?</strong> The standard options work great for most designs</p>
            <p>• <strong>Save time:</strong> Choose options for one design, then use "Copy Options" for others</p>
            <p>• <strong>Watch the price:</strong> The design cost updates as you select options</p>
            <p>• <strong>Optional items:</strong> You can skip optional upgrades if you want to keep costs down</p>
          </div>
        </div>
      )}

      {/* Validation Message */}
      {customizationData.designs.length > 0 && (
        <>
          {customizationData.designs.some(design => 
            !design.selectedStyles.coverage || 
            !design.selectedStyles.material || 
            !design.selectedStyles.border
          ) ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start">
                <Info className="w-5 h-5 text-amber-600 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-900 mb-2">Please complete required options for all designs:</p>
                  <ul className="text-sm text-amber-800 space-y-1">
                    {customizationData.designs.map((design, index) => {
                      const missing: string[] = []
                      if (!design.selectedStyles.coverage) missing.push('Coverage')
                      if (!design.selectedStyles.material) missing.push('Material')
                      if (!design.selectedStyles.border) missing.push('Border Style')
                      
                      if (missing.length > 0) {
                        return (
                          <li key={design.id}>
                            <strong>Design {index + 1} ({design.name}):</strong> Missing {missing.join(', ')}
                          </li>
                        )
                      }
                      return null
                    })}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center">
                <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0" />
                <p className="text-sm text-green-800 font-medium">Perfect! All required options are selected for {customizationData.designs.length} design{customizationData.designs.length > 1 ? 's' : ''}.</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row justify-between space-y-3 sm:space-y-0">
        <Button variant="outline" onClick={onBack} className="w-full sm:w-auto">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Positioning
        </Button>
        <Button 
          onClick={onComplete} 
          disabled={
            customizationData.designs.length === 0 || 
            customizationData.designs.some(design => 
              !design.selectedStyles.coverage || 
              !design.selectedStyles.material || 
              !design.selectedStyles.border
            )
          }
          className="w-full sm:w-auto"
        >
          {customizationData.designs.length === 0 
            ? 'Add designs first' 
            : customizationData.designs.some(design => 
                !design.selectedStyles.coverage || 
                !design.selectedStyles.material || 
                !design.selectedStyles.border
              )
            ? 'Complete required options to continue'
            : 'Next: Review Everything'}
          {customizationData.designs.length > 0 && 
           !customizationData.designs.some(design => 
             !design.selectedStyles.coverage || 
             !design.selectedStyles.material || 
             !design.selectedStyles.border
           ) && <ArrowRight className="w-4 h-4 ml-2" />}
        </Button>
      </div>
    </div>
  )
}

export default PerDesignCustomization
