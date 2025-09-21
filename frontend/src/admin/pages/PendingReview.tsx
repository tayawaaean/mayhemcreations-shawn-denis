import React, { useState, useEffect } from 'react'
import { 
  Search, 
  Filter, 
  Eye, 
  CheckCircle,
  X,
  Clock,
  AlertCircle,
  User,
  Calendar,
  DollarSign,
  Package,
  MessageSquare,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  Check,
  XCircle,
  CreditCard
} from 'lucide-react'
import { orderReviewApiService, OrderReview } from '../../shared/orderReviewApiService' // Updated with new status types

const PendingReview: React.FC = () => {
  const [reviews, setReviews] = useState<OrderReview[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('pending')
  const [selectedPictureReplyStatus, setSelectedPictureReplyStatus] = useState('all')
  const [selectedReviews, setSelectedReviews] = useState<number[]>([])
  const [selectedReview, setSelectedReview] = useState<OrderReview | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<{src: string, alt: string, type: string} | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [pictureReplies, setPictureReplies] = useState<{[itemId: string]: {image: string, notes: string}}>({})
  const [uploadingPictures, setUploadingPictures] = useState(false)

  // Load reviews on component mount
  useEffect(() => {
    loadReviews()
  }, [])

  const loadReviews = async () => {
    try {
      setLoading(true)
      console.log('🔄 Loading reviews...')
      const response = await orderReviewApiService.getAllReviewOrders()
      console.log('📊 Reviews API response:', response)
      if (response.success && response.data) {
        console.log('✅ Reviews loaded:', response.data)
        // Debug the order_data structure
        response.data.forEach((review, index) => {
          console.log(`📦 Review ${index + 1} order_data:`, {
            type: typeof review.order_data,
            isArray: Array.isArray(review.order_data),
            value: review.order_data
          });
        });
        setReviews(response.data)
      } else {
        console.log('❌ Failed to load reviews:', response.message)
      }
    } catch (error) {
      console.error('❌ Error loading reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = review.id.toString().includes(searchQuery) ||
                         review.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         review.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         review.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = selectedStatus === 'all' || review.status === selectedStatus
    
    // Picture reply status filtering
    const matchesPictureReplyStatus = (() => {
      if (selectedPictureReplyStatus === 'all') return true;
      
      const hasPictureReplies = review.admin_picture_replies && review.admin_picture_replies.length > 0;
      
      // Parse customer confirmations if it's a string
      let customerConfirmations = review.customer_confirmations;
      if (typeof customerConfirmations === 'string') {
        try {
          customerConfirmations = JSON.parse(customerConfirmations);
        } catch (e) {
          customerConfirmations = [];
        }
      }
      
      const hasCustomerConfirmations = customerConfirmations && Array.isArray(customerConfirmations) && customerConfirmations.length > 0;
      const customerConfirmedAt = review.customer_confirmed_at;
      
      switch (selectedPictureReplyStatus) {
        case 'no-reply':
          return !hasPictureReplies;
        case 'pending':
          return hasPictureReplies && (!hasCustomerConfirmations || !customerConfirmedAt);
        case 'confirmed':
          return hasPictureReplies && hasCustomerConfirmations && customerConfirmedAt && 
                 customerConfirmations?.every(conf => conf.confirmed === true);
        case 'rejected':
          return hasPictureReplies && hasCustomerConfirmations && customerConfirmedAt && 
                 customerConfirmations?.some(conf => conf.confirmed === false);
        case 'partial':
          return hasPictureReplies && hasCustomerConfirmations && customerConfirmedAt && 
                 !customerConfirmations?.every(conf => conf.confirmed === true) &&
                 !customerConfirmations?.some(conf => conf.confirmed === false);
        default:
          return true;
      }
    })();
    
    return matchesSearch && matchesStatus && matchesPictureReplyStatus
  })

  // Pagination logic
  const totalItems = filteredReviews.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedReviews = filteredReviews.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleSelectReview = (reviewId: number) => {
    setSelectedReviews(prev => 
      prev.includes(reviewId) 
        ? prev.filter(id => id !== reviewId)
        : [...prev, reviewId]
    )
  }

  const handleSelectAll = () => {
    if (selectedReviews.length === filteredReviews.length) {
      setSelectedReviews([])
    } else {
      setSelectedReviews(filteredReviews.map(r => r.id))
    }
  }

  const handleViewReview = (review: OrderReview) => {
    setSelectedReview(review)
    setIsDetailModalOpen(true)
  }


  const handleStatusUpdate = async (reviewId: number, status: string, notes: string) => {
    try {
      const response = await orderReviewApiService.updateReviewStatus(reviewId, {
        status: status as any,
        adminNotes: notes
      })
      
      if (response.success) {
        // Update local state
        setReviews(prev => prev.map(review => 
          review.id === reviewId 
            ? { ...review, status: status as any, admin_notes: notes, reviewed_at: new Date().toISOString() }
            : review
        ))
        setIsStatusModalOpen(false)
        setAdminNotes('')
      } else {
        alert('Failed to update review status')
      }
    } catch (error) {
      console.error('Error updating review status:', error)
      alert('Failed to update review status')
    }
  }

  // Handle picture reply upload
  const handlePictureReplyUpload = (itemId: string, file: File) => {
    console.log('📸 Uploading picture for item:', itemId, 'File:', file.name);
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result as string
      console.log('📸 Base64 generated for item:', itemId);
      setPictureReplies(prev => {
        const newState = {
        ...prev,
        [itemId]: {
          ...prev[itemId],
          image: base64
        }
        };
        console.log('📸 Updated pictureReplies state:', newState);
        return newState;
      })
    }
    reader.readAsDataURL(file)
  }

  // Handle picture reply notes change
  const handlePictureReplyNotesChange = (itemId: string, notes: string) => {
    setPictureReplies(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        notes
      }
    }))
  }

  // Submit picture replies
  const handleSubmitPictureReplies = async () => {
    if (!selectedReview) return

    console.log('🚀 Submitting picture replies:', {
      selectedReviewId: selectedReview.id,
      pictureReplies: pictureReplies,
      pictureRepliesKeys: Object.keys(pictureReplies)
    });

    try {
      setUploadingPictures(true)
      
      // Parse order data to get proper item IDs
      const orderData = Array.isArray(selectedReview.order_data) 
        ? selectedReview.order_data 
        : JSON.parse(selectedReview.order_data as string);
      
      console.log('📊 Order data for mapping:', orderData);
      
      const pictureRepliesArray = Object.entries(pictureReplies).map(([itemKey, reply]) => {
        // Find the corresponding item in order data to get the proper item ID
        const item = orderData.find((orderItem: any) => {
          const orderItemKey = orderItem.id || `${orderItem.productId}-${orderData.indexOf(orderItem)}`;
          return orderItemKey === itemKey;
        });
        
        console.log('🔍 Mapping item:', { itemKey, item, reply });
        
        return {
          itemId: item?.id || itemKey, // Use the actual item ID if available, otherwise use the key
        image: reply.image,
        notes: reply.notes || ''
        };
      });

      console.log('📤 Final picture replies array:', pictureRepliesArray);

      const response = await orderReviewApiService.uploadPictureReply(selectedReview.id, pictureRepliesArray)
      
      console.log('📥 API response:', response);
      
      if (response.success) {
        alert('Picture replies uploaded successfully!')
        setPictureReplies({})
        loadReviews() // Refresh the reviews
      } else {
        alert('Failed to upload picture replies. Please try again.')
      }
    } catch (error) {
      console.error('Error uploading picture replies:', error)
      alert('Failed to upload picture replies. Please try again.')
    } finally {
      setUploadingPictures(false)
    }
  }


  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'approved':
        return <CheckCircle className="h-4 w-4" />
      case 'rejected':
        return <X className="h-4 w-4" />
      case 'needs-changes':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'needs-changes':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPictureReplyStatus = (review: OrderReview) => {
    // Check if there are admin picture replies
    const hasPictureReplies = review.admin_picture_replies && review.admin_picture_replies.length > 0;
    
    if (!hasPictureReplies) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <X className="h-3 w-3 mr-1" />
          No Reply
        </span>
      );
    }

    // Parse customer confirmations if it's a string
    let customerConfirmations = review.customer_confirmations;
    if (typeof customerConfirmations === 'string') {
      try {
        customerConfirmations = JSON.parse(customerConfirmations);
      } catch (e) {
        customerConfirmations = [];
      }
    }

    // Check if customer has confirmed the picture replies
    const hasCustomerConfirmations = customerConfirmations && Array.isArray(customerConfirmations) && customerConfirmations.length > 0;
    const customerConfirmedAt = review.customer_confirmed_at;

    if (hasCustomerConfirmations && customerConfirmedAt) {
      // Check if all picture replies have been confirmed
      const allConfirmed = customerConfirmations?.every(conf => conf.confirmed === true);
      const anyRejected = customerConfirmations?.some(conf => conf.confirmed === false);

      if (allConfirmed) {
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Confirmed
          </span>
        );
      } else if (anyRejected) {
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </span>
        );
      } else {
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Partial
          </span>
        );
      }
    }

    // Picture replies uploaded but no customer confirmation yet
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        <ImageIcon className="h-3 w-3 mr-1" />
        Pending
      </span>
    );
  }

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending Review' },
    { value: 'needs-changes', label: 'Picture Reply Pending' },
    { value: 'pending-payment', label: 'Pending Payment' },
    { value: 'approved-processing', label: 'Approved - Processing Design' },
    { value: 'rejected', label: 'Rejected - Needs Re-upload' }
  ]

  const pictureReplyStatusOptions = [
    { value: 'all', label: 'All Picture Replies' },
    { value: 'no-reply', label: 'No Reply' },
    { value: 'pending', label: 'Pending Confirmation' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'partial', label: 'Partial' }
  ]

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  // Function to handle image click for preview
  const handleImageClick = (src: string, alt: string, type: string) => {
    setSelectedImage({ src, alt, type })
    setIsImageModalOpen(true)
  }

  // Helper function to calculate item price including customization costs
  const calculateItemPrice = (item: any) => {
    // For custom embroidery items, use the total price from embroideryData
    if (item.productId === 'custom-embroidery' && item.customization?.embroideryData) {
      return Number(item.customization.embroideryData.totalPrice) || 0;
    }
    
    // For regular items, calculate base price + customization costs
    let itemPrice = Number(item.product?.price) || 0;
    
    if (item.customization?.selectedStyles) {
      const { selectedStyles } = item.customization;
      if (selectedStyles.coverage) itemPrice += Number(selectedStyles.coverage.price) || 0;
      if (selectedStyles.material) itemPrice += Number(selectedStyles.material.price) || 0;
      if (selectedStyles.border) itemPrice += Number(selectedStyles.border.price) || 0;
      if (selectedStyles.backing) itemPrice += Number(selectedStyles.backing.price) || 0;
      if (selectedStyles.cutting) itemPrice += Number(selectedStyles.cutting.price) || 0;
      
      if (selectedStyles.threads) {
        selectedStyles.threads.forEach((thread: any) => {
          itemPrice += Number(thread.price) || 0;
        });
      }
      if (selectedStyles.upgrades) {
        selectedStyles.upgrades.forEach((upgrade: any) => {
          itemPrice += Number(upgrade.price) || 0;
        });
      }
    }
    
    return itemPrice;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">Loading reviews...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pending Review</h1>
          <p className="mt-2 text-gray-600">
            Review and approve customized orders before checkout
          </p>
        </div>
        <button
          onClick={loadReviews}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">
                {reviews.filter(r => r.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-gray-900">
                {reviews.filter(r => r.status === 'pending-payment').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <X className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-gray-900">
                {reviews.filter(r => r.status === 'rejected').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <AlertCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Needs Changes</p>
              <p className="text-2xl font-bold text-gray-900">
                {reviews.filter(r => r.status === 'needs-changes').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and search */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search by order ID, customer name, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:w-48">
            <select
              value={selectedPictureReplyStatus}
              onChange={(e) => setSelectedPictureReplyStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {pictureReplyStatusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Reviews table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedReviews.length === filteredReviews.length && filteredReviews.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Picture Reply
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedReviews.map((review) => (
                <tr key={review.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedReviews.includes(review.id)}
                      onChange={() => handleSelectReview(review.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{review.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {review.first_name} {review.last_name}
                        </div>
                        <div className="text-sm text-gray-500">{review.user_email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(() => {
                      try {
                        const orderData = typeof review.order_data === 'string' 
                          ? JSON.parse(review.order_data) 
                          : review.order_data;
                        return Array.isArray(orderData) ? orderData.length : 0;
                      } catch (e) {
                        return 0;
                      }
                    })()} items
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatPrice(review.total)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(review.status)}`}>
                      {getStatusIcon(review.status)}
                      <span className="ml-1 capitalize">{review.status.replace('-', ' ')}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getPictureReplyStatus(review)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(review.submitted_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleViewReview(review)}
                      className="text-blue-600 hover:text-blue-900 p-2 rounded hover:bg-blue-50 transition-colors"
                      title="View details and manage order"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
                  Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(endIndex, totalItems)}</span> of{' '}
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
      </div>

      {/* Review Detail Modal */}
      {isDetailModalOpen && selectedReview && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsDetailModalOpen(false)}></div>
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Order Review #{selectedReview.id}
                </h2>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                {/* Customer Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Customer Information</h4>
                  <p><strong>Name:</strong> {selectedReview.first_name} {selectedReview.last_name}</p>
                  <p><strong>Email:</strong> {selectedReview.user_email}</p>
                </div>

                {/* Picture Reply Summary */}
                {(() => {
                  // Parse admin picture replies if it's a string
                  let adminPictureReplies = selectedReview.admin_picture_replies;
                  if (typeof adminPictureReplies === 'string') {
                    try {
                      adminPictureReplies = JSON.parse(adminPictureReplies);
                    } catch (e) {
                      adminPictureReplies = [];
                    }
                  }
                  
                  return adminPictureReplies && Array.isArray(adminPictureReplies) && adminPictureReplies.length > 0;
                })() && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-3">Picture Reply Summary</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {(() => {
                            let adminPictureReplies = selectedReview.admin_picture_replies;
                            if (typeof adminPictureReplies === 'string') {
                              try {
                                adminPictureReplies = JSON.parse(adminPictureReplies);
                              } catch (e) {
                                adminPictureReplies = [];
                              }
                            }
                            return Array.isArray(adminPictureReplies) ? adminPictureReplies.length : 0;
                          })()}
                        </div>
                        <div className="text-sm text-blue-700">Total Replies</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {(() => {
                            // Parse customer confirmations if it's a string
                            let customerConfirmations = selectedReview.customer_confirmations;
                            if (typeof customerConfirmations === 'string') {
                              try {
                                customerConfirmations = JSON.parse(customerConfirmations);
                              } catch (e) {
                                customerConfirmations = [];
                              }
                            }
                            
                            const confirmedCount = customerConfirmations?.filter((conf: any) => conf.confirmed === true).length || 0;
                            return confirmedCount;
                          })()}
                        </div>
                        <div className="text-sm text-green-700">Confirmed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {(() => {
                            // Parse customer confirmations if it's a string
                            let customerConfirmations = selectedReview.customer_confirmations;
                            if (typeof customerConfirmations === 'string') {
                              try {
                                customerConfirmations = JSON.parse(customerConfirmations);
                              } catch (e) {
                                customerConfirmations = [];
                              }
                            }
                            
                            const rejectedCount = customerConfirmations?.filter((conf: any) => conf.confirmed === false).length || 0;
                            return rejectedCount;
                          })()}
                        </div>
                        <div className="text-sm text-red-700">Rejected</div>
                      </div>
                    </div>
                    {selectedReview.picture_reply_uploaded_at && (
                      <div className="mt-3 text-sm text-blue-600">
                        <strong>Last Uploaded:</strong> {new Date(selectedReview.picture_reply_uploaded_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                )}

                {/* Order Items */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Order Items</h4>
                  {(() => {
                    try {
                      const orderData = typeof selectedReview.order_data === 'string' 
                        ? JSON.parse(selectedReview.order_data) 
                        : selectedReview.order_data;
                      
                      if (Array.isArray(orderData)) {
                        return (
                          <div className="space-y-2">
                            {orderData.map((item: any, index: number) => (
                              <div key={index} className="flex justify-between items-start p-3 bg-white rounded border">
                                <div className="flex-1">
                                  <div className="flex items-start space-x-3">
                                    {/* Product/Design Image */}
                                    <div className="flex-shrink-0">
                                      {(() => {
                                        // For custom embroidery items - show uploaded design
                                        if (item.productId === 'custom-embroidery' && item.customization?.design?.preview) {
                                          return (
                                            <img
                                              src={item.customization.design.preview}
                                              alt="Uploaded Design"
                                              className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                              onClick={() => handleImageClick(
                                                item.customization.design.preview,
                                                'Uploaded Design',
                                                'design'
                                              )}
                                              onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                              }}
                                            />
                                          );
                                        }
                                        // For regular products with customization - show final product mockup
                                        if (item.customization?.mockup) {
                                          return (
                                            <img
                                              src={item.customization.mockup}
                                              alt="Final Product"
                                              className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                              onClick={() => handleImageClick(
                                                item.customization.mockup,
                                                'Final Product',
                                                'mockup'
                                              )}
                                              onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                              }}
                                            />
                                          );
                                        }
                                        // For regular products without customization - show product image
                                        if (item.product?.image) {
                                          return (
                                            <img
                                              src={item.product.image}
                                              alt={item.product.title}
                                              className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                              onClick={() => handleImageClick(
                                                item.product.image,
                                                item.product.title,
                                                'product'
                                              )}
                                              onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                              }}
                                            />
                                          );
                                        }
                                        // Default placeholder
                                        return (
                                          <div className="w-16 h-16 bg-gray-200 rounded border flex items-center justify-center">
                                            <span className="text-xs text-gray-500">No Image</span>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                    
                                    {/* Product Details */}
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-gray-900 truncate">
                                        {item.product?.title || (item.productId === 'custom-embroidery' ? 'Custom Embroidery' : 'Custom Item')}
                                      </p>
                                      <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                                      {item.customization && (
                                        <div className="mt-1">
                                          <p className="text-sm text-blue-600">
                                            {item.productId === 'custom-embroidery' ? 'Custom Design' : 'Customized'}
                                          </p>
                                          {item.productId === 'custom-embroidery' && item.customization.embroideryData && (
                                            <div className="text-xs text-gray-500 mt-1">
                                              <p>Size: {item.customization.embroideryData.dimensions?.width}" × {item.customization.embroideryData.dimensions?.height}"</p>
                                              <p>Material: {item.customization.embroideryData.materialCosts?.selectedMaterial?.name}</p>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Price */}
                                <div className="text-right ml-4">
                                  <p className="font-medium">{formatPrice(calculateItemPrice(item))}</p>
                                  {item.customization && (
                                    <p className="text-xs text-gray-500">
                                      {item.productId === 'custom-embroidery' ? 'Custom pricing' : 'Includes customization'}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      } else {
                        return <p className="text-gray-500">No items found</p>;
                      }
                    } catch (e) {
                      return <p className="text-gray-500">Error parsing order data</p>;
                    }
                  })()}
                </div>

                {/* Order Summary */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Order Summary</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatPrice(selectedReview.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping:</span>
                      <span>{formatPrice(selectedReview.shipping)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>{formatPrice(selectedReview.tax)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total:</span>
                      <span>{formatPrice(selectedReview.total)}</span>
                    </div>
                  </div>
                  
                  {/* Pricing Breakdown for Custom Embroidery */}
                  {(() => {
                    try {
                      const orderData = typeof selectedReview.order_data === 'string' 
                        ? JSON.parse(selectedReview.order_data) 
                        : selectedReview.order_data;
                      
                      const customEmbroideryItems = orderData.filter((item: any) => 
                        item.productId === 'custom-embroidery' && item.customization?.embroideryData
                      );
                      
                      if (customEmbroideryItems.length > 0) {
                        return (
                          <div className="mt-4 pt-4 border-t border-gray-300">
                            <h5 className="font-medium text-gray-900 mb-2">Custom Embroidery Pricing Breakdown</h5>
                            {customEmbroideryItems.map((item: any, index: number) => (
                              <div key={index} className="text-sm space-y-1">
                                <div className="flex justify-between">
                                  <span>Base Material Cost:</span>
                                  <span>{formatPrice(item.customization.embroideryData.materialCosts.totalCost)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Embroidery Options:</span>
                                  <span>{formatPrice(item.customization.embroideryData.optionsPrice)}</span>
                                </div>
                                <div className="flex justify-between font-medium border-t pt-1">
                                  <span>Item Total:</span>
                                  <span>{formatPrice(item.customization.embroideryData.totalPrice)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    } catch (e) {
                      return null;
                    }
                  })()}
                </div>

                {/* Admin Notes */}
                {selectedReview.admin_notes && (
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Admin Notes</h4>
                    <p className="text-sm text-gray-700">{selectedReview.admin_notes}</p>
                  </div>
                )}

                {/* Picture Reply Section */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-4">Picture Replies</h4>
                  
                  {(() => {
                    const orderData = Array.isArray(selectedReview.order_data) 
                      ? selectedReview.order_data 
                      : JSON.parse(selectedReview.order_data as string);
                    
                    return (
                      <div className="space-y-4">
                        {orderData.map((item: any, index: number) => {
                          // Generate a unique key for this item
                          const itemKey = item.id || `${item.productId}-${index}`;
                          
                          return (
                            <div key={itemKey} className="border border-gray-200 rounded-lg p-4 bg-white">
                              <div className="flex items-start space-x-4">
                                {/* Item Image */}
                                <div className="flex-shrink-0">
                                  {(() => {
                                    // For custom embroidery items - show uploaded design
                                    if (item.productId === 'custom-embroidery' && item.customization?.embroideryData?.designImage) {
                                      return (
                                        <img
                                          src={item.customization.embroideryData.designImage}
                                          alt="Uploaded Design"
                                          className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                          onClick={() => handleImageClick(
                                            item.customization.embroideryData.designImage,
                                            'Uploaded Design',
                                            'design'
                                          )}
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                          }}
                                        />
                                      );
                                    }
                                    // For custom embroidery items with design preview
                                    if (item.productId === 'custom-embroidery' && item.customization?.design?.preview) {
                                      return (
                                        <img
                                          src={item.customization.design.preview}
                                          alt="Uploaded Design"
                                          className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                          onClick={() => handleImageClick(
                                            item.customization.design.preview,
                                            'Uploaded Design',
                                            'design'
                                          )}
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                          }}
                                        />
                                      );
                                    }
                                    // For regular products with customization - show final product mockup
                                    if (item.customization?.mockup) {
                                      return (
                                        <img
                                          src={item.customization.mockup}
                                          alt="Final Product"
                                          className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                          onClick={() => handleImageClick(
                                            item.customization.mockup,
                                            'Final Product',
                                            'mockup'
                                          )}
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                          }}
                                        />
                                      );
                                    }
                                    // For regular products without customization - show product image
                                    if (item.product?.image) {
                                      return (
                                        <img
                                          src={item.product.image}
                                          alt={item.product.title}
                                          className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                          onClick={() => handleImageClick(
                                            item.product.image,
                                            item.product.title,
                                            'product'
                                          )}
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                          }}
                                        />
                                      );
                                    }
                                    // Default placeholder
                                    return (
                                      <div className="w-16 h-16 bg-gray-200 rounded border flex items-center justify-center">
                                        <span className="text-xs text-gray-500">No Image</span>
                                      </div>
                                    );
                                  })()}
              </div>
              
                                {/* Item Details and Picture Reply */}
                                <div className="flex-1">
                                  <h5 className="font-medium text-gray-900 mb-1">
                                    {(() => {
                                      // For custom embroidery items - show design name
                                      if (item.productId === 'custom-embroidery' && item.customization?.embroideryData?.designName) {
                                        return `Custom Embroidery: ${item.customization.embroideryData.designName}`;
                                      }
                                      // For custom embroidery items with design name in customization
                                      if (item.productId === 'custom-embroidery' && item.customization?.design?.name) {
                                        return `Custom Embroidery: ${item.customization.design.name}`;
                                      }
                                      // For regular products
                                      return item.product?.title || 'Custom Product';
                                    })()}
                                  </h5>
                                  <p className="text-sm text-gray-500 mb-3">Qty: {item.quantity || 1}</p>
                                  
                                  {/* Existing Admin Picture Replies */}
                                  {(() => {
                                    // Parse admin picture replies if it's a string
                                    let adminPictureReplies = selectedReview.admin_picture_replies;
                                    if (typeof adminPictureReplies === 'string') {
                                      try {
                                        adminPictureReplies = JSON.parse(adminPictureReplies);
                                      } catch (e) {
                                        adminPictureReplies = [];
                                      }
                                    }
                                    
                                    const existingReplies = (adminPictureReplies && Array.isArray(adminPictureReplies)) 
                                      ? adminPictureReplies.filter((reply: any) => {
                                          const replyItemId = reply.itemId;
                                          return replyItemId === item.id || replyItemId === itemKey;
                                        })
                                      : [];
                                    
                                    if (existingReplies.length > 0) {
                                      return (
                                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                          <h6 className="text-sm font-medium text-blue-900 mb-2">Admin Picture Replies</h6>
                                          {existingReplies.map((reply: any, replyIndex: number) => (
                                            <div key={replyIndex} className="mb-3 last:mb-0">
                                              <div className="flex items-start space-x-3">
                                                <img
                                                  src={reply.image}
                                                  alt="Admin Picture Reply"
                                                  className="w-20 h-20 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                                  onClick={() => handleImageClick(
                                                    reply.image,
                                                    'Admin Picture Reply',
                                                    'admin-reply'
                                                  )}
                                                />
                                                <div className="flex-1">
                                                  <p className="text-xs text-blue-700 mb-1">
                                                    <strong>Uploaded:</strong> {reply.uploadedAt ? new Date(reply.uploadedAt).toLocaleDateString() : 'Unknown'}
                                                  </p>
                                                  {reply.notes && (
                                                    <p className="text-xs text-blue-600">
                                                      <strong>Notes:</strong> {reply.notes}
                                                    </p>
                                                  )}
                                                  {/* Customer Confirmation Status */}
                                                  {(() => {
                                                    // Parse customer confirmations if it's a string
                                                    let customerConfirmations = selectedReview.customer_confirmations;
                                                    if (typeof customerConfirmations === 'string') {
                                                      try {
                                                        customerConfirmations = JSON.parse(customerConfirmations);
                                                      } catch (e) {
                                                        customerConfirmations = [];
                                                      }
                                                    }
                                                    
                                                    const customerConfirmation = customerConfirmations?.find((conf: any) => conf.itemId === reply.itemId);
                                                    if (customerConfirmation) {
                                                      return (
                                                        <div className="mt-2">
                                                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                            customerConfirmation.confirmed === true 
                                                              ? 'bg-green-100 text-green-800' 
                                                              : customerConfirmation.confirmed === false
                                                              ? 'bg-red-100 text-red-800'
                                                              : 'bg-yellow-100 text-yellow-800'
                                                          }`}>
                                                            {customerConfirmation.confirmed === true ? '✓ Confirmed by Customer' : 
                                                             customerConfirmation.confirmed === false ? '✗ Rejected by Customer' : 
                                                             '⏳ Pending Customer Review'}
                                                          </span>
                                                          {customerConfirmation.notes && (
                                                            <p className="text-xs text-gray-600 mt-1">
                                                              <strong>Customer Notes:</strong> {customerConfirmation.notes}
                                                            </p>
                                                          )}
                                                        </div>
                                                      );
                                                    }
                                                    return (
                                                      <div className="mt-2">
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                          ⏳ Awaiting Customer Review
                                                        </span>
                                                      </div>
                                                    );
                                                  })()}
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}
                                  
                                  {/* Status-specific content */}
                                  {selectedReview.status === 'pending' && (
                                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                      <div className="flex items-center space-x-2">
                                        <Clock className="h-4 w-4 text-yellow-600" />
                                        <span className="text-sm font-medium text-yellow-800">
                                          Review this order first, then move to "Picture Reply Pending" to upload picture replies
                                        </span>
                                      </div>
                                    </div>
                                  )}

                                  {selectedReview.status === 'needs-changes' && (
                                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                      <div className="flex items-center space-x-2">
                                        <ImageIcon className="h-4 w-4 text-blue-600" />
                                        <span className="text-sm font-medium text-blue-800">
                                          Upload picture replies for customer review
                                        </span>
                                      </div>
                                    </div>
                                  )}

                                  {selectedReview.status === 'pending-payment' && (
                                    <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                      <div className="flex items-center space-x-2">
                                        <CreditCard className="h-4 w-4 text-orange-600" />
                                        <span className="text-sm font-medium text-orange-800">
                                          Customer approved the design - Payment required to proceed
                                        </span>
                                      </div>
                                    </div>
                                  )}

                                  {selectedReview.status === 'approved-processing' && (
                                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                      <div className="flex items-center space-x-2">
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                        <span className="text-sm font-medium text-green-800">
                                          Payment received - Design is being processed
                                        </span>
                                      </div>
                                    </div>
                                  )}

                                  {/* Picture Upload - Only show when order is in picture reply pending status */}
                                  {selectedReview.status === 'needs-changes' && (
                                    <>
                                      <div className="mb-3">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                          Upload Picture Reply
                                        </label>
                                        <div className="flex items-center space-x-4">
                                          <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                              console.log('📁 File input changed for item:', itemKey);
                                              const file = e.target.files?.[0]
                                              console.log('📁 Selected file:', file);
                                              if (file) {
                                                handlePictureReplyUpload(itemKey, file)
                                              } else {
                                                console.log('❌ No file selected');
                                              }
                                            }}
                                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                          />
                                          {pictureReplies[itemKey]?.image && (
                                            <div className="flex items-center space-x-2 text-green-600">
                                              <Check className="h-4 w-4" />
                                              <span className="text-sm">Uploaded</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {/* Notes */}
                                      <div className="mb-3">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                          Notes (Optional)
                                        </label>
                                        <textarea
                                          value={pictureReplies[itemKey]?.notes || ''}
                                          onChange={(e) => handlePictureReplyNotesChange(itemKey, e.target.value)}
                                          rows={2}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                          placeholder="Add any notes about this picture reply..."
                                        />
                                      </div>
                                      
                                      {/* Preview */}
                                      {pictureReplies[itemKey]?.image && (
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Preview
                                          </label>
                                          <img
                                            src={pictureReplies[itemKey].image}
                                            alt="Preview"
                                            className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                                          />
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
              
              <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex space-x-3">
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
                  
                  {/* Status Update Button - Show for all statuses */}
                <button
                  onClick={() => {
                      setAdminNotes(selectedReview.admin_notes || '')
                      setIsStatusModalOpen(true)
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Update Status
                </button>
              </div>
                
                {/* Picture Reply Actions - Only show when order is in picture reply pending status */}
                {selectedReview.status === 'needs-changes' && (
                  <div className="flex space-x-3">
                    {(() => {
                      console.log('🔍 Current pictureReplies state:', pictureReplies);
                      console.log('🔍 Picture replies keys:', Object.keys(pictureReplies));
                      console.log('🔍 Should show button:', Object.keys(pictureReplies).length > 0);
                      return null;
                    })()}
                    {Object.keys(pictureReplies).length > 0 && (
                      <button
                        onClick={handleSubmitPictureReplies}
                        disabled={uploadingPictures}
                        className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {uploadingPictures ? 'Uploading...' : 'Upload Picture Replies'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {isStatusModalOpen && selectedReview && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsStatusModalOpen(false)}></div>
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Update Review Status - Order #{selectedReview.id}
                </h2>
                <button
                  onClick={() => setIsStatusModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                {/* Workflow Steps */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Order Workflow Steps</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        selectedReview.status === 'pending' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                      }`}>1</div>
                      <span className={selectedReview.status === 'pending' ? 'text-blue-800 font-medium' : 'text-gray-600'}>
                        Review Order & Design
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        selectedReview.status === 'needs-changes' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                      }`}>2</div>
                      <span className={selectedReview.status === 'needs-changes' ? 'text-blue-800 font-medium' : 'text-gray-600'}>
                        Upload Picture Reply
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        selectedReview.status === 'pending-payment' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-600'
                      }`}>3</div>
                      <span className={selectedReview.status === 'pending-payment' ? 'text-orange-800 font-medium' : 'text-gray-600'}>
                        Customer Approves & Payment Required
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        selectedReview.status === 'approved-processing' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>4</div>
                      <span className={selectedReview.status === 'approved-processing' ? 'text-green-800 font-medium' : 'text-gray-600'}>
                        Proceed to Production
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Update Status
                  </label>
                  <select
                    value={selectedReview.status}
                    onChange={(e) => setSelectedReview({...selectedReview, status: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="pending">1. Pending Review</option>
                    <option value="needs-changes">2. Picture Reply Pending</option>
                    <option value="pending-payment">3. Pending Payment</option>
                    <option value="approved-processing">4. Approved - Processing Design</option>
                    <option value="rejected">Rejected - Needs Re-upload</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Notes
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add notes for the customer..."
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => setIsStatusModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleStatusUpdate(selectedReview.id, selectedReview.status, adminNotes)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Update Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {isImageModalOpen && selectedImage && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-75" onClick={() => setIsImageModalOpen(false)}></div>
            <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedImage.type === 'design' ? 'Uploaded Design - Custom Embroidery' : 
                   selectedImage.type === 'mockup' ? 'Final Product - Customized Item' : 
                   'Product Image'}
                </h2>
                <button
                  onClick={() => setIsImageModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="p-6 flex justify-center">
                <img
                  src={selectedImage.src}
                  alt={selectedImage.alt}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzZiNzI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBmb3VuZDwvdGV4dD48L3N2Zz4=';
                  }}
                />
              </div>
              
              <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => setIsImageModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default PendingReview
