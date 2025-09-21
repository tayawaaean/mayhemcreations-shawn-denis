import React from 'react'
import { Link } from 'react-router-dom'
import { Facebook, Instagram, Phone, MapPin, ExternalLink } from 'lucide-react'

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

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <div>
                <div className="font-bold text-xl">Mayhem Creation</div>
                <div className="text-sm text-gray-400">Custom Embroidery</div>
              </div>
            </div>
            <p className="text-gray-400 text-sm">
              Crafting quality custom embroidery since 2018. We bring your vision to life with professional-grade equipment and exceptional attention to detail.
            </p>
            <div className="flex space-x-4">
              <a href="https://etsy.com/shop/MayhemCreationLLC" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-accent transition-colors">
                <EtsyIcon className="w-5 h-5" />
              </a>
              <a href="https://tiktok.com/@Mayhem_Creation" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-accent transition-colors">
                <TikTokIcon className="w-5 h-5" />
              </a>
              <a href="https://facebook.com/MayhemCreationLLC" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-accent transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="https://instagram.com/Mayhem_Creaton" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-accent transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link to="/products" className="text-gray-400 hover:text-accent transition-colors">All Products</Link></li>
              <li><Link to="/about" className="text-gray-400 hover:text-accent transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="text-gray-400 hover:text-accent transition-colors">Contact</Link></li>
              <li><Link to="/faq" className="text-gray-400 hover:text-accent transition-colors">FAQ</Link></li>
            </ul>
          </div>

          {/* Customer Service */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Customer Service</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-accent transition-colors">Shipping Info</a></li>
              <li><a href="#" className="text-gray-400 hover:text-accent transition-colors">Returns & Exchanges</a></li>
              <li><a href="#" className="text-gray-400 hover:text-accent transition-colors">Size Guide</a></li>
              <li><a href="#" className="text-gray-400 hover:text-accent transition-colors">Care Instructions</a></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Contact Info</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Phone className="w-4 h-4 text-accent" />
                <span className="text-gray-400 text-sm">614-715-4742</span>
              </div>
              <div className="flex items-start space-x-3">
                <MapPin className="w-4 h-4 text-accent mt-1" />
                <span className="text-gray-400 text-sm">128 Persimmon Dr<br />Newark, OH 43055</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <EtsyIcon className="w-4 h-4 text-accent" />
                  <a href="https://etsy.com/shop/MayhemCreationLLC" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-accent transition-colors text-sm">@MayhemCreationLLC</a>
                </div>
                <div className="flex items-center space-x-3">
                  <TikTokIcon className="w-4 h-4 text-accent" />
                  <a href="https://tiktok.com/@Mayhem_Creation" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-accent transition-colors text-sm">@Mayhem_Creation</a>
                </div>
                <div className="flex items-center space-x-3">
                  <Facebook className="w-4 h-4 text-accent" />
                  <a href="https://facebook.com/MayhemCreationLLC" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-accent transition-colors text-sm">@MayhemCreationLLC</a>
                </div>
                <div className="flex items-center space-x-3">
                  <Instagram className="w-4 h-4 text-accent" />
                  <a href="https://instagram.com/Mayhem_Creaton" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-accent transition-colors text-sm">@Mayhem_Creaton</a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-gray-400 text-sm">
              © {new Date().getFullYear()} Mayhem Creation. All rights reserved.
            </div>
            <div className="flex space-x-6 text-sm">
              <a href="#" className="text-gray-400 hover:text-accent transition-colors">Privacy Policy</a>
              <a href="#" className="text-gray-400 hover:text-accent transition-colors">Terms of Service</a>
              <a href="#" className="text-gray-400 hover:text-accent transition-colors">Cookie Policy</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}