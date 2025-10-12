import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Heart, Share2, Star, ShoppingCart, ArrowRight } from 'lucide-react'
import Button from '../../components/Button'
import ProductSlideshow from '../components/ProductSlideshow'
import { productApiService, Product } from '../../shared/productApiService'
import { getAllProductImages } from '../../shared/imageUtils'
import { productReviewApiService, ProductReview, ReviewStats } from '../../shared/productReviewApiService'

export default function ProductPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null)
  const [reviewsLoading, setReviewsLoading] = useState(false)

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return
      
      try {
        setLoading(true)
        setError(null)
        
        const response = await productApiService.getProductById(parseInt(id))
        setProduct(response.data || null)
      } catch (err) {
        setError('Product not found')
        console.error('Error fetching product:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [id])

  useEffect(() => {
    const fetchReviews = async () => {
      if (!id) return
      
      try {
        setReviewsLoading(true)
        const response = await productReviewApiService.getProductReviews(parseInt(id))
        if (response.success && response.data) {
          setReviews(response.data.reviews)
          setReviewStats(response.data.stats)
        }
      } catch (err) {
        console.error('Error fetching reviews:', err)
      } finally {
        setReviewsLoading(false)
      }
    }

    fetchReviews()
  }, [id])

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`h-5 w-5 ${
              i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading product...</p>
        </div>
      </main>
    )
  }

  if (error || !product) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Product not found</h1>
          <p className="text-gray-600 mb-6">The product you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/products')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Products
          </Button>
        </div>
      </main>
    )
  }

  // Debug logging
  console.log('ProductPage received product:', {
    id: product.id,
    title: product.title,
    image: product.image,
    images: product.images,
    primaryImageIndex: product.primaryImageIndex
  })

  // Prepare images for slideshow
  const images = getAllProductImages(product)
  console.log('ProductPage processed images:', images)
  
  // Calculate total stock from variants
  const totalStock = product.variants?.reduce((sum: number, variant: any) => sum + (variant.stock || 0), 0) || 0

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => navigate('/products')}
            className="flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Products
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            <ProductSlideshow
              images={images}
              alt={product.alt}
              showThumbnails={true}
              autoPlay={false}
              className="w-full"
            />
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                {product.title}
              </h1>
              <p className="text-lg text-gray-600 mb-4">
                {product.category?.name} {product.subcategory?.name && `• ${product.subcategory.name}`}
              </p>
              
              {/* Price and Stock */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <span className="text-3xl font-bold text-gray-900">
                    ${typeof product.price === 'string' ? parseFloat(product.price).toFixed(2) : product.price.toFixed(2)}
                  </span>
                </div>
                
                {/* Stock Status */}
                {totalStock !== undefined && (
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      totalStock === 0 
                        ? 'bg-red-500' 
                        : totalStock <= 5 
                          ? 'bg-yellow-500' 
                          : 'bg-green-500'
                    }`}></div>
                    <span className={`text-sm font-medium ${
                      totalStock === 0 
                        ? 'text-red-600' 
                        : totalStock <= 5 
                          ? 'text-yellow-600' 
                          : 'text-green-600'
                    }`}>
                      {totalStock === 0 ? 'Out of Stock' : totalStock <= 5 ? 'Low Stock' : 'In Stock'}
                    </span>
                  </div>
                )}
              </div>

              {/* Rating - Connected to actual review data */}
              {reviewStats && reviewStats.totalReviews > 0 ? (
                <div 
                  className="flex items-center space-x-2 mb-6 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => {
                    // Scroll to reviews section
                    document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                  title="Click to view all reviews"
                >
                  <div className="flex items-center">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${
                          i < Math.round(parseFloat(reviewStats.averageRating))
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">
                    ({parseFloat(reviewStats.averageRating).toFixed(1)}) • {reviewStats.totalReviews} {reviewStats.totalReviews === 1 ? 'review' : 'reviews'}
                  </span>
                </div>
              ) : !reviewsLoading && (
                <div className="flex items-center space-x-2 mb-6 text-gray-500">
                  <div className="flex items-center">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className="h-5 w-5 text-gray-300"
                      />
                    ))}
                  </div>
                  <span className="text-sm">No reviews yet</span>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
              <p className="text-gray-600 leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Features */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Features</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
                  High-quality embroidery
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
                  Custom design placement
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
                  Durable materials
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
                  Free shipping on orders over $50
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              <div className="flex space-x-4">
                <Button
                  variant={totalStock === 0 ? "outline" : "add-to-cart"}
                  size="lg"
                  className="flex-1"
                  disabled={totalStock === 0}
                  onClick={() => totalStock !== 0 && navigate(`/customize/${product.id}`)}
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  {totalStock === 0 ? 'Out of Stock' : 'Start Customizing'}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="px-4"
                >
                  <Heart className="w-5 h-5" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="px-4"
                >
                  <Share2 className="w-5 h-5" />
                </Button>
              </div>

              <Button
                variant="outline"
                size="lg"
                className="w-full"
                disabled={totalStock === 0}
                onClick={() => totalStock !== 0 && navigate(`/customize/${product.id}`)}
              >
                {totalStock === 0 ? 'Not Available' : 'View Customization Options'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {/* Additional Info */}
            <div className="border-t pt-6">
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">SKU:</span> {product.sku}
                </div>
                <div>
                  <span className="font-medium">Category:</span> {product.category?.name}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div id="reviews-section" className="container mx-auto px-4 py-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Customer Reviews</h2>
          
          {reviewsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            </div>
          ) : (
            <>
              {/* Review Stats */}
              {reviewStats && reviewStats.totalReviews > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-center mb-2">
                        <span className="text-5xl font-bold text-gray-900">{reviewStats.averageRating}</span>
                        <div className="ml-4">
                          {renderStars(Math.round(parseFloat(reviewStats.averageRating)))}
                          <p className="text-sm text-gray-600 mt-1">
                            Based on {reviewStats.totalReviews} {reviewStats.totalReviews === 1 ? 'review' : 'reviews'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {[5, 4, 3, 2, 1].map((rating) => {
                        const count = reviewStats.ratingDistribution[rating as keyof typeof reviewStats.ratingDistribution]
                        const percentage = reviewStats.totalReviews > 0 ? (count / reviewStats.totalReviews) * 100 : 0
                        return (
                          <div key={rating} className="flex items-center">
                            <span className="text-sm font-medium text-gray-700 w-12">{rating} star</span>
                            <div className="flex-1 mx-3">
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-yellow-400"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                            <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Individual Reviews */}
              <div className="space-y-6">
                {reviews.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <Star className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No reviews yet</h3>
                    <p className="text-gray-600">Be the first to review this product!</p>
                  </div>
                ) : (
                  reviews.map((review) => (
                    <div key={review.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          {renderStars(review.rating)}
                          <div className="mt-2 flex items-center text-sm text-gray-600">
                            <span className="font-medium text-gray-900">
                              {review.first_name} {review.last_name}
                            </span>
                            {review.is_verified && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                Verified Purchase
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <h4 className="font-semibold text-gray-900 mb-2">{review.title}</h4>
                      <p className="text-gray-700 mb-4">{review.comment}</p>
                      
                      {/* Review Images */}
                      {review.images && (() => {
                        try {
                          const images = JSON.parse(review.images);
                          if (Array.isArray(images) && images.length > 0) {
                            return (
                              <div className="grid grid-cols-4 gap-2 mb-4">
                                {images.map((image: string, imgIndex: number) => (
                                  <img
                                    key={imgIndex}
                                    src={image}
                                    alt={`Review ${imgIndex + 1}`}
                                    className="w-full h-32 object-contain rounded-lg border border-gray-200 bg-gray-50 cursor-pointer hover:opacity-80 transition-opacity"
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
                      
                      {review.admin_response && (
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-4">
                          <p className="text-sm font-semibold text-blue-900 mb-1">Seller Response:</p>
                          <p className="text-sm text-blue-800">{review.admin_response}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
