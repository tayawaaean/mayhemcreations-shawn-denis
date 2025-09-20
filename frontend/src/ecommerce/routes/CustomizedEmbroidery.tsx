import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Palette, Scissors, Zap, Star, CheckCircle, Users, Award, Clock, Sparkles, Upload } from 'lucide-react'
import Button from '../../components/Button'
import DesignUpload from '../components/DesignUpload'
import { embroideryOptionApiService, EmbroideryOption } from '../../shared/embroideryOptionApiService'

interface EmbroideryService {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  features: string[]
  price: string
  estimatedTime: string
  popular?: boolean
}

const embroideryServices: EmbroideryService[] = [
  {
    id: 'custom-design',
    title: 'Custom Design Creation',
    description: 'We create unique embroidery designs from your ideas, logos, or artwork',
    icon: <Palette className="w-8 h-8" />,
    features: [
      'Unlimited revisions',
      'Vector file conversion',
      'Color matching',
      'Design consultation'
    ],
    price: 'From $25',
    estimatedTime: '2-3 days',
    popular: true
  },
  {
    id: 'logo-embroidery',
    title: 'Logo Embroidery',
    description: 'Professional logo embroidery on any of our products',
    icon: <Award className="w-8 h-8" />,
    features: [
      'High-quality thread',
      'Durable stitching',
      'Multiple color options',
      'Size customization'
    ],
    price: 'From $15',
    estimatedTime: '1-2 days'
  },
  {
    id: 'text-embroidery',
    title: 'Text & Monogramming',
    description: 'Custom text, names, or monograms embroidered beautifully',
    icon: <Scissors className="w-8 h-8" />,
    features: [
      'Various fonts available',
      'Thread color selection',
      'Size options',
      'Placement flexibility'
    ],
    price: 'From $10',
    estimatedTime: '1 day'
  },
  {
    id: 'rush-service',
    title: 'Rush Service',
    description: 'Fast-track embroidery service for urgent orders',
    icon: <Zap className="w-8 h-8" />,
    features: [
      'Same-day service',
      'Priority processing',
      'Express shipping',
      'Quality guaranteed'
    ],
    price: 'From $35',
    estimatedTime: 'Same day'
  }
]

const processSteps = [
  {
    step: 1,
    title: 'Submit Your Design',
    description: 'Upload your artwork, logo, or describe your vision to us',
    icon: <Palette className="w-6 h-6" />
  },
  {
    step: 2,
    title: 'Design Review',
    description: 'We review and provide feedback or create a custom design',
    icon: <CheckCircle className="w-6 h-6" />
  },
  {
    step: 3,
    title: 'Approval & Quote',
    description: 'You approve the design and receive a detailed quote',
    icon: <Star className="w-6 h-6" />
  },
  {
    step: 4,
    title: 'Production',
    description: 'We embroider your design with precision and care',
    icon: <Scissors className="w-6 h-6" />
  },
  {
    step: 5,
    title: 'Quality Check',
    description: 'Final inspection to ensure perfect results',
    icon: <CheckCircle className="w-6 h-6" />
  },
  {
    step: 6,
    title: 'Delivery',
    description: 'Your custom embroidered product is ready for pickup or shipping',
    icon: <ArrowRight className="w-6 h-6" />
  }
]

export default function CustomizedEmbroidery() {
  const [embroideryOptions, setEmbroideryOptions] = useState<EmbroideryOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadedDesign, setUploadedDesign] = useState<File | null>(null)
  const [designPreview, setDesignPreview] = useState<string | null>(null)
  const [quotePrice, setQuotePrice] = useState<{total: number, base: number, options: number} | null>(null)

  useEffect(() => {
    const fetchEmbroideryOptions = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await embroideryOptionApiService.getEmbroideryOptions({
          status: 'active',
          limit: 20
        })
        
        setEmbroideryOptions(response.data)
      } catch (err) {
        setError('Failed to load embroidery options')
        console.error('Error fetching embroidery options:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchEmbroideryOptions()
  }, [])

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

      {/* Services Section */}
      <section className="py-16 bg-white">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Our Embroidery Services
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Professional embroidery services tailored to your needs. From simple text to complex designs, 
              we handle every detail with care.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {embroideryServices.map((service) => (
              <div
                key={service.id}
                className={`relative bg-white rounded-xl shadow-sm border-2 p-6 hover:shadow-lg transition-all duration-300 ${
                  service.popular ? 'border-accent ring-2 ring-accent/20' : 'border-gray-200 hover:border-accent/50'
                }`}
              >
                {service.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-accent text-white px-3 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4 text-accent">
                    {service.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{service.title}</h3>
                  <p className="text-gray-600 mb-4">{service.description}</p>
                  
                  <div className="space-y-3 mb-6">
                    {service.features.map((feature, index) => (
                      <div key={index} className="flex items-center text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t border-gray-100 pt-4">
                    <div className="text-2xl font-bold text-gray-900 mb-1">{service.price}</div>
                    <div className="flex items-center justify-center text-sm text-gray-500">
                      <Clock className="w-4 h-4 mr-1" />
                      <span>{service.estimatedTime}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-16 bg-gray-50">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our simple 6-step process ensures your custom embroidery project is completed 
              to perfection, every time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {processSteps.map((step, index) => (
              <div key={step.step} className="text-center">
                <div className="relative">
                  <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4 text-white">
                    {step.icon}
                  </div>
                  {index < processSteps.length - 1 && (
                    <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-accent/30 transform translate-x-4"></div>
                  )}
                </div>
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <div className="text-sm font-medium text-accent mb-2">Step {step.step}</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Guide Section */}
      <section className="py-16 bg-white">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Pricing Guide
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our pricing is based on the size of your embroidery and includes tier-based discounts for larger projects.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-green-600 text-xl font-bold">S</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Small</h3>
              <p className="text-sm text-gray-600 mb-2">Up to 4 sq in</p>
              <p className="text-lg font-bold text-accent">$2.50/sq in</p>
            </div>
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 text-xl font-bold">M</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Medium</h3>
              <p className="text-sm text-gray-600 mb-2">4-16 sq in</p>
              <p className="text-lg font-bold text-accent">$2.25/sq in</p>
            </div>
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-purple-600 text-xl font-bold">L</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Large</h3>
              <p className="text-sm text-gray-600 mb-2">16-36 sq in</p>
              <p className="text-lg font-bold text-accent">$2.00/sq in</p>
            </div>
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-orange-600 text-xl font-bold">XL</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Extra Large</h3>
              <p className="text-sm text-gray-600 mb-2">36+ sq in</p>
              <p className="text-lg font-bold text-accent">$1.75/sq in</p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              * Minimum order: $15.00 • Additional embroidery options available
            </p>
          </div>
        </div>
      </section>

      {/* Available Options Section */}
      <section className="py-16 bg-gray-50">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Available Embroidery Options
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Choose from our extensive collection of embroidery options or create something completely custom.
            </p>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
              <p className="text-gray-600">Loading embroidery options...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <div className="text-red-600 mb-2">Failed to load embroidery options</div>
              <p className="text-red-500">{error}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {embroideryOptions.map((option) => (
                <div key={option.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">{option.name}</h3>
                      <span className="text-sm text-gray-500">${option.basePrice}</span>
                    </div>
                    <p className="text-gray-600 mb-4">{option.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          option.isActive ? 'bg-green-500' : 'bg-gray-400'
                        }`}></div>
                        <span className="text-sm text-gray-500">
                          {option.isActive ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                      <Button size="sm" variant="outline">
                        Select Option
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
