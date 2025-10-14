import React, { useState, useEffect } from 'react'
import { X, Upload, Image as ImageIcon, AlertCircle, CheckCircle, Package } from 'lucide-react'
import Button from '../../components/Button'
import { RefundApiService } from '../../shared/refundApiService'

interface OrderItem {
  id: string
  productId: string
  productName: string
  productImage: string
  quantity: number
  price: number
  variantId?: string
  variantName?: string
}

interface RefundRequestModalEnhancedProps {
  isOpen: boolean
  onClose: () => void
  orderId: number
  orderNumber: string
  orderTotal: number
  orderSubtotal: number
  orderShipping: number
  orderTax: number
  orderItems: OrderItem[]
  onSuccess?: () => void
}

const RefundRequestModalEnhanced: React.FC<RefundRequestModalEnhancedProps> = ({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  orderTotal,
  orderSubtotal,
  orderShipping,
  orderTax,
  orderItems,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    reason: '',
    description: '',
    refundType: 'full' as 'full' | 'partial'
  })
  
  // Item selection for partial refunds
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [calculatedRefund, setCalculatedRefund] = useState(orderTotal)
  
  // Image upload state
  const [images, setImages] = useState<File[]>([])
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const refundReasons = [
    { value: 'damaged_defective', label: 'Product damaged or defective' },
    { value: 'wrong_item', label: 'Wrong item received' },
    { value: 'not_as_described', label: 'Item not as described' },
    { value: 'changed_mind', label: 'Changed my mind' },
    { value: 'duplicate_order', label: 'Duplicate order' },
    { value: 'shipping_delay', label: 'Shipping took too long' },
    { value: 'quality_issues', label: 'Quality issues' },
    { value: 'other', label: 'Other reason' }
  ]

  // Auto-select all items when refund type is 'full'
  useEffect(() => {
    if (formData.refundType === 'full') {
      setSelectedItems(new Set(orderItems.map(item => item.id)))
    }
  }, [formData.refundType, orderItems])

  // Calculate refund amount when items or type changes
  useEffect(() => {
    if (formData.refundType === 'full') {
      setCalculatedRefund(orderTotal)
    } else {
      // Calculate partial refund based on selected items
      const itemsSubtotal = orderItems
        .filter(item => selectedItems.has(item.id))
        .reduce((sum, item) => sum + (item.price * item.quantity), 0)
      
      if (itemsSubtotal === 0) {
        setCalculatedRefund(0)
        return
      }
      
      // Check if ALL items are selected (even in "partial" mode)
      const allItemsSelected = selectedItems.size === orderItems.length && orderItems.length > 0
      
      if (allItemsSelected) {
        // If all items selected, treat as full refund (include shipping + all tax)
        setCalculatedRefund(orderTotal)
      } else {
        // True partial refund: Only refund item price + proportional tax
        // Shipping is NOT refunded because customer still receives other items
        const proportionalTax = (itemsSubtotal / orderSubtotal) * orderTax
        
        const total = itemsSubtotal + proportionalTax
        setCalculatedRefund(total)
      }
    }
  }, [formData.refundType, selectedItems, orderItems, orderTotal, orderSubtotal, orderTax, orderShipping])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  const handleImageUpload = async (files: FileList | null) => {
    if (!files) return

    const newImages = Array.from(files).slice(0, 5 - images.length)
    setImages(prev => [...prev, ...newImages])

    // Convert to base64
    const promises = newImages.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })
    })

    const urls = await Promise.all(promises)
    setImageUrls(prev => [...prev, ...urls])
  }

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
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files)
    }
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
    setImageUrls(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.reason) {
      setSubmitError('Please select a reason for the refund')
      return
    }
    
    if (!formData.description.trim()) {
      setSubmitError('Please provide a description')
      return
    }

    if (formData.refundType === 'partial' && selectedItems.size === 0) {
      setSubmitError('Please select at least one item to refund')
      return
    }

    if (formData.refundType === 'partial' && selectedItems.size === orderItems.length) {
      setSubmitError('All items selected - please use Full Refund instead')
      return
    }

    setIsLoading(true)
    setSubmitError(null)

    try {
      // Prepare refund items data
      const refundItemsData = orderItems
        .filter(item => selectedItems.has(item.id))
        .map(item => ({
          productId: item.productId,
          productName: item.productName,
          variantId: item.variantId,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity
        }))

      // Submit refund request to API
      const response = await RefundApiService.createRefundRequest({
        orderId: orderId,
        reason: formData.reason,
        description: formData.description,
        refundType: formData.refundType,
        refundAmount: calculatedRefund,
        refundItems: formData.refundType === 'partial' ? refundItemsData : undefined,
        imagesUrls: imageUrls.length > 0 ? imageUrls : undefined
      })

      if (response.success) {
        setSubmitSuccess(true)
        
        // Call onSuccess callback to refresh orders and show alert
        if (onSuccess) {
          onSuccess()
        }

        // Auto-close after 5 seconds (increased from 2)
        setTimeout(() => {
          handleClose()
        }, 5000)
      } else {
        setSubmitError(response.message || 'Failed to submit refund request')
      }
    } catch (error: any) {
      console.error('Error submitting refund:', error)
      setSubmitError(error.message || 'Failed to submit refund request. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      reason: '',
      description: '',
      refundType: 'full'
    })
    setSelectedItems(new Set())
    setImages([])
    setImageUrls([])
    setSubmitSuccess(false)
    setSubmitError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Request Refund</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Message */}
        {submitSuccess ? (
          <div className="p-8 text-center">
            <div className="bg-green-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Refund Request Submitted!</h3>
            <p className="text-gray-700 mb-2">
              Your refund request for <span className="font-semibold">{selectedItems.size} item(s)</span> has been submitted successfully.
            </p>
            <p className="text-gray-600 mb-6">
              Order #{orderNumber} • ${calculatedRefund.toFixed(2)}
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-900 font-medium mb-1">
                ⏱️ What's Next?
              </p>
              <p className="text-sm text-blue-800">
                Our team will review your request within 1-2 business days. You can track the status in "My Refunds".
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.href = '/my-refunds'}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                View My Refunds
              </button>
              <button
                onClick={handleClose}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Close
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              This window will close automatically in 5 seconds
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Order Info */}
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Order Number</p>
                  <p className="text-sm text-gray-900">{orderNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Order Total</p>
                  <p className="text-sm text-gray-900">${orderTotal.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Items in Order</p>
                  <p className="text-sm text-gray-900">{orderItems.length} item(s)</p>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                  <p className="text-red-800 text-sm">{submitError}</p>
                </div>
              </div>
            )}

            {/* Refund Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Refund Type
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="relative flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="refundType"
                    value="full"
                    checked={formData.refundType === 'full'}
                    onChange={handleInputChange}
                    className="sr-only"
                  />
                  <div className={`flex-1 p-4 border-2 rounded-lg ${
                    formData.refundType === 'full' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300'
                  }`}>
                    <p className="font-medium text-gray-900">Full Refund</p>
                    <p className="text-sm text-gray-500">All {orderItems.length} items</p>
                    <p className="text-lg font-semibold text-gray-900 mt-2">${orderTotal.toFixed(2)}</p>
                  </div>
                </label>
                <label className="relative flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="refundType"
                    value="partial"
                    checked={formData.refundType === 'partial'}
                    onChange={handleInputChange}
                    className="sr-only"
                  />
                  <div className={`flex-1 p-4 border-2 rounded-lg ${
                    formData.refundType === 'partial' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300'
                  }`}>
                    <p className="font-medium text-gray-900">Partial Refund</p>
                    <p className="text-sm text-gray-500">Select specific items</p>
                    <p className="text-lg font-semibold text-gray-900 mt-2">${calculatedRefund.toFixed(2)}</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Item Selection (for partial refunds) */}
            {formData.refundType === 'partial' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Items to Refund <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {orderItems.map(item => {
                    const isSelected = selectedItems.has(item.id)
                    const itemTotal = item.price * item.quantity
                    
                    return (
                      <label
                        key={item.id}
                        className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleItemSelection(item.id)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          className="w-12 h-12 ml-3 object-cover rounded"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = 'https://via.placeholder.com/100/f3f4f6/9ca3af?text=No+Image'
                          }}
                        />
                        <div className="ml-3 flex-1">
                          <p className="font-medium text-gray-900">{item.productName}</p>
                          {item.variantName && (
                            <p className="text-xs text-gray-500">{item.variantName}</p>
                          )}
                          <p className="text-sm text-gray-600">
                            ${item.price.toFixed(2)} × {item.quantity}
                          </p>
                        </div>
                        <p className="font-semibold text-gray-900">
                          ${itemTotal.toFixed(2)}
                        </p>
                      </label>
                    )
                  })}
                </div>

                {/* Refund Calculation Summary */}
                <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Items Selected:</span>
                      <span className="font-medium text-gray-900">
                        {selectedItems.size} of {orderItems.length}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-blue-900 pt-2 border-t border-blue-300">
                      <span>Refund Amount:</span>
                      <span>${calculatedRefund.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-gray-600 italic">
                      {formData.refundType === 'full' || selectedItems.size === orderItems.length
                        ? 'Includes all tax and shipping' 
                        : 'Includes proportional tax (shipping not refunded for partial refunds)'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for Refund <span className="text-red-500">*</span>
              </label>
              <select
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select a reason...</option>
                {refundReasons.map((reason) => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={
                  formData.refundType === 'partial'
                    ? 'Explain which items have issues and why...'
                    : 'Please provide details about why you\'re requesting a refund...'
                }
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Be specific about which items have issues
              </p>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upload Images (Optional)
              </label>
              <p className="text-sm text-gray-500 mb-2">
                Add photos to support your refund request (max 5 images)
              </p>
              
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
              >
                <input
                  type="file"
                  id="image-upload"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e.target.files)}
                  className="hidden"
                  disabled={images.length >= 5}
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    Drag and drop images here, or click to browse
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PNG, JPG, GIF up to 5 images
                  </p>
                </label>
              </div>

              {images.length > 0 && (
                <div className="mt-4 grid grid-cols-5 gap-2">
                  {images.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(image)}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-20 object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Important Notice */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-yellow-800">Important Information</h4>
                  <div className="mt-2 text-sm text-yellow-700 space-y-1">
                    <p>• Refund requests are reviewed within 2-3 business days</p>
                    <p>• Refunds processed to your original payment method</p>
                    <p>• Allow 3-10 business days for refund to appear</p>
                    {formData.refundType === 'partial' && (
                      <p>• Only selected items will be refunded</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                onClick={handleClose}
                variant="secondary"
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isLoading || 
                  !formData.reason || 
                  !formData.description ||
                  (formData.refundType === 'partial' && selectedItems.size === 0) ||
                  calculatedRefund === 0
                }
                className="flex-1"
              >
                {isLoading ? 'Submitting...' : `Submit Refund ($${calculatedRefund.toFixed(2)})`}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default RefundRequestModalEnhanced

