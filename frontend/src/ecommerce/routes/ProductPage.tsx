import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Heart, Share2, Star, ShoppingCart, ArrowRight } from 'lucide-react'
import Button from '../../components/Button'
import ProductSlideshow from '../components/ProductSlideshow'
import { productApiService, Product } from '../../shared/productApiService'
import { getAllProductImages } from '../../shared/imageUtils'

export default function ProductPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

              {/* Rating */}
              <div className="flex items-center space-x-2 mb-6">
                <div className="flex items-center">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className="h-5 w-5 text-yellow-400 fill-current"
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-600">(4.8) • 24 reviews</span>
              </div>
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
                <div>
                  <span className="font-medium">Status:</span> 
                  <span className={`ml-1 px-2 py-1 rounded-full text-xs ${
                    product.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {product.status}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Shipping:</span> Free on orders over $50
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
