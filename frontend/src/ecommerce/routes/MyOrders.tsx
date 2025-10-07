import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Package, Truck, CheckCircle, Clock, XCircle, Search, Filter, X, CreditCard, DollarSign, AlertCircle, RotateCcw, Eye, MessageSquare, Image as ImageIcon, Upload, Check, User, Calendar } from 'lucide-react'
import Button from '../../components/Button'
import RefundRequestModal, { RefundRequest } from '../components/RefundRequestModal'
import { orderReviewApiService, OrderReview, PictureReply, CustomerConfirmation } from '../../shared/orderReviewApiService'
import { MaterialPricingService } from '../../shared/materialPricingService'
import { useWebSocket } from '../../hooks/useWebSocket'
import { products } from '../../data/products'
import { productApiService } from '../../shared/productApiService'

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
    designs?: Array<{
      id: string
      name: string
      preview: string
      file: string
    }>
    mockup?: string
    selectedStyles?: any
    placement?: string
    size?: string
    color?: string
    notes?: string
    embroideryData?: {
      designImage: string
      designName?: string
    }
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
const convertOrderReviewToOrder = (orderReview: OrderReview, backendProducts: any[]): Order => {
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
        return 'approved-processing' // After payment, goes to approved-processing
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

  const convertedItems = orderData.map((item: any) => {
      const resolvedProduct = (() => {
        // First try to find in backend products by numeric ID
        const numericId = typeof item.productId === 'string' && !isNaN(Number(item.productId)) ? Number(item.productId) : item.productId
        let product = backendProducts.find((p: any) => p.id === numericId)
        
        // If not found in backend products, try frontend products as fallback
        if (!product) {
          product = products.find((p: any) => p.id === item.productId || p.id === numericId)
        }
        
        console.log('🔍 Product lookup debug:', {
          productId: item.productId,
          numericId: numericId,
          foundInBackend: !!product,
          backendProductsCount: backendProducts.length,
          productTitle: product?.title,
          foundProductId: product?.id
        });
        
        return product
      })()
      let itemPrice = 0;
      
      console.log('🔍 Processing item:', {
        productId: item.productId,
        productPrice: item.product?.price,
        customization: item.customization,
        embroideryData: item.customization?.embroideryData,
        pricingBreakdown: item.pricingBreakdown,
        hasDesigns: !!item.customization?.designs?.length
      });
      
      // PRIORITY 1: Use stored pricing breakdown if available (new format)
      if (item.pricingBreakdown && typeof item.pricingBreakdown === 'object') {
        itemPrice = Number(item.pricingBreakdown.totalPrice) || 0;
        console.log('💰 Using stored pricingBreakdown:', itemPrice);
      }
      // PRIORITY 2: For custom embroidery items, use the total price from customization
      else if (item.productId === 'custom-embroidery' && item.customization?.totalPrice) {
        itemPrice = Number(item.customization.totalPrice) || 0;
        console.log('💰 Custom embroidery price:', itemPrice);
      }
      // PRIORITY 3: For custom embroidery items with legacy embroideryData structure
      else if (item.productId === 'custom-embroidery' && item.customization?.embroideryData?.totalPrice) {
        itemPrice = Number(item.customization.embroideryData.totalPrice) || 0;
        console.log('💰 Custom embroidery price (legacy):', itemPrice);
      }
      // PRIORITY 4: For multiple designs with individual pricing (new format)
      else if (item.customization?.designs && item.customization.designs.length > 0) {
        let basePrice = Number(item.product?.price ?? resolvedProduct?.price) || 0;
        let totalCustomizationCost = 0;
        
        item.customization.designs.forEach((design: any) => {
          if (design.totalPrice) {
            totalCustomizationCost += Number(design.totalPrice) || 0;
          } else if (design.selectedStyles) {
            const { selectedStyles } = design;
            if (selectedStyles.coverage) totalCustomizationCost += Number(selectedStyles.coverage.price) || 0;
            if (selectedStyles.material) totalCustomizationCost += Number(selectedStyles.material.price) || 0;
            if (selectedStyles.border) totalCustomizationCost += Number(selectedStyles.border.price) || 0;
            if (selectedStyles.backing) totalCustomizationCost += Number(selectedStyles.backing.price) || 0;
            if (selectedStyles.cutting) totalCustomizationCost += Number(selectedStyles.cutting.price) || 0;
            
            if (selectedStyles.threads) {
              selectedStyles.threads.forEach((thread: any) => {
                totalCustomizationCost += Number(thread.price) || 0;
              });
            }
            if (selectedStyles.upgrades) {
              selectedStyles.upgrades.forEach((upgrade: any) => {
                totalCustomizationCost += Number(upgrade.price) || 0;
              });
            }
          }
        });
        
        itemPrice = basePrice + totalCustomizationCost;
        console.log('💰 Multi-design pricing:', { basePrice, totalCustomizationCost, total: itemPrice });
      }
      // PRIORITY 5: For regular products with customization, calculate total price including customization costs (legacy)
      else if (item.customization?.selectedStyles) {
        let basePrice = Number(item.product?.price ?? resolvedProduct?.price) || 0;
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
        console.log('💰 Regular product with customization (legacy):', { basePrice, customizationCost, total: itemPrice });
      }
      // PRIORITY 6: For regular products without customization, use base price
      else {
        itemPrice = Number(item.product?.price ?? resolvedProduct?.price) || 0;
        console.log('💰 Regular product without customization:', itemPrice);
      }
      
      return {
        id: String(item.id || item.productId || ''),
        productId: item.productId,
        productName: (() => {
          // For custom embroidery items with multiple designs
          if (item.productId === 'custom-embroidery' && item.customization?.designs?.length > 0) {
            const designCount = item.customization.designs.length;
            const firstDesignName = item.customization.designs[0].name;
            if (designCount === 1) {
              return `Custom Embroidery: ${firstDesignName}`;
            } else {
              return `Custom Embroidery: ${firstDesignName} + ${designCount - 1} more design${designCount > 2 ? 's' : ''}`;
            }
          }
          // For custom embroidery items - show design name (legacy)
          if (item.productId === 'custom-embroidery' && item.customization?.embroideryData?.designName) {
            return `Custom Embroidery: ${item.customization.embroideryData.designName}`;
          }
          // For custom embroidery items with design name in customization (legacy)
          if (item.productId === 'custom-embroidery' && item.customization?.design?.name) {
            return `Custom Embroidery: ${item.customization.design.name}`;
          }
          // For regular products - try multiple fallbacks
          if (item.product?.title) {
            console.log('🔍 Using item.product.title:', item.product.title);
            return item.product.title;
          }
          if (item.productName) {
            console.log('🔍 Using item.productName:', item.productName);
            return item.productName;
          }
          if (resolvedProduct?.title) {
            console.log('🔍 Using resolvedProduct.title:', resolvedProduct.title);
            return (resolvedProduct as any).title as string;
          }
          // If we have a productId but no product data, try to fetch it
          if (item.productId && item.productId !== 'custom-embroidery') {
            console.log('🔍 Falling back to Product #', item.productId);
            return `Product #${item.productId}`;
          }
          console.log('🔍 Using Custom Product fallback');
          return 'Custom Product';
        })(),
        productImage: (() => {
          // Debug logging for mockup data
          console.log('🖼️ Order item productImage debug:', {
            productId: item.productId,
            hasCustomization: !!item.customization,
            hasMockup: !!item.customization?.mockup,
            mockupLength: item.customization?.mockup?.length,
            hasDesigns: !!item.customization?.designs?.length,
            hasEmbroideryData: !!item.customization?.embroideryData,
            hasLegacyDesign: !!item.customization?.design,
            designsData: item.customization?.designs ? {
              count: item.customization.designs.length,
              firstDesign: item.customization.designs[0] ? {
                id: item.customization.designs[0].id,
                name: item.customization.designs[0].name,
                hasPreview: !!item.customization.designs[0].preview,
                previewLength: item.customization.designs[0].preview?.length,
                previewStart: item.customization.designs[0].preview?.substring(0, 50),
                hasFile: !!item.customization.designs[0].file,
                fileLength: item.customization.designs[0].file?.length,
                fileStart: item.customization.designs[0].file?.substring(0, 50)
              } : null
            } : null
          });

          // For custom embroidery items with multiple designs - show mockup or first design
          if (item.productId === 'custom-embroidery' && item.customization?.designs?.length > 0) {
            // Show mockup if available (final product preview)
            if (item.customization.mockup) {
              console.log('🖼️ Using mockup for custom embroidery with designs');
              return item.customization.mockup;
            }
            // Otherwise show first design
            console.log('🖼️ Using first design for custom embroidery (no mockup)');
            return item.customization.designs[0].preview || item.customization.designs[0].file;
          }
          // For custom embroidery items - show uploaded design (legacy)
          if (item.productId === 'custom-embroidery' && item.customization?.embroideryData?.designImage) {
            console.log('🖼️ Using embroidery data design image (legacy)');
            return item.customization.embroideryData.designImage;
          }
          // For custom embroidery items with design preview (legacy)
          if (item.productId === 'custom-embroidery' && item.customization?.design?.preview) {
            console.log('🖼️ Using legacy design preview');
            return item.customization.design.preview;
          }
          // For regular products with customization - show final product mockup
          if (item.customization?.mockup) {
            console.log('🖼️ Using mockup for regular product with customization');
            return item.customization.mockup;
          }
          // For regular products without customization - show product image
          if (item.product?.image || resolvedProduct?.image) {
            console.log('🖼️ Using base product image');
            return (item.product?.image ?? (resolvedProduct as any)?.image) as string;
          }
          // Default placeholder
          console.log('🖼️ Using default placeholder image');
          return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAiIGhlaWdodD0iODAiIGZpbGw9IiNmM2Y0ZjYiLz48dGV4dCB4PSI0MCIgeT0iNDAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMCIgZmlsbD0iIzZiNzI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
        })(),
        quantity: item.quantity || 1,
        price: itemPrice,
        customization: item.customization,
        product: resolvedProduct // Include the full product data for pricing calculations
      };
    });

  // Calculate total from items to ensure consistency
  const calculatedTotal = convertedItems.reduce((total: number, item: any) => {
    return total + (item.price * item.quantity);
  }, 0);

  console.log('💰 Order pricing consistency check:', {
    orderId: orderReview.id,
    storedTotal: Number(orderReview.total) || 0,
    calculatedTotal: calculatedTotal,
    discrepancy: Math.abs((Number(orderReview.total) || 0) - calculatedTotal),
    itemsBreakdown: convertedItems.map((item: any) => ({
      productId: item.productId,
      productName: item.productName,
      price: item.price,
      quantity: item.quantity,
      subtotal: item.price * item.quantity
    }))
  });

  const convertedOrder = {
    id: orderReview.id,
    orderNumber: `MC-${orderReview.id}`,
    status: mapStatus(orderReview.status),
    orderDate: orderReview.submitted_at,
    total: calculatedTotal, // Use calculated total instead of stored total
    items: convertedItems,
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
  const navigate = useNavigate()
  const { user, isLoggedIn } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  const [pictureConfirmations, setPictureConfirmations] = useState<{[itemId: string]: {confirmed: boolean | null, notes: string, designId?: string, designName?: string, embroideryStyle?: string}}>({})
  const [submittingConfirmations, setSubmittingConfirmations] = useState(false)
  const [showReuploadModal, setShowReuploadModal] = useState(false)
  const [reuploadFiles, setReuploadFiles] = useState<{[itemId: string]: File | null}>({})
  const [submittingReupload, setSubmittingReupload] = useState(false)
  const [backendProducts, setBackendProducts] = useState<any[]>([])
  
  // WebSocket hook for real-time updates
  const { subscribe, isConnected } = useWebSocket()

  // Load backend products
  const loadBackendProducts = async () => {
    try {
      const response = await productApiService.getProducts({ status: 'active', limit: 100 })
      if (response.success && response.data) {
        setBackendProducts(response.data)
        console.log('📦 Loaded backend products:', response.data.length)
      }
    } catch (error) {
      console.error('Error loading backend products:', error)
    }
  }

  // Load orders on component mount
  useEffect(() => {
    if (isLoggedIn) {
      loadOrders()
      loadBackendProducts()
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
        const convertedOrders = response.data.map((orderReview: OrderReview) => convertOrderReviewToOrder(orderReview, backendProducts))
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

  // Helper function to get pricing breakdown for display (matches admin panel structure)
  const getPricingBreakdown = (item: any, backendProducts: any[]): {
    baseProductPrice: number;
    embroideryPrice: number;
    embroideryOptionsPrice: number;
    totalPrice: number;
    designBreakdown?: Array<{
      designName: string;
      designOptions: number;
      designDetails: {
        coverage: number;
        material: number;
        border: number;
        backing: number;
        cutting: number;
        threads: number;
        upgrades: number;
      };
    }>;
  } => {
    // Use stored pricing breakdown if available (matches cart structure)
    if (item.pricingBreakdown && typeof item.pricingBreakdown === 'object') {
      let storedBasePrice = Number(item.pricingBreakdown.baseProductPrice) || 0;
      const storedEmbroideryPrice = Number(item.pricingBreakdown.embroideryPrice) || 0;
      const storedOptionsPrice = Number(item.pricingBreakdown.embroideryOptionsPrice) || 0;
      const storedTotalPrice = Number(item.pricingBreakdown.totalPrice) || 0;
      
      // If base product price is 0 but we have embroidery costs, calculate the missing base price
      let baseProductPrice = storedBasePrice;
      if (baseProductPrice === 0 && (storedEmbroideryPrice > 0 || storedOptionsPrice > 0)) {
        // Calculate base price as: total - embroidery - options
        baseProductPrice = storedTotalPrice - storedEmbroideryPrice - storedOptionsPrice;
        console.log('🔧 Calculated missing base product price:', {
          total: storedTotalPrice,
          embroidery: storedEmbroideryPrice,
          options: storedOptionsPrice,
          calculatedBase: baseProductPrice
        });
        // If still not positive, fallback to catalog base price
        if (!(baseProductPrice > 0)) {
          const numericId = typeof item.productId === 'string' && !isNaN(Number(item.productId)) ? Number(item.productId) : item.productId
          const catalogProduct = products.find((p: any) => p.id === item.productId || p.id === numericId)
          if (catalogProduct?.price) {
            baseProductPrice = Number((catalogProduct as any).price) || 0
          }
        }
      }
      
      return {
        baseProductPrice: baseProductPrice,
        embroideryPrice: storedEmbroideryPrice,
        embroideryOptionsPrice: storedOptionsPrice,
        totalPrice: storedTotalPrice
      };
    }

    // Fallback calculation for custom embroidery items
    if (item.productId === 'custom-embroidery' && item.customization?.embroideryData) {
      return {
        baseProductPrice: 0,
        embroideryPrice: Number(item.customization.embroideryData.materialCosts?.totalCost) || 0,
        embroideryOptionsPrice: Number(item.customization.embroideryData.optionsPrice) || 0,
        totalPrice: Number(item.customization.embroideryData.totalPrice) || 0
      };
    }

    // Calculate pricing for multiple designs with individual embroidery options
    let baseProduct = Number(item.product?.price) || 0;
    
    // If base product price is not available from item.product, try to get it from backend products
    if (baseProduct === 0) {
      const numericId = typeof item.productId === 'string' && !isNaN(Number(item.productId)) ? Number(item.productId) : item.productId
      let catalogProduct = backendProducts.find((p: any) => p.id === numericId)
      
      // If not found in backend products, try frontend products as fallback
      if (!catalogProduct) {
        catalogProduct = products.find((p: any) => p.id === item.productId || p.id === numericId)
      }
      
      if (catalogProduct?.price) {
        baseProduct = Number(catalogProduct.price) || 0
        console.log('🔧 Retrieved base product price from catalog:', {
          productId: item.productId,
          catalogPrice: baseProduct,
          catalogTitle: catalogProduct.title
        })
      }
    }
    let totalEmbroideryPrice = 0;
    let totalOptionsPrice = 0;
    let designBreakdown: Array<{designName: string, designOptions: number, designDetails: any}> = [];

    // Handle multiple designs with individual embroidery options
    if (item.customization?.designs && item.customization.designs.length > 0) {
      console.log('🔍 Multi-design pricing calculation:', {
        designsCount: item.customization.designs.length,
        designs: item.customization.designs.map((d: any) => ({
          name: d.name,
          dimensions: d.dimensions,
          hasSelectedStyles: !!d.selectedStyles
        }))
      });
      item.customization.designs.forEach((design: any, index: number) => {
        let designOptions = 0;
        let designMaterialCost = 0;
        const designName = design.name || `Design ${index + 1}`;
        const designDetails: any = {
          coverage: 0,
          material: 0,
          border: 0,
          backing: 0,
          cutting: 0,
          threads: 0,
          upgrades: 0
        };
        
        // Calculate material costs for this design if dimensions are available
        if (design.dimensions && design.dimensions.width > 0 && design.dimensions.height > 0) {
          try {
            const materialCosts = MaterialPricingService.calculateMaterialCosts({
              patchWidth: design.dimensions.width,
              patchHeight: design.dimensions.height
            });
            designMaterialCost = materialCosts.totalCost;
            console.log('🔧 Calculated material cost for design:', {
              designName,
              dimensions: design.dimensions,
              materialCost: designMaterialCost
            });
          } catch (error) {
            console.warn('Failed to calculate material costs for design:', designName, error);
          }
        }
        
        if (design.selectedStyles) {
          const { selectedStyles } = design;
          
          // Calculate options for this specific design
          // NOTE: coverage and material are embroidery style options, not material costs
          // Material costs should come from MaterialPricingService.calculateMaterialCosts()
          if (selectedStyles.coverage) {
            designDetails.coverage = Number(selectedStyles.coverage.price) || 0;
            designOptions += designDetails.coverage;
            totalOptionsPrice += designDetails.coverage; // Coverage is an option, not material cost
          }
          if (selectedStyles.material) {
            designDetails.material = Number(selectedStyles.material.price) || 0;
            designOptions += designDetails.material;
            totalOptionsPrice += designDetails.material; // Material style is an option, not material cost
          }
          if (selectedStyles.border) {
            designDetails.border = Number(selectedStyles.border.price) || 0;
            designOptions += designDetails.border;
            totalOptionsPrice += designDetails.border;
          }
          if (selectedStyles.backing) {
            designDetails.backing = Number(selectedStyles.backing.price) || 0;
            designOptions += designDetails.backing;
            totalOptionsPrice += designDetails.backing;
          }
          if (selectedStyles.cutting) {
            designDetails.cutting = Number(selectedStyles.cutting.price) || 0;
            designOptions += designDetails.cutting;
            totalOptionsPrice += designDetails.cutting;
          }
          
          if (selectedStyles.threads && selectedStyles.threads.length > 0) {
            selectedStyles.threads.forEach((thread: any) => {
              const threadPrice = Number(thread.price) || 0;
              designDetails.threads += threadPrice;
              designOptions += threadPrice;
              totalOptionsPrice += threadPrice;
            });
          }
          
          if (selectedStyles.upgrades && selectedStyles.upgrades.length > 0) {
            selectedStyles.upgrades.forEach((upgrade: any) => {
              const upgradePrice = Number(upgrade.price) || 0;
              designDetails.upgrades += upgradePrice;
              designOptions += upgradePrice;
              totalOptionsPrice += upgradePrice;
            });
          }
        }
        
        // Add material costs to total embroidery price
        totalEmbroideryPrice += designMaterialCost;
        
        designBreakdown.push({
          designName,
          designOptions,
          designDetails
        });
      });

      return {
        baseProductPrice: baseProduct,
        embroideryPrice: totalEmbroideryPrice,
        embroideryOptionsPrice: totalOptionsPrice,
        totalPrice: baseProduct + totalEmbroideryPrice + totalOptionsPrice,
        designBreakdown
      };
    }

    // Fallback calculation for regular items with customization
    if (item.customization?.selectedStyles) {
      const { selectedStyles } = item.customization;
      let embroideryPrice = 0;
      let optionsPrice = 0;
      
      // Embroidery base: coverage + material
      if (selectedStyles.coverage) embroideryPrice += Number(selectedStyles.coverage.price) || 0;
      if (selectedStyles.material) embroideryPrice += Number(selectedStyles.material.price) || 0;
      
      // Embroidery options: border, backing, cutting, threads, upgrades
      if (selectedStyles.border) optionsPrice += Number(selectedStyles.border.price) || 0;
      if (selectedStyles.backing) optionsPrice += Number(selectedStyles.backing.price) || 0;
      if (selectedStyles.cutting) optionsPrice += Number(selectedStyles.cutting.price) || 0;
      
      if (selectedStyles.threads) {
        selectedStyles.threads.forEach((thread: any) => {
          optionsPrice += Number(thread.price) || 0;
        });
      }
      if (selectedStyles.upgrades) {
        selectedStyles.upgrades.forEach((upgrade: any) => {
          optionsPrice += Number(upgrade.price) || 0;
        });
      }
      
      return {
        baseProductPrice: baseProduct,
        embroideryPrice,
        embroideryOptionsPrice: optionsPrice,
        totalPrice: baseProduct + embroideryPrice + optionsPrice
      };
    }

    // No customization - just base product
    return {
      baseProductPrice: baseProduct,
      embroideryPrice: 0,
      embroideryOptionsPrice: 0,
      totalPrice: baseProduct
    };
  };

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
          notes: data.notes || undefined,
          // Enhanced fields for multi-design support
          designId: data.designId || undefined, // Optional design ID for multi-design items
          designName: data.designName || undefined, // Optional design name for reference
          embroideryStyle: data.embroideryStyle || undefined // Optional embroidery style info
        }))

      const response = await orderReviewApiService.confirmPictureReplies(selectedOrder.id, confirmationData)
      
      if (response.success) {
        // Check if all pictures were approved
        const allApproved = confirmationData.every(conf => conf.confirmed === true)
        const anyRejected = confirmationData.some(conf => conf.confirmed === false)
        
        // Immediately update the order status in UI based on backend response
        if (response.data?.status === 'pending-payment' && !anyRejected) {
          setOrders(prev => prev.map(order => 
            order.id === selectedOrder.id 
              ? { ...order, status: 'pending-payment' }
              : order
          ))
        }

        if (allApproved) {
          alert('All pictures approved! Order is ready for production.')
        } else if (anyRejected) {
          alert('Some pictures were rejected. Admin will upload new designs.')
        }
        
        setPictureConfirmations({})
        // Close the details modal after successful submission
        setShowOrderDetails(false)
        setSelectedOrder(null)
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
    console.log('Proceeding to checkout for order:', order)
    // Store order data in sessionStorage for the checkout page
    sessionStorage.setItem('checkoutOrder', JSON.stringify(order))
    // Navigate to checkout page
    navigate('/order-checkout')
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
            <div key={order.id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
              {/* Order Header */}
              <div className="px-6 py-5 border-b border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                  {/* Left Section - Order Info */}
                  <div className="flex items-start space-x-4">
                    {/* Status Badge */}
                    <div className="flex flex-col items-center space-y-2">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 border-2 border-gray-200">
                        {getStatusIcon(order.status)}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>
                    
                    {/* Order Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        Order #{order.orderNumber}
                      </h3>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>Placed {new Date(order.orderDate).toLocaleDateString()}</span>
                        </div>
                        {order.reviewedAt && (
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span>Reviewed {new Date(order.reviewedAt).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Section - Total & Actions */}
                  <div className="flex flex-col sm:items-end space-y-3">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">${(Number(order.total) || 0).toFixed(2)}</p>
                      <p className="text-sm text-gray-500">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewDetails(order)}
                      className="w-full sm:w-auto"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </div>
              </div>

              {/* Order Items Preview */}
              <div className="px-6 py-4">
                <div className="space-y-4">
                  {order.items.slice(0, 2).map((item) => (
                    <div key={item.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                      <div className="relative flex space-x-2">
                        {/* Final Product Image (with design overlays) */}
                        <div className="relative">
                          <img
                            src={item.customization?.mockup || item.productImage}
                            alt={`Final ${item.productName}`}
                            className="w-16 h-16 object-cover rounded-lg border-2 border-white shadow-sm"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = 'https://via.placeholder.com/400x400/f3f4f6/9ca3af?text=No+Image';
                            }}
                          />
                          <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-xs px-1 rounded text-center min-w-[20px]">
                            Final
                          </div>
                        </div>
                        
                        {/* Uploaded Design Image(s) */}
                        {item.customization && (
                          <div className="flex space-x-1">
                            {/* Show multiple designs if available */}
                            {(item.customization as any).designs && (item.customization as any).designs.length > 0 ? (
                              (item.customization as any).designs.slice(0, 2).map((design: any, index: number) => {
                                // Debug logging for order preview
                                console.log('🔍 Order preview design data:', {
                                  itemId: item.id,
                                  itemName: item.productName,
                                  designId: design.id,
                                  designName: design.name,
                                  hasPreview: !!design.preview,
                                  previewLength: design.preview?.length,
                                  previewStart: design.preview?.substring(0, 50),
                                  hasFile: !!design.file,
                                  fileLength: design.file?.length,
                                  fileStart: design.file?.substring(0, 50)
                                });
                                
                                // Check if it's a blob URL (temporary) or base64 (persistent)
                                const imageSrc = design.preview || design.file;
                                const isBlobUrl = imageSrc && imageSrc.startsWith('blob:');
                                
                                console.log('🖼️ Order preview using image source:', {
                                  imageSrc: imageSrc?.substring(0, 50) + '...',
                                  imageSrcLength: imageSrc?.length,
                                  isBlobUrl: isBlobUrl,
                                  isBase64: imageSrc && imageSrc.startsWith('data:image/')
                                });
                                
                                return (
                                  <div key={design.id || index} className="relative">
                                    {isBlobUrl ? (
                                      // Show placeholder for blob URLs (temporary images)
                                      <div className="w-16 h-16 bg-gray-100 rounded-lg border-2 border-white shadow-sm flex flex-col items-center justify-center">
                                        <span className="text-xs text-gray-500 text-center px-1">
                                          {design.name}
                                        </span>
                                        <span className="text-xs text-red-500 mt-1">
                                          Lost
                                        </span>
                                      </div>
                                    ) : (
                                      // Show actual image for base64 URLs
                                      <img
                                        src={imageSrc}
                                        alt={`Design ${index + 1}`}
                                        className="w-16 h-16 object-cover rounded-lg border-2 border-white shadow-sm"
                                        onError={(e) => {
                                          console.error('❌ Order preview image failed to load:', {
                                            designName: design.name,
                                            imageSrc: imageSrc?.substring(0, 50) + '...',
                                            error: e
                                          });
                                          const target = e.target as HTMLImageElement;
                                          target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIGZpbGw9IiNmM2Y0ZjYiLz48dGV4dCB4PSIzMiIgeT0iMzIiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSI4IiBmaWxsPSIjNmI3MjgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';
                                        }}
                                        onLoad={() => {
                                          console.log('✅ Order preview image loaded successfully:', design.name);
                                        }}
                                      />
                                    )}
                                    <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-xs px-1 rounded text-center min-w-[20px]">
                                      D{index + 1}
                                    </div>
                                    {(item.customization as any).designs.length > 2 && index === 1 && (
                                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                                        <span className="text-white text-xs font-bold">
                                          +{(item.customization as any).designs.length - 2}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            ) : item.customization.design ? (
                              <div className="relative">
                                <img
                                  src={item.customization.design.preview}
                                  alt="Design"
                                  className="w-16 h-16 object-cover rounded-lg border-2 border-white shadow-sm"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = 'https://via.placeholder.com/400x400/f3f4f6/9ca3af?text=No+Image';
                                  }}
                                />
                                <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-xs px-1 rounded text-center min-w-[20px]">
                                  Design
                                </div>
                              </div>
                            ) : item.customization.embroideryData?.designImage ? (
                              <div className="relative">
                                <img
                                  src={item.customization.embroideryData.designImage}
                                  alt="Design"
                                  className="w-16 h-16 object-cover rounded-lg border-2 border-white shadow-sm"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = 'https://via.placeholder.com/400x400/f3f4f6/9ca3af?text=No+Image';
                                  }}
                                />
                                <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-xs px-1 rounded text-center min-w-[20px]">
                                  Design
                                </div>
                              </div>
                            ) : null}
                          </div>
                        )}
                        
                        <div className="absolute -top-2 -right-2 bg-accent text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                          {item.quantity}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-gray-900 truncate">{item.productName}</h4>
                        <p className="text-xs text-gray-500 mb-2">${item.price.toFixed(2)} each</p>
                        
                        {/* Simplified Customization Display */}
                        {item.customization && (
                          <div className="flex flex-wrap gap-1">
                            {(item.customization as any).designs && (item.customization as any).designs.length > 0 ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {(item.customization as any).designs.length} Design{(item.customization as any).designs.length !== 1 ? 's' : ''}
                              </span>
                            ) : item.customization.design ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Custom Design
                              </span>
                            ) : null}
                            
                            {item.customization.placement && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {item.customization.placement.replace('-', ' ')}
                              </span>
                            )}
                            
                            {item.customization.size && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                {item.customization.size}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          ${((Number(item.price) || 0) * (item.quantity || 1)).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {/* Show more items indicator */}
                  {order.items.length > 2 && (
                    <div className="text-center py-2">
                      <span className="text-sm text-gray-500 font-medium">
                        +{order.items.length - 2} more item{order.items.length - 2 !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Admin Notes */}
              {order.adminNotes && (
                <div className="px-6 py-3 bg-blue-50 border-t border-blue-100">
                  <div className="flex items-start space-x-3">
                    <MessageSquare className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blue-800 mb-1">Admin Message</p>
                      <p className="text-sm text-blue-700">{order.adminNotes}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Status-specific Actions */}
              {order.status === 'pending-payment' && (
                <div className="px-6 py-4 bg-orange-50 border-t border-orange-100">
                  <div className="flex items-center space-x-3">
                    <CreditCard className="w-6 h-6 text-orange-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-orange-800">Ready for Payment</p>
                      <p className="text-sm text-orange-700 mt-1">
                        Your design has been approved! Complete your payment to begin processing.
                      </p>
                    </div>
                    <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white" onClick={() => handleProceedToCheckout(order)}>
                      Proceed to Checkout
                    </Button>
                  </div>
                </div>
              )}

              {order.status === 'in-production' && (
                <div className="px-6 py-4 bg-blue-50 border-t border-blue-100">
                  <div className="flex items-center space-x-3">
                    <Truck className="w-6 h-6 text-blue-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blue-800">In Production</p>
                      <p className="text-sm text-blue-700 mt-1">
                        Your order is being processed. We'll notify you when it's ready for shipping.
                      </p>
                    </div>
                  </div>
                </div>
              )}
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
                      <div key={item.id} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-start space-x-4">
                          {/* Images Section */}
                          <div className="flex flex-col space-y-3">
                            {/* Final Product Image */}
                            <div className="relative">
                              <img
                                src={item.customization?.mockup || item.productImage}
                                alt={`Final ${item.productName}`}
                                className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = 'https://via.placeholder.com/400x400/f3f4f6/9ca3af?text=No+Image';
                                }}
                              />
                              <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-xs px-2 py-1 rounded font-medium">
                                Final Product
                              </div>
                            </div>
                            
                            {/* Uploaded Design Images */}
                            {item.customization && (
                              <div className="space-y-2">
                                <h5 className="text-xs font-medium text-gray-700 uppercase tracking-wide">Uploaded Designs</h5>
                                <div className="flex flex-wrap gap-2">
                                  {/* Show multiple designs if available */}
                                  {(item.customization as any).designs && (item.customization as any).designs.length > 0 ? (
                                    (item.customization as any).designs.map((design: any, index: number) => {
                                      // Debug logging
                                      console.log('🔍 Design data for display:', {
                                        designId: design.id,
                                        designName: design.name,
                                        hasPreview: !!design.preview,
                                        previewLength: design.preview?.length,
                                        previewStart: design.preview?.substring(0, 50),
                                        hasFile: !!design.file,
                                        fileLength: design.file?.length,
                                        fileStart: design.file?.substring(0, 50),
                                        designObject: design
                                      });
                                      
                                      // Check if it's a blob URL (temporary) or base64 (persistent)
                                      const imageSrc = design.preview || design.file;
                                      const isBlobUrl = imageSrc && imageSrc.startsWith('blob:');
                                      
                                      console.log('🖼️ Using image source:', {
                                        imageSrc: imageSrc?.substring(0, 50) + '...',
                                        imageSrcLength: imageSrc?.length,
                                        isBlobUrl: isBlobUrl,
                                        isBase64: imageSrc && imageSrc.startsWith('data:image/')
                                      });
                                      
                                      // If it's a blob URL, show a placeholder with a note
                                      const displaySrc = isBlobUrl ? null : imageSrc;
                                      
                                      return (
                                        <div key={design.id || index} className="relative">
                                          {isBlobUrl ? (
                                            // Show placeholder for blob URLs (temporary images)
                                            <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex flex-col items-center justify-center">
                                              <span className="text-xs text-gray-500 text-center px-1">
                                                {design.name}
                                              </span>
                                              <span className="text-xs text-red-500 mt-1">
                                                Preview Lost
                                              </span>
                                            </div>
                                          ) : (
                                            // Show actual image for base64 URLs
                                            <img
                                              src={imageSrc}
                                              alt={`Design ${index + 1}`}
                                              className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                                              onError={(e) => {
                                                console.error('❌ Image failed to load:', {
                                                  designName: design.name,
                                                  imageSrc: imageSrc?.substring(0, 50) + '...',
                                                  error: e
                                                });
                                                const target = e.target as HTMLImageElement;
                                                target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIGZpbGw9IiNmM2Y0ZjYiLz48dGV4dCB4PSIzMiIgeT0iMzIiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSI4IiBmaWxsPSIjNmI3MjgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';
                                              }}
                                              onLoad={() => {
                                                console.log('✅ Image loaded successfully:', design.name);
                                              }}
                                            />
                                          )}
                                          <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-xs px-1 rounded text-center min-w-[20px]">
                                            {index + 1}
                                          </div>
                                        </div>
                                      );
                                    })
                                  ) : item.customization.design ? (
                                    <div className="relative">
                                      <img
                                        src={item.customization.design.preview}
                                        alt="Design"
                                        className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.src = 'https://via.placeholder.com/400x400/f3f4f6/9ca3af?text=No+Image';
                                        }}
                                      />
                                      <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-xs px-1 rounded text-center min-w-[20px]">
                                        1
                                      </div>
                                    </div>
                                  ) : item.customization.embroideryData?.designImage ? (
                                    <div className="relative">
                                      <img
                                        src={item.customization.embroideryData.designImage}
                                        alt="Design"
                                        className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.src = 'https://via.placeholder.com/400x400/f3f4f6/9ca3af?text=No+Image';
                                        }}
                                      />
                                      <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-xs px-1 rounded text-center min-w-[20px]">
                                        1
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                                      <span className="text-xs text-gray-500">No Design</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Product Details Section */}
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 mb-2">{item.productName}</h4>
                            <div className="space-y-3">
                              <div className="space-y-1 text-sm text-gray-600">
                                <p><strong>Quantity:</strong> {item.quantity}</p>
                              </div>
                              
                              {/* Detailed Pricing Breakdown */}
                              {(() => {
                                const pricing = getPricingBreakdown(item, backendProducts);
                                return (
                                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                                    <h6 className="text-sm font-semibold text-gray-800 mb-2">Price Breakdown</h6>
                                    
                                    {/* Base Product Price - Always show if there's customization or if it's > 0 */}
                                    {(pricing.baseProductPrice > 0 || pricing.embroideryPrice > 0 || pricing.embroideryOptionsPrice > 0) && (
                                      <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Base Product Price:</span>
                                        <span className="font-medium">${pricing.baseProductPrice.toFixed(2)}</span>
                                      </div>
                                    )}
                                    
                                    {/* Embroidery Price */}
                                    {pricing.embroideryPrice > 0 && (
                                      <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Embroidery Price:</span>
                                        <span className="font-medium">${pricing.embroideryPrice.toFixed(2)}</span>
                                      </div>
                                    )}
                                    
                                    {/* Embroidery Options */}
                                    {pricing.embroideryOptionsPrice > 0 && (
                                      <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Embroidery Options:</span>
                                        <span className="font-medium">${pricing.embroideryOptionsPrice.toFixed(2)}</span>
                                      </div>
                                    )}
                                    
                                    {/* Per-design breakdown for multiple designs */}
                                    {pricing.designBreakdown && pricing.designBreakdown.length > 0 && (
                                      <div className="mt-2 pt-2 border-t border-gray-200">
                                        <h6 className="text-xs font-medium text-gray-700 mb-2">Per Design Breakdown</h6>
                                        {pricing.designBreakdown.map((design, index) => (
                                          <div key={index} className="mb-2 last:mb-0">
                                            <div className="flex justify-between text-xs">
                                              <span className="text-gray-600 font-medium">{design.designName}:</span>
                                              <span className="font-medium">${design.designOptions.toFixed(2)}</span>
                                            </div>
                                            {/* Show individual design details */}
                                            {Object.entries(design.designDetails).some(([_, value]) => value > 0) && (
                                              <div className="ml-3 mt-1 space-y-1">
                                                {Object.entries(design.designDetails).map(([key, value]) => {
                                                  if (value > 0) {
                                                    return (
                                                      <div key={key} className="flex justify-between text-xs">
                                                        <span className="text-gray-500 capitalize">{key}:</span>
                                                        <span>${Number(value).toFixed(2)}</span>
                                                      </div>
                                                    );
                                                  }
                                                  return null;
                                                })}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    
                                    {/* Item Total */}
                                    <div className="flex justify-between text-sm font-semibold border-t border-gray-200 pt-2">
                                      <span className="text-gray-800">Item Total:</span>
                                      <span className="text-gray-900">${pricing.totalPrice.toFixed(2)}</span>
                                    </div>
                                    
                                    {/* Line Total (item total × quantity) */}
                                    <div className="flex justify-between text-sm font-bold bg-blue-50 rounded p-2">
                                      <span className="text-blue-800">Line Total ({item.quantity} × ${pricing.totalPrice.toFixed(2)}):</span>
                                      <span className="text-blue-900">${(pricing.totalPrice * (item.quantity || 1)).toFixed(2)}</span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                            
                            {item.customization && (
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                <h5 className="text-sm font-medium text-gray-700 mb-2">Customization Details</h5>
                                <div className="space-y-1 text-sm text-gray-600">
                                  {(item.customization as any).designs && (item.customization as any).designs.length > 0 ? (
                                    <div>
                                      <p><strong>Designs:</strong> {(item.customization as any).designs.length} uploaded</p>
                                      {(item.customization as any).designs.map((design: any, index: number) => (
                                        <p key={design.id || index} className="ml-4 text-xs">
                                          • {design.name || `Design ${index + 1}`}
                                        </p>
                                      ))}
                                    </div>
                                  ) : item.customization.design && (
                                    <p><strong>Design:</strong> {item.customization.design.name}</p>
                                  )}
                                  
                                  {item.customization.placement && (
                                    <p><strong>Placement:</strong> {item.customization.placement.replace('-', ' ')}</p>
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
                              </div>
                            )}
                          </div>
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
                          const replyItemIdStr = String(reply.itemId || '');
                          const itemIdStr = String(item.id || '');
                          const productIdStr = String(item.productId || '');
                          
                          const matches = 
                            // Exact matches
                            reply.itemId === item.id || 
                            reply.itemId === item.productId ||
                            replyItemIdStr === itemIdStr ||
                            replyItemIdStr === productIdStr ||
                            // Handle custom-embroidery-0 vs custom-embroidery mismatch
                            (replyItemIdStr === 'custom-embroidery-0' && itemIdStr === 'custom-embroidery') ||
                            (replyItemIdStr === 'custom-embroidery' && itemIdStr === 'custom-embroidery-0') ||
                            // Handle other potential mismatches with startsWith/contains
                            (replyItemIdStr && itemIdStr && replyItemIdStr.startsWith(itemIdStr)) ||
                            (replyItemIdStr && itemIdStr && itemIdStr.startsWith(replyItemIdStr)) ||
                            (replyItemIdStr && productIdStr && replyItemIdStr.startsWith(productIdStr)) ||
                            (replyItemIdStr && productIdStr && productIdStr.startsWith(replyItemIdStr));
                          
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
                          const replyItemIdStr = String(reply.itemId || '');
                          const itemIdStr = String(item.id || '');
                          const productIdStr = String(item.productId || '');
                          
                          return reply.itemId === item.id || 
                            reply.itemId === item.productId ||
                            replyItemIdStr === itemIdStr ||
                            replyItemIdStr === productIdStr ||
                            (replyItemIdStr === 'custom-embroidery-0' && itemIdStr === 'custom-embroidery') ||
                            (replyItemIdStr === 'custom-embroidery' && itemIdStr === 'custom-embroidery-0') ||
                            (replyItemIdStr && itemIdStr && replyItemIdStr.startsWith(itemIdStr)) ||
                            (replyItemIdStr && itemIdStr && itemIdStr.startsWith(replyItemIdStr)) ||
                            (replyItemIdStr && productIdStr && replyItemIdStr.startsWith(productIdStr)) ||
                            (replyItemIdStr && productIdStr && productIdStr.startsWith(replyItemIdStr));
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
