import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { Package, Truck, CheckCircle, Clock, XCircle, Search, Filter, X, CreditCard, DollarSign, AlertCircle, RotateCcw, Eye, MessageSquare, Image as ImageIcon, Upload, Check, User } from 'lucide-react'
import Button from '../../components/Button'
import RefundRequestModal, { RefundRequest } from '../components/RefundRequestModal'
import { orderReviewApiService, OrderReview, PictureReply, CustomerConfirmation } from '../../shared/orderReviewApiService'
import { useWebSocket } from '../../hooks/useWebSocket'

interface OrderItem {
  id: string
  productId: string
  productName: string
  productImage: string
  quantity: number
  price: number
  customization?: {
    design?: {
      name: string
      preview: string
    }
    mockup?: string
    selectedStyles?: any
    placement?: string
    size?: string
    color?: string
    notes?: string
  }
}

interface Order {
  id: number
  orderNumber: string
  status: 'pending-review' | 'rejected-needs-upload' | 'picture-reply-pending' | 'picture-reply-rejected' | 'picture-reply-approved' | 'pending-payment' | 'approved-processing' | 'ready-for-production' | 'in-production' | 'ready-for-checkout'
  orderDate: string
  total: number
  items: OrderItem[]
  adminNotes?: string
  reviewedAt?: string
  adminPictureReplies?: PictureReply[]
  customerConfirmations?: CustomerConfirmation[]
  pictureReplyUploadedAt?: string
  customerConfirmedAt?: string
  originalOrderData?: any[] // Store original order data for matching
}

// Helper function to convert OrderReview to Order
const convertOrderReviewToOrder = (orderReview: OrderReview): Order => {
  const orderData = Array.isArray(orderReview.order_data) 
    ? orderReview.order_data 
    : JSON.parse(orderReview.order_data as string);

  console.log('🔍 Converting order review to order:', {
    orderId: orderReview.id,
    orderData: orderData,
    total: orderReview.total,
    adminPictureReplies: orderReview.admin_picture_replies,
    adminPictureRepliesType: typeof orderReview.admin_picture_replies,
    status: orderReview.status
  });

  // Debug picture replies and item IDs
  if (orderReview.admin_picture_replies) {
    const parsedReplies = Array.isArray(orderReview.admin_picture_replies) ? 
      orderReview.admin_picture_replies : 
      JSON.parse(orderReview.admin_picture_replies as string);
    console.log('🔍 Picture replies debug:', {
      replies: parsedReplies,
      itemIds: parsedReplies.map((r: any) => r.itemId),
      orderItemIds: orderData.map((item: any) => ({ 
        id: item.id, 
        productId: item.productId,
        productName: item.product?.title || item.productName,
        productImage: item.product?.image
      }))
    });
  }

  // Map old statuses to new statuses
  const mapStatus = (oldStatus: string): Order['status'] => {
    switch (oldStatus) {
      case 'pending':
        return 'pending-review'
      case 'approved':
        return 'pending-payment' // After customer approves, goes to pending payment
      case 'rejected':
        return 'rejected-needs-upload'
      case 'needs-changes':
        return 'picture-reply-pending'
      case 'picture-reply-approved':
        return 'pending-payment' // After customer approves picture reply, goes to pending payment
      case 'pending-payment':
        return 'pending-payment'
      case 'approved-processing':
        return 'approved-processing'
      case 'in-production':
        return 'in-production'
      case 'ready-for-checkout':
        return 'ready-for-checkout'
      default:
        return oldStatus as Order['status']
    }
  }

  const convertedOrder = {
    id: orderReview.id,
    orderNumber: `MC-${orderReview.id}`,
    status: mapStatus(orderReview.status),
    orderDate: orderReview.submitted_at,
    total: Number(orderReview.total) || 0,
    items: orderData.map((item: any) => {
      let itemPrice = 0;
      
      console.log('🔍 Processing item:', {
        productId: item.productId,
        productPrice: item.product?.price,
        customization: item.customization,
        embroideryData: item.customization?.embroideryData
      });
      
      // For custom embroidery items, use the embroidery total price
      if (item.productId === 'custom-embroidery' && item.customization?.embroideryData?.totalPrice) {
        itemPrice = Number(item.customization.embroideryData.totalPrice) || 0;
        console.log('💰 Custom embroidery price:', itemPrice);
      }
      // For regular products with customization, calculate total price including customization costs
      else if (item.customization?.selectedStyles) {
        let basePrice = Number(item.product?.price) || 0;
        let customizationCost = 0;
        
        // Add costs from selected styles
        const { selectedStyles } = item.customization;
        if (selectedStyles.coverage) customizationCost += Number(selectedStyles.coverage.price) || 0;
        if (selectedStyles.material) customizationCost += Number(selectedStyles.material.price) || 0;
        if (selectedStyles.border) customizationCost += Number(selectedStyles.border.price) || 0;
        if (selectedStyles.threads) {
          selectedStyles.threads.forEach((thread: any) => {
            customizationCost += Number(thread.price) || 0;
          });
        }
        if (selectedStyles.backing) customizationCost += Number(selectedStyles.backing.price) || 0;
        if (selectedStyles.upgrades) {
          selectedStyles.upgrades.forEach((upgrade: any) => {
            customizationCost += Number(upgrade.price) || 0;
          });
        }
        if (selectedStyles.cutting) customizationCost += Number(selectedStyles.cutting.price) || 0;
        
        itemPrice = basePrice + customizationCost;
        console.log('💰 Regular product with customization:', { basePrice, customizationCost, total: itemPrice });
      }
      // For regular products without customization, use base price
      else {
        itemPrice = Number(item.product?.price) || 0;
        console.log('💰 Regular product without customization:', itemPrice);
      }
      
      return {
        id: item.id || item.productId,
        productId: item.productId,
        productName: (() => {
          // For custom embroidery items - show design name
          if (item.productId === 'custom-embroidery' && item.customization?.embroideryData?.designName) {
            return `Custom Embroidery: ${item.customization.embroideryData.designName}`;
          }
          // For custom embroidery items with design name in customization
          if (item.productId === 'custom-embroidery' && item.customization?.design?.name) {
            return `Custom Embroidery: ${item.customization.design.name}`;
          }
          // For regular products
          return item.product?.title || item.productName || 'Custom Product';
        })(),
        productImage: (() => {
          // For custom embroidery items - show uploaded design
          if (item.productId === 'custom-embroidery' && item.customization?.embroideryData?.designImage) {
            return item.customization.embroideryData.designImage;
          }
          // For custom embroidery items with design preview
          if (item.productId === 'custom-embroidery' && item.customization?.design?.preview) {
            return item.customization.design.preview;
          }
          // For regular products with customization - show final product mockup
          if (item.customization?.mockup) {
            return item.customization.mockup;
          }
          // For regular products without customization - show product image
          if (item.product?.image) {
            return item.product.image;
          }
          // Default placeholder
          return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAiIGhlaWdodD0iODAiIGZpbGw9IiNmM2Y0ZjYiLz48dGV4dCB4PSI0MCIgeT0iNDAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMCIgZmlsbD0iIzZiNzI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
        })(),
        quantity: item.quantity || 1,
        price: itemPrice,
        customization: item.customization
      };
    }),
    adminNotes: orderReview.admin_notes,
    reviewedAt: orderReview.reviewed_at,
    adminPictureReplies: orderReview.admin_picture_replies ? 
      (Array.isArray(orderReview.admin_picture_replies) ? 
        orderReview.admin_picture_replies : 
        (() => {
          try {
            return JSON.parse(orderReview.admin_picture_replies as string);
          } catch (error) {
            console.error('Error parsing admin_picture_replies:', error);
            return [];
          }
        })()) : 
      undefined,
    customerConfirmations: orderReview.customer_confirmations ? 
      (Array.isArray(orderReview.customer_confirmations) ? 
        orderReview.customer_confirmations : 
        (() => {
          try {
            return JSON.parse(orderReview.customer_confirmations as string);
          } catch (error) {
            console.error('Error parsing customer_confirmations:', error);
            return [];
          }
        })()) : 
      undefined,
    pictureReplyUploadedAt: orderReview.picture_reply_uploaded_at,
    customerConfirmedAt: orderReview.customer_confirmed_at,
    originalOrderData: orderData // Store original order data for matching
  };

  console.log('🔍 Final converted order:', {
    orderId: convertedOrder.id,
    status: convertedOrder.status,
    hasAdminPictureReplies: !!convertedOrder.adminPictureReplies,
    adminPictureRepliesLength: convertedOrder.adminPictureReplies?.length || 0,
    adminPictureReplies: convertedOrder.adminPictureReplies
  });

  return convertedOrder;
};

