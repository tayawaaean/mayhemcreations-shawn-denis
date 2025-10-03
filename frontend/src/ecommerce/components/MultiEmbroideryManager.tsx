import React, { useState, useRef } from 'react'
import { Upload, X, Trash2 } from 'lucide-react'
import { useCustomization, EmbroideryDesignData } from '../context/CustomizationContext'

interface MultiEmbroideryManagerProps {
  onDesignsChange?: (designs: EmbroideryDesignData[]) => void
}

const MultiEmbroideryManager: React.FC<MultiEmbroideryManagerProps> = ({ onDesignsChange }) => {
  const { 
    customizationData, 
    addDesign, 
    removeDesignById
  } = useCustomization()
  
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'))
      files.forEach(file => {
        if (customizationData.designs.length < customizationData.maxDesigns) {
          addDesign(file)
        }
      })
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files).filter(file => file.type.startsWith('image/'))
      files.forEach(file => {
        if (customizationData.designs.length < customizationData.maxDesigns) {
          addDesign(file)
        }
      })
    }
  }

  const handleRemoveDesign = (designId: string) => {
    removeDesignById(designId)
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
            <Upload className="w-5 h-5 mr-2 text-accent" />
            Upload Your Designs
          </h3>
          <p className="text-gray-600 text-sm">
            Upload up to {customizationData.maxDesigns} design files. Each design can have its own embroidery options and notes.
          </p>
        </div>

        {/* Drag and Drop Area */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-accent bg-accent/5'
              : customizationData.designs.length >= customizationData.maxDesigns
              ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
              : 'border-gray-300 hover:border-gray-400 cursor-pointer'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => {
            if (customizationData.designs.length < customizationData.maxDesigns) {
              fileInputRef.current?.click()
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
            disabled={customizationData.designs.length >= customizationData.maxDesigns}
          />
          
          {customizationData.designs.length >= customizationData.maxDesigns ? (
            <div className="text-gray-500">
              <Upload className="mx-auto h-12 w-12 mb-4" />
              <p className="text-lg font-medium">Maximum designs reached</p>
              <p className="text-sm">You can upload up to {customizationData.maxDesigns} designs</p>
            </div>
          ) : (
            <div>
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                <span className="text-accent">Click to upload</span> or drag and drop
              </p>
              <p className="text-sm text-gray-500">
                PNG, JPG, GIF up to 10MB each
              </p>
              <p className="text-xs text-gray-400 mt-2">
                {customizationData.designs.length} of {customizationData.maxDesigns} designs uploaded
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Design List */}
      {customizationData.designs.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Uploaded Designs ({customizationData.designs.length})
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {customizationData.designs.map((design, index) => (
              <div
                key={design.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                {/* Design Preview */}
                <div className="relative mb-3">
                  <img
                    src={design.preview}
                    alt={design.name}
                    className="w-full h-24 object-cover rounded-lg border border-gray-200"
                  />
                  <div className="absolute -top-2 -left-2 bg-accent text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold">
                    {index + 1}
                  </div>
                  <button
                    onClick={() => handleRemoveDesign(design.id)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                    title="Remove design"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                {/* Design Info */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {design.name}
                  </h4>
                  <div className="text-xs text-gray-500">
                    <div>Size: {design.dimensions.width}" × {design.dimensions.height}"</div>
                    <div>File: {Math.round(design.file.size / 1024)}KB</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default MultiEmbroideryManager
