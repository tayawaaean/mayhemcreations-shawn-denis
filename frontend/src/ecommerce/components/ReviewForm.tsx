import React, { useState } from 'react'
import { Star, Upload, X } from 'lucide-react'
import Button from '../../components/Button'

interface ReviewFormProps {
  productId: string
  productTitle: string
  onSubmit: (review: {
    rating: number
    title: string
    comment: string
    images?: File[]
  }) => void
  onCancel?: () => void
}

const ReviewForm: React.FC<ReviewFormProps> = ({ 
  productId, 
  productTitle, 
  onSubmit, 
  onCancel 
}) => {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [title, setTitle] = useState('')
  const [comment, setComment] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleRatingClick = (selectedRating: number) => {
    setRating(selectedRating)
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const newImages = [...images, ...files].slice(0, 5) // Limit to 5 images
    setImages(newImages)
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (rating === 0) {
      alert('Please select a rating')
      return
    }
    
    if (!title.trim()) {
      alert('Please enter a review title')
      return
    }
    
    if (!comment.trim()) {
      alert('Please enter a review comment')
      return
    }

    setIsSubmitting(true)
    
    try {
      await onSubmit({
        rating,
        title: title.trim(),
        comment: comment.trim(),
        images: images.length > 0 ? images : undefined
      })
      
      // Reset form
      setRating(0)
      setTitle('')
      setComment('')
      setImages([])
    } catch (error) {
      console.error('Error submitting review:', error)
      alert('Failed to submit review. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStars = (currentRating: number, isInteractive: boolean = false) => {
    return Array.from({ length: 5 }, (_, i) => {
      const starRating = i + 1
      const isFilled = starRating <= currentRating
      const isHovered = isInteractive && starRating <= hoveredRating
      
      return (
        <button
          key={i}
          type="button"
          className={`transition-colors ${
            isInteractive 
              ? 'hover:scale-110 cursor-pointer' 
              : 'cursor-default'
          }`}
          onClick={isInteractive ? () => handleRatingClick(starRating) : undefined}
          onMouseEnter={isInteractive ? () => setHoveredRating(starRating) : undefined}
          onMouseLeave={isInteractive ? () => setHoveredRating(0) : undefined}
        >
          <Star
            className={`h-6 w-6 ${
              isFilled || isHovered
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300'
            }`}
          />
        </button>
      )
    })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Write a Review for {productTitle}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rating *
          </label>
          <div className="flex items-center space-x-1">
            {renderStars(rating, true)}
            <span className="ml-2 text-sm text-gray-600">
              {rating > 0 && (
                rating === 1 ? 'Poor' :
                rating === 2 ? 'Fair' :
                rating === 3 ? 'Good' :
                rating === 4 ? 'Very Good' :
                'Excellent'
              )}
            </span>
          </div>
        </div>

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Review Title *
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Summarize your experience"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            maxLength={100}
          />
          <p className="text-xs text-gray-500 mt-1">{title.length}/100 characters</p>
        </div>

        {/* Comment */}
        <div>
          <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
            Your Review *
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us about your experience with this product..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            maxLength={1000}
          />
          <p className="text-xs text-gray-500 mt-1">{comment.length}/1000 characters</p>
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Photos (Optional)
          </label>
          <div className="space-y-4">
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-2 text-gray-400" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">PNG, JPG up to 10MB each (max 5 images)</p>
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
            
            {/* Image Previews */}
            {images.length > 0 && (
              <div className="grid grid-cols-5 gap-2">
                {images.map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(image)}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-20 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-3">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || rating === 0 || !title.trim() || !comment.trim()}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default ReviewForm
