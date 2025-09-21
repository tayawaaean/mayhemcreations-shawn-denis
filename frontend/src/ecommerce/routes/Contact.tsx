import React, { useState } from 'react'
import { Mail, Phone, MapPin, Clock, Send, CheckCircle, MessageCircle, Calendar, Users, Facebook, Instagram } from 'lucide-react'
import Button from '../../components/Button'

// Custom SVG Icons for social media platforms
const EtsyIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M8.564 2.445c0-.325.033-.52.59-.52h7.465c1.3 0 1.51.3 1.51 1.28v1.8h-3.92c-.59 0-.59.28-.59.52v3.44c0 .28 0 .52.59.52h3.92v8.1c0 1.04-.21 1.28-1.51 1.28H8.564c-.59 0-.59-.28-.59-.52V2.445zm1.18 10.92c0 .28 0 .52.59.52h4.33c.59 0 .59-.28.59-.52V9.445c0-.28 0-.52-.59-.52h-4.33c-.59 0-.59.28-.59.52v3.92z"/>
  </svg>
)

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
  </svg>
)

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    projectType: '',
    quantity: '',
    message: ''
  })
  const [sent, setSent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    console.log('Form submitted:', formData)
    setSent(true)
    setIsSubmitting(false)
  }

  const contactInfo = [
    {
      icon: Phone,
      title: 'Phone',
      details: ['614-715-4742'],
      description: 'Call us for immediate assistance'
    },
    {
      icon: MapPin,
      title: 'Address',
      details: ['128 Persimmon Dr', 'Newark, OH 43055'],
      description: 'Visit our workshop'
    },
    {
      icon: Clock,
      title: 'Business Hours',
      details: ['Mon-Fri: 8AM-6PM', 'Sat: 9AM-4PM', 'Sun: Closed'],
      description: 'We\'re here to help'
    }
  ]

  const projectTypes = [
    'T-Shirts & Apparel',
    'Caps & Hats',
    'Bags & Accessories',
    'Corporate Uniforms',
    'Event Merchandise',
    'Custom Patches',
    'Other'
  ]

  if (sent) {
    return (
      <main className="min-h-screen">
        <section className="bg-gradient-to-br from-gray-50 to-white py-16 lg:py-24">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-8">
                <CheckCircle className="w-10 h-10 text-purple-600" />
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                Thank You!
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                We've received your message and will get back to you within 24 hours. 
                We're excited to work with you on your custom embroidery project!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => setSent(false)}
                >
                  Send Another Message
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => window.location.href = '/'}
                >
                  Back to Home
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-50 to-white py-16 lg:py-24">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-accent rounded-2xl mb-8">
              <MessageCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6">
              Get In <span className="text-accent">Touch</span>
            </h1>
            <p className="text-xl lg:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Ready to start your custom embroidery project? We'd love to hear from you! 
              Contact us today for a free consultation and quote.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Content */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="container">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
              {/* Contact Form */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 lg:p-10">
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">Send us a Message</h2>
                  <p className="text-gray-600">
                    Fill out the form below and we'll get back to you within 24 hours with a personalized quote.
                  </p>
                </div>

                <form onSubmit={submit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        required
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-accent focus:border-accent transition-colors duration-200"
                        placeholder="Your full name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        required
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-accent focus:border-accent transition-colors duration-200"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-accent focus:border-accent transition-colors duration-200"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Company/Organization
                      </label>
                      <input
                        name="company"
                        value={formData.company}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-accent focus:border-accent transition-colors duration-200"
                        placeholder="Your company name"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Project Type *
                      </label>
                      <select
                        required
                        name="projectType"
                        value={formData.projectType}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-accent focus:border-accent transition-colors duration-200"
                      >
                        <option value="">Select project type</option>
                        {projectTypes.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Estimated Quantity
                      </label>
                      <input
                        name="quantity"
                        value={formData.quantity}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-accent focus:border-accent transition-colors duration-200"
                        placeholder="e.g., 50 pieces"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Project Details *
                    </label>
                    <textarea
                      required
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      rows={5}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-accent focus:border-accent transition-colors duration-200"
                      placeholder="Tell us about your project, design requirements, timeline, and any other details..."
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="add-to-cart"
                    size="lg"
                    className="w-full"
                    icon={<Send className="w-5 h-5" />}
                    iconPosition="left"
                    isLoading={isSubmitting}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </Button>
                </form>
              </div>

              {/* Contact Information */}
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-6">Contact Information</h2>
                  <p className="text-lg text-gray-600 mb-8">
                    We're here to help bring your vision to life. Reach out to us through any of these channels.
                  </p>
                </div>

                <div className="space-y-6">
                  {contactInfo.map((info, index) => {
                    const IconComponent = info.icon
                    return (
                      <div key={index} className="bg-gray-50 rounded-xl p-6">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <IconComponent className="w-6 h-6 text-accent" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">{info.title}</h3>
                            <div className="space-y-1">
                              {info.details.map((detail, detailIndex) => (
                                <p key={detailIndex} className="text-gray-700">{detail}</p>
                              ))}
                            </div>
                            <p className="text-sm text-gray-500 mt-2">{info.description}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Social Media */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Follow Us</h3>
                  <p className="text-gray-600 mb-4">
                    Stay connected and see our latest work on social media!
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <a
                      href="https://etsy.com/shop/MayhemCreationLLC"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-3 p-3 bg-white rounded-lg hover:bg-accent/5 transition-colors duration-200"
                    >
                      <EtsyIcon className="w-5 h-5 text-accent" />
                      <span className="text-sm font-medium text-gray-700">@MayhemCreationLLC</span>
                    </a>
                    <a
                      href="https://tiktok.com/@Mayhem_Creation"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-3 p-3 bg-white rounded-lg hover:bg-accent/5 transition-colors duration-200"
                    >
                      <TikTokIcon className="w-5 h-5 text-accent" />
                      <span className="text-sm font-medium text-gray-700">@Mayhem_Creation</span>
                    </a>
                    <a
                      href="https://facebook.com/MayhemCreationLLC"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-3 p-3 bg-white rounded-lg hover:bg-accent/5 transition-colors duration-200"
                    >
                      <Facebook className="w-5 h-5 text-accent" />
                      <span className="text-sm font-medium text-gray-700">@MayhemCreationLLC</span>
                    </a>
                    <a
                      href="https://instagram.com/Mayhem_Creaton"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-3 p-3 bg-white rounded-lg hover:bg-accent/5 transition-colors duration-200"
                    >
                      <Instagram className="w-5 h-5 text-accent" />
                      <span className="text-sm font-medium text-gray-700">@Mayhem_Creaton</span>
                    </a>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-accent/5 rounded-xl p-6 border border-accent/20">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <a
                      href="tel:+16147154742"
                      className="flex items-center space-x-3 text-gray-700 hover:text-accent transition-colors duration-200"
                    >
                      <Phone className="w-5 h-5" />
                      <span>Call us now</span>
                    </a>
                    <a
                      href="/products"
                      className="flex items-center space-x-3 text-gray-700 hover:text-accent transition-colors duration-200"
                    >
                      <Users className="w-5 h-5" />
                      <span>View our products</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}