import React, { useState, useEffect } from 'react'
import { useAdmin } from '../context/AdminContext'
import { 
  Search, 
  Filter, 
  Eye, 
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  CreditCard,
  AlertCircle,
  RefreshCw,
  Download
} from 'lucide-react'
import { PaymentLog } from '../types/paymentLogs'
import { adminPaymentApiService } from '../../shared/adminPaymentApiService'
import HelpModal from '../components/modals/HelpModal'
import { PaymentConfirmationModal, RefundModal } from '../components/modals/PaymentModals'
import { formatDateOnly } from '../../utils/dateFormatter'

const PaymentManagement: React.FC = () => {
  const { state, dispatch } = useAdmin()
  const { orders } = state
  const [payments, setPayments] = useState<PaymentLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedProvider, setSelectedProvider] = useState('all')
  const [selectedPayments, setSelectedPayments] = useState<string[]>([])
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false)
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<PaymentLog | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 10
  const [isHelpOpen, setIsHelpOpen] = useState(false)

  // Fetch payments data
  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await adminPaymentApiService.getPayments({
          page: currentPage,
          limit: itemsPerPage,
          status: selectedStatus !== 'all' ? selectedStatus : undefined,
          provider: selectedProvider !== 'all' ? selectedProvider : undefined
        })

        if (response.success && response.data) {
          const transformedPayments = response.data.payments.map(payment => 
            adminPaymentApiService.transformPaymentData(payment)
          )
          setPayments(transformedPayments)
          setTotalPages(response.data.pagination.totalPages)
        } else {
          setError(response.error || 'Failed to fetch payments')
        }
      } catch (err) {
        setError('Failed to fetch payments')
        console.error('Error fetching payments:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPayments()
  }, [currentPage, selectedStatus, selectedProvider])

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         payment.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         payment.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         payment.transactionId.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesSearch
  })

  // Pagination logic
  const totalItems = filteredPayments.length
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedPayments = filteredPayments.slice(startIndex, endIndex)

  // Refresh payments
  const refreshPayments = () => {
    setCurrentPage(1)
    // The useEffect will trigger and fetch fresh data
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleSelectPayment = (paymentId: string) => {
    setSelectedPayments(prev => 
      prev.includes(paymentId) 
        ? prev.filter(id => id !== paymentId)
        : [...prev, paymentId]
    )
  }

  const handleSelectAll = () => {
    if (selectedPayments.length === filteredPayments.length) {
      setSelectedPayments([])
    } else {
      setSelectedPayments(filteredPayments.map(p => p.id))
    }
  }

  const handleConfirmPayment = (payment: PaymentLog) => {
    setSelectedPayment(payment)
    setIsConfirmationModalOpen(true)
  }

  const handleRefundPayment = (payment: PaymentLog) => {
    setSelectedPayment(payment)
    setIsRefundModalOpen(true)
  }

  const confirmPayment = (paymentId: string) => {
    setPayments(prevPayments => 
      prevPayments.map(payment => 
        payment.id === paymentId 
          ? { ...payment, status: 'completed', processedAt: new Date().toISOString() }
          : payment
      )
    )

    // Update corresponding order status to processing
    const payment = payments.find(p => p.id === paymentId)
    if (payment) {
      const order = orders.find(o => o.id === payment.orderId)
      if (order) {
        const updatedOrder = { ...order, status: 'processing' as any, updatedAt: new Date() }
        dispatch({ type: 'UPDATE_ORDER', payload: updatedOrder })
      }
    }

    setIsConfirmationModalOpen(false)
    setSelectedPayment(null)
  }

  const processRefund = (paymentId: string, refundAmount: number, reason: string) => {
    setPayments(prevPayments => 
      prevPayments.map(payment => 
        payment.id === paymentId 
          ? { 
              ...payment, 
              status: 'refunded', 
              refundedAt: new Date().toISOString(),
              refundAmount: refundAmount,
              refunds: [...(payment.refunds || []), {
                id: `refund_${Date.now()}`,
                paymentId: paymentId,
                amount: refundAmount,
                reason: reason,
                status: 'completed',
                createdAt: new Date().toISOString(),
                processedAt: new Date().toISOString()
              }]
            }
          : payment
      )
    )

    // Update corresponding order status to cancelled
    const payment = payments.find(p => p.id === paymentId)
    if (payment) {
      const order = orders.find(o => o.id === payment.orderId)
      if (order) {
        const updatedOrder = { ...order, status: 'cancelled' as any, updatedAt: new Date() }
        dispatch({ type: 'UPDATE_ORDER', payload: updatedOrder })
      }
    }

    setIsRefundModalOpen(false)
    setSelectedPayment(null)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-600" />
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

  const getStatusColor = (status: string) => {
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

  const getProviderIcon = (provider: string) => {
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

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'processing', label: 'Processing' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
    { value: 'refunded', label: 'Refunded' },
    { value: 'cancelled', label: 'Cancelled' }
  ]

  const providerOptions = [
    { value: 'all', label: 'All Providers' },
    { value: 'stripe', label: 'Stripe' },
    { value: 'paypal', label: 'PayPal' },
    { value: 'google_pay', label: 'Google Pay' },
    { value: 'apple_pay', label: 'Apple Pay' }
  ]

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payment Management</h1>
          <p className="mt-2 text-gray-600">
            Manage payments, confirm transactions, and handle refunds
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsHelpOpen(true)}
            className="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            <span className="hidden sm:inline">How to use</span>
            <span className="sm:hidden">?</span>
          </button>
        </div>
      </div>

      {/* Loading and Error States */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
            <span className="text-gray-600">Loading payments...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
            <button
              onClick={refreshPayments}
              className="ml-auto text-red-600 hover:text-red-800 underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">
                {payments.filter(p => p.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">
                {payments.filter(p => p.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-gray-900">
                {payments.filter(p => p.status === 'failed').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Refunded</p>
              <p className="text-2xl font-bold text-gray-900">
                {payments.filter(p => p.status === 'refunded').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and search */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search payments, customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-3 py-2 border border-gray-300 rounded-md w-full focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              {providerOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 flex items-center justify-center">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </button>
          </div>
        </div>
      </div>

      {/* Bulk actions */}
      {selectedPayments.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">
              {selectedPayments.length} payment{selectedPayments.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex space-x-2">
              <button className="text-sm text-blue-700 hover:text-blue-800">Bulk Confirm</button>
              <button className="text-sm text-blue-700 hover:text-blue-800">Export</button>
            </div>
          </div>
        </div>
      )}

      {/* Payments table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 hidden lg:table">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedPayments.length === filteredPayments.length && filteredPayments.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transaction
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedPayments.includes(payment.id)}
                      onChange={() => handleSelectPayment(payment.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">#{payment.orderNumber}</div>
                    <div className="text-sm text-gray-500 font-mono">{payment.transactionId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 font-medium text-sm">
                          {payment.customerName.charAt(0)}
                        </span>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{payment.customerName}</div>
                        <div className="text-sm text-gray-500">{payment.customerEmail}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${Number(payment.amount).toFixed(2)}
                    {payment.refundAmount && (
                      <div className="text-xs text-red-600">
                        Refunded: ${Number(payment.refundAmount).toFixed(2)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getProviderIcon(payment.provider)}
                      <span className="text-sm text-gray-900 capitalize">{payment.provider.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(payment.status)}`}>
                        {getStatusIcon(payment.status)}
                        <span className="ml-1">{payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateOnly(payment.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button 
                        onClick={() => handleConfirmPayment(payment)}
                        disabled={payment.status === 'completed' || payment.status === 'refunded'}
                        className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Confirm Payment"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleRefundPayment(payment)}
                        disabled={payment.status !== 'completed'}
                        className="text-orange-600 hover:text-orange-900 p-1 rounded hover:bg-orange-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Process Refund"
                      >
                        <DollarSign className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile Card Layout */}
          <div className="lg:hidden">
            {paginatedPayments.map((payment) => (
              <div key={payment.id} className="bg-white border-b border-gray-200 p-4 last:border-b-0">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedPayments.includes(payment.id)}
                    onChange={() => handleSelectPayment(payment.id)}
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900">#{payment.orderNumber}</h3>
                        <p className="text-sm text-gray-500 truncate">{payment.customerName}</p>
                        <p className="text-xs text-gray-400 mt-1 font-mono">{payment.transactionId}</p>
                      </div>
                      <div className="flex items-center space-x-2 ml-2">
                        <button
                          onClick={() => handleConfirmPayment(payment)}
                          disabled={payment.status === 'completed' || payment.status === 'refunded'}
                          className="text-green-600 hover:text-green-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleRefundPayment(payment)}
                          disabled={payment.status !== 'completed'}
                          className="text-orange-600 hover:text-orange-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <DollarSign className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Amount</p>
                        <p className="text-sm font-medium text-gray-900">${Number(payment.amount).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Provider</p>
                        <div className="flex items-center space-x-1">
                          {getProviderIcon(payment.provider)}
                          <p className="text-sm text-gray-900 capitalize">{payment.provider.replace('_', ' ')}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Status</p>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                          {payment.status}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Date</p>
                        <p className="text-sm text-gray-900">{formatDateOnly(payment.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(endIndex, totalItems)}</span> of{' '}
                <span className="font-medium">{totalItems}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button 
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      page === currentPage
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button 
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <PaymentConfirmationModal
        isOpen={isConfirmationModalOpen}
        onClose={() => {
          setIsConfirmationModalOpen(false)
          setSelectedPayment(null)
        }}
        onConfirm={confirmPayment}
        payment={selectedPayment}
      />

      <RefundModal
        isOpen={isRefundModalOpen}
        onClose={() => {
          setIsRefundModalOpen(false)
          setSelectedPayment(null)
        }}
        onRefund={processRefund}
        payment={selectedPayment}
      />

      {/* Help Modal */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} title="How to use: Payment Management">
        <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
          <li>Search by order number, customer name, email, or transaction ID.</li>
          <li>Filter by Status and Provider to narrow results.</li>
          <li>Click the checkmark to confirm pending payments (updates order to processing).</li>
          <li>Click the dollar sign to process refunds for completed payments.</li>
          <li>Use bulk actions to process multiple payments at once.</li>
        </ol>
      </HelpModal>
        </>
      )}
    </div>
  )
}

export default PaymentManagement
