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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="mb-4 sm:mb-6">
          <div className="flex items-start sm:items-center mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-accent/10 rounded-full flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
              <Upload className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">Step 2: Upload Your Design</h3>
              <p className="text-gray-600 text-xs sm:text-sm mt-0.5 sm:mt-0">
                Add your logo, artwork, or image - we'll embroider it for you!
              </p>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              What kind of files can I upload?
            </h4>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-blue-800 font-medium mb-2">We accept these image types:</p>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1.5 rounded-full">PNG (best for logos)</span>
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1.5 rounded-full">JPG / JPEG</span>
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1.5 rounded-full">GIF</span>
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1.5 rounded-full">SVG (best quality)</span>
                </div>
              </div>
              <div className="bg-blue-100 rounded-md p-3">
                <p className="text-xs text-blue-900 font-medium mb-1">Quick Tips:</p>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Each file should be under 10MB</li>
                  <li>• Clear, high-quality images work best</li>
                  <li>• PNG files with transparent backgrounds look great</li>
                  <li>• You can upload up to {customizationData.maxDesigns} different designs</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Drag and Drop Area */}
        <div
          className={`relative border-2 border-dashed rounded-xl p-6 sm:p-8 md:p-12 text-center transition-all duration-200 ${
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
              <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
              </div>
              <p className="text-base sm:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">All {customizationData.maxDesigns} design slots filled!</p>
              <p className="text-xs sm:text-sm text-gray-600">That's the maximum number of designs for one product</p>
              <p className="text-xs text-gray-500 mt-2 sm:mt-3">
                Want to change one? Remove a design below to upload a different one
              </p>
            </div>
          ) : (
            <div>
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-gradient-to-br from-accent/20 to-accent/10 rounded-full flex items-center justify-center animate-pulse">
                <Upload className="w-8 h-8 sm:w-10 sm:h-10 text-accent" />
              </div>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 mb-2">
                <span className="text-accent">Click here</span> or drag your design
              </p>
              <p className="text-sm sm:text-base text-gray-600 mb-4 px-2">
                It's as simple as choosing a photo from your computer
              </p>
              <div className="inline-flex items-center px-4 py-2 sm:px-6 sm:py-3 bg-accent text-white rounded-lg text-sm sm:text-base font-semibold hover:bg-accent/90 transition-all shadow-md hover:shadow-lg transform hover:scale-105">
                <Upload className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Browse My Computer
              </div>
              <div className="mt-6 text-sm">
                {customizationData.designs.length === 0 ? (
                  <p className="text-gray-500">No designs uploaded yet - let's get started!</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-green-600 font-medium">{customizationData.designs.length} design{customizationData.designs.length > 1 ? 's' : ''} uploaded!</p>
                    <p className="text-gray-500 text-xs">You can add {customizationData.maxDesigns - customizationData.designs.length} more design{customizationData.maxDesigns - customizationData.designs.length === 1 ? '' : 's'}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Design List */}
      {customizationData.designs.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-start sm:items-center flex-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center mr-2 sm:mr-3 animate-bounce flex-shrink-0">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-gray-900">
                  Great! {customizationData.designs.length} Design{customizationData.designs.length > 1 ? 's' : ''} Ready
                </h3>
                <p className="text-xs sm:text-sm text-green-600 font-medium">Your {customizationData.designs.length > 1 ? 'designs are' : 'design is'} uploaded and ready to customize</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-3 sm:space-y-4">
            {customizationData.designs.map((design, index) => (
              <div
                key={design.id}
                className="border border-gray-200 rounded-xl p-3 sm:p-4 hover:shadow-lg transition-all duration-200 bg-gradient-to-r from-white to-gray-50"
              >
                <div className="flex items-start space-x-3 sm:space-x-4">
                  {/* Design Preview - Responsive */}
                  <div className="relative flex-shrink-0">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border-2 border-gray-200 shadow-sm bg-white">
                      <img
                        src={design.preview}
                        alt={design.name}
                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-200"
                        onClick={() => handlePreviewImage(design)}
                      />
                    </div>
                    <div className="absolute -top-2 -left-2 bg-accent text-white w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold shadow-lg">
                      {index + 1}
                    </div>
                    <button
                      onClick={() => handleRemoveDesign(design.id)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                      title="Remove design"
                    >
                      <X className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </div>

                  {/* Design Info - Responsive */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 flex items-center">
                          <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-accent mr-1.5 sm:mr-2 flex-shrink-0" />
                          <span className="truncate">{design.name}</span>
                        </h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 mb-3">
                          <div className="bg-blue-50 rounded-lg p-2 sm:p-3">
                            <div className="flex items-center mb-1">
                              <Ruler className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 mr-1.5 sm:mr-2" />
                              <span className="text-xs font-medium text-blue-800 uppercase tracking-wide">Dimensions</span>
                            </div>
                            <p className="text-xs sm:text-sm font-semibold text-blue-900">
                              {design.dimensions.width}" × {design.dimensions.height}"
                            </p>
                          </div>
                          
                          <div className="bg-green-50 rounded-lg p-2 sm:p-3">
                            <div className="flex items-center mb-1">
                              <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 mr-1.5 sm:mr-2" />
                              <span className="text-xs font-medium text-green-800 uppercase tracking-wide">File Size</span>
                            </div>
                            <p className="text-xs sm:text-sm font-semibold text-green-900">
                              {formatFileSize(design.file.size)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons - Responsive */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <button
                        onClick={() => handlePreviewImage(design)}
                        className="flex items-center justify-center sm:justify-start px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
                        title="Preview full size"
                      >
                        <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                        Preview
                      </button>
                      
                      <button
                        onClick={() => handleDownloadImage(design)}
                        className="flex items-center justify-center sm:justify-start px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
                        title="Download image"
                      >
                        <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                        Download
                      </button>
                      
                      <div className="hidden sm:flex flex-1"></div>
                      
                      <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full text-center sm:text-left">
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

      {/* Image Preview Modal - Responsive */}
      {previewImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200">
              <div className="flex items-center min-w-0 flex-1 mr-2">
                <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-accent mr-2 flex-shrink-0" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{previewName}</h3>
              </div>
              <button
                onClick={() => setPreviewImage(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
            <div className="p-2 sm:p-4 overflow-auto max-h-[60vh] sm:max-h-[70vh]">
              <img
                src={previewImage}
                alt={previewName}
                className="max-w-full max-h-full object-contain mx-auto rounded-lg shadow-lg"
              />
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-end gap-2 sm:gap-3 p-3 sm:p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  const link = document.createElement('a')
                  link.href = previewImage
                  link.download = previewName
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)
                }}
                className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent/90 transition-colors"
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
