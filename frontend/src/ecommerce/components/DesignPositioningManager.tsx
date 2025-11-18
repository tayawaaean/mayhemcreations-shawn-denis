import React, { useState } from 'react'
import { Edit3, Calculator, Save, X, MessageSquare, Copy, Info, Ruler, RotateCw, Trash2 } from 'lucide-react'
import { useCustomization, EmbroideryDesignData } from '../context/CustomizationContext'
import { MaterialPricingService } from '../../shared/materialPricingService'

interface DesignPositioningManagerProps {
  showFinalView: boolean
}

const DesignPositioningManager: React.FC<DesignPositioningManagerProps> = ({ showFinalView }) => {
  const { 
    customizationData, 
    updateDesign,
    calculateDesignPrice,
    setCustomizationData,
    removeDesignById
  } = useCustomization()
  
  const [editingNotes, setEditingNotes] = useState<string | null>(null)
  const [editingNotesValue, setEditingNotesValue] = useState('')
  const [editingDimensions, setEditingDimensions] = useState<{[key: string]: {width: string, height: string}}>({})
  const [editingRotation, setEditingRotation] = useState<{[key: string]: string}>({})

  const handleEditNotes = (designId: string, currentNotes: string) => {
    setEditingNotes(designId)
    setEditingNotesValue(currentNotes)
  }

  const handleSaveNotes = (designId: string) => {
    updateDesign(designId, { notes: editingNotesValue })
    setEditingNotes(null)
    setEditingNotesValue('')
  }

  const handleCancelNotes = () => {
    setEditingNotes(null)
    setEditingNotesValue('')
  }

  const calculateMaterialCost = (design: EmbroideryDesignData) => {
    try {
      const pricing = MaterialPricingService.calculateMaterialCosts({
        patchWidth: design.dimensions.width * design.scale,
        patchHeight: design.dimensions.height * design.scale
      })
      return pricing.totalCost
    } catch (error) {
      console.error('Error calculating material cost:', error)
      return 0
    }
  }

  const handleDuplicateDesign = (originalDesign: EmbroideryDesignData) => {
    try {
      // Create a new design with the same file but different dimensions and position
      const duplicatedDesign: EmbroideryDesignData = {
        id: `design_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: `${originalDesign.name} (Copy)`,
        file: originalDesign.file,
        preview: originalDesign.preview,
        dimensions: { 
          width: originalDesign.dimensions.width, 
          height: originalDesign.dimensions.height 
        },
        position: { 
          x: originalDesign.position.x + 30, // Offset position slightly
          y: originalDesign.position.y + 30,
          placement: originalDesign.position.placement
        },
        scale: 1, // Reset scale to 1
        rotation: 0, // Reset rotation to 0
        notes: '', // Empty notes for the duplicate
        selectedStyles: {
          coverage: null,
          material: null,
          border: null,
          threads: [],
          backing: null,
          upgrades: [],
          cutting: null
        }
      }

      // Add the duplicated design
      const newDesignsArray = [...customizationData.designs, duplicatedDesign]
      setCustomizationData({ designs: newDesignsArray })
      
      console.log('Design duplicated successfully:', duplicatedDesign.name)
    } catch (error) {
      console.error('Error duplicating design:', error)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Design Positioning Controls */}
      <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-6">
        <div className="mb-4 sm:mb-6">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1.5 sm:mb-2 flex items-center">
            <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-accent flex-shrink-0" />
            <span>Step 3: Tell Us Where to Put Your Design</span>
          </h3>
          <p className="text-xs sm:text-sm md:text-base text-gray-600">Add notes to tell us exactly where you want each design placed on your product</p>
        </div>
        
        <div className="space-y-3 sm:space-y-4">
          {customizationData.designs.map((design, index) => (
            <div key={design.id} className="border border-gray-200 rounded-lg p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                {/* Design Preview */}
                <div className="relative flex-shrink-0 self-center sm:self-start">
                  <img
                    src={design.preview}
                    alt={design.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-gray-200"
                  />
                  <div className="absolute -top-2 -left-2 bg-accent text-white w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs font-semibold">
                    {index + 1}
                  </div>
                </div>

                {/* Design Info & Controls */}
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-2 sm:mb-3">
                    <h4 className="text-sm font-medium text-gray-900 truncate" title={design.name}>
                      {design.name}
                    </h4>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDuplicateDesign(design)}
                          className="px-2.5 sm:px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded-md transition-colors flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-medium"
                          title="Duplicate this design with different size"
                        >
                          <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span>Duplicate</span>
                        </button>
                        {customizationData.designs.length > 1 && (
                          <button
                            onClick={() => removeDesignById(design.id)}
                            className="px-2.5 sm:px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded-md transition-colors flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-medium"
                            title="Delete this design"
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                      <span className="text-[10px] sm:text-xs text-gray-500 whitespace-nowrap">
                        {design.dimensions.width}" × {design.dimensions.height}" @ {Math.round(design.scale * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Notes Section - Highlighted with pulsing animation when empty */}
                  <div className="mb-2 sm:mb-3">
                    {editingNotes === design.id ? (
                      <div className="space-y-1.5 sm:space-y-2">
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                          Where should we place this design?
                        </label>
                        <textarea
                          value={editingNotesValue}
                          onChange={(e) => setEditingNotesValue(e.target.value)}
                          placeholder="Example: 'Place on front center' or 'Left chest pocket area' or 'Back of shirt, centered'"
                          className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
                          rows={3}
                        />
                        <p className="text-[10px] sm:text-xs text-gray-500">Be as specific as you can - it helps us get it perfect!</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveNotes(design.id)}
                            className="px-2.5 sm:px-3 py-1 text-[10px] sm:text-xs bg-accent text-white rounded hover:bg-accent/90 transition-colors flex items-center gap-1"
                          >
                            <Save className="w-3 h-3" />
                            Save
                          </button>
                          <button
                            onClick={handleCancelNotes}
                            className="px-2.5 sm:px-3 py-1 text-[10px] sm:text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => handleEditNotes(design.id, design.notes)}
                        className={`text-xs sm:text-sm text-gray-600 cursor-pointer transition-colors min-h-[50px] sm:min-h-[60px] flex items-center p-2.5 sm:p-3 border-2 border-dashed rounded-lg ${
                          design.notes 
                            ? 'border-gray-300 hover:bg-blue-50 hover:border-blue-400' 
                            : 'border-amber-400 bg-amber-50 hover:bg-amber-100 hover:border-amber-500 animate-pulse'
                        }`}
                      >
                        {design.notes ? (
                          <div className="flex items-start gap-2 w-full">
                            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 text-green-600 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs sm:text-sm font-medium text-gray-900 mb-0.5 sm:mb-1">Placement Instructions:</p>
                              <p className="text-xs sm:text-sm text-gray-700 break-words">{design.notes}</p>
                            </div>
                            <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 w-full">
                            <div className="flex items-center gap-2">
                              <div className="relative">
                                <Edit3 className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                              </div>
                              <div className="text-center sm:text-left">
                                <p className="text-xs sm:text-sm font-bold text-amber-900">Click here to add placement instructions</p>
                                <p className="text-[10px] sm:text-xs text-amber-700 mt-0.5 sm:mt-1 font-medium">Required - Tell us where to place this design</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Manual Size Input */}
                  <div className="bg-white border border-gray-200 rounded-lg p-2.5 sm:p-3">
                    <h5 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3 flex items-center">
                      <Ruler className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-gray-600 flex-shrink-0" />
                      Set Exact Size (Optional)
                    </h5>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <div>
                        <label className="block text-[10px] sm:text-xs font-medium text-gray-700 mb-1">
                          Width (inches)
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={editingDimensions[design.id]?.width ?? design.dimensions.width.toFixed(2)}
                          onFocus={() => {
                            setEditingDimensions(prev => ({
                              ...prev,
                              [design.id]: {
                                width: design.dimensions.width.toString(),
                                height: prev[design.id]?.height ?? design.dimensions.height.toString()
                              }
                            }))
                          }}
                          onChange={(e) => {
                            const value = e.target.value
                            // Allow empty string and valid decimal numbers during typing
                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                              setEditingDimensions(prev => ({
                                ...prev,
                                [design.id]: {
                                  ...prev[design.id],
                                  width: value
                                }
                              }))
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur()
                            }
                          }}
                          onBlur={(e) => {
                            const value = e.target.value
                            // Round to 2 decimal places and enforce limits when user finishes typing
                            let numValue = parseFloat(value)
                            if (isNaN(numValue) || value === '' || numValue < 0.5) {
                              numValue = 0.5
                            } else if (numValue > 12) {
                              numValue = 12
                            }
                            // Round to 2 decimal places
                            const rounded = Math.round(numValue * 100) / 100
                            updateDesign(design.id, {
                              dimensions: { 
                                width: rounded,
                                height: design.dimensions.height 
                              }
                            })
                            // Clear editing state
                            setEditingDimensions(prev => {
                              const newState = {...prev}
                              delete newState[design.id]
                              return newState
                            })
                          }}
                          placeholder="0.50"
                          className="w-full px-2 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] sm:text-xs font-medium text-gray-700 mb-1">
                          Height (inches)
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={editingDimensions[design.id]?.height ?? design.dimensions.height.toFixed(2)}
                          onFocus={() => {
                            setEditingDimensions(prev => ({
                              ...prev,
                              [design.id]: {
                                width: prev[design.id]?.width ?? design.dimensions.width.toString(),
                                height: design.dimensions.height.toString()
                              }
                            }))
                          }}
                          onChange={(e) => {
                            const value = e.target.value
                            // Allow empty string and valid decimal numbers during typing
                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                              setEditingDimensions(prev => ({
                                ...prev,
                                [design.id]: {
                                  ...prev[design.id],
                                  height: value
                                }
                              }))
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur()
                            }
                          }}
                          onBlur={(e) => {
                            const value = e.target.value
                            // Round to 2 decimal places and enforce limits when user finishes typing
                            let numValue = parseFloat(value)
                            if (isNaN(numValue) || value === '' || numValue < 0.5) {
                              numValue = 0.5
                            } else if (numValue > 12) {
                              numValue = 12
                            }
                            // Round to 2 decimal places
                            const rounded = Math.round(numValue * 100) / 100
                            updateDesign(design.id, {
                              dimensions: { 
                                width: design.dimensions.width,
                                height: rounded
                              }
                            })
                            // Clear editing state
                            setEditingDimensions(prev => {
                              const newState = {...prev}
                              delete newState[design.id]
                              return newState
                            })
                          }}
                          placeholder="0.50"
                          className="w-full px-2 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-1.5 sm:mt-2">
                      Size range: 0.5" to 12" • Values are rounded to 2 decimal places
                    </p>
                  </div>

                  {/* Rotation Controls */}
                  <div className="bg-white border border-gray-200 rounded-lg p-2.5 sm:p-3">
                    <h5 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3 flex items-center">
                      <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-gray-600 flex-shrink-0" />
                      Set Rotation (Optional)
                    </h5>
                    <div className="space-y-2 sm:space-y-3">
                      {/* Preset Angle Buttons */}
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => updateDesign(design.id, { rotation: 0 })}
                          className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                            design.rotation === 0 || design.rotation === 360
                              ? 'bg-accent text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          0°
                        </button>
                        <button
                          onClick={() => updateDesign(design.id, { rotation: 90 })}
                          className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                            design.rotation === 90
                              ? 'bg-accent text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          90°
                        </button>
                        <button
                          onClick={() => updateDesign(design.id, { rotation: 180 })}
                          className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                            design.rotation === 180
                              ? 'bg-accent text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          180°
                        </button>
                        <button
                          onClick={() => updateDesign(design.id, { rotation: 270 })}
                          className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                            design.rotation === 270
                              ? 'bg-accent text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          270°
                        </button>
                      </div>
                      
                      {/* Manual Input */}
                      <div>
                        <label className="block text-[10px] sm:text-xs font-medium text-gray-700 mb-1">
                          Rotation (degrees)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={editingRotation[design.id] ?? Math.round(design.rotation).toString()}
                          onFocus={() => {
                            setEditingRotation(prev => ({
                              ...prev,
                              [design.id]: Math.round(design.rotation).toString()
                            }))
                          }}
                          onChange={(e) => {
                            const value = e.target.value
                            // Allow empty string and valid integers/decimals during typing
                            if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
                              setEditingRotation(prev => ({
                                ...prev,
                                [design.id]: value
                              }))
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur()
                            }
                          }}
                          onBlur={(e) => {
                            const value = e.target.value
                            // Normalize rotation to 0-360 range and round to nearest integer
                            let numValue = parseFloat(value)
                            if (isNaN(numValue) || value === '') {
                              numValue = design.rotation
                            } else {
                              // Normalize to 0-360 range
                              numValue = ((numValue % 360) + 360) % 360
                            }
                            const rounded = Math.round(numValue)
                            updateDesign(design.id, { rotation: rounded })
                            // Clear editing state
                            setEditingRotation(prev => {
                              const newState = {...prev}
                              delete newState[design.id]
                              return newState
                            })
                          }}
                          placeholder="0"
                          className="w-full px-2 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                        />
                        <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                          Current: {Math.round(design.rotation)}° • Range: 0° to 360°
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Live Calculator */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-2.5 sm:p-3 border border-blue-200">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Calculator className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-medium text-blue-900">Material Cost</span>
                      </div>
                      <div className="text-right">
                        <div className="text-base sm:text-lg font-bold text-blue-900">
                          ${calculateMaterialCost(design).toFixed(2)}
                        </div>
                        <div className="text-[10px] sm:text-xs text-blue-600 whitespace-nowrap">
                          {(design.dimensions.width * design.scale).toFixed(2)}" × {(design.dimensions.height * design.scale).toFixed(2)}"
                        </div>
                      </div>
                    </div>
                    <div className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-blue-700">
                      Based on current size and scale. Updates automatically when you resize the design.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {customizationData.designs.length === 0 && (
          <div className="text-center py-8 sm:py-12 text-gray-500">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <MessageSquare className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
            </div>
            <p className="text-base sm:text-lg font-medium text-gray-700 mb-1.5 sm:mb-2">No designs yet</p>
            <p className="text-xs sm:text-sm text-gray-500 px-4">You'll need to upload at least one design in Step 2 before you can add placement notes.</p>
          </div>
        )}

        {/* Total Cost Summary */}
        {customizationData.designs.length > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Calculator className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                <span className="text-base sm:text-lg font-semibold text-green-900">Total Material Cost</span>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-xl sm:text-2xl font-bold text-green-900">
                  ${customizationData.designs.reduce((total, design) => total + calculateMaterialCost(design), 0).toFixed(2)}
                </div>
                <div className="text-xs sm:text-sm text-green-600">
                  {customizationData.designs.length} design{customizationData.designs.length !== 1 ? 's' : ''} total
                </div>
              </div>
            </div>
            <div className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-green-700">
              This includes all designs and their duplicates. Cost updates automatically when you resize designs.
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 sm:p-5">
        <h4 className="font-semibold text-blue-900 mb-2 sm:mb-3 flex items-center text-base sm:text-lg">
          <Info className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 flex-shrink-0" />
          How to Position Your Designs
        </h4>
        <div className="space-y-2 sm:space-y-3">
          <div className="bg-white rounded-md p-2.5 sm:p-3">
            <p className="font-medium text-blue-900 mb-1.5 sm:mb-2 text-xs sm:text-sm">On the product preview (left side):</p>
            <ul className="text-xs sm:text-sm text-blue-800 space-y-1 sm:space-y-1.5">
              <li className="flex items-start">
                <span className="text-blue-500 mr-1.5 sm:mr-2 mt-0.5 flex-shrink-0">1.</span>
                <span><strong>Drag your design</strong> to move it around the product</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-1.5 sm:mr-2 mt-0.5 flex-shrink-0">2.</span>
                <span><strong>Grab the corner handles</strong> to make it bigger or smaller</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-1.5 sm:mr-2 mt-0.5 flex-shrink-0">3.</span>
                <span><strong>Drag the rotation handle</strong> at the top of the design to rotate it</span>
              </li>
            </ul>
          </div>
          <div className="bg-white rounded-md p-2.5 sm:p-3">
            <p className="font-medium text-blue-900 mb-1.5 sm:mb-2 text-xs sm:text-sm">For each design below:</p>
            <ul className="text-xs sm:text-sm text-blue-800 space-y-1 sm:space-y-1.5">
              <li className="flex items-start">
                <span className="text-blue-500 mr-1.5 sm:mr-2 mt-0.5 flex-shrink-0">•</span>
                <span><strong>Click the box</strong> to add specific placement instructions</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-1.5 sm:mr-2 mt-0.5 flex-shrink-0">•</span>
                <span>Click <strong>"Duplicate"</strong> to use the same design in multiple sizes</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-1.5 sm:mr-2 mt-0.5 flex-shrink-0">•</span>
                <span>Click <strong>"Delete"</strong> to remove a duplicated design (you must keep at least one design)</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-1.5 sm:mr-2 mt-0.5 flex-shrink-0">•</span>
                <span>Use <strong>preset buttons (0°, 90°, 180°, 270°)</strong> or enter a custom rotation angle</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-1.5 sm:mr-2 mt-0.5 flex-shrink-0">•</span>
                <span>The <strong>material cost updates automatically</strong> when you resize</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DesignPositioningManager
