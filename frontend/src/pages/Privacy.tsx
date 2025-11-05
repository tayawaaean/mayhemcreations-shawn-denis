import React from 'react'
import { Link } from 'react-router-dom'
import SEO from '../components/SEO'

export default function Privacy() {
  return (
    <main className="min-h-screen bg-white">
      <SEO
        title="Privacy Policy - Mayhem Creations"
        description="Learn how Mayhem Creations collects, uses, and protects your personal information."
        url="/privacy"
        type="website"
        canonicalUrl="/privacy"
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-50 to-white py-14">
        <div className="container max-w-5xl">
          <nav className="text-sm text-gray-500 mb-4">
            <Link to="/" className="hover:text-gray-700">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-700">Privacy Policy</span>
          </nav>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Privacy Policy</h1>
          <p className="text-lg text-gray-600">How we collect, use, and protect your information.</p>
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
                <li><a className="text-gray-600 hover:text-accent" href="#information-we-collect">Information We Collect</a></li>
                <li><a className="text-gray-600 hover:text-accent" href="#how-we-use-info">How We Use Information</a></li>
                <li><a className="text-gray-600 hover:text-accent" href="#data-security">Data Security</a></li>
                <li><a className="text-gray-600 hover:text-accent" href="#your-rights">Your Rights</a></li>
                <li><a className="text-gray-600 hover:text-accent" href="#contact">Contact Us</a></li>
              </ul>
            </div>
          </aside>

          {/* Main */}
          <div className="lg:col-span-3 space-y-8">
            <section id="information-we-collect" className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Information We Collect</h2>
              <p className="text-gray-600">We collect information you provide during checkout or inquiries (name, email, phone, shipping address), and basic usage data for improving our site performance and experience.</p>
            </section>

            <section id="how-we-use-info" className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">How We Use Information</h2>
              <ul className="list-disc pl-5 space-y-2 text-gray-600">
                <li>Process and fulfill orders, including shipping and notifications</li>
                <li>Provide customer support and respond to inquiries</li>
                <li>Improve products, services, and site usability</li>
              </ul>
            </section>

            <section id="data-security" className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Data Security</h2>
              <p className="text-gray-600">We use appropriate technical and organizational measures to protect your information. Payment data is processed by trusted providers and is not stored on our servers.</p>
            </section>

            <section id="your-rights" className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Your Rights</h2>
              <p className="text-gray-600">You may request access, correction, or deletion of your information. To exercise these rights, please contact us.</p>
            </section>

            <section id="contact" className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Contact Us</h2>
              <p className="text-gray-600">Questions about this policy? <Link to="/contact" className="text-accent hover:underline">Contact our support team</Link>.</p>
            </section>
          </div>
        </div>
      </section>
    </main>
  )
}


