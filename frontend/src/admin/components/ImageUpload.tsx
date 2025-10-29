import React, { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon, Plus, AlertCircle } from 'lucide-react'

interface ImageUploadProps {
  value?: string | string[]
  onChange: (imageUrls: string | string[]) => void
  multiple?: boolean
  maxFiles?: number
  maxSizeMB?: number
  className?: string
  onError?: (error: string) => void
}

interface FileError {
  fileName: string
  error: string
}

const ImageUpload: React.FC<ImageUploadProps> = ({ 
  value, 
  onChange, 
  multiple = false, 
  maxFiles = 1,
  maxSizeMB = 5,
  className = '',
  onError
}) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState<FileError[]>([])
  const [generalError, setGeneralError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Normalize value to always be an array for easier handling
  const images = Array.isArray(value) ? value : (value ? [value] : [])
  const hasImages = images.length > 0
  
  // Supported image types
  const SUPPORTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  const SUPPORTED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp']

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

  // Validate file type
  const validateFileType = (file: File): { valid: boolean; error?: string } => {
    // Check MIME type
    if (!SUPPORTED_TYPES.includes(file.type.toLowerCase())) {
      return {
        valid: false,
        error: `Invalid file type. Supported formats: ${SUPPORTED_EXTENSIONS.join(', ').toUpperCase()}`
      }
    }
    
    // Also check file extension as backup
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!extension || !SUPPORTED_EXTENSIONS.includes(extension)) {
      return {
        valid: false,
        error: `Invalid file extension. Supported formats: ${SUPPORTED_EXTENSIONS.join(', ').toUpperCase()}`
      }
    }
    
    return { valid: true }
  }

  // Validate file size
  const validateFileSize = (file: File): { valid: boolean; error?: string } => {
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: `File too large. Maximum size is ${maxSizeMB}MB (current: ${(file.size / 1024 / 1024).toFixed(2)}MB)`
      }
    }
    return { valid: true }
  }

  // Clear all errors
  const clearErrors = () => {
    setErrors([])
    setGeneralError(null)
  }

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return
    
    // Clear previous errors
    clearErrors()
    
    const fileErrors: FileError[] = []
    
    // Check if no files provided
    if (files.length === 0) {
      setGeneralError('No files selected.')
      if (onError) onError('No files selected.')
      return
    }

    // Check single file restriction
    if (!multiple && files.length > 1) {
      const error = 'Only one image can be uploaded at a time.'
      setGeneralError(error)
      if (onError) onError(error)
      return
    }

    // Check if adding these files would exceed maxFiles
    const currentCount = images.length
    const newCount = currentCount + files.length
    if (newCount > maxFiles) {
      const error = `Maximum ${maxFiles} ${maxFiles === 1 ? 'image' : 'images'} allowed. You can add ${maxFiles - currentCount} more.`
      setGeneralError(error)
      if (onError) onError(error)
      return
    }

    // Validate each file
    const validatedFiles: { file: File; dataUrl: string | null }[] = []
    
    for (const file of files) {
      // Validate file type
      const typeValidation = validateFileType(file)
      if (!typeValidation.valid) {
        fileErrors.push({ fileName: file.name, error: typeValidation.error! })
        continue
      }
      
      // Validate file size
      const sizeValidation = validateFileSize(file)
      if (!sizeValidation.valid) {
        fileErrors.push({ fileName: file.name, error: sizeValidation.error! })
        continue
      }
      
      validatedFiles.push({ file, dataUrl: null })
    }

    // If all files failed validation
    if (validatedFiles.length === 0) {
      setErrors(fileErrors)
      const firstError = fileErrors[0]?.error || 'All files failed validation.'
      if (onError) onError(firstError)
      return
    }

    // If some files failed, show warnings but continue with valid files
    if (fileErrors.length > 0) {
      setErrors(fileErrors)
    }

    setUploading(true)

    try {
      // Read files with enhanced error handling
      const uploadPromises = validatedFiles.map(({ file }) => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          
          // FileReader load event
          reader.onload = (e) => {
            try {
              const result = e.target?.result
              
              if (!result) {
                reject(new Error('FileReader returned no result'))
                return
              }
              
              if (typeof result !== 'string') {
                reject(new Error('FileReader returned non-string result'))
                return
              }
              
              // Validate the data URL format
              if (!result.startsWith('data:image/')) {
                reject(new Error('Invalid image data format'))
                return
              }
              
              resolve(result)
            } catch (parseError) {
              reject(new Error('Failed to parse file data'))
            }
          }
          
          // FileReader error event
          reader.onerror = (error) => {
            console.error('FileReader error:', error)
            
            // Categorize FileReader errors
            const errorMessage = reader.error?.message || 'Unknown error'
            if (reader.error?.name === 'NotFoundError') {
              reject(new Error('File not found. It may have been moved or deleted.'))
            } else if (reader.error?.name === 'SecurityError') {
              reject(new Error('Security error. Unable to read this file.'))
            } else if (reader.error?.name === 'NotReadableError') {
              reject(new Error('File is not readable. It may be corrupted.'))
            } else if (reader.error?.name === 'AbortError') {
              reject(new Error('File reading was aborted.'))
            } else {
              reject(new Error(`Failed to read file: ${errorMessage}`))
            }
          }
          
          // FileReader abort event
          reader.onabort = () => {
            reject(new Error('File reading was aborted'))
          }
          
          // Start reading the file
          try {
            reader.readAsDataURL(file)
          } catch (readError) {
            reject(new Error('Failed to start file reading'))
          }
        })
      })

      const newImageUrls = await Promise.all(uploadPromises)
      
      // Update image state
      if (multiple) {
        const updatedImages = [...images, ...newImageUrls]
        onChange(updatedImages)
      } else {
        onChange(newImageUrls[0])
      }
      
      // Clear errors on success
      clearErrors()
      setUploading(false)
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error: any) {
      console.error('Error uploading images:', error)
      
      const errorMessage = error?.message || 'Error uploading images. Please try again.'
      setGeneralError(errorMessage)
      if (onError) onError(errorMessage)
      
      setUploading(false)
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
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
      {/* General Error Message */}
      {generalError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start">
          <AlertCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-800 font-medium">{generalError}</p>
          </div>
          <button
            onClick={clearErrors}
            className="text-red-400 hover:text-red-600 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Individual File Errors */}
      {errors.length > 0 && !generalError && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-start mb-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-yellow-800 font-medium">
              {errors.length === 1 ? '1 file' : `${errors.length} files`} could not be uploaded:
            </p>
          </div>
          <ul className="ml-7 space-y-1">
            {errors.map((error, index) => (
              <li key={index} className="text-xs text-yellow-700">
                <strong>{error.fileName}:</strong> {error.error}
              </li>
            ))}
          </ul>
          <button
            onClick={clearErrors}
            className="mt-2 text-xs text-yellow-600 hover:text-yellow-800 underline"
          >
            Dismiss
          </button>
        </div>
      )}

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
                    {SUPPORTED_EXTENSIONS.map(ext => ext.toUpperCase()).join(', ')} up to {maxSizeMB}MB
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
                {SUPPORTED_EXTENSIONS.map(ext => ext.toUpperCase()).join(', ')} up to {maxSizeMB}MB
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
