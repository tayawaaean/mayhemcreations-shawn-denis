import React, { useState } from 'react'
import { Mail, Phone, MapPin, Clock, Send, CheckCircle, MessageCircle, Calendar, Users } from 'lucide-react'
import Button from '../../components/Button'

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
      details: ['(555) 123-4567', '(555) 987-6543'],
      description: 'Call us for immediate assistance'
    },
    {
      icon: Mail,
      title: 'Email',
      details: ['hello@mayhemcreation.com', 'orders@mayhemcreation.com'],
      description: 'Email us anytime'
    },
    {
      icon: MapPin,
      title: 'Address',
      details: ['123 Embroidery Lane', 'Craft City, CC 12345'],
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
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8">
                <CheckCircle className="w-10 h-10 text-green-600" />
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

                {/* Quick Actions */}
                <div className="bg-accent/5 rounded-xl p-6 border border-accent/20">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <a
                      href="tel:+15551234567"
                      className="flex items-center space-x-3 text-gray-700 hover:text-accent transition-colors duration-200"
                    >
                      <Phone className="w-5 h-5" />
                      <span>Call us now</span>
                    </a>
                    <a
                      href="mailto:hello@mayhemcreation.com"
                      className="flex items-center space-x-3 text-gray-700 hover:text-accent transition-colors duration-200"
                    >
                      <Mail className="w-5 h-5" />
                      <span>Send us an email</span>
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