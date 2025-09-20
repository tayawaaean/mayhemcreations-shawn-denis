import React, { useState, useEffect } from 'react'
import { ChevronDown, HelpCircle, Clock, Palette, Truck, Shield, CreditCard, MessageCircle } from 'lucide-react'
import { faqApiService, FAQ as FAQType } from '../../shared/faqApiService'

const categoryIcons: Record<string, any> = {
  'General': HelpCircle,
  'Design & Artwork': Palette,
  'Ordering & Shipping': Truck,
  'Quality & Care': Shield,
  'Payment': CreditCard,
  'Support': MessageCircle
}

export default function FAQ() {
  const [openItems, setOpenItems] = useState<number[]>([])
  const [faqs, setFaqs] = useState<FAQType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchFAQs = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await faqApiService.getActiveFAQs()
        
        if (response.success && response.data) {
          setFaqs(response.data)
        } else {
          throw new Error(response.message || 'Failed to fetch FAQs')
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch FAQs'
        setError(errorMessage)
        console.error('Error fetching FAQs:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchFAQs()
  }, [])

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    )
  }

  // Group FAQs by category
  const groupedFAQs = faqs.reduce((acc, faq) => {
    if (!acc[faq.category]) {
      acc[faq.category] = []
    }
    acc[faq.category].push(faq)
    return acc
  }, {} as Record<string, FAQType[]>)

  // Sort categories and FAQs within each category
  const sortedCategories = Object.keys(groupedFAQs).sort()
  sortedCategories.forEach(category => {
    groupedFAQs[category].sort((a, b) => a.sortOrder - b.sortOrder)
  })

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-50 to-white py-16 lg:py-24">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-accent rounded-2xl mb-8">
              <HelpCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6">
              Frequently Asked <span className="text-accent">Questions</span>
            </h1>
            <p className="text-xl lg:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Find answers to common questions about our custom embroidery services, 
              ordering process, and more.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading FAQs...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="text-red-500 text-lg font-medium mb-2">Error loading FAQs</div>
                  <p className="text-gray-600">{error}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {sortedCategories.map((categoryName, categoryIndex) => {
                  const categoryFAQs = groupedFAQs[categoryName]
                  const IconComponent = categoryIcons[categoryName] || HelpCircle
                  
                  return (
                    <div key={categoryIndex} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="bg-gray-50 px-8 py-6 border-b border-gray-200">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                            <IconComponent className="w-6 h-6 text-accent" />
                          </div>
                          <h2 className="text-2xl font-bold text-gray-900">{categoryName}</h2>
                        </div>
                      </div>
                      <div className="divide-y divide-gray-200">
                        {categoryFAQs.map((faq, faqIndex) => {
                          const globalIndex = categoryIndex * 100 + faqIndex
                          const isOpen = openItems.includes(globalIndex)
                          return (
                            <div key={faq.id} className="group">
                              <button
                                onClick={() => toggleItem(globalIndex)}
                                className="w-full px-8 py-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
                              >
                                <h3 className="text-lg font-semibold text-gray-900 pr-4">
                                  {faq.question}
                                </h3>
                                <ChevronDown 
                                  className={`w-5 h-5 text-gray-500 transition-transform duration-200 flex-shrink-0 ${
                                    isOpen ? 'rotate-180' : ''
                                  }`} 
                                />
                              </button>
                              <div className={`overflow-hidden transition-all duration-300 ${
                                isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                              }`}>
                                <div className="px-8 pb-6">
                                  <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 lg:py-24 bg-gray-50">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 lg:p-12">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                Still Have Questions?
              </h2>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                Can't find what you're looking for? Our team is here to help! 
                Contact us and we'll get back to you within 24 hours.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/contact"
                  className="inline-flex items-center justify-center px-8 py-4 bg-accent text-white font-semibold rounded-lg hover:bg-opacity-90 transition-colors duration-200"
                >
                  Contact Us
                </a>
                <a
                  href="tel:+1234567890"
                  className="inline-flex items-center justify-center px-8 py-4 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Call Now
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}