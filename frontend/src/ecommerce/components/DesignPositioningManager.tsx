import React, { useState } from 'react'
import { Edit3, Calculator, Save, X, MessageSquare, Copy } from 'lucide-react'
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <MessageSquare className="w-5 h-5 mr-2 text-accent" />
          Design Positioning & Notes
        </h3>
        
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
                        <textarea
                          value={editingNotesValue}
                          onChange={(e) => setEditingNotesValue(e.target.value)}
                          placeholder="Add notes for this design placement..."
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
                          rows={2}
                        />
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
                        className="text-sm text-gray-600 cursor-pointer hover:text-accent transition-colors min-h-[40px] flex items-center p-2 border border-gray-200 rounded-md hover:border-accent"
                      >
                        {design.notes ? (
                          <div className="flex items-start space-x-2">
                            <MessageSquare className="w-4 h-4 mt-0.5 text-accent flex-shrink-0" />
                            <span className="text-sm">{design.notes}</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 text-gray-400">
                            <Edit3 className="w-4 h-4" />
                            <span className="text-sm italic">Click to add placement notes...</span>
                          </div>
                        )}
                      </div>
                    )}
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
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No designs uploaded yet.</p>
            <p className="text-sm">Go back to step 2 to upload your designs.</p>
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
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">How to Position Your Designs:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Drag</strong> designs to move them around the product</li>
          <li>• <strong>Drag resize handles</strong> to change design size (material cost updates automatically)</li>
          <li>• <strong>Ctrl + Scroll</strong> over a design to rotate it</li>
          <li>• <strong>Duplicate</strong> designs to create copies with different sizes</li>
          <li>• <strong>Add notes</strong> for each design to specify placement instructions</li>
          <li>• The <strong>total cost calculator</strong> includes all designs and their duplicates</li>
        </ul>
      </div>
    </div>
  )
}

export default DesignPositioningManager
