import React, { useState } from 'react'
import { X, Upload, Image as ImageIcon, AlertCircle, CheckCircle } from 'lucide-react'
import Button from '../../components/Button'

interface RefundRequestModalProps {
  isOpen: boolean
  onClose: () => void
  orderId: string
  orderTotal: number
  onRequestRefund: (request: RefundRequest) => void
}

export interface RefundRequest {
  id: string
  orderId: string
  customerId: string
  customerEmail: string
  amount: number
  reason: string
  description: string
  images: File[]
  status: 'pending' | 'approved' | 'rejected' | 'processing'
  requestedAt: Date
  processedAt?: Date
  adminNotes?: string
}

const RefundRequestModal: React.FC<RefundRequestModalProps> = ({
  isOpen,
  onClose,
  orderId,
  orderTotal,
  onRequestRefund
}) => {
  const [formData, setFormData] = useState({
    reason: '',
    description: '',
    amount: orderTotal
  })
  const [images, setImages] = useState<File[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const refundReasons = [
    'Product damaged or defective',
    'Wrong item received',
    'Item not as described',
    'Changed mind',
    'Shipping delay',
    'Other'
  ]

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleImageUpload = (files: FileList | null) => {
    if (!files) return

    const newImages = Array.from(files).slice(0, 5 - images.length) // Max 5 images
    setImages(prev => [...prev, ...newImages])
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
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.reason || !formData.description) return

    setIsLoading(true)

    // Simulate API call
    setTimeout(() => {
      const refundRequest: RefundRequest = {
        id: `refund_${Date.now()}`,
        orderId,
        customerId: 'customer_123', // This would come from auth context
        customerEmail: 'customer@example.com', // This would come from auth context
        amount: formData.amount,
        reason: formData.reason,
        description: formData.description,
        images,
        status: 'pending',
        requestedAt: new Date()
      }

      onRequestRefund(refundRequest)
      setIsLoading(false)
      onClose()
      
      // Reset form
      setFormData({
        reason: '',
        description: '',
        amount: orderTotal
      })
      setImages([])
    }, 1500)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Request Refund</h2>
            <p className="text-sm text-gray-600">Order #{orderId} - ${orderTotal.toFixed(2)}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Refund Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Refund Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                min="0"
                max={orderTotal}
                step="0.01"
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Maximum refund amount: ${orderTotal.toFixed(2)}
            </p>
          </div>

          {/* Refund Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Refund *
            </label>
            <select
              name="reason"
              value={formData.reason}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select a reason</option>
              {refundReasons.map(reason => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Details *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Please provide more details about your refund request..."
              required
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Supporting Images (Optional)
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Upload photos to support your refund request (max 5 images)
            </p>
            
            {/* Drag and Drop Area */}
            <div
              className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleImageUpload(e.target.files)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB each</p>
            </div>

            {/* Image Preview */}
            {images.length > 0 && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                {images.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(image)}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <p className="text-xs text-gray-500 mt-1 truncate">{image.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Refund Policy Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5 mr-3" />
              <div className="text-sm">
                <h4 className="font-medium text-blue-900">Refund Policy</h4>
                <ul className="mt-2 text-blue-800 space-y-1">
                  <li>• Refunds are processed within 5-7 business days</li>
                  <li>• You will receive an email confirmation once processed</li>
                  <li>• Refunds are issued to the original payment method</li>
                  <li>• We may contact you for additional information if needed</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.reason || !formData.description}
            >
              {isLoading ? 'Submitting...' : 'Submit Refund Request'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RefundRequestModal
