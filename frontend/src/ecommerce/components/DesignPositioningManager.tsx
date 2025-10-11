import React, { useState } from 'react'
import { Edit3, Calculator, Save, X, MessageSquare, Copy, Info, Ruler } from 'lucide-react'
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
    setCustomizationData
  } = useCustomization()
  
  const [editingNotes, setEditingNotes] = useState<string | null>(null)
  const [editingNotesValue, setEditingNotesValue] = useState('')
  const [editingDimensions, setEditingDimensions] = useState<{[key: string]: {width: string, height: string}}>({})

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
    <div className="space-y-6">
      {/* Design Positioning Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center">
            <MessageSquare className="w-6 h-6 mr-2 text-accent" />
            Step 3: Tell Us Where to Put Your Design
          </h3>
          <p className="text-gray-600">Add notes to tell us exactly where you want each design placed on your product</p>
        </div>
        
        <div className="space-y-4">
          {customizationData.designs.map((design, index) => (
            <div key={design.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start space-x-4">
                {/* Design Preview */}
                <div className="relative flex-shrink-0">
                  <img
                    src={design.preview}
                    alt={design.name}
                    className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                  />
                  <div className="absolute -top-2 -left-2 bg-accent text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold">
                    {index + 1}
                  </div>
                </div>

                {/* Design Info & Controls */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {design.name}
                    </h4>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleDuplicateDesign(design)}
                        className="px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded-md transition-colors flex items-center space-x-1 text-sm font-medium"
                        title="Duplicate this design with different size"
                      >
                        <Copy className="w-4 h-4" />
                        <span>Duplicate</span>
                      </button>
                      <span className="text-xs text-gray-500">
                        {design.dimensions.width}" × {design.dimensions.height}" @ {Math.round(design.scale * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Notes Section */}
                  <div className="mb-3">
                    {editingNotes === design.id ? (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Where should we place this design?
                        </label>
                        <textarea
                          value={editingNotesValue}
                          onChange={(e) => setEditingNotesValue(e.target.value)}
                          placeholder="Example: 'Place on front center' or 'Left chest pocket area' or 'Back of shirt, centered'"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
                          rows={3}
                        />
                        <p className="text-xs text-gray-500">Be as specific as you can - it helps us get it perfect!</p>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleSaveNotes(design.id)}
                            className="px-3 py-1 text-xs bg-accent text-white rounded hover:bg-accent/90 transition-colors flex items-center"
                          >
                            <Save className="w-3 h-3 mr-1" />
                            Save
                          </button>
                          <button
                            onClick={handleCancelNotes}
                            className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => handleEditNotes(design.id, design.notes)}
                        className="text-sm text-gray-600 cursor-pointer hover:bg-blue-50 transition-colors min-h-[60px] flex items-center p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400"
                      >
                        {design.notes ? (
                          <div className="flex items-start space-x-2 w-full">
                            <MessageSquare className="w-5 h-5 mt-0.5 text-green-600 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900 mb-1">Placement Instructions:</p>
                              <p className="text-sm text-gray-700">{design.notes}</p>
                            </div>
                            <Edit3 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center space-x-2 text-gray-400 w-full">
                            <Edit3 className="w-5 h-5" />
                            <div className="text-center">
                              <p className="text-sm font-medium text-gray-600">Click here to add placement instructions</p>
                              <p className="text-xs text-gray-500 mt-1">Tell us where to place this design (required)</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Manual Size Input */}
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                      <Ruler className="w-4 h-4 mr-2 text-gray-600" />
                      Set Exact Size (Optional)
                    </h5>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
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
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
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
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Size range: 0.5" to 12" • Values are rounded to 2 decimal places
                    </p>
                  </div>

                  {/* Live Calculator */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Calculator className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">Material Cost</span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-900">
                          ${calculateMaterialCost(design).toFixed(2)}
                        </div>
                        <div className="text-xs text-blue-600">
                          {design.dimensions.width * design.scale}" × {design.dimensions.height * design.scale}"
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-blue-700">
                      Based on current size and scale. Updates automatically when you resize the design.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {customizationData.designs.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-lg font-medium text-gray-700 mb-2">No designs yet</p>
            <p className="text-sm text-gray-500">You'll need to upload at least one design in Step 2 before you can add placement notes.</p>
          </div>
        )}

        {/* Total Cost Summary */}
        {customizationData.designs.length > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calculator className="w-5 h-5 text-green-600" />
                <span className="text-lg font-semibold text-green-900">Total Material Cost</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-900">
                  ${customizationData.designs.reduce((total, design) => total + calculateMaterialCost(design), 0).toFixed(2)}
                </div>
                <div className="text-sm text-green-600">
                  {customizationData.designs.length} design{customizationData.designs.length !== 1 ? 's' : ''} total
                </div>
              </div>
            </div>
            <div className="mt-2 text-sm text-green-700">
              This includes all designs and their duplicates. Cost updates automatically when you resize designs.
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
        <h4 className="font-semibold text-blue-900 mb-3 flex items-center text-lg">
          <Info className="w-5 h-5 mr-2" />
          How to Position Your Designs
        </h4>
        <div className="space-y-3">
          <div className="bg-white rounded-md p-3">
            <p className="font-medium text-blue-900 mb-2 text-sm">On the product preview (left side):</p>
            <ul className="text-sm text-blue-800 space-y-1.5">
              <li className="flex items-start">
                <span className="text-blue-500 mr-2 mt-0.5">1.</span>
                <span><strong>Drag your design</strong> to move it around the product</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2 mt-0.5">2.</span>
                <span><strong>Grab the corner handles</strong> to make it bigger or smaller</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2 mt-0.5">3.</span>
                <span><strong>Hold Ctrl and scroll</strong> to rotate the design</span>
              </li>
            </ul>
          </div>
          <div className="bg-white rounded-md p-3">
            <p className="font-medium text-blue-900 mb-2 text-sm">For each design below:</p>
            <ul className="text-sm text-blue-800 space-y-1.5">
              <li className="flex items-start">
                <span className="text-blue-500 mr-2 mt-0.5">•</span>
                <span><strong>Click the box</strong> to add specific placement instructions</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2 mt-0.5">•</span>
                <span>Click <strong>"Duplicate"</strong> to use the same design in multiple sizes</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2 mt-0.5">•</span>
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
