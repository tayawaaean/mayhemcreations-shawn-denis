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
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/my-orders')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to My Orders
        </button>
        
        <h1 className="text-3xl font-bold text-gray-900">My Reviews</h1>
        <p className="text-gray-600 mt-2">
          View and manage all your product reviews
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 px-6 py-4 text-sm font-medium ${
              filter === 'all'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All Reviews ({reviews.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`flex-1 px-6 py-4 text-sm font-medium ${
              filter === 'pending'
                ? 'border-b-2 border-yellow-600 text-yellow-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Pending ({reviews.filter(r => r.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`flex-1 px-6 py-4 text-sm font-medium ${
              filter === 'approved'
                ? 'border-b-2 border-green-600 text-green-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Approved ({reviews.filter(r => r.status === 'approved').length})
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`flex-1 px-6 py-4 text-sm font-medium ${
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
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading your reviews...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredReviews.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {filter === 'all' ? 'No reviews yet' : `No ${filter} reviews`}
          </h3>
          <p className="text-gray-600 mb-6">
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
        <div className="space-y-6">
          {filteredReviews.map((review) => (
            <div
              key={review.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            >
              {/* Review Header */}
              <div className="p-6 border-b border-gray-200 bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Package className="w-5 h-5 text-gray-400" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        {review.productTitle}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {formatDate(review.createdAt)}
                      </span>
                      <span>Order #{review.orderId}</span>
                      <span>SKU: {review.productSku}</span>
                      {review.isVerified && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verified Purchase
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    {getStatusBadge(review.status)}
                  </div>
                </div>
              </div>

              {/* Review Content */}
              <div className="p-6">
                {/* Rating */}
                <div className="mb-4">
                  {renderStars(review.rating)}
                </div>

                {/* Review Title */}
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  {review.title}
                </h4>

                {/* Review Comment */}
                <p className="text-gray-700 mb-4 whitespace-pre-wrap">
                  {review.comment}
                </p>

                {/* Review Images */}
                {review.images && review.images.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center text-sm font-medium text-gray-700 mb-2">
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Review Photos ({review.images.length})
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                  <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <MessageSquare className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-semibold text-blue-900">
                            Response from Mayhem Creations
                          </h5>
                          {review.adminRespondedAt && (
                            <span className="text-xs text-blue-700">
                              {formatDate(review.adminRespondedAt)}
                            </span>
                          )}
                        </div>
                        <p className="text-blue-800 whitespace-pre-wrap">
                          {review.adminResponse}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Status Messages */}
                {review.status === 'pending' && (
                  <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      <Clock className="w-4 h-4 inline mr-2" />
                      Your review is being reviewed by our team. It will be published once approved.
                    </p>
                  </div>
                )}

                {review.status === 'rejected' && (
                  <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-800">
                      <XCircle className="w-4 h-4 inline mr-2" />
                      This review was not approved. Please ensure your review follows our community guidelines.
                    </p>
                  </div>
                )}

                {review.status === 'approved' && (
                  <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800">
                      <CheckCircle className="w-4 h-4 inline mr-2" />
                      Your review is published and visible to other customers. Thank you for your feedback!
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









