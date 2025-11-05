import React from 'react'
import { Link } from 'react-router-dom'
import SEO from '../components/SEO'

export default function Terms() {
  return (
    <main className="min-h-screen bg-white">
      <SEO
        title="Terms of Service - Mayhem Creations"
        description="Read the terms and conditions for using Mayhem Creations products and services."
        url="/terms"
        type="website"
        canonicalUrl="/terms"
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-50 to-white py-14">
        <div className="container max-w-5xl">
          <nav className="text-sm text-gray-500 mb-4">
            <Link to="/" className="hover:text-gray-700">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-700">Terms of Service</span>
          </nav>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Terms of Service</h1>
          <p className="text-lg text-gray-600">The rules for using our website and services.</p>
          <p className="text-sm text-gray-500 mt-3">Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </section>

      {/* Content with TOC */}
      <section className="py-10">
        <div className="container max-w-5xl grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* TOC */}
          <aside className="lg:col-span-1">
            <div className="sticky top-20 rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">On this page</h2>
              <ul className="space-y-2 text-sm">
                <li><a className="text-gray-600 hover:text-accent" href="#orders">Orders & Payments</a></li>
                <li><a className="text-gray-600 hover:text-accent" href="#refunds">Refunds</a></li>
                <li><a className="text-gray-600 hover:text-accent" href="#ip">Intellectual Property</a></li>
                <li><a className="text-gray-600 hover:text-accent" href="#liability">Limitation of Liability</a></li>
                <li><a className="text-gray-600 hover:text-accent" href="#contact">Contact</a></li>
              </ul>
            </div>
          </aside>

          {/* Main */}
          <div className="lg:col-span-3 space-y-8">
            <section id="orders" className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Orders & Payments</h2>
              <p className="text-gray-600">Orders are confirmed upon successful payment. You agree to provide accurate shipping and contact details and authorize charges for your purchases and applicable taxes and shipping.</p>
            </section>

            <section id="refunds" className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Refunds</h2>
              <p className="text-gray-600">We want you to love your order. If there’s an issue, please contact us within 30 days. Approved cases may be refunded or reworked at our discretion.</p>
            </section>

            <section id="ip" className="bg-white rounded-2xl border border-gray-2 00 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Intellectual Property</h2>
              <p className="text-gray-600">All site content, branding, and original designs are the property of Mayhem Creations. You warrant you have rights to any artwork you submit for embroidery.</p>
            </section>

            <section id="liability" className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Limitation of Liability</h2>
              <p className="text-gray-600">To the maximum extent permitted by law, we are not liable for indirect, incidental, or consequential damages arising from the use of our site or services.</p>
            </section>

            <section id="contact" className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Contact</h2>
              <p className="text-gray-600">Questions about these terms? <Link to="/contact" className="text-accent hover:underline">Contact our support team</Link>.</p>
            </section>
          </div>
        </div>
      </section>
    </main>
  )
}


