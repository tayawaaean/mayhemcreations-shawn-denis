import React, { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon, Plus } from 'lucide-react'

interface ImageUploadProps {
  value?: string | string[]
  onChange: (imageUrls: string | string[]) => void
  multiple?: boolean
  maxFiles?: number
  className?: string
}

const ImageUpload: React.FC<ImageUploadProps> = ({ 
  value, 
  onChange, 
  multiple = false, 
  maxFiles = 1,
  className = ''
}) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Normalize value to always be an array for easier handling
  const images = Array.isArray(value) ? value : (value ? [value] : [])
  const hasImages = images.length > 0

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      handleFiles(files)
    }
  }

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return
    
    const validFiles = files.filter(file => file.type.startsWith('image/'))
    if (validFiles.length === 0) {
      alert('Please select valid image files')
      return
    }

    if (!multiple && validFiles.length > 1) {
      alert('Please select only one image')
      return
    }

    // Check if adding these files would exceed maxFiles
    const currentCount = images.length
    const newCount = currentCount + validFiles.length
    if (newCount > maxFiles) {
      alert(`Maximum ${maxFiles} images allowed. You can add ${maxFiles - currentCount} more.`)
      return
    }

    setUploading(true)

    try {
      const uploadPromises = validFiles.map(file => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => {
            const result = e.target?.result as string
            resolve(result)
          }
          reader.onerror = () => reject(new Error('Failed to read file'))
          reader.readAsDataURL(file)
        })
      })

      const newImageUrls = await Promise.all(uploadPromises)
      
      if (multiple) {
        const updatedImages = [...images, ...newImageUrls]
        onChange(updatedImages)
      } else {
        onChange(newImageUrls[0])
      }
      
      setUploading(false)
    } catch (error) {
      console.error('Error uploading images:', error)
      alert('Error uploading images. Please try again.')
      setUploading(false)
    }
  }

  const handleRemoveImage = (index?: number) => {
    if (multiple) {
      if (index !== undefined) {
        const updatedImages = images.filter((_, i) => i !== index)
        onChange(updatedImages)
      } else {
        onChange([])
      }
    } else {
      onChange('')
    }
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={className}>
      {hasImages ? (
        <div className="space-y-4">
          {/* Image Grid */}
          <div className={`grid gap-3 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3'}`}>
            {images.map((image, index) => (
              <div key={index} className="relative group">
                <img
                  src={image}
                  alt={`Uploaded ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            
            {/* Add More Button */}
            {multiple && images.length < maxFiles && (
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
                onClick={openFileDialog}
              >
                <div className="text-center">
                  <Plus className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Add More</p>
                  <p className="text-xs text-gray-400">
                    {maxFiles - images.length} remaining
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* Upload Area (when no images or for additional uploads) */}
          {(!hasImages || (multiple && images.length < maxFiles)) && (
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragOver
                  ? 'border-gray-400 bg-gray-50'
                  : 'border-gray-300 hover:border-gray-400'
              } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={openFileDialog}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple={multiple}
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {uploading ? (
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-2"></div>
                  <p className="text-sm text-gray-600">Uploading...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="p-3 bg-gray-100 rounded-full mb-3">
                    <Upload className="h-6 w-6 text-gray-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    {multiple ? 'Upload images' : 'Upload image'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Drag and drop or click to browse
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    PNG, JPG, GIF up to 10MB
                  </p>
                  {multiple && (
                    <p className="text-xs text-gray-400 mt-1">
                      Max {maxFiles} images
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragOver
              ? 'border-gray-400 bg-gray-50'
              : 'border-gray-300 hover:border-gray-400'
          } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={openFileDialog}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple={multiple}
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {uploading ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-2"></div>
              <p className="text-sm text-gray-600">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="p-3 bg-gray-100 rounded-full mb-3">
                <Upload className="h-6 w-6 text-gray-600" />
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">
                {multiple ? 'Upload images' : 'Upload image'}
              </p>
              <p className="text-xs text-gray-500">
                Drag and drop or click to browse
              </p>
              <p className="text-xs text-gray-400 mt-1">
                PNG, JPG, GIF up to 10MB
              </p>
              {multiple && (
                <p className="text-xs text-gray-400 mt-1">
                  Max {maxFiles} images
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ImageUpload
