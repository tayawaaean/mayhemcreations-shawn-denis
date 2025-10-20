import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { RefundApiService, RefundRequest } from '../../shared/refundApiService'
import { 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RotateCcw, 
  AlertCircle,
  Calendar,
  DollarSign,
  FileText,
  Eye,
  RefreshCw,
  Search,
  Image as ImageIcon
} from 'lucide-react'

const RefundTracking: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  
  // State management
  const [refunds, setRefunds] = useState<RefundRequest[]>([])
  const [filteredRefunds, setFilteredRefunds] = useState<RefundRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  // Fetch refunds on mount
  useEffect(() => {
    if (!user) {
      navigate('/')
      return
    }
    fetchRefunds()
  }, [user])

  // Filter refunds when search or filter changes
  useEffect(() => {
    filterRefunds()
  }, [refunds, searchTerm, statusFilter])

  /**
   * Fetch user's refunds from API
   */
  const fetchRefunds = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await RefundApiService.getUserRefunds()
      
      if (response.success) {
        setRefunds(response.data)
      } else {
        setError('Failed to load refund requests')
      }
    } catch (err: any) {
      console.error('Error fetching refunds:', err)
      setError(err.message || 'Failed to load your refund requests')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Filter refunds locally
   */
  const filterRefunds = () => {
    let filtered = [...refunds]

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(refund =>
        refund.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        RefundApiService.getReasonLabel(refund.reason).toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(refund => refund.status === statusFilter)
    }

    // Sort by requested date (newest first)
    filtered.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())

    setFilteredRefunds(filtered)
  }

  /**
   * Cancel a refund request
   */
  const handleCancel = async (refundId: number) => {
    if (!confirm('Are you sure you want to cancel this refund request?')) {
      return
    }

    try {
      const response = await RefundApiService.cancelRefund(refundId)
      
      if (response.success) {
        alert('Refund request cancelled successfully')
        fetchRefunds() // Refresh the list
      }
    } catch (err: any) {
      alert('Error cancelling refund: ' + (err.message || 'Unknown error'))
    }
  }

  /**
   * Get status icon
   */
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'approved':
      case 'processing':
        return <Clock className="w-5 h-5 text-blue-500" />
      case 'rejected':
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-gray-500" />
      case 'under_review':
        return <Eye className="w-5 h-5 text-purple-500" />
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />
    }
  }

  /**
   * Get status color
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'approved':
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'rejected':
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'under_review':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
  }

  /**
   * Get progress percentage based on status
   */
  const getProgressPercentage = (status: string): number => {
    switch (status) {
      case 'pending': return 25
      case 'under_review': return 50
      case 'approved': return 75
      case 'processing': return 85
      case 'completed': return 100
      case 'rejected':
      case 'failed':
      case 'cancelled': return 0
      default: return 25
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-6 md:py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
            <RotateCcw className="w-6 h-6 sm:w-8 sm:h-8 mr-2 sm:mr-3 text-blue-600" />
            My Refund Requests
          </h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600">
            Track and manage your refund requests
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 sm:mb-6 bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
            <div className="flex items-center">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 mr-2" />
              <p className="text-sm sm:text-base text-red-800 break-words">{error}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by order number or reason..."
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div className="mt-3 sm:mt-4 flex justify-end">
            <button
              onClick={fetchRefunds}
              disabled={loading}
              className="flex items-center px-3 sm:px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-8 sm:py-12">
            <RefreshCw className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-gray-400 animate-spin" />
            <h3 className="mt-2 text-sm sm:text-base font-medium text-gray-900">Loading refund requests...</h3>
          </div>
        ) : filteredRefunds.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-lg shadow-sm p-6 sm:p-12 text-center">
            <Package className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
            <h3 className="mt-2 text-base sm:text-lg font-medium text-gray-900">No refund requests found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : "You haven't requested any refunds yet"
              }
            </p>
            <div className="mt-4 sm:mt-6">
              <button
                onClick={() => navigate('/my-orders')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                View My Orders
              </button>
            </div>
          </div>
        ) : (
          /* Refund Cards */
          <div className="space-y-3 sm:space-y-4">
            {filteredRefunds.map((refund) => (
              <div key={refund.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-4 sm:p-6">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row items-start justify-between mb-3 sm:mb-4 gap-3">
                    <div className="flex items-start sm:items-center w-full sm:w-auto">
                      {getStatusIcon(refund.status)}
                      <div className="ml-3 flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 break-words">
                          Order #{refund.orderNumber}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-500">
                          Requested on {new Date(refund.requestedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium border whitespace-nowrap self-start sm:self-auto ${getStatusColor(refund.status)}`}>
                      {RefundApiService.getStatusLabel(refund.status)}
                    </span>
                  </div>

                  {/* Progress Bar (for active refunds) */}
                  {!['rejected', 'failed', 'cancelled'].includes(refund.status) && (
                    <div className="mb-3 sm:mb-4">
                      <div className="flex justify-between text-xs sm:text-sm text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>{getProgressPercentage(refund.status)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            refund.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${getProgressPercentage(refund.status)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <div className="flex items-center">
                      <DollarSign className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">Refund Amount</p>
                        <p className="text-sm font-medium text-gray-900 truncate">${Number(refund.refundAmount).toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">Reason</p>
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {RefundApiService.getReasonLabel(refund.reason)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Package className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">Type</p>
                        <p className="text-sm font-medium text-gray-900 capitalize truncate">{refund.refundType}</p>
                      </div>
                    </div>
                  </div>

                  {/* Evidence Images Indicator */}
                  {(() => {
                    // Parse images if they're a JSON string, otherwise use as-is
                    let images: string[] = [];
                    if (refund.imagesUrls) {
                      if (typeof refund.imagesUrls === 'string') {
                        try {
                          images = JSON.parse(refund.imagesUrls);
                        } catch (e) {
                          console.error('Failed to parse images:', e);
                        }
                      } else if (Array.isArray(refund.imagesUrls)) {
                        images = refund.imagesUrls;
                      }
                    }
                    
                    return images.length > 0 && (
                      <div className="mb-3 sm:mb-4 flex items-center text-xs sm:text-sm text-blue-600 bg-blue-50 p-2 rounded-md">
                        <ImageIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span>{images.length} evidence image{images.length > 1 ? 's' : ''} attached</span>
                      </div>
                    );
                  })()}

                  {/* Description */}
                  {refund.description && (
                    <div className="mb-3 sm:mb-4">
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md break-words">
                        {refund.description}
                      </p>
                    </div>
                  )}

                  {/* Rejection Reason */}
                  {refund.rejectionReason && (
                    <div className="mb-3 sm:mb-4">
                      <p className="text-sm font-medium text-red-700 mb-1">Rejection Reason:</p>
                      <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200 break-words">
                        {refund.rejectionReason}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-3 sm:pt-4 border-t border-gray-200 gap-3">
                    <div className="text-xs sm:text-sm text-gray-500 w-full sm:w-auto">
                      {refund.completedAt && (
                        <span className="flex items-center text-green-600">
                          <CheckCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                          <span className="break-words">Completed on {new Date(refund.completedAt).toLocaleDateString()}</span>
                        </span>
                      )}
                      {refund.processedAt && !refund.completedAt && (
                        <span className="flex items-center text-blue-600">
                          <Clock className="w-4 h-4 mr-1 flex-shrink-0" />
                          <span className="break-words">Processing since {new Date(refund.processedAt).toLocaleDateString()}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => {
                          setSelectedRefund(refund)
                          setShowDetailsModal(true)
                        }}
                        className="px-3 sm:px-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium text-center"
                      >
                        View Details
                      </button>
                      {(refund.status === 'pending' || refund.status === 'under_review') && (
                        <button
                          onClick={() => handleCancel(refund.id)}
                          className="px-3 sm:px-4 py-2 text-sm text-red-600 hover:text-red-700 font-medium text-center"
                        >
                          Cancel Request
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Details Modal */}
        {selectedRefund && showDetailsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Refund Request Details</h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full flex-shrink-0"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* Status Badge */}
                <div className="flex items-center justify-center">
                  <span className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium border flex items-center ${getStatusColor(selectedRefund.status)}`}>
                    {getStatusIcon(selectedRefund.status)}
                    <span className="ml-2">{RefundApiService.getStatusLabel(selectedRefund.status)}</span>
                  </span>
                </div>

                {/* Refund Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="min-w-0">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700">Order Number</label>
                    <p className="text-sm text-gray-900 break-words">{selectedRefund.orderNumber}</p>
                  </div>
                  <div className="min-w-0">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700">Refund Amount</label>
                    <p className="text-sm text-gray-900 font-semibold">${Number(selectedRefund.refundAmount).toFixed(2)}</p>
                  </div>
                  <div className="min-w-0">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700">Original Amount</label>
                    <p className="text-sm text-gray-900">${Number(selectedRefund.originalAmount).toFixed(2)}</p>
                  </div>
                  <div className="min-w-0">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700">Refund Type</label>
                    <p className="text-sm text-gray-900 capitalize">{selectedRefund.refundType}</p>
                  </div>
                  <div className="min-w-0">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700">Reason</label>
                    <p className="text-sm text-gray-900 break-words">{RefundApiService.getReasonLabel(selectedRefund.reason)}</p>
                  </div>
                  {selectedRefund.paymentProvider && (
                    <div className="min-w-0">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700">Payment Provider</label>
                      <p className="text-sm text-gray-900 capitalize">{selectedRefund.paymentProvider}</p>
                    </div>
                  )}
                </div>

                {/* Evidence Images */}
                {(() => {
                  // Parse images if they're a JSON string, otherwise use as-is
                  let images: string[] = [];
                  if (selectedRefund.imagesUrls) {
                    if (typeof selectedRefund.imagesUrls === 'string') {
                      try {
                        images = JSON.parse(selectedRefund.imagesUrls);
                      } catch (e) {
                        console.error('Failed to parse images:', e);
                      }
                    } else if (Array.isArray(selectedRefund.imagesUrls)) {
                      images = selectedRefund.imagesUrls;
                    }
                  }
                  
                  return images.length > 0 && (
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Evidence Images ({images.length})</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                        {images.map((imageUrl, index) => (
                        <div
                          key={index}
                          className="aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-blue-400 transition-colors cursor-pointer"
                          onClick={() => window.open(imageUrl, '_blank')}
                        >
                          <img
                            src={imageUrl}
                            alt={`Evidence ${index + 1}`}
                            className="w-full h-full object-cover hover:scale-105 transition-transform"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
                            }}
                          />
                        </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Click on an image to view it in full size</p>
                    </div>
                  );
                })()}

                {/* Description */}
                {selectedRefund.description && (
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Description</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md break-words">{selectedRefund.description}</p>
                  </div>
                )}

                {/* Admin Notes */}
                {selectedRefund.adminNotes && (
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Admin Notes</label>
                    <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md border border-blue-200 break-words">
                      {selectedRefund.adminNotes}
                    </p>
                  </div>
                )}

                {/* Rejection Reason */}
                {selectedRefund.rejectionReason && (
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Rejection Reason</label>
                    <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200 break-words">
                      {selectedRefund.rejectionReason}
                    </p>
                  </div>
                )}

                {/* Timeline */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">Timeline</label>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                      <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium text-gray-900">Request Submitted</p>
                        <p className="text-xs text-gray-500 break-words">{new Date(selectedRefund.requestedAt).toLocaleString()}</p>
                      </div>
                    </div>
                    
                    {selectedRefund.reviewedAt && (
                      <div className="flex items-start">
                        <div className="flex-shrink-0 w-2 h-2 bg-purple-500 rounded-full mt-1.5"></div>
                        <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-medium text-gray-900">Under Review</p>
                          <p className="text-xs text-gray-500 break-words">{new Date(selectedRefund.reviewedAt).toLocaleString()}</p>
                        </div>
                      </div>
                    )}
                    
                    {selectedRefund.processedAt && (
                      <div className="flex items-start">
                        <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                        <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-medium text-gray-900">Processing Refund</p>
                          <p className="text-xs text-gray-500 break-words">{new Date(selectedRefund.processedAt).toLocaleString()}</p>
                        </div>
                      </div>
                    )}
                    
                    {selectedRefund.completedAt && (
                      <div className="flex items-start">
                        <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
                        <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-medium text-green-700">Refund Completed</p>
                          <p className="text-xs text-gray-500 break-words">{new Date(selectedRefund.completedAt).toLocaleString()}</p>
                          <p className="text-xs text-gray-500 mt-1 break-words">
                            Refund should appear in your account within 3-10 business days
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-200">
                  {(selectedRefund.status === 'pending' || selectedRefund.status === 'under_review') && (
                    <button
                      onClick={() => {
                        setShowDetailsModal(false)
                        handleCancel(selectedRefund.id)
                      }}
                      className="flex-1 px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Cancel Request
                    </button>
                  )}
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="flex-1 px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default RefundTracking


















