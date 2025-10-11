import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import Button from '../../components/Button'
import DesignUpload from '../components/DesignUpload'

export default function CustomizedEmbroidery() {
  const [uploadedDesign, setUploadedDesign] = useState<File | null>(null)
  const [designPreview, setDesignPreview] = useState<string | null>(null)
  const [quotePrice, setQuotePrice] = useState<{total: number, base: number, options: number} | null>(null)

  return (
    <main>
      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-br from-accent/10 via-white to-accent/5">
        <div className="container">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center space-x-2 bg-accent/10 text-accent px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              <span>Custom Embroidery Services</span>
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6">
              Customized Embroidery
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Transform your ideas into stunning embroidered designs. From custom logos to personal monograms, 
              we bring your vision to life with precision and artistry.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/contact">
                <Button size="lg" className="group">
                  Get Custom Quote
                  <ArrowRight className="ml-2 w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link to="/products">
                <Button variant="outline" size="lg" className="group">
                  Browse Products
                  <ArrowRight className="ml-2 w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Design Upload Section */}
      <section className="py-16 bg-gray-50">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Get Your Custom Quote
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Upload your design, specify the size, and get an instant price quote for your custom embroidery project.
            </p>
          </div>
          
          <DesignUpload
            onPriceUpdate={(total, base, options) => {
              setQuotePrice({ total, base, options })
            }}
            onDesignUpdate={(file, preview) => {
              setUploadedDesign(file)
              setDesignPreview(preview)
            }}
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-accent">
        <div className="container text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Ready to Start Your Custom Embroidery Project?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Contact us today for a personalized quote. Our team is ready to bring your 
            embroidery vision to life with professional quality and attention to detail.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/contact">
              <Button variant="secondary" size="lg" className="group">
                Get Started Today
                <ArrowRight className="ml-2 w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link to="/products">
              <Button variant="outline" size="lg" className="bg-white text-accent hover:bg-gray-50 group">
                View Our Products
                <ArrowRight className="ml-2 w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
