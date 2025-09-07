import React from 'react'
import { useCart } from '../context/CartContext'
import { products } from '../data/products'

export default function CartDrawer() {
  const { items, update, remove, clear } = useCart()
  const enriched = items.map((it) => ({ ...it, product: products.find((p) => p.id === it.productId)! }))
  const subtotal = enriched.reduce((s, e) => s + e.product.price * e.quantity, 0)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Your Cart</h2>
          {items.length === 0 ? (
            <div className="p-6 border rounded">Cart is empty</div>
          ) : (
            <div className="space-y-4">
              {enriched.map((e) => (
                <div key={e.productId} className="flex items-center gap-4 border rounded p-3">
                  <img src={e.product.image} alt={e.product.alt} className="w-20 h-20 object-cover rounded" />
                  <div className="flex-1">
                    <div className="font-semibold">{e.product.title}</div>
                    <div className="text-sm text-gray-600">${e.product.price.toFixed(2)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" min={1} value={e.quantity} onChange={(ev) => update(e.productId, Number(ev.target.value))} className="w-20 border rounded px-2 py-1" />
                    <button onClick={() => remove(e.productId)} className="btn-base border">Remove</button>
                  </div>
                </div>
              ))}

              <div className="text-right font-bold">Subtotal: ${subtotal.toFixed(2)}</div>

              <div className="flex gap-3 justify-end">
                <button onClick={() => clear()} className="btn-base border">Clear</button>
                <button onClick={() => alert('Checkout stub — integrate payment gateway') } className="btn-base bg-accent text-white">Proceed to Checkout</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