const getStatusIcon = (status: Order['status']) => {
  switch (status) {
    case 'pending-review':
      return <Clock className="w-5 h-5 text-yellow-500" />
    case 'rejected-needs-upload':
      return <XCircle className="w-5 h-5 text-red-500" />
    case 'picture-reply-pending':
      return <ImageIcon className="w-5 h-5 text-blue-500" />
    case 'picture-reply-rejected':
      return <XCircle className="w-5 h-5 text-red-500" />
    case 'picture-reply-approved':
      return <CheckCircle className="w-5 h-5 text-green-500" />
    case 'pending-payment':
      return <CreditCard className="w-5 h-5 text-orange-500" />
    case 'approved-processing':
      return <CheckCircle className="w-5 h-5 text-green-500" />
    case 'ready-for-production':
      return <AlertCircle className="w-5 h-5 text-orange-500" />
    case 'in-production':
      return <Truck className="w-5 h-5 text-blue-500" />
    case 'ready-for-checkout':
      return <CreditCard className="w-5 h-5 text-purple-500" />
    default:
      return <Clock className="w-5 h-5 text-gray-500" />
  }
}

const getStatusText = (status: Order['status']) => {
  switch (status) {
    case 'pending-review':
      return 'Pending Admin Review'
    case 'rejected-needs-upload':
      return 'Rejected - Re-upload Required'
    case 'picture-reply-pending':
      return 'Picture Reply Pending'
    case 'picture-reply-rejected':
      return 'Picture Rejected - Admin Will Re-upload'
    case 'picture-reply-approved':
      return 'Picture Approved'
    case 'pending-payment':
      return 'Pending Payment'
    case 'approved-processing':
      return 'Approved - Processing Design'
    case 'ready-for-production':
      return 'Ready for Production'
    case 'in-production':
      return 'In Production'
    case 'ready-for-checkout':
      return 'Ready for Checkout'
    default:
      return 'Unknown'
  }
}

