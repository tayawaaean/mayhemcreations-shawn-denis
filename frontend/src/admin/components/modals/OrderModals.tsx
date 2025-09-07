import React, { useState } from 'react'
import { X, Package, Truck, CheckCircle, XCircle, Clock, User, Mail, Phone, MapPin } from 'lucide-react'
import { Order } from '../../types'

interface OrderDetailModalProps {
  isOpen: boolean
  onClose: () => void
  order: Order | null
}

interface StatusUpdateModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdate: (orderId: string, newStatus: string) => void
  order: Order | null
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ isOpen, onClose, order }) => {
  if (!isOpen || !order) return null

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />
      case 'processing':
        return <Package className="h-5 w-5 text-blue-600" />
      case 'shipped':
        return <Truck className="h-5 w-5 text-purple-600" />
      case 'delivered':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-600" />
      default:
        return <Clock className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'shipped':
        return 'bg-purple-100 text-purple-800'
      case 'delivered':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm sm:max-w-md md:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Order Details - #{order.id}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-4 sm:p-6 space-y-6 flex-1 overflow-y-auto">
            {/* Order Status */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {getStatusIcon(order.status)}
                  <span className={`ml-2 px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(order.status)}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Order Date</p>
                  <p className="text-sm font-medium text-gray-900">{order.createdAt.toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:p-6">
              {/* Customer Information */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Customer Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <User className="h-4 w-4 text-gray-400 mr-3" />
                    <span className="text-gray-900 font-medium">{order.customer.name}</span>
                  </div>
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 text-gray-400 mr-3" />
                    <span className="text-gray-600">{order.customer.email}</span>
                  </div>
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 text-gray-400 mr-3" />
                    <span className="text-gray-600">{order.customer.phone || 'Not provided'}</span>
                  </div>
                </div>
              </div>

              {/* Shipping Information */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Shipping Address
                </h3>
                <div className="space-y-2">
                  <p className="text-gray-900 font-medium">{order.shippingAddress.name}</p>
                  <p className="text-gray-600">{order.shippingAddress.street}</p>
                  <p className="text-gray-600">
                    {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                  </p>
                  <p className="text-gray-600">{order.shippingAddress.country}</p>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h3>
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center">
                      <img
                        src={item.product.primaryImage}
                        alt={item.product.title}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-900">{item.product.title}</p>
                        <p className="text-sm text-gray-500">SKU: {item.product.sku}</p>
                        <p className="text-sm text-gray-500">Size: {item.size}, Color: {item.color}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">Qty: {item.quantity}</p>
                      <p className="text-sm text-gray-600">${item.price.toFixed(2)} each</p>
                      <p className="text-sm font-semibold text-gray-900">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900">${order.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="text-gray-900">${order.shipping.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax</span>
                  <span className="text-gray-900">${order.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold border-t border-gray-200 pt-2">
                  <span className="text-gray-900">Total</span>
                  <span className="text-gray-900">${order.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 p-4 sm:p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export const StatusUpdateModal: React.FC<StatusUpdateModalProps> = ({ isOpen, onClose, onUpdate, order }) => {
  const [selectedStatus, setSelectedStatus] = useState(order?.status || 'pending')

  React.useEffect(() => {
    if (order) {
      setSelectedStatus(order.status)
    }
  }, [order])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (order) {
      onUpdate(order.id, selectedStatus)
      onClose()
    }
  }

  if (!isOpen || !order) return null

  const statusOptions = [
    { value: 'pending', label: 'Pending', icon: Clock, color: 'text-yellow-600' },
    { value: 'processing', label: 'Processing', icon: Package, color: 'text-blue-600' },
    { value: 'shipped', label: 'Shipped', icon: Truck, color: 'text-purple-600' },
    { value: 'delivered', label: 'Delivered', icon: CheckCircle, color: 'text-green-600' },
    { value: 'cancelled', label: 'Cancelled', icon: XCircle, color: 'text-red-600' }
  ]

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm sm:max-w-md mx-4 flex flex-col">
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Update Order Status</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-6">
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-4">
                Update status for order <span className="font-medium">#{order.id}</span>
              </p>
              
              <div className="space-y-3">
                {statusOptions.map((option) => {
                  const Icon = option.icon
                  return (
                    <label
                      key={option.value}
                      className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedStatus === option.value
                          ? 'border-gray-900 bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="status"
                        value={option.value}
                        checked={selectedStatus === option.value}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="sr-only"
                      />
                      <Icon className={`h-5 w-5 mr-3 ${option.color}`} />
                      <span className="text-sm font-medium text-gray-900">{option.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                Update Status
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
