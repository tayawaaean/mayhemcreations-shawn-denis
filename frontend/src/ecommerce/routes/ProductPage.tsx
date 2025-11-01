import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Share2, Star, ShoppingCart, ArrowRight } from 'lucide-react'
import Button from '../../components/Button'
import ProductSlideshow from '../components/ProductSlideshow'
import { productApiService, Product } from '../../shared/productApiService'
import { getAllProductImages } from '../../shared/imageUtils'
import { productReviewApiService, ProductReview, ReviewStats } from '../../shared/productReviewApiService'
import SEO from '../../components/SEO'

// Placeholder for review images that fail to load
const REVIEW_IMAGE_PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%23f9fafb"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%23d1d5db"%3EImage Unavailable%3C/text%3E%3C/svg%3E'

export default function ProductPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null)
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviewsError, setReviewsError] = useState<string | null>(null)
  const [isRetryingReviews, setIsRetryingReviews] = useState(false)

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
        setReviewsError(null)
        const response = await productReviewApiService.getProductReviews(parseInt(id))
        if (response.success && response.data) {
          setReviews(response.data.reviews)
          setReviewStats(response.data.stats)
        } else {
          // API returned unsuccessful response
          setReviewsError(response.message || 'Failed to load reviews')
        }
      } catch (err: any) {
        console.error('Error fetching reviews:', err)
        
        // Categorize review loading errors
        let errorMessage = 'Failed to load reviews. '
        
        if (err?.message?.includes('timeout') || err?.code === 'ECONNABORTED') {
          errorMessage = 'Connection timeout while loading reviews. Product reviews may not be available.'
        } else if (!navigator.onLine) {
          errorMessage = 'No internet connection. Reviews cannot be loaded.'
        } else if (err?.response?.status >= 500) {
          errorMessage = 'Server error while loading reviews. Reviews may not be available right now.'
        } else if (err?.response?.status === 404) {
          errorMessage = 'No reviews found for this product.'
        } else {
          errorMessage += 'Reviews may not be available right now.'
        }
        
        setReviewsError(errorMessage)
      } finally {
        setReviewsLoading(false)
        setIsRetryingReviews(false)
      }
    }

    fetchReviews()
  }, [id])
  
  // Function to retry loading reviews
  const handleRetryReviews = async () => {
    if (!id) return
    
    setIsRetryingReviews(true)
    setReviewsLoading(true)
    setReviewsError(null)
    
    try {
      const response = await productReviewApiService.getProductReviews(parseInt(id))
      if (response.success && response.data) {
        setReviews(response.data.reviews)
        setReviewStats(response.data.stats)
      } else {
        setReviewsError(response.message || 'Failed to load reviews')
      }
    } catch (err: any) {
      console.error('❌ Reviews retry failed:', err)
      
      let errorMessage = 'Retry failed. '
      
      if (err?.message?.includes('timeout') || err?.code === 'ECONNABORTED') {
        errorMessage = 'Connection timeout. Please check your internet and try again.'
      } else if (!navigator.onLine) {
        errorMessage = 'Still no internet connection. Please connect and try again.'
      } else if (err?.response?.status >= 500) {
        errorMessage = 'Server is still having issues. Please try again later.'
      } else {
        errorMessage += 'Reviews may not be available. You can still purchase this product.'
      }
      
      setReviewsError(errorMessage)
    } finally {
      setReviewsLoading(false)
      setIsRetryingReviews(false)
    }
  }

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

  // Prepare images for slideshow
  const images = getAllProductImages(product)
  
  // Calculate total stock from variants
  const totalStock = product.variants?.reduce((sum: number, variant: any) => sum + (variant.stock || 0), 0) || 0

  // Build product structured data (JSON-LD) for SEO
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description || `${product.title} - Premium custom embroidery from Mayhem Creations`,
    image: images.length > 0 ? images[0] : product.image,
    sku: product.sku,
    brand: {
      '@type': 'Brand',
      name: 'Mayhem Creations'
    },
    offers: {
      '@type': 'Offer',
      url: `https://mayhemcreation.com/product/${product.id}`,
      priceCurrency: 'USD',
      price: typeof product.price === 'string' ? parseFloat(product.price) : product.price,
      availability: totalStock > 0 
        ? 'https://schema.org/InStock' 
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition'
    },
    aggregateRating: reviewStats && reviewStats.totalReviews > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: reviewStats.averageRating,
      reviewCount: reviewStats.totalReviews
    } : undefined
  }

  // Remove undefined aggregateRating if no reviews
  if (!productSchema.aggregateRating) {
    delete productSchema.aggregateRating
  }

  // Build SEO meta data
  const productTitle = `${product.title} - Mayhem Creations`
  const productDescription = product.description || 
    `${product.title} from Mayhem Creations. Premium custom embroidery services and high-quality apparel.${totalStock > 0 ? ' In stock now.' : ''}`
  const productImage = images.length > 0 ? images[0] : product.image
  const productUrl = `/product/${product.id}` // Using ID for now, will update to slug later

  return (
    <main className="min-h-screen bg-gray-50">
      <SEO
        title={productTitle}
        description={productDescription}
        image={productImage}
        url={productUrl}
        type="product"
        structuredData={productSchema}
        canonicalUrl={productUrl}
      />
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
          <div className="space-y-4 sm:space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                {product.title}
              </h1>
              <p className="text-base sm:text-lg text-gray-600 mb-3 sm:mb-4">
                {product.category?.name} {product.subcategory?.name && `• ${product.subcategory.name}`}
              </p>
              
              {/* Price and Stock */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                <div>
                  <span className="text-2xl sm:text-3xl font-bold text-gray-900">
                    ${typeof product.price === 'string' ? parseFloat(product.price).toFixed(2) : product.price.toFixed(2)}
                  </span>
                </div>
                
                {/* Stock Status */}
                {totalStock !== undefined && (
                  <div className="flex items-center space-x-2">
                    <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${
                      totalStock === 0 
                        ? 'bg-red-500' 
                        : totalStock <= 5 
                          ? 'bg-yellow-500' 
                          : 'bg-green-500'
                    }`}></div>
                    <span className={`text-xs sm:text-sm font-medium ${
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
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">Description</h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Features */}
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">Features</h3>
              <ul className="space-y-2 text-sm sm:text-base text-gray-600">
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
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Button
                  variant={totalStock === 0 ? "outline" : "add-to-cart"}
                  size="lg"
                  className="flex-1 w-full"
                  disabled={totalStock === 0}
                  onClick={() => totalStock !== 0 && navigate(`/customize/${product.id}`)}
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  {totalStock === 0 ? 'Out of Stock' : 'Start Customizing'}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="px-6 sm:px-4 w-full sm:w-auto"
                >
                  <Share2 className="w-5 h-5 sm:mr-0 mr-2" />
                  <span className="sm:hidden">Share</span>
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
            <div className="border-t pt-4 sm:pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600">
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
        <div id="reviews-section" className="mt-8 sm:mt-12 pt-8 sm:pt-12 border-t border-gray-200">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">Customer Reviews</h2>
          
          {/* Reviews Error Banner */}
          {reviewsError && !reviewsLoading && (
            <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-6 mb-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-semibold text-yellow-800 mb-1">
                      Reviews Unavailable
                    </h3>
                    <p className="text-sm text-yellow-700">{reviewsError}</p>
                    <p className="text-sm text-yellow-600 mt-2">
                      Don't worry - you can still view product details and make a purchase.
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetryReviews}
                    disabled={isRetryingReviews}
                    className="border-yellow-300 text-yellow-700 hover:bg-yellow-50 disabled:opacity-50"
                  >
                    {isRetryingReviews ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-yellow-700" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Retrying...
                      </>
                    ) : (
                      'Retry'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {reviewsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading reviews...</p>
            </div>
          ) : !reviewsError ? (
            <>
              {/* Review Stats */}
              {reviewStats && reviewStats.totalReviews > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <div className="flex items-center mb-2">
                        <span className="text-4xl sm:text-5xl font-bold text-gray-900">{reviewStats.averageRating}</span>
                        <div className="ml-3 sm:ml-4">
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
              <div className="space-y-4 sm:space-y-6">
                {reviews.length === 0 ? (
                  <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-lg">
                    <Star className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-2 sm:mb-3" />
                    <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-1">No reviews yet</h3>
                    <p className="text-sm sm:text-base text-gray-600">Be the first to review this product!</p>
                  </div>
                ) : (
                  reviews.map((review) => (
                    <div key={review.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
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
                          let images: string[] = [];
                          
                          // Try to parse images if it's a JSON string
                          if (typeof review.images === 'string') {
                            try {
                              images = JSON.parse(review.images);
                            } catch (parseError) {
                              console.warn(`Failed to parse images for review ${review.id}:`, parseError);
                              return null;
                            }
                          } else if (Array.isArray(review.images)) {
                            images = review.images;
                          }
                          
                          // Validate images array and filter out invalid entries
                          if (Array.isArray(images) && images.length > 0) {
                            const validImages = images.filter((img: any) => 
                              typeof img === 'string' && img.trim() !== ''
                            );
                            
                            if (validImages.length === 0) {
                              console.warn(`Review ${review.id} has no valid images`);
                              return null;
                            }
                            
                            return (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                                {validImages.map((image: string, imgIndex: number) => (
                                  <img
                                    key={imgIndex}
                                    src={image}
                                    alt={`Review image ${imgIndex + 1} for ${product?.title || 'product'}`}
                                    className="w-full h-24 sm:h-32 object-contain rounded-lg border border-gray-200 bg-gray-50 cursor-pointer hover:opacity-80 transition-opacity"
                                    onError={(e) => {
                                      console.warn(`Failed to load review image ${imgIndex + 1} for review ${review.id}`);
                                      e.currentTarget.src = REVIEW_IMAGE_PLACEHOLDER;
                                      e.currentTarget.classList.add('opacity-60');
                                    }}
                                  />
                                ))}
                              </div>
                            );
                          }
                        } catch (e) {
                          console.error(`Error rendering images for review ${review.id}:`, e);
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
          ) : null}
        </div>
      </div>
    </main>
  )
}
