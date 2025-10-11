import React, { useState, useEffect } from 'react'
import { Star, Search, Filter, Trash2, Check, X, ThumbsUp, Loader, MessageSquare } from 'lucide-react'
import { productReviewApiService, ProductReview } from '../../shared/productReviewApiService'
import { formatDateOnly } from '../../utils/dateFormatter'

const Reviews: React.FC = () => {
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [ratingFilter, setRatingFilter] = useState<'all' | '5' | '4' | '3' | '2' | '1'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'rating' | 'helpful'>('newest')
  const [selectedReview, setSelectedReview] = useState<ProductReview | null>(null)
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false)
  const [adminResponse, setAdminResponse] = useState('')

  useEffect(() => {
    fetchReviews()
  }, [statusFilter])

  const fetchReviews = async () => {
    try {
      setLoading(true)
      const response = await productReviewApiService.getAllReviews(statusFilter)
      if (response.success && response.data) {
        setReviews(response.data)
      }
    } catch (error) {
      console.error('Error fetching reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredReviews = reviews
    .filter(review => {
      const customerName = `${review.first_name || ''} ${review.last_name || ''}`.trim()
      const matchesSearch = 
        review.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (review.product_title && review.product_title.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesRating = ratingFilter === 'all' || review.rating.toString() === ratingFilter
      
      return matchesSearch && matchesRating
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'rating':
          return b.rating - a.rating
        case 'helpful':
          return b.helpful_votes - a.helpful_votes
        default:
          return 0
      }
    })

  const handleStatusChange = async (reviewId: number, newStatus: 'pending' | 'approved' | 'rejected') => {
    try {
      const response = await productReviewApiService.updateReviewStatus(reviewId, { status: newStatus })
      if (response.success) {
        fetchReviews()
      }
    } catch (error) {
      console.error('Error updating review status:', error)
      alert('Failed to update review status')
    }
  }

  const handleDeleteReview = async (reviewId: number) => {
    if (window.confirm('Are you sure you want to delete this review?')) {
      try {
        const response = await productReviewApiService.deleteReview(reviewId)
        if (response.success) {
          fetchReviews()
        }
      } catch (error) {
        console.error('Error deleting review:', error)
        alert('Failed to delete review')
      }
    }
  }

  const handleSendResponse = async () => {
    if (!selectedReview || !adminResponse.trim()) return
    
    try {
      const response = await productReviewApiService.updateReviewStatus(selectedReview.id, {
        status: selectedReview.status,
        adminResponse: adminResponse
      })
      if (response.success) {
        setIsResponseModalOpen(false)
        setAdminResponse('')
        setSelectedReview(null)
        fetchReviews()
      }
    } catch (error) {
      console.error('Error sending admin response:', error)
      alert('Failed to send response')
    }
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ))
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    }
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${styles[status as keyof typeof styles]}`}>
        {status}
      </span>
    )
  }

  const stats = {
    total: reviews.length,
    pending: reviews.filter(r => r.status === 'pending').length,
    approved: reviews.filter(r => r.status === 'approved').length,
    rejected: reviews.filter(r => r.status === 'rejected').length,
    averageRating: reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : '0.0'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reviews</h1>
          <p className="mt-2 text-gray-600">
            Manage customer reviews and ratings for your products.
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Total Reviews</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.total}</dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Average Rating</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.averageRating} ★</dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-yellow-600 truncate">Pending</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.pending}</dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-green-600 truncate">Approved</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.approved}</dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-red-600 truncate">Rejected</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.rejected}</dd>
          </div>
        </div>
      </div>

      {/* Filters and search */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search reviews..."
                className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value as any)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="all">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="rating">Highest Rating</option>
              <option value="helpful">Most Helpful</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reviews list */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {filteredReviews.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No reviews found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredReviews.map((review) => (
              <div key={review.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Product and customer info */}
                    <div className="flex items-center space-x-4 mb-3">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{review.product_title || 'Product'}</h3>
                        <p className="text-sm text-gray-500">
                          by {review.first_name} {review.last_name} • {formatDateOnly(review.created_at)}
                          {review.is_verified && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              <Check className="w-3 h-3 mr-1" />
                              Verified Purchase
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Rating */}
                    <div className="flex items-center mb-2">
                      {renderStars(review.rating)}
                      <span className="ml-2 text-sm text-gray-600">{review.rating}.0</span>
                    </div>

                    {/* Review content */}
                    <h4 className="font-medium text-gray-900 mb-1">{review.title}</h4>
                    <p className="text-gray-700 mb-3">{review.comment}</p>

                    {/* Review Images */}
                    {review.images && (() => {
                      try {
                        const images = JSON.parse(review.images);
                        if (Array.isArray(images) && images.length > 0) {
                          return (
                            <div className="grid grid-cols-5 gap-2 mb-3">
                              {images.map((image: string, imgIndex: number) => (
                                <img
                                  key={imgIndex}
                                  src={image}
                                  alt={`Review ${imgIndex + 1}`}
                                  className="w-full h-28 object-contain rounded-lg border border-gray-200 bg-gray-50 cursor-pointer hover:opacity-80 transition-opacity"
                                />
                              ))}
                            </div>
                          );
                        }
                      } catch (e) {
                        return null;
                      }
                      return null;
                    })()}

                    {/* Admin response */}
                    {review.admin_response && (
                      <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-3">
                        <p className="text-sm font-medium text-blue-900 mb-1">Admin Response:</p>
                        <p className="text-sm text-blue-800">{review.admin_response}</p>
                        {review.admin_responded_at && (
                          <p className="text-xs text-blue-600 mt-1">
                            {formatDateOnly(review.admin_responded_at)}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <button className="flex items-center hover:text-gray-700">
                        <ThumbsUp className="w-4 h-4 mr-1" />
                        {review.helpful_votes} helpful
                      </button>
                      <button
                        onClick={() => {
                          setSelectedReview(review)
                          setAdminResponse(review.admin_response || '')
                          setIsResponseModalOpen(true)
                        }}
                        className="flex items-center hover:text-blue-600"
                      >
                        <MessageSquare className="w-4 h-4 mr-1" />
                        Respond
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="ml-6 flex flex-col space-y-2">
                    {getStatusBadge(review.status)}
                    
                    <div className="flex space-x-1">
                      {review.status !== 'approved' && (
                        <button
                          onClick={() => handleStatusChange(review.id, 'approved')}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-md"
                          title="Approve"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      {review.status !== 'rejected' && (
                        <button
                          onClick={() => handleStatusChange(review.id, 'rejected')}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                          title="Reject"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteReview(review.id)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Admin Response Modal */}
      {isResponseModalOpen && selectedReview && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-black opacity-50" onClick={() => setIsResponseModalOpen(false)}></div>
            
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">Respond to Review</h3>
                <button
                  onClick={() => setIsResponseModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Response
                  </label>
                  <textarea
                    value={adminResponse}
                    onChange={(e) => setAdminResponse(e.target.value)}
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Thank you for your feedback..."
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setIsResponseModalOpen(false)}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendResponse}
                    disabled={!adminResponse.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
                  >
                    Send Response
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Reviews
