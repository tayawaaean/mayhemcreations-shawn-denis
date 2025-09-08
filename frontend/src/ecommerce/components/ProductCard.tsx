import React, { useState } from 'react'
import type { Product } from '../../types'
import { Link } from 'react-router-dom'
import { Heart, Eye, Star } from 'lucide-react'
import Button from '../../components/Button'

export default function ProductCard({ product }: { product: Product }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <article
      className="card-hover group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <Link to={`/product/${product.id}`} className="block">
          <img
            src={product.image}
            alt={product.alt}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </Link>

        {/* Badges */}
        {product.badges && product.badges.length > 0 && (
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {product.badges.map((badge, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs font-medium bg-accent text-white rounded-full"
              >
                {badge}
              </span>
            ))}
          </div>
        )}

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
            variant="add-to-cart"
            size="sm"
            className="w-full"
            onClick={() => window.location.href = `/customize/${product.id}`}
          >
            Start Customizing
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
