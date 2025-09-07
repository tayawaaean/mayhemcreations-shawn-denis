import React, { useState } from 'react'
import { ChevronDown, HelpCircle, Clock, Palette, Truck, Shield, CreditCard, MessageCircle } from 'lucide-react'

const faqs = [
  {
    category: 'General',
    icon: HelpCircle,
    questions: [
      {
        q: 'What is your turnaround time?',
        a: 'Our standard turnaround time is 5-10 business days depending on the complexity and quantity of your order. Rush orders can be accommodated with a 2-3 day turnaround for an additional fee. We\'ll always provide you with an accurate timeline during the consultation process.'
      },
      {
        q: 'Do you offer bulk discounts?',
        a: 'Yes! We offer competitive bulk pricing for orders of 25+ pieces. Discounts increase with quantity, and we can provide custom quotes for large orders. Contact us with your specific requirements for a personalized quote.'
      },
      {
        q: 'What makes Mayhem Creation different?',
        a: 'We combine traditional craftsmanship with modern technology, ensuring every piece meets our high quality standards. Our attention to detail, personalized service, and commitment to customer satisfaction sets us apart in the custom embroidery industry.'
      }
    ]
  },
  {
    category: 'Design & Artwork',
    icon: Palette,
    questions: [
      {
        q: 'Do you accept custom artwork?',
        a: 'Absolutely! We accept vector files (AI, EPS, SVG), high-resolution PNG/JPG files, and even hand-drawn sketches. Our design team can help refine your artwork to ensure it looks perfect when embroidered. We also offer custom design services if you need help creating your artwork.'
      },
      {
        q: 'What file formats do you prefer?',
        a: 'For best results, we prefer vector files (AI, EPS, SVG) as they scale perfectly. High-resolution PNG or JPG files (300 DPI minimum) also work well. We can work with most common file formats and will let you know if any adjustments are needed.'
      },
      {
        q: 'Can you help with design ideas?',
        a: 'Yes! Our experienced design team can help bring your vision to life. Whether you have a rough sketch, a concept, or just an idea, we can create professional embroidery designs that perfectly represent your brand or personal style.'
      }
    ]
  },
  {
    category: 'Ordering & Shipping',
    icon: Truck,
    questions: [
      {
        q: 'What is your minimum order quantity?',
        a: 'We have a minimum order of 12 pieces for most items. However, we can accommodate smaller orders for certain products or special circumstances. Contact us to discuss your specific needs.'
      },
      {
        q: 'Do you ship nationwide?',
        a: 'Yes! We ship to all 50 states and can accommodate international shipping for larger orders. Standard shipping is included on orders over $100, and we offer expedited shipping options for rush orders.'
      },
      {
        q: 'What if I need to make changes to my order?',
        a: 'We understand that changes happen! If you need to modify your order, contact us as soon as possible. Changes made before production begins are usually free, while changes during production may incur additional charges.'
      }
    ]
  },
  {
    category: 'Quality & Care',
    icon: Shield,
    questions: [
      {
        q: 'How do you ensure quality?',
        a: 'Every piece goes through our rigorous quality control process. We use premium materials, state-of-the-art equipment, and experienced embroiderers. Each order is carefully inspected before packaging and shipping to ensure it meets our high standards.'
      },
      {
        q: 'How should I care for my embroidered items?',
        a: 'For best results, machine wash in cold water with like colors, tumble dry on low heat, and iron on the reverse side if needed. Avoid bleach and fabric softeners. Detailed care instructions are included with every order.'
      },
      {
        q: 'What if I\'m not satisfied with my order?',
        a: 'Your satisfaction is our priority. If you\'re not completely happy with your order, contact us within 30 days of receipt. We\'ll work with you to make it right, including re-embroidery or full refund if necessary.'
      }
    ]
  }
]

export default function FAQ() {
  const [openItems, setOpenItems] = useState<number[]>([])

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    )
  }

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
            <div className="space-y-8">
              {faqs.map((category, categoryIndex) => {
                const IconComponent = category.icon
                return (
                  <div key={categoryIndex} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-8 py-6 border-b border-gray-200">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                          <IconComponent className="w-6 h-6 text-accent" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">{category.category}</h2>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {category.questions.map((faq, faqIndex) => {
                        const globalIndex = categoryIndex * 10 + faqIndex
                        const isOpen = openItems.includes(globalIndex)
                        return (
                          <div key={faqIndex} className="group">
                            <button
                              onClick={() => toggleItem(globalIndex)}
                              className="w-full px-8 py-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
                            >
                              <h3 className="text-lg font-semibold text-gray-900 pr-4">
                                {faq.q}
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
                                <p className="text-gray-600 leading-relaxed">{faq.a}</p>
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