const getStatusColor = (status: Order['status']) => {
  switch (status) {
    case 'pending-review':
      return 'bg-yellow-100 text-yellow-800'
    case 'rejected-needs-upload':
      return 'bg-red-100 text-red-800'
    case 'picture-reply-pending':
      return 'bg-blue-100 text-blue-800'
    case 'picture-reply-rejected':
      return 'bg-red-100 text-red-800'
    case 'picture-reply-approved':
      return 'bg-green-100 text-green-800'
    case 'pending-payment':
      return 'bg-orange-100 text-orange-800'
    case 'approved-processing':
      return 'bg-green-100 text-green-800'
    case 'ready-for-production':
      return 'bg-orange-100 text-orange-800'
    case 'in-production':
      return 'bg-blue-100 text-blue-800'
    case 'ready-for-checkout':
      return 'bg-purple-100 text-purple-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

// Helper function to find item by reply itemId
const findItemForReply = (reply: PictureReply, order: Order): { productName: string; productImage: string; quantity: number } => {
  console.log('🔍 Finding item for reply:', {
    replyItemId: reply.itemId,
    orderItems: order.items.map(item => ({ id: item.id, productId: item.productId })),
    originalOrderData: order.originalOrderData?.map(item => ({ id: item.id, productId: item.productId }))
  });

  // First try to find in converted items by exact ID match
  let item = order.items.find(item => item.id === reply.itemId);
  
  if (item) {
    console.log('✅ Found item in converted items:', item);
    return {
      productName: item.productName,
      productImage: item.productImage,
      quantity: item.quantity
    };
  }
  
  // Try to find by productId as fallback
  item = order.items.find(item => item.productId === reply.itemId);
  
  if (item) {
    console.log('✅ Found item by productId in converted items:', item);
    return {
      productName: item.productName,
      productImage: item.productImage,
      quantity: item.quantity
    };
  }
  
  // If item not found, try to find it in the original order data
  if (order.originalOrderData) {
    let originalItem = order.originalOrderData.find(origItem => origItem.id === reply.itemId);
    
    if (!originalItem) {
      // Try by productId as fallback
      originalItem = order.originalOrderData.find(origItem => origItem.productId === reply.itemId);
    }
    
    if (originalItem) {
      console.log('✅ Found item in original order data:', originalItem);
      return {
        productName: (() => {
          // For custom embroidery items - show design name
          if (originalItem.productId === 'custom-embroidery' && originalItem.customization?.embroideryData?.designName) {
            return `Custom Embroidery: ${originalItem.customization.embroideryData.designName}`;
          }
          // For custom embroidery items with design name in customization
          if (originalItem.productId === 'custom-embroidery' && originalItem.customization?.design?.name) {
            return `Custom Embroidery: ${originalItem.customization.design.name}`;
          }
          // For regular products
          return originalItem.product?.title || originalItem.productName || 'Custom Product';
        })(),
        productImage: (() => {
          // For custom embroidery items - show uploaded design
          if (originalItem.productId === 'custom-embroidery' && originalItem.customization?.embroideryData?.designImage) {
            return originalItem.customization.embroideryData.designImage;
          }
          // For custom embroidery items with design preview
          if (originalItem.productId === 'custom-embroidery' && originalItem.customization?.design?.preview) {
            return originalItem.customization.design.preview;
          }
          // For regular products with customization - show final product mockup
          if (originalItem.customization?.mockup) {
            return originalItem.customization.mockup;
          }
          // For regular products without customization - show product image
          if (originalItem.product?.image) {
            return originalItem.product.image;
          }
          // Default placeholder
          return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAiIGhlaWdodD0iODAiIGZpbGw9IiNmM2Y0ZjYiLz48dGV4dCB4PSI0MCIgeT0iNDAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMCIgZmlsbD0iIzZiNzI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
        })(),
        quantity: originalItem.quantity || 1
      };
    }
  }
  
  console.log('❌ Item not found for reply:', reply.itemId);
  
  // Fallback
  return {
    productName: 'Custom Product',
    productImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAiIGhlaWdodD0iODAiIGZpbGw9IiNmM2Y0ZjYiLz48dGV4dCB4PSI0MCIgeT0iNDAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMCIgZmlsbD0iIzZiNzI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==',
    quantity: 1
  };
}


export default function MyOrders() {
  const { user, isLoggedIn } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  const [pictureConfirmations, setPictureConfirmations] = useState<{[itemId: string]: {confirmed: boolean | null, notes: string}}>({})
  const [submittingConfirmations, setSubmittingConfirmations] = useState(false)
  const [showReuploadModal, setShowReuploadModal] = useState(false)
  const [reuploadFiles, setReuploadFiles] = useState<{[itemId: string]: File | null}>({})
  const [submittingReupload, setSubmittingReupload] = useState(false)
  
  // WebSocket hook for real-time updates
  const { subscribe, isConnected } = useWebSocket()

  // Load orders on component mount
  useEffect(() => {
    if (isLoggedIn) {
      loadOrders()
    }
  }, [isLoggedIn])

  // WebSocket event listeners for real-time updates
  useEffect(() => {
    if (!isConnected || !isLoggedIn) return;

    // Listen for picture reply received
    const unsubscribePictureReply = subscribe('picture_reply_received', (data) => {
      console.log('🔌 Real-time picture reply received:', data);
      setOrders(prev => prev.map(order => 
        order.id === data.orderId 
          ? { 
              ...order, 
              adminPictureReplies: data.replyData.pictureReplies,
              status: 'picture-reply-pending'
            }
          : order
      ));
    });

    // Listen for order status updates
    const unsubscribeStatusUpdate = subscribe('order_status_updated', (data) => {
      console.log('🔌 Real-time order status update:', data);
      setOrders(prev => prev.map(order => 
        order.id === data.orderId 
          ? { 
              ...order, 
              status: data.statusData.status
            }
          : order
      ));
    });

    // Listen for confirmation submitted
    const unsubscribeConfirmation = subscribe('confirmation_submitted', (data) => {
      console.log('🔌 Real-time confirmation submitted:', data);
      // Update the order with confirmation data
      setOrders(prev => prev.map(order => 
        order.id === data.orderId 
          ? { 
              ...order, 
              customerConfirmations: data.confirmationData.confirmations,
              status: data.confirmationData.confirmations.some((c: any) => c.confirmed === false) 
                ? 'rejected-needs-upload' 
                : 'pending-payment'
            }
          : order
      ));
    });

    // Cleanup subscriptions
    return () => {
      unsubscribePictureReply();
      unsubscribeStatusUpdate();
      unsubscribeConfirmation();
    };
  }, [isConnected, isLoggedIn, subscribe]);

  const loadOrders = async () => {
    try {
      setLoading(true)
      console.log('🔄 Loading user orders...')
      const response = await orderReviewApiService.getUserReviewOrders()
      console.log('📊 Orders API response:', response)
      
      if (response.success && response.data) {
        const convertedOrders = response.data.map(convertOrderReviewToOrder)
        console.log('✅ Orders loaded:', convertedOrders)
        setOrders(convertedOrders)
      } else {
        console.log('❌ Failed to load orders:', response.message)
        setOrders([])
      }
    } catch (error) {
      console.error('❌ Error loading orders:', error)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetails = (order: Order) => {
    console.log('🔍 Opening order details:', {
      orderId: order.id,
      status: order.status,
      hasAdminPictureReplies: !!order.adminPictureReplies,
      adminPictureRepliesLength: order.adminPictureReplies?.length || 0,
      adminPictureReplies: order.adminPictureReplies,
      items: order.items.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName
      }))
    });
    
    setSelectedOrder(order)
    setShowOrderDetails(true)
    
    // Load existing picture confirmations if any
    if (order.adminPictureReplies && order.adminPictureReplies.length > 0) {
      const existingConfirmations: {[itemId: string]: {confirmed: boolean | null, notes: string}} = {};
      
      console.log('🔍 Loading existing confirmations:', {
        orderId: order.id,
        adminPictureReplies: order.adminPictureReplies,
        customerConfirmations: order.customerConfirmations,
        customerConfirmationsType: typeof order.customerConfirmations
      });
      
      // Check if there are existing customer confirmations
      if (order.customerConfirmations && Array.isArray(order.customerConfirmations)) {
        order.customerConfirmations.forEach(conf => {
          existingConfirmations[conf.itemId] = {
            confirmed: conf.confirmed,
            notes: conf.notes || ''
          };
        });
        console.log('✅ Loaded existing confirmations:', existingConfirmations);
      } else {
        console.log('ℹ️ No existing confirmations found');
      }
      
      setPictureConfirmations(existingConfirmations);
    }
  }

  const handleCloseModal = () => {
    setShowOrderDetails(false)
    setSelectedOrder(null)
    setPictureConfirmations({})
  }

  // Handle picture confirmation change
  const handlePictureConfirmationChange = (itemId: string, confirmed: boolean) => {
    setPictureConfirmations(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        confirmed
      }
    }))
  }

  // Handle picture confirmation notes change
  const handlePictureConfirmationNotesChange = (itemId: string, notes: string) => {
    setPictureConfirmations(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        notes
      }
    }))
  }

  // Submit picture confirmations
  const handleSubmitPictureConfirmations = async () => {
    if (!selectedOrder) return

    try {
      setSubmittingConfirmations(true)
      
      const confirmationData: CustomerConfirmation[] = Object.entries(pictureConfirmations)
        .filter(([_, data]) => data.confirmed !== null) // Only include items with a decision
        .map(([itemId, data]) => ({
          itemId,
          confirmed: data.confirmed!,
          notes: data.notes || undefined
        }))

      const response = await orderReviewApiService.confirmPictureReplies(selectedOrder.id, confirmationData)
      
      if (response.success) {
        // Check if all pictures were approved
        const allApproved = confirmationData.every(conf => conf.confirmed === true)
        const anyRejected = confirmationData.some(conf => conf.confirmed === false)
        
        if (allApproved) {
          alert('All pictures approved! Order is ready for production.')
        } else if (anyRejected) {
          alert('Some pictures were rejected. Admin will upload new designs.')
        }
        
        setPictureConfirmations({})
        // Reload orders to get updated data
        loadOrders()
      } else {
        alert('Failed to submit confirmations. Please try again.')
      }
    } catch (error) {
      console.error('Error submitting confirmations:', error)
      alert('Error submitting confirmations. Please try again.')
    } finally {
      setSubmittingConfirmations(false)
    }
  }

  // Handle proceed to checkout
  const handleProceedToCheckout = (order: Order) => {
    // Navigate to checkout with the order data
    // This would typically involve passing the order data to the checkout page
    console.log('Proceeding to checkout for order:', order)
    // For now, just show an alert - you can implement the actual checkout flow
    alert('Proceeding to checkout...')
  }

  // Handle re-upload modal
  const handleOpenReuploadModal = (order: Order) => {
    setSelectedOrder(order)
    setShowReuploadModal(true)
    setReuploadFiles({})
  }

  const handleCloseReuploadModal = () => {
    setShowReuploadModal(false)
    setSelectedOrder(null)
    setReuploadFiles({})
  }

  // Handle file selection for re-upload
  const handleReuploadFileChange = (itemId: string, file: File | null) => {
    setReuploadFiles(prev => ({
      ...prev,
      [itemId]: file
    }))
  }

  // Submit re-uploaded files
  const handleSubmitReupload = async () => {
    if (!selectedOrder) return

    try {
      setSubmittingReupload(true)
      
      // Convert files to base64
      const reuploadData = await Promise.all(
        Object.entries(reuploadFiles)
          .filter(([_, file]) => file !== null)
          .map(async ([itemId, file]) => {
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader()
              reader.onload = () => resolve(reader.result as string)
              reader.readAsDataURL(file!)
            })
            return {
              itemId,
              designFile: base64,
              fileName: file!.name
            }
          })
      )

      // Submit re-upload (you'll need to implement this API endpoint)
      console.log('Re-uploading files:', reuploadData)
      alert('Re-upload functionality will be implemented with backend API')
      
      // Close modal and reload orders
      handleCloseReuploadModal()
      loadOrders()
    } catch (error) {
      console.error('Error re-uploading files:', error)
      alert('Error re-uploading files. Please try again.')
    } finally {
      setSubmittingReupload(false)
    }
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

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your orders...</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center space-x-4">
          <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
          {/* WebSocket connection status */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              {isConnected ? 'Live Updates' : 'Offline'}
            </span>
          </div>
        </div>
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
            <option value="pending-review">Pending Admin Review</option>
            <option value="rejected-needs-upload">Rejected - Re-upload Required</option>
            <option value="picture-reply-pending">Picture Reply Pending</option>
            <option value="picture-reply-rejected">Picture Rejected</option>
            <option value="picture-reply-approved">Picture Approved</option>
            <option value="pending-payment">Pending Payment</option>
            <option value="approved-processing">Approved - Processing Design</option>
            <option value="ready-for-production">Ready for Production</option>
            <option value="in-production">In Production</option>
            <option value="ready-for-checkout">Ready for Checkout</option>
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
                    <p className="text-lg font-semibold text-gray-900">${(Number(order.total) || 0).toFixed(2)}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Submitted: {new Date(order.orderDate).toLocaleDateString()}
                    </p>
                    {order.reviewedAt && (
                      <p className="text-sm text-gray-500">
                        Reviewed: {new Date(order.reviewedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                </div>

                {/* Status Message */}
                {selectedOrder && selectedOrder.status === 'pending-payment' && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <CreditCard className="h-6 w-6 text-orange-600" />
                      <div>
                        <h3 className="text-lg font-medium text-orange-800">Payment Required</h3>
                        <p className="text-sm text-orange-700 mt-1">
                          Your design has been approved! Please proceed to checkout to complete your payment and begin processing.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedOrder && selectedOrder.status === 'approved-processing' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                      <div>
                        <h3 className="text-lg font-medium text-green-800">Design Approved!</h3>
                        <p className="text-sm text-green-700 mt-1">
                          Your design has been approved and is being processed. You can now proceed to checkout to complete your order.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

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
                            {item.customization.design && (
                              <p>Design: {item.customization.design.name}</p>
                            )}
                            {item.customization.placement && (
                              <p>Placement: {item.customization.placement}</p>
                            )}
                            {item.customization.size && (
                              <p>Size: {item.customization.size}</p>
                            )}
                            {item.customization.color && (
                              <p>Color: {item.customization.color}</p>
                            )}
                            {item.customization.notes && (
                              <p>Notes: {item.customization.notes}</p>
                            )}
                          </div>
                        )}
                        
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">${((Number(item.price) || 0) * (item.quantity || 1)).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Actions */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    <p>Submitted: {new Date(order.orderDate).toLocaleDateString()}</p>
                    {order.reviewedAt && (
                      <p>Reviewed: {new Date(order.reviewedAt).toLocaleDateString()}</p>
                    )}
                    {order.adminNotes && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                        <div className="flex items-start space-x-2">
                          <MessageSquare className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-blue-800">Admin Notes:</p>
                            <p className="text-xs text-blue-700">{order.adminNotes}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewDetails(order)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Details
                    </Button>
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
                      <p className="text-sm font-medium text-gray-500">Submitted Date</p>
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
                      <p className="text-lg font-semibold text-gray-900">${(Number(selectedOrder.total) || 0).toFixed(2)}</p>
                    </div>
                    {selectedOrder.reviewedAt && (
                    <div>
                        <p className="text-sm font-medium text-gray-500">Reviewed Date</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {new Date(selectedOrder.reviewedAt).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {selectedOrder.adminNotes && (
                      <div className="col-span-2">
                        <p className="text-sm font-medium text-gray-500">Admin Notes</p>
                        <div className="mt-1 p-3 bg-blue-50 border border-blue-200 rounded">
                          <p className="text-sm text-blue-800">{selectedOrder.adminNotes}</p>
                    </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Message */}
                {selectedOrder && selectedOrder.status === 'pending-payment' && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <CreditCard className="h-6 w-6 text-orange-600" />
                      <div>
                        <h3 className="text-lg font-medium text-orange-800">Payment Required</h3>
                        <p className="text-sm text-orange-700 mt-1">
                          Your design has been approved! Please proceed to checkout to complete your payment and begin processing.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedOrder && selectedOrder.status === 'approved-processing' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                      <div>
                        <h3 className="text-lg font-medium text-green-800">Design Approved!</h3>
                        <p className="text-sm text-green-700 mt-1">
                          Your design has been approved and is being processed. You can now proceed to checkout to complete your order.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

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
                          <p className="text-sm text-gray-500">Price: ${(Number(item.price) || 0).toFixed(2)} each</p>
                          {item.customization && (
                            <div className="mt-2 text-sm text-gray-600">
                              {item.customization.design && (
                                <p><strong>Design:</strong> {item.customization.design.name}</p>
                              )}
                              {item.customization.placement && (
                                <p><strong>Placement:</strong> {item.customization.placement}</p>
                              )}
                              {item.customization.size && (
                                <p><strong>Size:</strong> {item.customization.size}</p>
                              )}
                              {item.customization.color && (
                              <p><strong>Color:</strong> {item.customization.color}</p>
                              )}
                              {item.customization.notes && (
                                <p><strong>Notes:</strong> {item.customization.notes}</p>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">${((Number(item.price) || 0) * (item.quantity || 1)).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Picture Replies Section - Grouped by Product */}
                {(() => {
                  console.log('🔍 Debug adminPictureReplies:', {
                    hasAdminPictureReplies: !!selectedOrder.adminPictureReplies,
                    isArray: Array.isArray(selectedOrder.adminPictureReplies),
                    length: selectedOrder.adminPictureReplies?.length,
                    adminPictureReplies: selectedOrder.adminPictureReplies,
                    selectedOrderId: selectedOrder.id,
                    status: selectedOrder.status
                  });
                  
                  return selectedOrder.adminPictureReplies && Array.isArray(selectedOrder.adminPictureReplies) && selectedOrder.adminPictureReplies.length > 0;
                })() && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                      <MessageSquare className="w-5 h-5 text-blue-600" />
                      <span>Design Review Conversations</span>
                    </h3>
                    
                    {/* Group replies by item */}
                    <div className="space-y-6">
                      {selectedOrder.items.map((item, itemIndex) => {
                        // Find replies for this specific item
                        const itemReplies = selectedOrder.adminPictureReplies?.filter(reply => {
                          // Enhanced matching logic to handle various ID formats
                          const matches = 
                            // Exact matches
                            reply.itemId === item.id || 
                            reply.itemId === item.productId ||
                            String(reply.itemId) === String(item.id) ||
                            String(reply.itemId) === String(item.productId) ||
                            // Handle custom-embroidery-0 vs custom-embroidery mismatch
                            (reply.itemId === 'custom-embroidery-0' && item.id === 'custom-embroidery') ||
                            (reply.itemId === 'custom-embroidery' && item.id === 'custom-embroidery-0') ||
                            // Handle other potential mismatches with startsWith/contains
                            (reply.itemId && item.id && reply.itemId.startsWith(item.id)) ||
                            (reply.itemId && item.id && item.id.startsWith(reply.itemId)) ||
                            (reply.itemId && item.productId && reply.itemId.startsWith(item.productId)) ||
                            (reply.itemId && item.productId && item.productId.startsWith(reply.itemId));
                          
                          console.log('🔍 Item reply matching:', {
                            itemId: item.id,
                            productId: item.productId,
                            replyItemId: reply.itemId,
                            matches,
                            itemName: item.productName,
                            customEmbroideryMatch: (reply.itemId === 'custom-embroidery-0' && item.id === 'custom-embroidery'),
                            startsWithMatch: (reply.itemId && item.id && reply.itemId.startsWith(item.id))
                          });
                          
                          return matches;
                        }) || [];
                        
                        console.log('🔍 Item replies found:', {
                          itemId: item.id,
                          itemName: item.productName,
                          replyCount: itemReplies.length,
                          replies: itemReplies
                        });
                        
                        // Skip if no replies for this item
                        if (itemReplies.length === 0) {
                          console.log('🔍 No replies found for item:', {
                            itemId: item.id,
                            itemName: item.productName,
                            productId: item.productId
                          });
                          return null;
                        }
                        
                        return (
                          <div key={itemIndex} className="border border-gray-200 rounded-lg p-4 bg-white">
                            <div className="flex items-start space-x-4 mb-4">
                              {/* Item Image */}
                              <div className="flex-shrink-0">
                                <img
                                  src={item.productImage}
                                  alt={item.productName}
                                  className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => window.open(item.productImage, '_blank')}
                                />
                              </div>
                              
                              {/* Item Details */}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-gray-900 mb-1">{item.productName}</h4>
                                <p className="text-sm text-gray-500 mb-3">Qty: {item.quantity || 1}</p>
                                
                                {/* Chat-like conversation for this item */}
                                <div className="space-y-3 max-h-80 overflow-y-auto">
                                  {itemReplies.map((reply, replyIndex) => (
                                    <div key={replyIndex} className="space-y-2">
                                      {/* Admin Message */}
                                      <div className="flex justify-start">
                                        <div className="max-w-xs lg:max-w-md">
                                          <div className="bg-blue-500 text-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                                            <div className="flex items-start space-x-3">
                                              <img
                                                src={reply.image}
                                                alt="Admin Picture Reply"
                                                className="w-16 h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
                                                onClick={() => window.open(reply.image, '_blank')}
                                              />
                                              <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-blue-100 mb-1">Admin</p>
                                                {reply.notes && (
                                                  <p className="text-sm text-white mb-2">{reply.notes}</p>
                                                )}
                                                <p className="text-xs text-blue-200 opacity-75">
                                                  {reply.uploadedAt ? new Date(reply.uploadedAt).toLocaleString() : 'Unknown time'}
                                                </p>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Customer Response */}
                                      <div className="flex justify-end">
                                        <div className="max-w-xs lg:max-w-md">
                                          {selectedOrder && (selectedOrder.status === 'pending-payment' || selectedOrder.status === 'approved-processing') ? (
                                            <div className="bg-green-100 text-green-800 rounded-2xl rounded-br-md px-4 py-3 shadow-sm border border-green-200">
                                              <div className="flex items-center space-x-2 mb-1">
                                                <User className="h-4 w-4" />
                                                <p className="text-sm font-medium">You</p>
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-200 text-green-800">
                                                  ✓ Approved
                                                </span>
                                              </div>
                                              <p className="text-sm">
                                                {selectedOrder.status === 'pending-payment' 
                                                  ? 'Design approved - Payment required to proceed'
                                                  : 'Design approved and being processed - No further action needed'
                                                }
                                              </p>
                                            </div>
                                          ) : (
                                            <div className="bg-gray-100 text-gray-600 rounded-2xl rounded-br-md px-4 py-3 shadow-sm border border-gray-200">
                                              <div className="flex items-center space-x-2 mb-2">
                                                <User className="h-4 w-4" />
                                                <p className="text-sm font-medium">Your Response</p>
                                              </div>
                                              
                                              <div className="space-y-3">
                                                <p className="text-sm font-medium text-gray-700">Do you approve this picture?</p>
                                                <div className="flex space-x-4">
                                                  <label className="flex items-center space-x-2">
                                                    <input
                                                      type="radio"
                                                      name={`confirmation-${reply.itemId}`}
                                                      checked={pictureConfirmations[reply.itemId]?.confirmed === true}
                                                      onChange={() => handlePictureConfirmationChange(reply.itemId, true)}
                                                      className="text-green-600 focus:ring-green-500"
                                                    />
                                                    <span className="text-sm text-green-700">✓ Approve</span>
                                                  </label>
                                                  <label className="flex items-center space-x-2">
                                                    <input
                                                      type="radio"
                                                      name={`confirmation-${reply.itemId}`}
                                                      checked={pictureConfirmations[reply.itemId]?.confirmed === false}
                                                      onChange={() => handlePictureConfirmationChange(reply.itemId, false)}
                                                      className="text-red-600 focus:ring-red-500"
                                                    />
                                                    <span className="text-sm text-red-700">✗ Reject</span>
                                                  </label>
                                                </div>
                                                
                                                {/* Notes */}
                                                <div>
                                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Your Notes (Optional)
                                                  </label>
                                                  <textarea
                                                    value={pictureConfirmations[reply.itemId]?.notes || ''}
                                                    onChange={(e) => handlePictureConfirmationNotesChange(reply.itemId, e.target.value)}
                                                    rows={2}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                                                    placeholder="Add any comments about this picture..."
                                                  />
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Show message if no items have replies */}
                      {selectedOrder.items.every((item, itemIndex) => {
                        const itemReplies = selectedOrder.adminPictureReplies?.filter(reply => {
                          // Use the same enhanced matching logic
                          return reply.itemId === item.id || 
                            reply.itemId === item.productId ||
                            String(reply.itemId) === String(item.id) ||
                            String(reply.itemId) === String(item.productId) ||
                            (reply.itemId === 'custom-embroidery-0' && item.id === 'custom-embroidery') ||
                            (reply.itemId === 'custom-embroidery' && item.id === 'custom-embroidery-0') ||
                            (reply.itemId && item.id && reply.itemId.startsWith(item.id)) ||
                            (reply.itemId && item.id && item.id.startsWith(reply.itemId)) ||
                            (reply.itemId && item.productId && reply.itemId.startsWith(item.productId)) ||
                            (reply.itemId && item.productId && item.productId.startsWith(reply.itemId));
                        }) || [];
                        return itemReplies.length === 0;
                      }) && (
                        <div className="text-center py-8">
                          <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                          <h3 className="mt-2 text-lg font-medium text-gray-900">No Design Samples Found</h3>
                          <p className="mt-1 text-sm text-gray-500">
                            Admin hasn't uploaded design samples for any items in this order yet.
                          </p>
                          <div className="mt-4 text-xs text-gray-400">
                            <p>Debug Info:</p>
                            <p>Total adminPictureReplies: {selectedOrder.adminPictureReplies?.length || 0}</p>
                            <p>Available reply item IDs: {selectedOrder.adminPictureReplies?.map(r => r.itemId).join(', ') || 'None'}</p>
                            <p>Order item IDs: {selectedOrder.items.map(item => item.id).join(', ')}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Debug section - show when no conversations */}
                {(!selectedOrder.adminPictureReplies || !Array.isArray(selectedOrder.adminPictureReplies) || selectedOrder.adminPictureReplies.length === 0) && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center space-x-2">
                      <MessageSquare className="w-5 h-5 text-gray-400" />
                      <span>Design Review Conversations</span>
                    </h3>
                    <div className="text-center py-8">
                      <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-lg font-medium text-gray-900">No Design Samples Yet</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Admin hasn't uploaded design samples for this order yet.
                      </p>
                      <div className="mt-4 text-xs text-gray-400">
                        <p>Debug Info:</p>
                        <p>Has adminPictureReplies: {selectedOrder.adminPictureReplies ? 'Yes' : 'No'}</p>
                        <p>Is Array: {Array.isArray(selectedOrder.adminPictureReplies) ? 'Yes' : 'No'}</p>
                        <p>Length: {selectedOrder.adminPictureReplies?.length || 0}</p>
                        <p>Order Status: {selectedOrder.status}</p>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              <div className="mt-6 flex justify-between items-center">
                <div className="flex space-x-3">
                  <Button onClick={handleCloseModal}>
                    Close
                  </Button>
                  
                  {/* Submit Picture Confirmations Button */}
                  {selectedOrder.adminPictureReplies && Array.isArray(selectedOrder.adminPictureReplies) && selectedOrder.adminPictureReplies.length > 0 && Object.values(pictureConfirmations).some(c => c.confirmed !== null) && selectedOrder.status !== 'pending-payment' && selectedOrder.status !== 'approved-processing' && (
                    <Button 
                      onClick={handleSubmitPictureConfirmations}
                      disabled={submittingConfirmations}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {submittingConfirmations ? 'Submitting...' : 'Submit Design Review'}
                    </Button>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className="flex space-x-3">
                  {/* Re-upload Button for rejected orders */}
                  {selectedOrder.status === 'rejected-needs-upload' && (
                    <Button 
                      onClick={() => handleOpenReuploadModal(selectedOrder)}
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      Re-upload Design
                    </Button>
                  )}
                  
                  {/* Checkout Button for pending-payment */}
                  {selectedOrder && selectedOrder.status === 'pending-payment' && (
                    <Button 
                      onClick={() => handleProceedToCheckout(selectedOrder)}
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      Proceed to Checkout
                    </Button>
                  )}
                  
                  {/* Proceed to Checkout Button */}
                  {selectedOrder.status === 'ready-for-checkout' && (
                    <Button 
                      onClick={() => handleProceedToCheckout(selectedOrder)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      Proceed to Checkout
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Re-upload Modal */}
      {showReuploadModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Re-upload Design Files</h2>
              <button
                onClick={handleCloseReuploadModal}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-gray-600 mb-4">
                Your design was rejected. Please upload new design files for the items below:
              </p>
              
              {selectedOrder.items.map((item) => (
                <div key={item.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-4 mb-3">
                    <img
                      src={item.productImage}
                      alt={item.productName}
                      className="w-16 h-16 object-cover rounded border border-gray-200"
                    />
                    <div>
                      <h4 className="font-medium text-gray-900">{item.productName}</h4>
                      <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload New Design File
                    </label>
                    <input
                      type="file"
                      accept="image/*,.pdf,.ai,.eps,.svg"
                      onChange={(e) => handleReuploadFileChange(item.id, e.target.files?.[0] || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {reuploadFiles[item.id] && (
                      <p className="text-sm text-green-600 mt-1">
                        Selected: {reuploadFiles[item.id]?.name}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <Button onClick={handleCloseReuploadModal}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitReupload}
                disabled={submittingReupload || Object.values(reuploadFiles).every(file => file === null)}
                className="bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
              >
                {submittingReupload ? 'Uploading...' : 'Submit Re-upload'}
              </Button>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}
