import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { products } from '../../data/products'
import Button from '../../components/Button'
import Reviews from '../components/Reviews'
import ReviewForm from '../components/ReviewForm'
import { ArrowRight, Truck, Star, ThumbsUp } from 'lucide-react'

export default function ProductPage() {
  const { id } = useParams()
  const product = products.find((p) => p.id === id)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [activeTab, setActiveTab] = useState<'description' | 'reviews'>('description')

  if (!product) return <div className="p-6">Product not found</div>

  const handleHelpfulVote = (reviewId: string, isHelpful: boolean) => {
    // In a real app, this would make an API call
    console.log('Helpful vote:', { reviewId, isHelpful })
  }

  const handleReviewSubmit = async (reviewData: {
    rating: number
    title: string
    comment: string
    images?: File[]
  }) => {
    // In a real app, this would make an API call
    console.log('Review submitted:', reviewData)
    setShowReviewForm(false)
    alert('Thank you for your review! It will be published after moderation.')
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
  
  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div>
          <img src={product.image} alt={product.alt} className="w-full h-96 lg:h-[500px] object-cover rounded-lg shadow-lg" />
        </div>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">{product.title}</h1>
            <p className="text-lg text-gray-600 leading-relaxed">{product.description}</p>
          </div>
          
          {/* Rating and Reviews Summary */}
          {product.reviews && product.reviews.length > 0 && (
            <div className="flex items-center space-x-4 py-2">
              <div className="flex items-center space-x-1">
                {renderStars(Math.round(product.averageRating || 0))}
              </div>
              <span className="text-sm text-gray-600">
                {product.averageRating?.toFixed(1)} ({product.totalReviews} review{product.totalReviews !== 1 ? 's' : ''})
              </span>
            </div>
          )}
          
          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-bold text-gray-900">${product.price.toFixed(2)}</div>
            <div className="flex items-center text-sm text-gray-500">
              <Truck className="w-4 h-4 mr-1" />
              Free shipping
            </div>
          </div>

          <div className="pt-4 space-y-3">
            <Button
              variant="add-to-cart"
              size="lg"
              className="w-full"
              onClick={() => window.location.href = `/customize/${product.id}`}
            >
              Start Customizing
            </Button>
            <Button
              variant="outline"
              size="lg"
              icon={<ArrowRight className="w-4 h-4" />}
              iconPosition="right"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="w-full"
            >
              Contact us
            </Button>
          </div>
        </div>
      </div>

      {/* Product Details Tabs */}
      <div className="mt-16">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('description')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'description'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Description
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'reviews'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Reviews ({product.totalReviews || 0})
            </button>
          </nav>
        </div>

        <div className="py-8">
          {activeTab === 'description' && (
            <div className="prose max-w-none">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Details</h3>
              <p className="text-gray-700 leading-relaxed">{product.description}</p>
              
              {product.availableColors && (
                <div className="mt-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-2">Available Colors</h4>
                  <div className="flex flex-wrap gap-2">
                    {product.availableColors.map((color) => (
                      <span
                        key={color}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                      >
                        {color}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {product.availableSizes && (
                <div className="mt-4">
                  <h4 className="text-md font-semibold text-gray-900 mb-2">Available Sizes</h4>
                  <div className="flex flex-wrap gap-2">
                    {product.availableSizes.map((size) => (
                      <span
                        key={size}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                      >
                        {size}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div>
              {product.reviews && product.reviews.length > 0 ? (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Customer Reviews</h3>
                    <Button
                      variant="outline"
                      onClick={() => setShowReviewForm(!showReviewForm)}
                    >
                      Write a Review
                    </Button>
                  </div>
                  
                  {showReviewForm && (
                    <ReviewForm
                      productId={product.id}
                      productTitle={product.title}
                      onSubmit={handleReviewSubmit}
                      onCancel={() => setShowReviewForm(false)}
                    />
                  )}
                  
                  <Reviews
                    reviews={product.reviews}
                    averageRating={product.averageRating || 0}
                    totalReviews={product.totalReviews || 0}
                    onHelpfulVote={handleHelpfulVote}
                  />
                </div>
              ) : (
                <div className="text-center py-12">
                  <Star className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No reviews yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Be the first to review this product!
                  </p>
                  <div className="mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setShowReviewForm(!showReviewForm)}
                    >
                      Write a Review
                    </Button>
                  </div>
                  
                  {showReviewForm && (
                    <div className="mt-6">
                      <ReviewForm
                        productId={product.id}
                        productTitle={product.title}
                        onSubmit={handleReviewSubmit}
                        onCancel={() => setShowReviewForm(false)}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}