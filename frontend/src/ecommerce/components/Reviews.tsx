import React, { useState } from 'react'
import { Star, ThumbsUp, ThumbsDown, CheckCircle } from 'lucide-react'
import type { ProductReview } from '../../types'

interface ReviewsProps {
  reviews: ProductReview[]
  averageRating: number
  totalReviews: number
  onHelpfulVote?: (reviewId: string, isHelpful: boolean) => void
}

const Reviews: React.FC<ReviewsProps> = ({ 
  reviews, 
  averageRating, 
  totalReviews, 
  onHelpfulVote 
}) => {
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest' | 'most_helpful'>('newest')
  const [filterRating, setFilterRating] = useState<'all' | '5' | '4' | '3' | '2' | '1'>('all')

  const sortedAndFilteredReviews = reviews
    .filter(review => filterRating === 'all' || review.rating.toString() === filterRating)
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'highest':
          return b.rating - a.rating
        case 'lowest':
          return a.rating - b.rating
        case 'most_helpful':
          return b.helpfulVotes - a.helpfulVotes
        default:
          return 0
      }
    })

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'h-3 w-3',
      md: 'h-4 w-4',
      lg: 'h-5 w-5'
    }
    
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`${sizeClasses[size]} ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ))
  }

  const getRatingDistribution = () => {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    reviews.forEach(review => {
      distribution[review.rating as keyof typeof distribution]++
    })
    return distribution
  }

  const distribution = getRatingDistribution()

  return (
    <div className="space-y-8">
      {/* Reviews Header */}
      <div className="border-b border-gray-200 pb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Customer Reviews</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Overall Rating */}
          <div className="lg:col-span-1">
            <div className="text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start mb-2">
                <span className="text-4xl font-bold text-gray-900">{averageRating}</span>
                <div className="ml-2">
                  <div className="flex items-center">
                    {renderStars(Math.round(averageRating), 'lg')}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Based on {totalReviews} review{totalReviews !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="lg:col-span-2">
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = distribution[rating as keyof typeof distribution]
                const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0
                
                return (
                  <div key={rating} className="flex items-center">
                    <span className="text-sm font-medium text-gray-700 w-8">{rating}</span>
                    <Star className="h-4 w-4 text-yellow-400 fill-current ml-1" />
                    <div className="flex-1 mx-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-yellow-400 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                    <span className="text-sm text-gray-600 w-8 text-right">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="highest">Highest Rating</option>
          <option value="lowest">Lowest Rating</option>
          <option value="most_helpful">Most Helpful</option>
        </select>
        
        <select
          value={filterRating}
          onChange={(e) => setFilterRating(e.target.value as any)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Ratings</option>
          <option value="5">5 Stars</option>
          <option value="4">4 Stars</option>
          <option value="3">3 Stars</option>
          <option value="2">2 Stars</option>
          <option value="1">1 Star</option>
        </select>
      </div>

      {/* Reviews List */}
      <div className="space-y-6">
        {sortedAndFilteredReviews.map((review) => (
          <div key={review.id} className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <img
                  src={review.customerAvatar || `https://ui-avatars.com/api/?name=${review.customerName}&background=random`}
                  alt={review.customerName}
                  className="h-10 w-10 rounded-full"
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-gray-900">{review.customerName}</h4>
                    {review.isVerified && (
                      <CheckCircle className="h-4 w-4 text-green-500" title="Verified Purchase" />
                    )}
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="flex items-center">
                      {renderStars(review.rating)}
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <h5 className="font-medium text-gray-900 mb-2">{review.title}</h5>
            <p className="text-gray-700 mb-4">{review.comment}</p>

            {/* Review Images */}
            {review.images && review.images.length > 0 && (
              <div className="flex space-x-2 mb-4">
                {review.images.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`Review image ${index + 1}`}
                    className="h-20 w-20 object-cover rounded-lg border border-gray-200"
                  />
                ))}
              </div>
            )}

            {/* Helpful Votes */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => onHelpfulVote?.(review.id, true)}
                  className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ThumbsUp className="h-4 w-4" />
                  <span>Helpful ({review.helpfulVotes})</span>
                </button>
                <button
                  onClick={() => onHelpfulVote?.(review.id, false)}
                  className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ThumbsDown className="h-4 w-4" />
                  <span>Not helpful</span>
                </button>
              </div>
            </div>
          </div>
        ))}

        {sortedAndFilteredReviews.length === 0 && (
          <div className="text-center py-12">
            <Star className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No reviews found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your filter criteria.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Reviews
