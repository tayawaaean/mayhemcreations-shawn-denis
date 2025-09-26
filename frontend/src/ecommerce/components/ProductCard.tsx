import React, { useState } from 'react'
import type { Product } from '../../types'
import { Link } from 'react-router-dom'
import { Heart, Eye, Star } from 'lucide-react'
import Button from '../../components/Button'
import ProductSlideshow from './ProductSlideshow'
import { getAllProductImages } from '../../shared/imageUtils'
import useProductUpdates from '../../hooks/useProductUpdates'

export default function ProductCard({ product }: { product: Product }) {
  const [isHovered, setIsHovered] = useState(false)
  
  // Get real-time stock updates
  const { stock, hasUpdates } = useProductUpdates(parseInt(product.id))
  
  // Use real-time stock if available, otherwise fall back to product stock
  const currentStock = stock !== null ? stock : product.stock
  const isOutOfStock = currentStock === 0
  const isLowStock = currentStock !== undefined && currentStock <= 5 && currentStock > 0

  // Debug logging
  console.log('ProductCard received product:', {
    id: product.id,
    title: product.title,
    image: product.image,
    images: product.images,
    primaryImageIndex: product.primaryImageIndex,
    originalStock: product.stock,
    realTimeStock: currentStock,
    hasUpdates
  })

  // Prepare images for slideshow
  const images = getAllProductImages(product)
  console.log('ProductCard processed images:', images)

  return (
    <article
      className="card-hover group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <Link to={`/product/${product.id}`} className="block">
          <ProductSlideshow
            images={images}
            alt={product.alt}
            showThumbnails={false}
            autoPlay={isHovered && images.length > 1}
            autoPlayInterval={2000}
            className="w-full h-full"
          />
        </Link>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {/* Stock Badge */}
          {currentStock !== undefined && (
            <span className={`px-2 py-1 text-xs font-medium rounded-full transition-all duration-300 ${
              hasUpdates ? 'ring-2 ring-blue-400 ring-opacity-50' : ''
            } ${
              isOutOfStock 
                ? 'bg-red-500 text-white' 
                : isLowStock 
                  ? 'bg-yellow-500 text-white' 
                  : 'bg-green-500 text-white'
            }`}>
              {isOutOfStock ? 'Out of Stock' : `${currentStock} in stock`}
              {hasUpdates && <span className="ml-1 text-blue-200">●</span>}
            </span>
          )}
          
          {/* Other Badges */}
          {product.badges && product.badges.length > 0 && (
            <>
              {product.badges.map((badge: string, index: number) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs font-medium bg-accent text-white rounded-full"
                >
                  {badge}
                </span>
              ))}
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className={`absolute top-3 right-3 flex flex-col gap-2 transition-opacity duration-200 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}>
          <button className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors">
            <Heart className="w-4 h-4 text-gray-600" />
          </button>
          <button className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors">
            <Eye className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Quick Customize */}
        <div className={`absolute bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-sm transition-transform duration-200 ${
          isHovered ? 'translate-y-0' : 'translate-y-full'
        }`}>
          <Button
            variant={isOutOfStock ? "outline" : "add-to-cart"}
            size="sm"
            className="w-full"
            disabled={isOutOfStock}
            onClick={() => !isOutOfStock && (window.location.href = `/customize/${product.id}`)}
          >
            {isOutOfStock ? 'Out of Stock' : 'Start Customizing'}
          </Button>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4">
        <Link to={`/product/${product.id}`}>
          <h3 className="font-semibold text-gray-900 mb-2 hover:text-accent transition-colors">
            {product.title}
          </h3>
        </Link>
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {product.description}
        </p>

        {/* Rating */}
        {product.reviews && product.reviews.length > 0 && (
          <div className="flex items-center space-x-1 mb-3">
            <div className="flex items-center">
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 ${
                    i < Math.round(product.averageRating || 0) 
                      ? 'text-yellow-400 fill-current' 
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-gray-600">
              {product.averageRating?.toFixed(1)} ({product.totalReviews})
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-lg font-bold text-gray-900">
            ${product.price.toFixed(2)}
          </div>
          <div className="text-sm text-gray-500">
            Free shipping
          </div>
        </div>
      </div>
    </article>
  )
}
