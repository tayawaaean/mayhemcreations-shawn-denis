import React from 'react'
import { useParams } from 'react-router-dom'
import { products } from '../data/products'
import Button from '../components/Button'
import { ArrowRight, Truck } from 'lucide-react'

export default function ProductPage() {
  const { id } = useParams()
  const product = products.find((p) => p.id === id)

  if (!product) return <div className="p-6">Product not found</div>
  
  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div>
          <img src={product.image} alt={product.alt} className="w-full h-96 lg:h-[500px] object-cover rounded-lg shadow-lg" />
        </div>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">{product.title}</h1>
            <p className="text-lg text-gray-600 leading-relaxed">{product.description}</p>
          </div>
          
          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-bold text-gray-900">${product.price.toFixed(2)}</div>
            <div className="flex items-center text-sm text-gray-500">
              <Truck className="w-4 h-4 mr-1" />
              Free shipping
            </div>
          </div>

          <div className="pt-4 space-y-3">
            <Button
              variant="add-to-cart"
              size="lg"
              className="w-full"
              onClick={() => window.location.href = `/customize/${product.id}`}
            >
              Start Customizing
            </Button>
            <Button
              variant="outline"
              size="lg"
              icon={<ArrowRight className="w-4 h-4" />}
              iconPosition="right"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="w-full"
            >
              Contact us
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}