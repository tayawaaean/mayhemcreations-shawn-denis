import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Package, Truck, CheckCircle, Clock, XCircle, Search, Filter, X } from 'lucide-react'
import Button from '../../components/Button'

interface OrderItem {
  id: string
  productId: string
  productName: string
  productImage: string
  quantity: number
  price: number
  customization?: {
    text: string
    color: string
    position: string
  }
}

interface Order {
  id: string
  orderNumber: string
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  orderDate: string
  estimatedDelivery: string
  total: number
  items: OrderItem[]
  shippingAddress: {
    name: string
    street: string
    city: string
    state: string
    zipCode: string
  }
  trackingNumber?: string
}

// Mock order data
const mockOrders: Order[] = [
  {
    id: '1',
    orderNumber: 'MC-2024-001',
    status: 'delivered',
    orderDate: '2024-01-15',
    estimatedDelivery: '2024-01-22',
    total: 45.99,
    items: [
      {
        id: '1',
        productId: 'tee',
        productName: 'Classic T-Shirt',
        productImage: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop&crop=center',
        quantity: 2,
        price: 19.99,
        customization: {
          text: 'Mayhem Creation',
          color: 'Red',
          position: 'Center Chest'
        }
      }
    ],
    shippingAddress: {
      name: 'John Doe',
      street: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      zipCode: '12345'
    },
    trackingNumber: '1Z999AA1234567890'
  },
  {
    id: '2',
    orderNumber: 'MC-2024-002',
    status: 'shipped',
    orderDate: '2024-01-20',
    estimatedDelivery: '2024-01-27',
    total: 67.50,
    items: [
      {
        id: '2',
        productId: 'hoodie',
        productName: 'Zip Hoodie',
        productImage: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop&crop=center',
        quantity: 1,
        price: 45.00,
        customization: {
          text: 'Custom Design',
          color: 'Blue',
          position: 'Back'
        }
      },
      {
        id: '3',
        productId: 'cap',
        productName: 'Snapback Cap',
        productImage: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&h=400&fit=crop&crop=center',
        quantity: 1,
        price: 22.50,
        customization: {
          text: 'Logo',
          color: 'Black',
          position: 'Front'
        }
      }
    ],
    shippingAddress: {
      name: 'John Doe',
      street: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      zipCode: '12345'
    },
    trackingNumber: '1Z999AA9876543210'
  },
  {
    id: '3',
    orderNumber: 'MC-2024-003',
    status: 'processing',
    orderDate: '2024-01-25',
    estimatedDelivery: '2024-02-01',
    total: 32.99,
    items: [
      {
        id: '4',
        productId: 'polo',
        productName: 'Performance Polo',
        productImage: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400&h=400&fit=crop&crop=center',
        quantity: 1,
        price: 32.99,
        customization: {
          text: 'Company Logo',
          color: 'Navy',
          position: 'Left Chest'
        }
      }
    ],
    shippingAddress: {
      name: 'John Doe',
      street: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      zipCode: '12345'
    }
  },
  {
    id: '4',
    orderNumber: 'MC-2024-004',
    status: 'pending',
    orderDate: '2024-01-28',
    estimatedDelivery: '2024-02-05',
    total: 28.50,
    items: [
      {
        id: '5',
        productId: 'cap',
        productName: 'Trucker Cap',
        productImage: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&h=400&fit=crop&crop=center',
        quantity: 1,
        price: 28.50,
        customization: {
          text: 'Custom Logo',
          color: 'Black',
          position: 'Front'
        }
      }
    ],
    shippingAddress: {
      name: 'John Doe',
      street: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      zipCode: '12345'
    }
  }
]

const getStatusIcon = (status: Order['status']) => {
  switch (status) {
    case 'pending':
      return <Clock className="w-5 h-5 text-yellow-500" />
    case 'processing':
      return <Package className="w-5 h-5 text-blue-500" />
    case 'shipped':
      return <Truck className="w-5 h-5 text-purple-500" />
    case 'delivered':
      return <CheckCircle className="w-5 h-5 text-green-500" />
    case 'cancelled':
      return <XCircle className="w-5 h-5 text-red-500" />
    default:
      return <Clock className="w-5 h-5 text-gray-500" />
  }
}

const getStatusText = (status: Order['status']) => {
  switch (status) {
    case 'pending':
      return 'Pending'
    case 'processing':
      return 'Processing'
    case 'shipped':
      return 'Shipped'
    case 'delivered':
      return 'Delivered'
    case 'cancelled':
      return 'Cancelled'
    default:
      return 'Unknown'
  }
}

