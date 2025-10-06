import React, { useState, useRef } from 'react'
import { Upload, X, Trash2, Eye, Download, Image as ImageIcon, FileText, CheckCircle, Ruler } from 'lucide-react'
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
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [previewName, setPreviewName] = useState<string>('')
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

  const handlePreviewImage = (design: EmbroideryDesignData) => {
    setPreviewImage(design.preview)
    setPreviewName(design.name)
  }

  const handleDownloadImage = (design: EmbroideryDesignData) => {
    const link = document.createElement('a')
    link.href = design.preview
    link.download = design.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <div className="flex items-center mb-3">
            <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center mr-3">
              <Upload className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Upload Your Designs</h3>
              <p className="text-gray-600 text-sm">
                Add up to {customizationData.maxDesigns} design files for embroidery
              </p>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Supported Formats:</h4>
            <div className="flex flex-wrap gap-2">
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">PNG</span>
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">JPG</span>
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">JPEG</span>
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">GIF</span>
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">SVG</span>
            </div>
            <p className="text-xs text-blue-700 mt-2">Maximum file size: 10MB per file</p>
          </div>
        </div>

        {/* Drag and Drop Area */}
        <div
          className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${
            dragActive
              ? 'border-accent bg-accent/10 scale-[1.02] shadow-lg'
              : customizationData.designs.length >= customizationData.maxDesigns
              ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
              : 'border-gray-300 hover:border-accent hover:bg-accent/5 cursor-pointer'
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
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                <Upload className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-xl font-semibold mb-2">Maximum designs reached</p>
              <p className="text-sm">You can upload up to {customizationData.maxDesigns} designs</p>
              <p className="text-xs text-gray-400 mt-3">
                Remove a design to upload a new one
              </p>
            </div>
          ) : (
            <div>
              <div className="w-20 h-20 mx-auto mb-6 bg-accent/10 rounded-full flex items-center justify-center">
                <Upload className="w-10 h-10 text-accent" />
              </div>
              <p className="text-2xl font-semibold text-gray-900 mb-3">
                <span className="text-accent">Click to upload</span> or drag and drop
              </p>
              <p className="text-gray-600 mb-4">
                Choose your design files from your computer
              </p>
              <div className="inline-flex items-center px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors">
                <Upload className="w-4 h-4 mr-2" />
                Choose Files
              </div>
              <div className="mt-4 text-sm text-gray-500">
                <p>{customizationData.designs.length} of {customizationData.maxDesigns} designs uploaded</p>
                {customizationData.designs.length > 0 && (
                  <p className="text-xs mt-1">Each design will be customized individually</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Design List */}
      {customizationData.designs.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Your Designs ({customizationData.designs.length})
                </h3>
                <p className="text-sm text-gray-600">Ready for customization and embroidery</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            {customizationData.designs.map((design, index) => (
              <div
                key={design.id}
                className="border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all duration-200 bg-gradient-to-r from-white to-gray-50"
              >
                <div className="flex items-start space-x-4">
                  {/* Design Preview - Larger and Better */}
                  <div className="relative flex-shrink-0">
                    <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-gray-200 shadow-sm bg-white">
                      <img
                        src={design.preview}
                        alt={design.name}
                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-200"
                        onClick={() => handlePreviewImage(design)}
                      />
                    </div>
                    <div className="absolute -top-2 -left-2 bg-accent text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
                      {index + 1}
                    </div>
                    <button
                      onClick={() => handleRemoveDesign(design.id)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                      title="Remove design"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Design Info - Enhanced */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                          <ImageIcon className="w-5 h-5 text-accent mr-2 flex-shrink-0" />
                          <span className="truncate">{design.name}</span>
                        </h4>
                        
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div className="bg-blue-50 rounded-lg p-3">
                            <div className="flex items-center mb-1">
                              <Ruler className="w-4 h-4 text-blue-600 mr-2" />
                              <span className="text-xs font-medium text-blue-800 uppercase tracking-wide">Dimensions</span>
                            </div>
                            <p className="text-sm font-semibold text-blue-900">
                              {design.dimensions.width}" × {design.dimensions.height}"
                            </p>
                          </div>
                          
                          <div className="bg-green-50 rounded-lg p-3">
                            <div className="flex items-center mb-1">
                              <FileText className="w-4 h-4 text-green-600 mr-2" />
                              <span className="text-xs font-medium text-green-800 uppercase tracking-wide">File Size</span>
                            </div>
                            <p className="text-sm font-semibold text-green-900">
                              {formatFileSize(design.file.size)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePreviewImage(design)}
                        className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
                        title="Preview full size"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                      </button>
                      
                      <button
                        onClick={() => handleDownloadImage(design)}
                        className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
                        title="Download image"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </button>
                      
                      <div className="flex-1"></div>
                      
                      <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        Design #{index + 1}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center">
                <ImageIcon className="w-5 h-5 text-accent mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">{previewName}</h3>
              </div>
              <button
                onClick={() => setPreviewImage(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4">
              <img
                src={previewImage}
                alt={previewName}
                className="max-w-full max-h-[70vh] object-contain mx-auto rounded-lg shadow-lg"
              />
            </div>
            <div className="flex items-center justify-end space-x-3 p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  const link = document.createElement('a')
                  link.href = previewImage
                  link.download = previewName
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)
                }}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent/90 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </button>
              <button
                onClick={() => setPreviewImage(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MultiEmbroideryManager
