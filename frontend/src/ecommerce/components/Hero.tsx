import React, { useState } from 'react'
import Button from '../../components/Button'
import { Link } from 'react-router-dom'
import { ArrowRight, Star } from 'lucide-react'

export default function Hero() {
  const [imageLoaded, setImageLoaded] = useState(false)

  return (
    <section className="bg-gradient-to-br from-gray-50 to-white py-16 lg:py-24">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Custom Embroidery
                <span className="block text-accent">That Stands Out</span>
              </h1>
              <p className="text-lg text-gray-600 max-w-lg">
                Transform your ideas into stunning embroidered apparel, patches, and accessories.
                Professional quality, fast turnaround, and exceptional customer service since 2018.
              </p>
            </div>

            {/* Trust indicators */}
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="ml-2 font-medium">4.9/5 (500+ reviews)</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/products">
                <Button size="lg" className="w-full sm:w-auto group">
                  Shop Now
                  <ArrowRight className="ml-2 w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button variant="outline" size="lg" className="w-full sm:w-auto group">
                  Get Custom Quote
                  <ArrowRight className="ml-2 w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8 border-t border-gray-200">
              <div className="text-center sm:text-left">
                <div className="text-2xl font-bold text-accent">5-10</div>
                <div className="text-sm text-gray-600">Days Turnaround</div>
              </div>
              <div className="text-center sm:text-left">
                <div className="text-2xl font-bold text-accent">1000+</div>
                <div className="text-sm text-gray-600">Happy Customers</div>
              </div>
              <div className="text-center sm:text-left">
                <div className="text-2xl font-bold text-accent">100%</div>
                <div className="text-sm text-gray-600">Satisfaction</div>
              </div>
            </div>
          </div>

          {/* Image */}
          <div className="relative">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 shadow-2xl">
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-200 animate-pulse">
                  <div className="text-gray-400 text-sm">Loading...</div>
                </div>
              )}
              <img
                src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop&crop=center"
                alt="Professional embroidery machine creating custom designs"
                className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImageLoaded(true)}
                onError={(e) => {
                  // Fallback to a working embroidery image
                  const target = e.target as HTMLImageElement;
                  target.src = "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop&crop=center";
                }}
              />
            </div>
            {/* Floating badge */}
            <div className="absolute -bottom-4 -left-4 bg-white rounded-full px-6 py-3 shadow-lg border border-gray-200">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-900">Live Production</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
