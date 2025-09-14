import React, { useState } from 'react'
import { useCustomization } from '../context/CustomizationContext'
import Button from '../../components/Button'
import { ArrowRight, ArrowLeft, Check, X, Star, Info } from 'lucide-react'

interface StepByStepCustomizationProps {
  onComplete: () => void
  onBackToDesign?: () => void
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

export default function StepByStepCustomization({ onComplete, onBackToDesign }: StepByStepCustomizationProps) {
  const { customizationData, selectStyle, toggleStyle, embroideryStyles, loading } = useCustomization()
  const [currentStep, setCurrentStep] = useState(0)
  const [showReview, setShowReview] = useState(false)

  const currentCategory = stepCategories[currentStep]
  const categoryStyles = embroideryStyles.filter(style => style.category === currentCategory.key)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
          <span>Loading embroidery options...</span>
        </div>
      </div>
    )
  }

  const handleStyleSelect = (style: typeof embroideryStyles[0]) => {
    if (currentCategory.key === 'threads' || currentCategory.key === 'upgrades') {
      toggleStyle(currentCategory.key, style)
    } else {
      selectStyle(currentCategory.key, style)
    }
  }

  const isStyleSelected = (style: typeof embroideryStyles[0]) => {
    if (currentCategory.key === 'threads' || currentCategory.key === 'upgrades') {
      return customizationData.selectedStyles[currentCategory.key].some(s => s.id === style.id)
    } else {
      return customizationData.selectedStyles[currentCategory.key]?.id === style.id
    }
  }

  const canProceed = () => {
    if (currentCategory.required) {
      if (currentCategory.key === 'threads' || currentCategory.key === 'upgrades' || currentCategory.key === 'cutting') {
        return true // Optional categories
      }
      return customizationData.selectedStyles[currentCategory.key] !== null
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
    } else if (onBackToDesign) {
      // If we're at the first step (coverage) and onBackToDesign is provided, go back to design upload
      onBackToDesign()
    }
  }

  const getStepProgress = () => {
    return ((currentStep + 1) / stepCategories.length) * 100
  }

  if (showReview) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Review Your Selections</h3>

          <div className="space-y-6">
            {stepCategories.map((category) => {
              const selected = customizationData.selectedStyles[category.key]
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
                              <Check className="w-4 h-4 text-purple-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{style.name}</p>
                              <p className="text-sm text-gray-600">{style.description}</p>
                            </div>
                          </div>
                          <p className="font-semibold text-accent">
                            {style.price === 0 ? 'Free' : `+$${style.price.toFixed(2)}`}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                            <Check className="w-4 h-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{selected.name}</p>
                            <p className="text-sm text-gray-600">{selected.description}</p>
                          </div>
                        </div>
                        <p className="font-semibold text-accent">
                          {selected.price === 0 ? 'Free' : `+$${selected.price.toFixed(2)}`}
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
              variant="add-to-cart"
              onClick={onComplete}
              className="w-full sm:w-auto"
            >
              Review my Order
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoryStyles.map((style) => (
            <div
              key={style.id}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all relative ${
                isStyleSelected(style)
                  ? 'border-accent bg-accent/5'
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
                  {Number(style.price) === 0 ? 'Free' : `+$${Number(style.price).toFixed(2)}`}
                </p>
                {style.estimatedTime !== '0 days' && (
                  <p className="text-xs text-gray-500">{style.estimatedTime}</p>
                )}
              </div>

              {isStyleSelected(style) && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-accent rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
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
            disabled={currentStep === 0 && !onBackToDesign}
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
    </div>
  )
}
