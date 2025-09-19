import React from 'react'
import Hero from '../components/Hero'
import ProductGrid from '../components/ProductGrid'
import { products } from '../../data/products'
import { Link } from 'react-router-dom'
import { ArrowRight, Truck, Shield, RotateCcw } from 'lucide-react'
import Button from '../../components/Button'

export default function Home() {
  const featured = products.slice(0, 4)

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
          <ProductGrid products={featured} />
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-accent text-xl">🎨</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Custom Design</h3>
              <p className="text-sm text-gray-600">Unique designs from your ideas</p>
            </div>
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-accent text-xl">🏆</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Logo Embroidery</h3>
              <p className="text-sm text-gray-600">Professional logo work</p>
            </div>
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-accent text-xl">✂️</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Text & Monograms</h3>
              <p className="text-sm text-gray-600">Personalized text embroidery</p>
            </div>
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-accent text-xl">⚡</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Rush Service</h3>
              <p className="text-sm text-gray-600">Fast-track orders available</p>
            </div>
          </div>
          <div className="text-center">
            <Link to="/customized-embroidery">
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
            <Link to="/customized-embroidery">
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