import React, { useState, useEffect } from 'react'
import { Search, Filter, Download, CheckCircle, XCircle, Clock, RotateCcw, Eye, User, Calendar, DollarSign, AlertCircle, RefreshCw, Package } from 'lucide-react'
import { RefundApiService, RefundRequest, RefundStats } from '../../shared/refundApiService'

const RefundManagement: React.FC = () => {
  // State management
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([])
  const [filteredRequests, setFilteredRequests] = useState<RefundRequest[]>([])
  const [stats, setStats] = useState<RefundStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  
  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  
  // Modal state
  const [selectedRequest, setSelectedRequest] = useState<RefundRequest | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [manualCaptureId, setManualCaptureId] = useState('')
  const [showManualInput, setShowManualInput] = useState(false)

  // Fetch refunds on component mount and when filters change
  useEffect(() => {
    fetchRefunds()
    fetchStats()
  }, [])

  // Filter requests locally whenever search or status filter changes
  useEffect(() => {
    filterRequests()
  }, [refundRequests, searchTerm, statusFilter])

  /**
   * Fetch all refunds from API
   */
  const fetchRefunds = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await RefundApiService.getAllRefunds({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchTerm || undefined,
        limit: 100 // Get more results
      })

      if (response.success) {
        setRefundRequests(response.data)
      } else {
        setError(response.message || 'Failed to load refunds')
      }
    } catch (err: any) {
      console.error('Error fetching refunds:', err)
      setError(err.message || 'Failed to load refund requests')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Fetch refund statistics
   */
  const fetchStats = async () => {
    try {
      const response = await RefundApiService.getRefundStats()
      if (response.success) {
        setStats(response.data)
      }
    } catch (err: any) {
      console.error('Error fetching stats:', err)
    }
  }

  /**
   * Filter requests locally
   */
  const filterRequests = () => {
    let filtered = [...refundRequests]

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(request =>
        request.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        RefundApiService.getReasonLabel(request.reason).toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(request => request.status === statusFilter)
    }

    // Sort by requested date (newest first)
    filtered.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())

    setFilteredRequests(filtered)
  }

  /**
   * Handle refund approval
   */
  const handleApprove = async (refundId: number) => {
    if (!confirm('Are you sure you want to approve this refund? This will process the payment refund immediately.')) {
      return
    }

    try {
      setProcessing(true)
      const response = await RefundApiService.approveRefund(refundId, adminNotes, manualCaptureId || undefined)
      
      if (response.success) {
        alert('Refund approved and processed successfully!')
        setShowDetailsModal(false)
        setAdminNotes('')
        setManualCaptureId('')
        setShowManualInput(false)
        // Refresh data
        await fetchRefunds()
        await fetchStats()
      } else {
        // Check if this is a manual refund required error for PayPal
        const errorMessage = response.message || 'Unknown error'
        if (errorMessage.includes('MANUAL_REFUND_REQUIRED')) {
          // Show detailed error message with option to enter capture ID
          if (confirm(errorMessage + '\n\nWould you like to enter the PayPal Capture ID manually?')) {
            setShowManualInput(true)
          }
        } else {
          alert('Error approving refund: ' + errorMessage)
        }
      }
    } catch (err: any) {
      alert('Error approving refund: ' + (err.message || 'Unknown error'))
    } finally {
      setProcessing(false)
    }
  }

  /**
   * Handle refund rejection
   */
  const handleReject = async (refundId: number) => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason')
      return
    }

    try {
      setProcessing(true)
      const response = await RefundApiService.rejectRefund(refundId, rejectionReason, adminNotes)
      
      if (response.success) {
        alert('Refund rejected successfully')
        setShowDetailsModal(false)
        setShowRejectModal(false)
        setAdminNotes('')
        setRejectionReason('')
        // Refresh data
        await fetchRefunds()
        await fetchStats()
      }
    } catch (err: any) {
      alert('Error rejecting refund: ' + (err.message || 'Unknown error'))
    } finally {
      setProcessing(false)
    }
  }

  /**
   * Handle marking refund as under review
   */
  const handleReview = async (refundId: number) => {
    try {
      setProcessing(true)
      const response = await RefundApiService.reviewRefund(refundId, adminNotes)
      
      if (response.success) {
        alert('Refund marked as under review')
        setShowDetailsModal(false)
        setAdminNotes('')
        await fetchRefunds()
        await fetchStats()
      }
    } catch (err: any) {
      alert('Error updating refund: ' + (err.message || 'Unknown error'))
    } finally {
      setProcessing(false)
    }
  }

  /**
   * Get status icon
   */
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-blue-500" />
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'processing':
        return <Clock className="w-4 h-4 text-blue-500" />
      case 'under_review':
        return <Eye className="w-4 h-4 text-purple-500" />
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />
    }
  }

  /**
   * Get status color
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'approved':
        return 'bg-blue-100 text-blue-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'under_review':
        return 'bg-purple-100 text-purple-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Refund Management</h1>
          <p className="text-gray-600">Manage customer refund requests and approvals</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => { fetchRefunds(); fetchStats(); }}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg">
              <RotateCcw className="w-6 h-6 text-gray-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Requests</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.total || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.pending || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.approved || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.completed || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.rejected || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by order #, email, or reason..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
              <Filter className="w-4 h-4 mr-2" />
              More Filters
            </button>
          </div>
        </div>
      </div>

      {/* Refund Requests Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="mx-auto h-12 w-12 text-gray-400 animate-spin" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Loading refund requests...</h3>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Request Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Requested
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 flex items-center">
                            Order #{request.orderNumber}
                            {request.refundType === 'partial' && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                Partial
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {RefundApiService.getReasonLabel(request.reason)}
                          </div>
                          {request.refundItems && request.refundItems.length > 0 && (
                            <div className="text-xs text-gray-400 mt-1">
                              {request.refundItems.length} item(s)
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="w-4 h-4 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{request.customerEmail}</div>
                            <div className="text-sm text-gray-500">{request.customerName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <DollarSign className="w-4 h-4 text-gray-400 mr-1" />
                          <span className="text-sm font-medium text-gray-900">${parseFloat(request.refundAmount).toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(request.status)}
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                            {RefundApiService.getStatusLabel(request.status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="w-4 h-4 mr-2" />
                          {new Date(request.requestedAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedRequest(request)
                              setAdminNotes(request.adminNotes || '')
                              setShowDetailsModal(true)
                            }}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {(request.status === 'pending' || request.status === 'under_review') && (
                            <>
                              <button
                                onClick={() => handleApprove(request.id)}
                                className="text-green-600 hover:text-green-900"
                                title="Approve & Process"
                                disabled={processing}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedRequest(request)
                                  setShowRejectModal(true)
                                }}
                                className="text-red-600 hover:text-red-900"
                                title="Reject"
                                disabled={processing}
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {request.status === 'failed' && (
                            <button
                              onClick={() => {
                                setSelectedRequest(request)
                                setAdminNotes(request.adminNotes || '')
                                setManualCaptureId('')
                                setShowManualInput(false)
                                setShowDetailsModal(true)
                              }}
                              className="text-orange-600 hover:text-orange-900"
                              title="Retry Failed Refund"
                              disabled={processing}
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredRequests.length === 0 && !loading && (
              <div className="text-center py-12">
                <RotateCcw className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No refund requests found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || statusFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'No refund requests have been submitted yet'
                  }
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Refund Details Modal */}
      {selectedRequest && showDetailsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Refund Request Details</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Request Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Order Number</label>
                  <p className="text-sm text-gray-900">{selectedRequest.orderNumber}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Refund Amount</label>
                  <p className="text-sm text-gray-900">${parseFloat(selectedRequest.refundAmount).toFixed(2)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Original Amount</label>
                  <p className="text-sm text-gray-900">${parseFloat(selectedRequest.originalAmount).toFixed(2)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Refund Type</label>
                  <p className="text-sm text-gray-900 capitalize">{selectedRequest.refundType}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer Email</label>
                  <p className="text-sm text-gray-900">{selectedRequest.customerEmail}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer Name</label>
                  <p className="text-sm text-gray-900">{selectedRequest.customerName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Provider</label>
                  <p className="text-sm text-gray-900 capitalize">{selectedRequest.paymentProvider || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedRequest.status)}`}>
                    {RefundApiService.getStatusLabel(selectedRequest.status)}
                  </span>
                </div>
              </div>

              {/* Reason and Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Reason</label>
                <p className="text-sm text-gray-900">{RefundApiService.getReasonLabel(selectedRequest.reason)}</p>
              </div>

              {selectedRequest.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <p className="text-sm text-gray-900">{selectedRequest.description}</p>
                </div>
              )}

              {/* Refund Items - Show which items are being refunded (for partial refunds) */}
              {selectedRequest.refundItems && selectedRequest.refundItems.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Items Being Refunded {selectedRequest.refundType === 'partial' && (
                      <span className="text-blue-600 text-xs ml-2">(Partial Refund)</span>
                    )}
                  </label>
                  <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
                    {selectedRequest.refundItems.map((item: any, index: number) => (
                      <div key={index} className="p-3 flex items-center justify-between hover:bg-gray-50">
                        <div className="flex items-center flex-1">
                          <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                            <Package className="w-6 h-6 text-gray-400" />
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{item.productName}</p>
                            {item.variantId && (
                              <p className="text-xs text-gray-500">Variant ID: {item.variantId}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            ${item.price.toFixed(2)} × {item.quantity}
                          </p>
                          <p className="text-xs text-gray-500">
                            = ${item.subtotal.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div className="p-3 bg-blue-50">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Refund Total:</span>
                        <span className="text-lg font-bold text-blue-900">
                          ${parseFloat(selectedRequest.refundAmount).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Includes proportional tax and shipping
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Existing Admin Notes (read-only) */}
              {selectedRequest.adminNotes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Previous Admin Notes</label>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{selectedRequest.adminNotes}</p>
                </div>
              )}

              {/* Rejection Reason (if rejected) */}
              {selectedRequest.rejectionReason && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Rejection Reason</label>
                  <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{selectedRequest.rejectionReason}</p>
                </div>
              )}

              {/* Admin Notes Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Add Admin Notes</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add notes about this refund request..."
                />
              </div>

              {/* Manual PayPal Capture ID (for PayPal orders only) */}
              {selectedRequest.paymentProvider === 'paypal' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-yellow-900 mb-1">PayPal Refund</h4>
                      <p className="text-xs text-yellow-700 mb-3">
                        If automatic PayPal refund fails, you can manually enter the PayPal Capture ID to retry.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowManualInput(!showManualInput)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {showManualInput ? 'Hide Manual Input' : 'Enter PayPal Capture ID Manually'}
                      </button>
                      {showManualInput && (
                        <div className="mt-3">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            PayPal Capture ID
                          </label>
                          <input
                            type="text"
                            value={manualCaptureId}
                            onChange={(e) => setManualCaptureId(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                            placeholder="e.g., 5TY45345KP543532R"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Find this in your PayPal dashboard under transaction details
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Timeline</label>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Requested:</span>
                    <span className="text-gray-900">{new Date(selectedRequest.requestedAt).toLocaleString()}</span>
                  </div>
                  {selectedRequest.reviewedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Reviewed:</span>
                      <span className="text-gray-900">{new Date(selectedRequest.reviewedAt).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedRequest.processedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Processed:</span>
                      <span className="text-gray-900">{new Date(selectedRequest.processedAt).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedRequest.completedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Completed:</span>
                      <span className="text-gray-900 font-medium text-green-600">{new Date(selectedRequest.completedAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {(selectedRequest.status === 'pending' || selectedRequest.status === 'under_review') && (
                <div className="flex space-x-3 pt-4 border-t border-gray-200">
                  {selectedRequest.status === 'pending' && (
                    <button
                      onClick={() => handleReview(selectedRequest.id)}
                      disabled={processing}
                      className="flex-1 flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Mark as Under Review
                    </button>
                  )}
                  <button
                    onClick={() => handleApprove(selectedRequest.id)}
                    disabled={processing}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {processing ? 'Processing...' : 'Approve & Process Refund'}
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailsModal(false)
                      setShowRejectModal(true)
                    }}
                    disabled={processing}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject Refund
                  </button>
                </div>
              )}

              {/* Failed Refund Retry Button */}
              {selectedRequest.status === 'failed' && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                    <div className="flex items-start">
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-red-900 mb-1">Refund Failed</h4>
                        <p className="text-xs text-red-700 mb-2">
                          This refund failed to process. Check the admin notes below for details.
                        </p>
                        {selectedRequest.adminNotes && (
                          <div className="bg-white border border-red-200 rounded p-2 mt-2">
                            <p className="text-xs text-gray-700 font-mono whitespace-pre-wrap">{selectedRequest.adminNotes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        // Reset manual capture ID and show input for retry
                        setManualCaptureId('')
                        setShowManualInput(true)
                      }}
                      disabled={processing}
                      className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Retry with Manual Capture ID
                    </button>
                    <button
                      onClick={() => handleApprove(selectedRequest.id)}
                      disabled={processing}
                      className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      {processing ? 'Retrying...' : 'Retry Refund'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {selectedRequest && showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Reject Refund Request</h2>
              <button
                onClick={() => setShowRejectModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Provide a clear reason for rejection that will be sent to the customer..."
                  required
                />
                <p className="mt-1 text-sm text-gray-500">This will be visible to the customer</p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReject(selectedRequest.id)}
                  disabled={processing || !rejectionReason.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {processing ? 'Rejecting...' : 'Reject Refund'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RefundManagement
