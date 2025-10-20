import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Star, Package, Clock, CheckCircle, XCircle, MessageSquare, Calendar, Image as ImageIcon, ArrowLeft } from 'lucide-react'
import Button from '../../components/Button'
import { productReviewApiService } from '../../shared/productReviewApiService'

// Define review interface based on API response
interface Review {
  id: number
  productId: string
  orderId: number
  rating: number
  title: string
  comment: string
  status: 'pending' | 'approved' | 'rejected'
  isVerified: boolean
  helpfulVotes: number
  images: string[] | null
  adminResponse: string | null
  adminRespondedAt: string | null
  createdAt: string
  updatedAt: string
  productTitle: string
  productSku: string
}

export default function MyReviews() {
  const navigate = useNavigate()
  const { isLoggedIn } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/')
    }
  }, [isLoggedIn, navigate])

  // Load user's reviews on mount
  useEffect(() => {
    if (isLoggedIn) {
      loadReviews()
    }
  }, [isLoggedIn])

  // Function to load reviews from API
  const loadReviews = async () => {
    try {
      setLoading(true)
      const response = await productReviewApiService.getMyReviews()
      
      if (response.success && response.data) {
        setReviews(response.data as Review[])
      }
    } catch (error) {
      console.error('Error loading reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter reviews based on status
  const filteredReviews = reviews.filter(review => {
    if (filter === 'all') return true
    return review.status === filter
  })

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-4 h-4 mr-1" />
            Approved
          </span>
        )
      case 'pending':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-4 h-4 mr-1" />
            Pending Review
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            <XCircle className="w-4 h-4 mr-1" />
            Rejected
          </span>
        )
      default:
        return null
    }
  }

  // Render star rating
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    )
  }

  // Format date to readable format
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <button
          onClick={() => navigate('/my-orders')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          Back to My Orders
        </button>
        
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Reviews</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-2">
          View and manage all your product reviews
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6 overflow-x-auto">
        <div className="flex border-b border-gray-200 min-w-max sm:min-w-0">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium whitespace-nowrap ${
              filter === 'all'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All Reviews ({reviews.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`flex-1 px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium whitespace-nowrap ${
              filter === 'pending'
                ? 'border-b-2 border-yellow-600 text-yellow-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Pending ({reviews.filter(r => r.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`flex-1 px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium whitespace-nowrap ${
              filter === 'approved'
                ? 'border-b-2 border-green-600 text-green-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Approved ({reviews.filter(r => r.status === 'approved').length})
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`flex-1 px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium whitespace-nowrap ${
              filter === 'rejected'
                ? 'border-b-2 border-red-600 text-red-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Rejected ({reviews.filter(r => r.status === 'rejected').length})
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8 sm:py-12">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm sm:text-base text-gray-600 mt-4">Loading your reviews...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredReviews.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-12 text-center">
          <MessageSquare className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
            {filter === 'all' ? 'No reviews yet' : `No ${filter} reviews`}
          </h3>
          <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
            {filter === 'all'
              ? 'You haven\'t submitted any product reviews yet.'
              : `You don't have any ${filter} reviews.`}
          </p>
          <Button onClick={() => navigate('/my-orders')}>
            Go to My Orders
          </Button>
        </div>
      )}

      {/* Reviews List */}
      {!loading && filteredReviews.length > 0 && (
        <div className="space-y-4 sm:space-y-6">
          {filteredReviews.map((review) => (
            <div
              key={review.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            >
              {/* Review Header */}
              <div className="p-4 sm:p-6 border-b border-gray-200 bg-gray-50">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 w-full sm:w-auto">
                    <div className="flex items-start sm:items-center space-x-2 sm:space-x-3 mb-2">
                      <Package className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0 mt-0.5 sm:mt-0" />
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 break-words">
                        {review.productTitle}
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                      <span className="flex items-center whitespace-nowrap">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                        {formatDate(review.createdAt)}
                      </span>
                      <span className="whitespace-nowrap">Order #{review.orderId}</span>
                      <span className="break-all">SKU: {review.productSku}</span>
                      {review.isVerified && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 whitespace-nowrap">
                          <CheckCircle className="w-3 h-3 mr-1 flex-shrink-0" />
                          Verified Purchase
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="self-start sm:self-auto">
                    {getStatusBadge(review.status)}
                  </div>
                </div>
              </div>

              {/* Review Content */}
              <div className="p-4 sm:p-6">
                {/* Rating */}
                <div className="mb-3 sm:mb-4">
                  {renderStars(review.rating)}
                </div>

                {/* Review Title */}
                <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 break-words">
                  {review.title}
                </h4>

                {/* Review Comment */}
                <p className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4 whitespace-pre-wrap break-words">
                  {review.comment}
                </p>

                {/* Review Images */}
                {review.images && review.images.length > 0 && (
                  <div className="mb-3 sm:mb-4">
                    <div className="flex items-center text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      <ImageIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                      Review Photos ({review.images.length})
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4">
                      {review.images.map((image, index) => (
                        <div
                          key={index}
                          className="aspect-square rounded-lg overflow-hidden border border-gray-200"
                        >
                          <img
                            src={image}
                            alt={`Review photo ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Admin Response */}
                {review.adminResponse && (
                  <div className="mt-4 sm:mt-6 bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-1">
                          <h5 className="text-sm sm:text-base font-semibold text-blue-900">
                            Response from Mayhem Creations
                          </h5>
                          {review.adminRespondedAt && (
                            <span className="text-xs text-blue-700">
                              {formatDate(review.adminRespondedAt)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-blue-800 whitespace-pre-wrap break-words">
                          {review.adminResponse}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Status Messages */}
                {review.status === 'pending' && (
                  <div className="mt-3 sm:mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
                    <p className="text-xs sm:text-sm text-yellow-800 flex items-start">
                      <Clock className="w-4 h-4 inline mr-2 flex-shrink-0 mt-0.5" />
                      <span className="break-words">Your review is being reviewed by our team. It will be published once approved.</span>
                    </p>
                  </div>
                )}

                {review.status === 'rejected' && (
                  <div className="mt-3 sm:mt-4 bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
                    <p className="text-xs sm:text-sm text-red-800 flex items-start">
                      <XCircle className="w-4 h-4 inline mr-2 flex-shrink-0 mt-0.5" />
                      <span className="break-words">This review was not approved. Please ensure your review follows our community guidelines.</span>
                    </p>
                  </div>
                )}

                {review.status === 'approved' && (
                  <div className="mt-3 sm:mt-4 bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
                    <p className="text-xs sm:text-sm text-green-800 flex items-start">
                      <CheckCircle className="w-4 h-4 inline mr-2 flex-shrink-0 mt-0.5" />
                      <span className="break-words">Your review is published and visible to other customers. Thank you for your feedback!</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


















