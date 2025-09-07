import React, { useState } from 'react'
import { X, User, Mail, Phone, MapPin, ShoppingBag, DollarSign, Calendar, Edit } from 'lucide-react'
import { Customer } from '../../types'

interface CustomerDetailModalProps {
  isOpen: boolean
  onClose: () => void
  customer: Customer | null
}

interface EditCustomerModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (customer: Customer) => void
  customer: Customer | null
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({ isOpen, onClose, customer }) => {
  if (!isOpen || !customer) return null

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm sm:max-w-md md:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Customer Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-4 sm:p-6 space-y-6 flex-1 overflow-y-auto">
            {/* Customer Header */}
            <div className="flex items-start space-x-6">
              <div className="flex-shrink-0">
                {customer.avatar ? (
                  <img
                    src={customer.avatar}
                    alt={customer.name}
                    className="h-20 w-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-20 w-20 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 font-medium text-2xl">
                      {customer.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900">{customer.name}</h3>
                <p className="text-gray-600">Customer ID: {customer.id}</p>
                <div className="mt-2">
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                    customer.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {customer.status.charAt(0).toUpperCase() + customer.status.slice(1)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Member since</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(customer.createdAt)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:p-6">
              {/* Contact Information */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Contact Information
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <Mail className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="text-gray-900 font-medium">{customer.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="text-gray-900 font-medium">{customer.phone || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Address
                </h4>
                <div className="space-y-2">
                  <p className="text-gray-900 font-medium">{customer.address.street}</p>
                  <p className="text-gray-600">
                    {customer.address.city}, {customer.address.state} {customer.address.zipCode}
                  </p>
                  <p className="text-gray-600">{customer.address.country}</p>
                </div>
              </div>
            </div>

            {/* Order Statistics */}
            <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Order Statistics</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:p-6">
                <div className="text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-2">
                    <ShoppingBag className="h-6 w-6 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{customer.orders.length}</p>
                  <p className="text-sm text-gray-500">Total Orders</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mx-auto mb-2">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">${customer.totalSpent.toFixed(2)}</p>
                  <p className="text-sm text-gray-500">Total Spent</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-2">
                    <Calendar className="h-6 w-6 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {customer.lastOrderDate ? formatDate(customer.lastOrderDate) : 'Never'}
                  </p>
                  <p className="text-sm text-gray-500">Last Order</p>
                </div>
              </div>
            </div>

            {/* Recent Orders */}
            {customer.orders.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Recent Orders</h4>
                <div className="space-y-3">
                  {customer.orders.slice(0, 5).map((order, index) => (
                    <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Order #{order.id}</p>
                        <p className="text-sm text-gray-500">{order.items.length} items</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">${order.total.toFixed(2)}</p>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                          order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                          order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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

export const EditCustomerModal: React.FC<EditCustomerModalProps> = ({ isOpen, onClose, onSave, customer }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    status: 'active' as 'active' | 'inactive'
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  React.useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        email: customer.email,
        phone: customer.phone || '',
        address: customer.address,
        status: customer.status
      })
    }
  }, [customer])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) newErrors.name = 'Name is required'
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }
    if (!formData.address.street.trim()) newErrors.street = 'Street address is required'
    if (!formData.address.city.trim()) newErrors.city = 'City is required'
    if (!formData.address.state.trim()) newErrors.state = 'State is required'
    if (!formData.address.zipCode.trim()) newErrors.zipCode = 'ZIP code is required'
    if (!formData.address.country.trim()) newErrors.country = 'Country is required'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm() && customer) {
      onSave({
        ...customer,
        ...formData,
        updatedAt: new Date()
      })
      onClose()
    }
  }

  if (!isOpen || !customer) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Edit Customer</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6 flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:p-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter full name"
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter email address"
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Address Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    value={formData.address.street}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      address: { ...formData.address, street: e.target.value }
                    })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 ${
                      errors.street ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter street address"
                  />
                  {errors.street && <p className="mt-1 text-sm text-red-600">{errors.street}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    value={formData.address.city}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      address: { ...formData.address, city: e.target.value }
                    })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 ${
                      errors.city ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter city"
                  />
                  {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State *
                  </label>
                  <input
                    type="text"
                    value={formData.address.state}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      address: { ...formData.address, state: e.target.value }
                    })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 ${
                      errors.state ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter state"
                  />
                  {errors.state && <p className="mt-1 text-sm text-red-600">{errors.state}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ZIP Code *
                  </label>
                  <input
                    type="text"
                    value={formData.address.zipCode}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      address: { ...formData.address, zipCode: e.target.value }
                    })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 ${
                      errors.zipCode ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter ZIP code"
                  />
                  {errors.zipCode && <p className="mt-1 text-sm text-red-600">{errors.zipCode}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country *
                  </label>
                  <input
                    type="text"
                    value={formData.address.country}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      address: { ...formData.address, country: e.target.value }
                    })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 ${
                      errors.country ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter country"
                  />
                  {errors.country && <p className="mt-1 text-sm text-red-600">{errors.country}</p>}
                </div>
              </div>
            </div>

          </form>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              className="px-6 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
