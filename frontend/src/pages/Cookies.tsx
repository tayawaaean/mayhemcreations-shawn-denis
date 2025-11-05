import React from 'react'
import { Link } from 'react-router-dom'
import SEO from '../components/SEO'

export default function Cookies() {
  return (
    <main className="min-h-screen bg-white">
      <SEO
        title="Cookie Policy - Mayhem Creations"
        description="Understand how Mayhem Creations uses cookies and similar technologies."
        url="/cookies"
        type="website"
        canonicalUrl="/cookies"
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-50 to-white py-14">
        <div className="container max-w-5xl">
          <nav className="text-sm text-gray-500 mb-4">
            <Link to="/" className="hover:text-gray-700">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-700">Cookie Policy</span>
          </nav>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Cookie Policy</h1>
          <p className="text-lg text-gray-600">How and why we use cookies and similar technologies.</p>
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
                <li><a className="text-gray-600 hover:text-accent" href="#what-are-cookies">What Are Cookies</a></li>
                <li><a className="text-gray-600 hover:text-accent" href="#how-we-use">How We Use Cookies</a></li>
                <li><a className="text-gray-600 hover:text-accent" href="#managing">Managing Cookies</a></li>
                <li><a className="text-gray-600 hover:text-accent" href="#contact">Contact</a></li>
              </ul>
            </div>
          </aside>

          {/* Main */}
          <div className="lg:col-span-3 space-y-8">
            <section id="what-are-cookies" className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">What Are Cookies</h2>
              <p className="text-gray-600">Cookies are small text files stored on your device. They help websites remember preferences, maintain sessions, and understand usage patterns.</p>
            </section>

            <section id="how-we-use" className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">How We Use Cookies</h2>
              <ul className="list-disc pl-5 space-y-2 text-gray-600">
                <li>Essential cookies for site functionality (e.g., cart, authentication)</li>
                <li>Performance cookies to analyze usage and improve experience</li>
                <li>Preference cookies to remember choices like language</li>
              </ul>
            </section>

            <section id="managing" className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Managing Cookies</h2>
              <p className="text-gray-600">You can control cookies via your browser settings. Disabling cookies may limit certain features such as keeping items in your cart or staying signed in.</p>
            </section>

            <section id="contact" className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Contact</h2>
              <p className="text-gray-600">Questions about this policy? <Link to="/contact" className="text-accent hover:underline">Contact our support team</Link>.</p>
            </section>
          </div>
        </div>
      </section>
    </main>
  )
}


