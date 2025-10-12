import React, { useState } from 'react'
import { X, Package, Truck, CheckCircle, XCircle, Clock, User, Mail, Phone, MapPin, CreditCard, DollarSign, AlertCircle, FileText } from 'lucide-react'
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

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-600" />
      case 'refunded':
        return <DollarSign className="h-4 w-4 text-orange-600" />
      case 'partially_refunded':
        return <DollarSign className="h-4 w-4 text-orange-600" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'refunded':
        return 'bg-orange-100 text-orange-800'
      case 'partially_refunded':
        return 'bg-orange-100 text-orange-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPaymentMethodIcon = (provider: string) => {
    switch (provider) {
      case 'stripe':
        return <CreditCard className="h-4 w-4" />
      case 'paypal':
        return <span className="text-blue-600 font-bold text-xs">PP</span>
      case 'google_pay':
        return <span className="text-gray-900 font-bold text-xs">G</span>
      case 'apple_pay':
        return <span className="text-gray-900 font-bold text-xs">A</span>
      default:
        return <CreditCard className="h-4 w-4" />
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

            {/* Customer Notes - Prioritized Section for Design Placement Instructions */}
            {(() => {
              // Collect all notes from order items - handling both multi-design and single-design structures
              const allNotes: Array<{ note: string; product: string; designName?: string }> = [];
              
              order.items.forEach((item: any, itemIndex: number) => {
                const customization = item.customization || {};
                const productTitle = item.productName || item.product?.title || item.productSnapshot?.title || `Item ${itemIndex + 1}`;
                
                // Handle multi-design structure (new format with designs array)
                if (customization.designs && Array.isArray(customization.designs)) {
                  customization.designs.forEach((design: any) => {
                    if (design.notes && design.notes.trim().length > 0) {
                      allNotes.push({
                        note: design.notes,
                        product: productTitle,
                        designName: design.name || 'Design'
                      });
                    }
                  });
                }
                
                // Handle single-design structure (legacy format)
                else if (customization.notes && customization.notes.trim().length > 0) {
                  allNotes.push({
                    note: customization.notes,
                    product: productTitle
                  });
                }
              });

              // Combine with order-level notes
              const orderNotes = order.notes && order.notes.length > 0 ? order.notes : [];
              const hasAnyNotes = allNotes.length > 0 || orderNotes.length > 0;

              // Only render the section if there are notes
              return hasAnyNotes ? (
                <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 shadow-sm">
                  <h3 className="text-lg font-bold text-blue-900 mb-3 flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-blue-700" />
                    Customer Instructions & Design Placement Notes
                  </h3>
                  <p className="text-sm text-blue-700 mb-3 font-medium">
                    Customer-provided instructions for design placement and customization
                  </p>
                  <div className="space-y-3">
                    {/* Display item-specific customization notes with product and design context */}
                    {allNotes.map((noteData: any, index: number) => (
                      <div key={`custom-${index}`} className="bg-white border border-blue-200 rounded-md p-3 shadow-sm">
                        <div className="flex items-start space-x-2 mb-2">
                          <FileText className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-blue-800 mb-0.5">{noteData.product}</p>
                            {noteData.designName && (
                              <p className="text-xs text-blue-600 mb-1">{noteData.designName}</p>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-900 font-medium bg-gray-50 p-2 rounded border border-gray-200">
                          {noteData.note}
                        </p>
                      </div>
                    ))}
                    {/* Display order-level notes */}
                    {orderNotes.map((note: string, index: number) => (
                      <div key={`order-${index}`} className="bg-white border border-blue-200 rounded-md p-3 shadow-sm">
                        <div className="flex items-start space-x-2 mb-2">
                          <FileText className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <p className="text-xs font-semibold text-blue-800">Order Note</p>
                        </div>
                        <p className="text-sm text-gray-900 font-medium bg-gray-50 p-2 rounded border border-gray-200">{note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Payment Information */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Payment Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Payment Method</p>
                  <div className="flex items-center space-x-2 mt-1">
                    {getPaymentMethodIcon(order.paymentProvider)}
                    <span className="text-sm font-medium text-gray-900">{order.paymentMethod}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payment Status</p>
                  <div className="flex items-center mt-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${getPaymentStatusColor(order.paymentStatus)}`}>
                      {getPaymentStatusIcon(order.paymentStatus)}
                      <span className="ml-1">{order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}</span>
                    </span>
                  </div>
                </div>
                {order.paymentDetails?.cardLast4 && (
                  <div>
                    <p className="text-sm text-gray-500">Card Details</p>
                    <p className="text-sm font-medium text-gray-900">****{order.paymentDetails.cardLast4}</p>
                  </div>
                )}
                {order.paymentDetails?.transactionId && (
                  <div>
                    <p className="text-sm text-gray-500">Transaction ID</p>
                    <p className="text-sm font-medium text-gray-900 font-mono">{order.paymentDetails.transactionId}</p>
                  </div>
                )}
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
                  <p className="text-gray-900 font-medium">{order.customer.name}</p>
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
                {order.items.map((item: any, index: number) => {
                  // Access product info from the nested structure
                  const product = item.product || item.productSnapshot || {};
                  const customization = item.customization || {};
                  const selectedVariant = customization.selectedVariant || {};
                  const productImage = product.image || product.primaryImage || '';
                  const productTitle = item.productName || product.title || 'Product';
                  
                  return (
                    <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                      <div className="flex items-center">
                        {productImage && (
                          <img
                            src={productImage}
                            alt={productTitle}
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                        )}
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-900">{productTitle}</p>
                          {selectedVariant.color && (
                            <p className="text-sm text-gray-500">
                              Color: {selectedVariant.color}
                              {selectedVariant.size && `, Size: ${selectedVariant.size}`}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">Qty: {item.quantity}</p>
                        <p className="text-sm text-gray-600">${Number(item.price || 0).toFixed(2)} each</p>
                        <p className="text-sm font-semibold text-gray-900">
                          ${(Number(item.price || 0) * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900">${order.total.toFixed(2)}</span>
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
