import React, { useState, useEffect } from 'react'
import Hero from '../components/Hero'
import ProductGrid from '../components/ProductGrid'
import { Link } from 'react-router-dom'
import { ArrowRight, Truck, Shield, RotateCcw } from 'lucide-react'
import Button from '../../components/Button'
import { productApiService, Product } from '../../shared/productApiService'
import { getAllProductImages } from '../../shared/imageUtils'

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch featured products from database
  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        setLoading(true)
        // Fetch products with featured flag set to true
        const response = await productApiService.getProducts({
          featured: true,
          status: 'active',
          limit: 4
        })
        
        if (response.success && response.data) {
          // Transform database products to frontend format
          const transformed = response.data.map(product => {
            const totalStock = product.variants?.reduce((sum: number, variant: any) => sum + (variant.stock || 0), 0) || 0
            const availableColors = product.variants && product.variants.length > 0
              ? [...new Set(product.variants.map((v: any) => v.color).filter(Boolean))]
              : product.availableColors || []
            const availableSizes = product.availableSizes && Array.isArray(product.availableSizes) && product.availableSizes.length > 0
              ? product.availableSizes
              : product.variants && product.variants.length > 0
                ? [...new Set(product.variants.map((v: any) => v.size).filter(Boolean))]
                : []
            
            return {
              id: product.id.toString(),
              title: product.title,
              price: typeof product.price === 'string' ? parseFloat(product.price) : product.price,
              description: product.description,
              image: product.image,
              alt: product.alt,
              badges: Array.isArray(product.badges) ? product.badges : [],
              category: product.category?.slug as 'apparel' | 'accessories' | 'embroidery' || 'apparel',
              subcategory: product.subcategory?.slug,
              availableColors: availableColors,
              availableSizes: availableSizes,
              materials: Array.isArray(product.materials) ? product.materials : [],
              averageRating: product.averageRating || 0,
              totalReviews: product.totalReviews || 0,
              stock: totalStock,
              sku: product.sku,
              status: product.status,
              hasSizing: product.hasSizing,
              variants: Array.isArray(product.variants) ? product.variants : []
            }
          })
          
          setFeaturedProducts(transformed)
        }
      } catch (error) {
        console.error('Error fetching featured products:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchFeaturedProducts()
  }, [])

  return (
    <main>
      <Hero />
      
      {/* Featured Products Section */}
      <section className="py-16 bg-white">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Featured Products
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Discover our most popular embroidered products, carefully crafted with attention to detail and quality.
            </p>
          </div>
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading featured products...</p>
            </div>
          ) : featuredProducts.length > 0 ? (
            <ProductGrid products={featuredProducts} />
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-600">No featured products available at the moment.</p>
            </div>
          )}
          <div className="text-center mt-12">
            <Link to="/products">
              <Button variant="outline" size="lg" className="group">
                View All Products
                <ArrowRight className="ml-2 w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Custom Embroidery Services Section */}
      <section className="py-16 bg-white">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Custom Embroidery Services
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              From custom logos to personal monograms, we bring your vision to life with professional embroidery services.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            <div className="text-center p-8 bg-gray-50 rounded-xl group hover:shadow-xl transition-all duration-300 hover:bg-white">
              <div className="w-full h-64 rounded-xl overflow-hidden mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <img 
                  src="https://images.unsplash.com/photo-1507525586584-6a9c816efbed?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" 
                  alt="Custom Patches"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Custom Patches</h3>
              <p className="text-base text-gray-600">Unique designs from your ideas</p>
            </div>
            <div className="text-center p-8 bg-gray-50 rounded-xl group hover:shadow-xl transition-all duration-300 hover:bg-white">
              <div className="w-full h-64 rounded-xl overflow-hidden mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <img 
                  src="https://images.unsplash.com/photo-1526290766257-c015850e4629?q=80&w=1080&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" 
                  alt="Logo Embroidery"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Logo Embroidery</h3>
              <p className="text-base text-gray-600">Professional logo work</p>
            </div>
            <div className="text-center p-8 bg-gray-50 rounded-xl group hover:shadow-xl transition-all duration-300 hover:bg-white">
              <div className="w-full h-64 rounded-xl overflow-hidden mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <img 
                  src="https://images.unsplash.com/photo-1614904301802-53243f11a17c?q=80&w=1080&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" 
                  alt="Text and Monograms"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Text & Monograms</h3>
              <p className="text-base text-gray-600">Personalized text embroidery</p>
            </div>
            <div className="text-center p-8 bg-gray-50 rounded-xl group hover:shadow-xl transition-all duration-300 hover:bg-white">
              <div className="w-full h-64 rounded-xl overflow-hidden mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <img 
                  src="https://images.unsplash.com/photo-1630930737762-95fba69e2dad?q=80&w=1080&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" 
                  alt="Rush Service"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Rush Service</h3>
              <p className="text-base text-gray-600">Fast-track orders available</p>
            </div>
          </div>
          <div className="text-center">
            <Link to="/studio">
              <Button variant="outline" size="lg" className="group">
                Explore All Services
                <ArrowRight className="ml-2 w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Free Shipping</h3>
              <p className="text-gray-600">Free shipping on orders over $50. Fast and reliable delivery.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Quality Guarantee</h3>
              <p className="text-gray-600">100% satisfaction guarantee. We stand behind our work.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                <RotateCcw className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Easy Returns</h3>
              <p className="text-gray-600">30-day return policy. No questions asked.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-accent">
        <div className="container text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Contact us today for a custom quote on your embroidery project. 
            We're here to bring your vision to life.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/studio">
              <Button variant="secondary" size="lg" className="group">
                Custom Embroidery Services
                <ArrowRight className="ml-2 w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link to="/products">
              <Button variant="outline" size="lg" className="bg-white text-accent hover:bg-gray-50 group">
                Browse Products
                <ArrowRight className="ml-2 w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}