const getStatusColor = (status: Order['status']) => {
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

export default function MyOrders() {
  const { user, isLoggedIn } = useAuth()
  const [orders, setOrders] = useState<Order[]>(mockOrders)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order)
    setShowOrderDetails(true)
  }

  const handleLeaveReview = (order: Order) => {
    setSelectedOrder(order)
    setShowReviewForm(true)
  }

  const handleCancelOrder = (order: Order) => {
    setSelectedOrder(order)
    setShowCancelModal(true)
  }

  const confirmCancelOrder = () => {
    if (selectedOrder) {
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === selectedOrder.id 
            ? { ...order, status: 'cancelled' as const }
            : order
        )
      )
      setShowCancelModal(false)
      setSelectedOrder(null)
    }
  }

  const handleCloseModal = () => {
    setShowOrderDetails(false)
    setShowReviewForm(false)
    setShowCancelModal(false)
    setSelectedOrder(null)
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h2 className="mt-2 text-2xl font-bold text-gray-900">Please log in to view your orders</h2>
          <p className="mt-1 text-sm text-gray-500">
            You need to be logged in to access your order history.
          </p>
        </div>
      </div>
    )
  }

  const filteredOrders = orders
    .filter(order => {
      const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           order.items.some(item => item.productName.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
      } else {
        return new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime()
      }
    })

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Orders</h1>
        <p className="text-gray-600">Track and manage your orders</p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
        <div className="flex-1 max-w-lg">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-accent focus:border-accent"
            />
          </div>
        </div>

        <div className="flex space-x-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-accent focus:border-accent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-accent focus:border-accent"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-6">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">No orders found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : "You haven't placed any orders yet."
              }
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div key={order.id} className="bg-white border border-gray-200 rounded-lg shadow-sm">
              {/* Order Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(order.status)}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Order #{order.orderNumber}</p>
                      <p className="text-sm text-gray-500">Placed on {new Date(order.orderDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900">${order.total.toFixed(2)}</p>
                    {order.trackingNumber && (
                      <p className="text-sm text-gray-500">Tracking: {order.trackingNumber}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="px-6 py-4">
                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center space-x-4">
                      <img
                        src={item.productImage}
                        alt={item.productName}
                        className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://via.placeholder.com/400x400/f3f4f6/9ca3af?text=No+Image';
                        }}
                      />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">{item.productName}</h4>
                        <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                        {item.customization && (
                          <div className="mt-1 text-xs text-gray-600">
                            <p>Custom: {item.customization.text}</p>
                            <p>Color: {item.customization.color} | Position: {item.customization.position}</p>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Actions */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    <p>Estimated delivery: {new Date(order.estimatedDelivery).toLocaleDateString()}</p>
                    <p>Shipping to: {order.shippingAddress.city}, {order.shippingAddress.state}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewDetails(order)}
                    >
                      View Details
                    </Button>
                    {order.status === 'delivered' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleLeaveReview(order)}
                      >
                        Leave Review
                      </Button>
                    )}
                    {order.status === 'pending' && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleCancelOrder(order)}
                      >
                        Cancel Order
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Order Details</h2>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Order Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Order Number</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedOrder.orderNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Order Date</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {new Date(selectedOrder.orderDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Status</p>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(selectedOrder.status)}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.status)}`}>
                          {getStatusText(selectedOrder.status)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total</p>
                      <p className="text-lg font-semibold text-gray-900">${selectedOrder.total.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* Shipping Address */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Shipping Address</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="font-medium text-gray-900">{selectedOrder.shippingAddress.name}</p>
                    <p className="text-gray-700">{selectedOrder.shippingAddress.street}</p>
                    <p className="text-gray-700">
                      {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.zipCode}
                    </p>
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Order Items</h3>
                  <div className="space-y-4">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'https://via.placeholder.com/400x400/f3f4f6/9ca3af?text=No+Image';
                          }}
                        />
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{item.productName}</h4>
                          <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                          <p className="text-sm text-gray-500">Price: ${item.price.toFixed(2)} each</p>
                          {item.customization && (
                            <div className="mt-2 text-sm text-gray-600">
                              <p><strong>Customization:</strong> {item.customization.text}</p>
                              <p><strong>Color:</strong> {item.customization.color}</p>
                              <p><strong>Position:</strong> {item.customization.position}</p>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">${(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tracking Info */}
                {selectedOrder.trackingNumber && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Tracking Information</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm font-medium text-gray-500">Tracking Number</p>
                      <p className="text-lg font-mono text-gray-900">{selectedOrder.trackingNumber}</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Estimated delivery: {new Date(selectedOrder.estimatedDelivery).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <Button onClick={handleCloseModal}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Form Modal */}
      {showReviewForm && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Leave a Review</h2>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-gray-600">
                  Review your order: <strong>{selectedOrder.orderNumber}</strong>
                </p>
                
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                    <img
                      src={item.productImage}
                      alt={item.productName}
                      className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/demo-images/placeholder.txt';
                      }}
                    />
                    <div>
                      <p className="font-medium text-gray-900">{item.productName}</p>
                      <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                    </div>
                  </div>
                ))}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                    <div className="flex space-x-1">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          className="text-2xl hover:text-yellow-400 transition-colors"
                        >
                          ⭐
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Review Title</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-accent focus:border-accent"
                      placeholder="Summarize your experience"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Your Review</label>
                    <textarea
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-accent focus:border-accent"
                      placeholder="Tell us about your experience with this product..."
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex space-x-3">
                <Button variant="outline" onClick={handleCloseModal} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    alert('Review submitted successfully! Thank you for your feedback.')
                    handleCloseModal()
                  }}
                  className="flex-1"
                >
                  Submit Review
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Confirmation Modal */}
      {showCancelModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Cancel Order</h2>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <img
                    src={selectedOrder.items[0]?.productImage}
                    alt={selectedOrder.items[0]?.productName}
                    className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/demo-images/placeholder.txt';
                    }}
                  />
                  <div>
                    <p className="font-medium text-gray-900">Order #{selectedOrder.orderNumber}</p>
                    <p className="text-sm text-gray-500">
                      {selectedOrder.items.length} item{selectedOrder.items.length !== 1 ? 's' : ''} • ${selectedOrder.total.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <XCircle className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">
                        Are you sure you want to cancel this order?
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>This action cannot be undone. Once cancelled, you'll need to place a new order if you change your mind.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-sm text-gray-600">
                  <p><strong>Order Date:</strong> {new Date(selectedOrder.orderDate).toLocaleDateString()}</p>
                  <p><strong>Estimated Delivery:</strong> {new Date(selectedOrder.estimatedDelivery).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="mt-6 flex space-x-3">
                <Button 
                  variant="outline" 
                  onClick={handleCloseModal} 
                  className="flex-1"
                >
                  Keep Order
                </Button>
                <Button 
                  onClick={confirmCancelOrder}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  Yes, Cancel Order
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
