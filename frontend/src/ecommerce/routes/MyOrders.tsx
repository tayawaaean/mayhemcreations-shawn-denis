import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAlertModal } from '../context/AlertModalContext'
import { Package, Truck, CheckCircle, Clock, XCircle, Search, Filter, X, CreditCard, DollarSign, AlertCircle, RotateCcw, Eye, MessageSquare, Image as ImageIcon, Upload, Check, User, Calendar, Star } from 'lucide-react'
import Button from '../../components/Button'
import RefundRequestModal, { RefundRequest } from '../components/RefundRequestModal'
import RefundRequestModalEnhanced from '../components/RefundRequestModalEnhanced'
import { orderReviewApiService, OrderReview, PictureReply, CustomerConfirmation } from '../../shared/orderReviewApiService'
import { productReviewApiService } from '../../shared/productReviewApiService'
import { MaterialPricingService } from '../../shared/materialPricingService'
import { useWebSocket } from '../../hooks/useWebSocket'
import { products } from '../../data/products'
import { productApiService } from '../../shared/productApiService'

// Helper function to format date without timezone conversion issues
const formatDateWithoutTimezone = (dateString: string): string => {
  // Parse the date string and extract just the date part (YYYY-MM-DD)
  const datePart = dateString.split('T')[0]
  const [year, month, day] = datePart.split('-')
  // Return in MM/DD/YYYY format
  return `${month}/${day}/${year}`
}

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
  status: 'pending-review' | 'rejected-needs-upload' | 'picture-reply-pending' | 'picture-reply-rejected' | 'picture-reply-approved' | 'pending-payment' | 'approved-processing' | 'ready-for-production' | 'in-production' | 'ready-for-checkout' | 'shipped' | 'delivered' | 'refunded'
  orderDate: string
  total: number
  subtotal?: number
  shipping?: number
  tax?: number
  items: OrderItem[]
  adminNotes?: string
  reviewedAt?: string
  adminPictureReplies?: PictureReply[]
  customerConfirmations?: CustomerConfirmation[]
  pictureReplyUploadedAt?: string
  customerConfirmedAt?: string
  trackingNumber?: string
  shippingCarrier?: string
  shippedAt?: string
  deliveredAt?: string
  orderReceived?: boolean
  orderReceivedAt?: string
  refundStatus?: 'none' | 'requested' | 'partial' | 'full'
  refundedAmount?: number
  refundRequestedAt?: string
  originalOrderData?: any[] // Store original order data for matching
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
    case 'shipped':
      return 'shipped'
    case 'delivered':
      return 'delivered'
    case 'refunded':
      return 'refunded'
    default:
      return oldStatus as Order['status']
  }
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
        // Try multiple sources for base price with proper ID matching
        let basePrice = 0;
        
        // First try item.product.price
        if (item.product?.price) {
          basePrice = Number(item.product.price);
        }
        // Then try resolvedProduct.price
        else if (resolvedProduct?.price) {
          basePrice = Number(resolvedProduct.price);
        }
        // Finally, search products array with proper ID matching
        else {
          const productId = item.productId;
          // Try direct match first
          let product = products.find((p: any) => p.id === productId);
          
          // If not found and productId is numeric, try mayhem-XXX format
          if (!product && typeof productId === 'string' && !isNaN(Number(productId))) {
            const paddedId = `mayhem-${productId.padStart(3, '0')}`;
            product = products.find((p: any) => p.id === paddedId);
          }
          
          // If not found and productId is mayhem-XXX, try numeric format
          if (!product && typeof productId === 'string' && productId.startsWith('mayhem-')) {
            const numericId = parseInt(productId.replace('mayhem-', ''), 10);
            product = products.find((p: any) => p.id === numericId || p.id === numericId.toString());
          }
          
          if (product?.price) {
            basePrice = Number(product.price);
            console.log('💰 Found base price from products array:', { productId, basePrice, foundProduct: product.id });
          }
        }
        
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
        // Try multiple sources for base price with proper ID matching
        let basePrice = 0;
        
        // First try item.product.price
        if (item.product?.price) {
          basePrice = Number(item.product.price);
        }
        // Then try resolvedProduct.price
        else if (resolvedProduct?.price) {
          basePrice = Number(resolvedProduct.price);
        }
        // Finally, search products array with proper ID matching
        else {
          const productId = item.productId;
          // Try direct match first
          let product = products.find((p: any) => p.id === productId);
          
          // If not found and productId is numeric, try mayhem-XXX format
          if (!product && typeof productId === 'string' && !isNaN(Number(productId))) {
            const paddedId = `mayhem-${productId.padStart(3, '0')}`;
            product = products.find((p: any) => p.id === paddedId);
          }
          
          // If not found and productId is mayhem-XXX, try numeric format
          if (!product && typeof productId === 'string' && productId.startsWith('mayhem-')) {
            const numericId = parseInt(productId.replace('mayhem-', ''), 10);
            product = products.find((p: any) => p.id === numericId || p.id === numericId.toString());
          }
          
          if (product?.price) {
            basePrice = Number(product.price);
          }
        }
        
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
        // Try multiple sources for base price with proper ID matching
        if (item.product?.price) {
          itemPrice = Number(item.product.price);
        }
        else if (resolvedProduct?.price) {
          itemPrice = Number(resolvedProduct.price);
        }
        else {
          const productId = item.productId;
          // Try direct match first
          let product = products.find((p: any) => p.id === productId);
          
          // If not found and productId is numeric, try mayhem-XXX format
          if (!product && typeof productId === 'string' && !isNaN(Number(productId))) {
            const paddedId = `mayhem-${productId.padStart(3, '0')}`;
            product = products.find((p: any) => p.id === paddedId);
          }
          
          // If not found and productId is mayhem-XXX, try numeric format
          if (!product && typeof productId === 'string' && productId.startsWith('mayhem-')) {
            const numericId = parseInt(productId.replace('mayhem-', ''), 10);
            product = products.find((p: any) => p.id === numericId || p.id === numericId.toString());
          }
          
          if (product?.price) {
            itemPrice = Number(product.price);
          }
        }
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
    subtotal: orderReview.subtotal || calculatedTotal,
    shipping: orderReview.shipping || 0,
    tax: orderReview.tax || 0,
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
    trackingNumber: orderReview.tracking_number,
    shippingCarrier: orderReview.shipping_carrier,
    shippedAt: orderReview.shipped_at,
    deliveredAt: orderReview.delivered_at,
    refundStatus: (orderReview as any).refund_status || 'none',
    refundedAmount: (orderReview as any).refunded_amount || 0,
    refundRequestedAt: (orderReview as any).refund_requested_at,
    originalOrderData: orderData // Store original order data for matching
  };

  console.log('🔍 Final converted order:', {
    orderId: convertedOrder.id,
    status: convertedOrder.status,
    trackingNumber: convertedOrder.trackingNumber,
    shippingCarrier: convertedOrder.shippingCarrier,
    shippedAt: convertedOrder.shippedAt,
    deliveredAt: convertedOrder.deliveredAt,
    hasAdminPictureReplies: !!convertedOrder.adminPictureReplies,
    adminPictureRepliesLength: convertedOrder.adminPictureReplies?.length || 0,
    adminPictureReplies: convertedOrder.adminPictureReplies
  });

  return convertedOrder;
};

// Professional status icon mapping with better visual hierarchy
const getStatusIcon = (status: Order['status']) => {
  switch (status) {
    case 'pending-review':
      return <Clock className="w-5 h-5 text-amber-600" />
    case 'rejected-needs-upload':
      return <XCircle className="w-5 h-5 text-red-600" />
    case 'picture-reply-pending':
      return <ImageIcon className="w-5 h-5 text-cyan-600" />
    case 'picture-reply-rejected':
      return <XCircle className="w-5 h-5 text-red-600" />
    case 'picture-reply-approved':
      return <CheckCircle className="w-5 h-5 text-emerald-600" />
    case 'pending-payment':
      return <DollarSign className="w-5 h-5 text-orange-600" />
    case 'approved-processing':
      return <Package className="w-5 h-5 text-blue-600" />
    case 'ready-for-production':
      return <AlertCircle className="w-5 h-5 text-indigo-600" />
    case 'in-production':
      return <Package className="w-5 h-5 text-violet-600" />
    case 'ready-for-checkout':
      return <CreditCard className="w-5 h-5 text-purple-600" />
    case 'shipped':
      return <Truck className="w-5 h-5 text-blue-600" />
    case 'delivered':
      return <CheckCircle className="w-5 h-5 text-green-600" />
    case 'refunded':
      return <RotateCcw className="w-5 h-5 text-yellow-600" />
    default:
      return <Clock className="w-5 h-5 text-gray-500" />
  }
}

const getStatusText = (status: Order['status']) => {
  switch (status) {
    case 'pending-review':
      return 'Being Reviewed'
    case 'rejected-needs-upload':
      return 'Needs Your Attention'
    case 'picture-reply-pending':
      return 'Design Sample Ready'
    case 'picture-reply-rejected':
      return 'We\'re Making Adjustments'
    case 'picture-reply-approved':
      return 'Design Approved'
    case 'pending-payment':
      return 'Ready for Payment'
    case 'approved-processing':
      return 'Being Prepared'
    case 'ready-for-production':
      return 'Ready to Make'
    case 'in-production':
      return 'Being Made'
    case 'ready-for-checkout':
      return 'Ready to Order'
    case 'shipped':
      return 'On the Way'
    case 'delivered':
      return 'Delivered'
    case 'refunded':
      return 'Refunded'
    default:
      return 'In Progress'
  }
}

// Professional status badge colors with improved contrast and readability
const getStatusColor = (status: Order['status']) => {
  switch (status) {
    case 'pending-review':
      return 'bg-amber-100 text-amber-800 border border-amber-200'
    case 'rejected-needs-upload':
      return 'bg-red-100 text-red-800 border border-red-200'
    case 'picture-reply-pending':
      return 'bg-cyan-100 text-cyan-800 border border-cyan-200'
    case 'picture-reply-rejected':
      return 'bg-red-100 text-red-800 border border-red-200'
    case 'picture-reply-approved':
      return 'bg-emerald-100 text-emerald-800 border border-emerald-200'
    case 'pending-payment':
      return 'bg-orange-100 text-orange-800 border border-orange-200'
    case 'approved-processing':
      return 'bg-blue-100 text-blue-800 border border-blue-200'
    case 'ready-for-production':
      return 'bg-indigo-100 text-indigo-800 border border-indigo-200'
    case 'in-production':
      return 'bg-violet-100 text-violet-800 border border-violet-200'
    case 'ready-for-checkout':
      return 'bg-purple-100 text-purple-800 border border-purple-200'
    case 'shipped':
      return 'bg-blue-100 text-blue-800 border border-blue-200'
    case 'delivered':
      return 'bg-green-100 text-green-800 border border-green-200'
    case 'refunded':
      return 'bg-yellow-100 text-yellow-800 border border-yellow-200'
    default:
      return 'bg-gray-100 text-gray-800 border border-gray-200'
  }
}
// Card border and background styling based on order status
const getCardStyling = (order: Order) => {
  // Priority 1: Refund status takes precedence
  if (order.refundStatus === 'requested') {
    return 'bg-red-50 border-2 border-red-400 shadow-red-100'
  }
  if (order.refundStatus === 'partial' || order.refundStatus === 'full') {
    return 'bg-orange-50 border-2 border-orange-300 shadow-orange-100'
  }
  
  // Priority 2: Status-based styling
  switch (order.status) {
    case 'rejected-needs-upload':
    case 'picture-reply-rejected':
      return 'bg-red-50 border-2 border-red-300 shadow-red-100'
    case 'pending-payment':
      return 'bg-orange-50 border-2 border-orange-200 shadow-orange-100'
    case 'delivered':
      return 'bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 shadow-green-100'
    case 'shipped':
      return 'bg-blue-50 border-2 border-blue-200 shadow-blue-100'
    case 'picture-reply-pending':
      return 'bg-cyan-50 border-2 border-cyan-200 shadow-cyan-100'
    case 'in-production':
      return 'bg-violet-50 border-2 border-violet-200 shadow-violet-100'
    default:
      return 'bg-white border border-gray-200 shadow-gray-100'
  }
}

// Status icon background color for better visual hierarchy
const getIconBackgroundColor = (status: Order['status']) => {
  switch (status) {
    case 'pending-review':
      return 'bg-amber-100 border-amber-300'
    case 'rejected-needs-upload':
    case 'picture-reply-rejected':
      return 'bg-red-100 border-red-300'
    case 'picture-reply-pending':
      return 'bg-cyan-100 border-cyan-300'
    case 'picture-reply-approved':
      return 'bg-emerald-100 border-emerald-300'
    case 'pending-payment':
      return 'bg-orange-100 border-orange-300'
    case 'approved-processing':
      return 'bg-blue-100 border-blue-300'
    case 'ready-for-production':
      return 'bg-indigo-100 border-indigo-300'
    case 'in-production':
      return 'bg-violet-100 border-violet-300'
    case 'ready-for-checkout':
      return 'bg-purple-100 border-purple-300'
    case 'shipped':
      return 'bg-blue-100 border-blue-300'
    case 'delivered':
      return 'bg-green-100 border-green-300'
    case 'refunded':
      return 'bg-yellow-100 border-yellow-300'
    default:
      return 'bg-gray-100 border-gray-300'
  }
}

// Get order progress percentage for visual progress bar
const getOrderProgress = (status: Order['status']): number => {
  switch (status) {
    case 'pending-review':
      return 10
    case 'rejected-needs-upload':
      return 15
    case 'picture-reply-pending':
      return 25
    case 'picture-reply-rejected':
      return 20
    case 'picture-reply-approved':
      return 40
    case 'pending-payment':
      return 50
    case 'approved-processing':
      return 60
    case 'ready-for-production':
      return 65
    case 'in-production':
      return 75
    case 'ready-for-checkout':
      return 45
    case 'shipped':
      return 90
    case 'delivered':
      return 100
    case 'refunded':
      return 100  // Refunded orders show as complete (100%)
    default:
      return 5
  }
}

// Get progress bar color based on status
const getProgressBarColor = (status: Order['status']): string => {
  switch (status) {
    case 'rejected-needs-upload':
    case 'picture-reply-rejected':
      return 'bg-red-500'
    case 'pending-payment':
      return 'bg-orange-500'
    case 'delivered':
      return 'bg-green-500'
    case 'shipped':
      return 'bg-blue-500'
    case 'in-production':
      return 'bg-violet-500'
    case 'refunded':
      return 'bg-yellow-500'
    default:
      return 'bg-blue-500'
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
  const location = useLocation()
  const { user, isLoggedIn } = useAuth()
  const { showSuccess, showError, showInfo } = useAlertModal()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  const [paymentSuccessNotification, setPaymentSuccessNotification] = useState<{
    show: boolean
    paymentMethod?: string
    orderId?: number
  }>({
    show: false
  })
  const [pictureConfirmations, setPictureConfirmations] = useState<{[itemId: string]: {confirmed: boolean | null, notes: string, designId?: string, designName?: string, embroideryStyle?: string}}>({})
  const [submittingConfirmations, setSubmittingConfirmations] = useState(false)
  const [showReuploadModal, setShowReuploadModal] = useState(false)
  const [reuploadFiles, setReuploadFiles] = useState<{[itemId: string]: File | null}>({})
  const [submittingReupload, setSubmittingReupload] = useState(false)
  // Image enlargement modal state
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null)
  const [enlargedImageTitle, setEnlargedImageTitle] = useState<string>('')
  // Product review modal state
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewOrderId, setReviewOrderId] = useState<number | null>(null)
  const [rating, setRating] = useState<number>(5)
  const [reviewText, setReviewText] = useState<string>('')
  const [reviewImages, setReviewImages] = useState<string[]>([])
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewResultModal, setReviewResultModal] = useState<{
    show: boolean
    success: boolean
    title: string
    message: string
  }>({
    show: false,
    success: false,
    title: '',
    message: ''
  })
  const [backendProducts, setBackendProducts] = useState<any[]>([])
  // REMOVED: Old order-level review tracking - now using item-level reviews with reviewedItems state
  
  // Refund modal state
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [refundOrderId, setRefundOrderId] = useState<number | null>(null)
  const [refundOrderNumber, setRefundOrderNumber] = useState<string>('')
  const [refundOrderTotal, setRefundOrderTotal] = useState<number>(0)
  const [refundOrderSubtotal, setRefundOrderSubtotal] = useState<number>(0)
  const [refundOrderShipping, setRefundOrderShipping] = useState<number>(0)
  const [refundOrderTax, setRefundOrderTax] = useState<number>(0)
  const [refundOrderItems, setRefundOrderItems] = useState<OrderItem[]>([])
  
  // Item-level review state
  const [reviewedItems, setReviewedItems] = useState<Set<string>>(new Set())
  const [submittedReviews, setSubmittedReviews] = useState<Map<string, any>>(new Map()) // Store full review data
  const [reviewItem, setReviewItem] = useState<{
    orderId: number;
    productId: string;
    productName: string;
    productImage: string;
  } | null>(null)
  
  // Order received confirmations
  const [receivedOrders, setReceivedOrders] = useState<Set<number>>(new Set())
  
  // WebSocket hook for real-time updates
  const { subscribe, isConnected } = useWebSocket()

  // Load received orders from localStorage
  const loadReceivedOrders = () => {
    try {
      const stored = localStorage.getItem('receivedOrders')
      if (stored) {
        const receivedArray = JSON.parse(stored)
        setReceivedOrders(new Set(receivedArray))
        console.log('📦 Loaded received orders:', receivedArray.length)
      }
    } catch (error) {
      console.error('Error loading received orders:', error)
    }
  }

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

  // Load user reviews
  // REMOVED: Old loadUserReviews function - replaced with loadExistingReviews for item-level tracking
  // This function was causing conflicts with the new item-level review system

  // Check for payment success from checkout redirect
  useEffect(() => {
    const state = location.state as any
    if (state?.paymentSuccess) {
      setPaymentSuccessNotification({
        show: true,
        paymentMethod: state.paymentMethod,
        orderId: state.orderId
      })
      // Auto-hide after 8 seconds
      setTimeout(() => {
        setPaymentSuccessNotification({ show: false })
      }, 8000)
      // Clear the state to prevent showing again on refresh
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location, navigate])

  // Load orders on component mount
  useEffect(() => {
    if (isLoggedIn) {
      loadReceivedOrders()
      loadOrders()
      loadBackendProducts()
      // REMOVED: loadUserReviews() - using loadExistingReviews() instead (called from loadOrders)
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
              status: mapStatus(data.statusData.status),
              trackingNumber: data.statusData.trackingNumber || order.trackingNumber,
              shippingCarrier: data.statusData.shippingCarrier || order.shippingCarrier,
              shippedAt: data.statusData.shippedAt || order.shippedAt,
              deliveredAt: data.statusData.deliveredAt || order.deliveredAt
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
        
        // Load existing reviews after orders are set
        if (convertedOrders.length > 0) {
          setTimeout(() => loadExistingReviews(), 500)
        }
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

  // Calculate correct order total from line items
  const calculateCorrectOrderTotal = (order: Order, backendProductsParam?: any[]): number => {
    // Sum up all line item totals (quantity × item price)
    const itemsTotal = order.items.reduce((total, item) => {
      // Use getPricingBreakdown to get the correct total price (includes base + embroidery + options)
      // This ensures consistency with the detailed item breakdown display
      const pricing = getPricingBreakdown(item, backendProductsParam || backendProducts);
      const lineTotal = pricing.totalPrice * (item.quantity || 1);
      return total + lineTotal;
    }, 0);
    
    // Add shipping and tax (these should be correct in the order)
    const shipping = Number(order.shipping) || 0;
    const tax = Number(order.tax) || 0;
    
    return itemsTotal + shipping + tax;
  };

  // Handler for opening refund modal
  const handleRequestRefund = (order: Order) => {
    // Check if refund already requested
    if (order.refundStatus === 'requested' || order.refundStatus === 'partial' || order.refundStatus === 'full') {
      showInfo('A refund has already been requested or processed for this order.')
      return
    }
    
    // Calculate correct totals for refund modal
    const correctTotal = calculateCorrectOrderTotal(order)
    const itemsSubtotal = order.items.reduce((total, item) => {
      const itemPrice = item.customization?.embroideryData 
        ? Number((item.customization.embroideryData as any).totalPrice) || 0
        : Number(item.price) || 0
      return total + (itemPrice * (item.quantity || 1))
    }, 0)
    
    // Set modal state and open
    setRefundOrderId(order.id)
    setRefundOrderNumber(order.orderNumber)
    setRefundOrderTotal(correctTotal)
    setRefundOrderSubtotal(itemsSubtotal)
    setRefundOrderShipping(Number(order.shipping) || 0)
    setRefundOrderTax(Number(order.tax) || 0)
    setRefundOrderItems(order.items)
    setShowRefundModal(true)
  }

  // Handler for successful refund submission
  const handleRefundSuccess = () => {
    // Don't close modal here - let the modal handle its own success state display
    // Just refresh orders to show updated refund status
    loadOrders()
  }

  // Load existing reviews to track which items have been reviewed
  const loadExistingReviews = async () => {
    const reviewedSet = new Set<string>()
    const reviewsMap = new Map<string, any>()
    
    try {
      // Get all user's reviews
      const response = await productReviewApiService.getMyReviews()
      
      console.log('📝 Loading existing reviews:', response)
      
      if (response.success && response.data) {
        response.data.forEach((review: any) => {
          // Create unique key: orderId-productId
          // Backend returns camelCase properties (orderId, productId)
          const key = `${review.orderId}-${review.productId}`
          reviewedSet.add(key)
          reviewsMap.set(key, review) // Store full review data
          console.log('✅ Marking as reviewed:', key, {
            orderId: review.orderId,
            productId: review.productId,
            productTitle: review.productTitle,
            status: review.status
          })
        })
      }
      
      console.log('📊 Total reviewed items:', reviewedSet.size, Array.from(reviewedSet))
    } catch (error) {
      // Silently fail - reviews are optional
      console.log('⚠️ Could not load existing reviews:', error)
    }
    
    setReviewedItems(reviewedSet)
    setSubmittedReviews(reviewsMap)
  }

  // Check if a specific item has been reviewed
  const isItemReviewed = (orderId: number, productId: string): boolean => {
    const key = `${orderId}-${productId}`
    return reviewedItems.has(key)
  }

  // Get the submitted review for a specific item
  const getItemReview = (orderId: number, productId: string): any | null => {
    const key = `${orderId}-${productId}`
    return submittedReviews.get(key) || null
  }

  // Handler for confirming order received
  const handleOrderReceived = (orderId: number) => {
    // Add to received orders set
    setReceivedOrders(prev => {
      const newSet = new Set(prev)
      newSet.add(orderId)
      return newSet
    })
    
    // Store in localStorage for persistence
    const stored = localStorage.getItem('receivedOrders') || '[]'
    const receivedArray = JSON.parse(stored)
    if (!receivedArray.includes(orderId)) {
      receivedArray.push(orderId)
      localStorage.setItem('receivedOrders', JSON.stringify(receivedArray))
    }
    
    // Show success message
    showSuccess('Order confirmed as received! You can now leave reviews for your items.')
    
    // Load reviews after confirming receipt
    setTimeout(() => loadExistingReviews(), 500)
  }

  // Check if order has been confirmed as received
  const isOrderReceived = (orderId: number): boolean => {
    return receivedOrders.has(orderId)
  }

  // Handler for leaving a review on a specific item
  const handleLeaveItemReview = (item: OrderItem, orderId: number, orderNumber: string) => {
    setReviewItem({
      orderId: orderId,
      productId: item.productId,
      productName: item.productName,
      productImage: item.productImage
    })
    setReviewOrderId(orderId)
    setRating(5)
    setReviewText('')
    setReviewImages([])
    setShowReviewModal(true)
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
          showSuccess('All pictures approved! Order is ready for production.', 'Approval Complete')
        } else if (anyRejected) {
          showInfo('Some pictures were rejected. Admin will upload new designs.', 'Revisions Needed')
        }
        
        setPictureConfirmations({})
        // Close the details modal after successful submission
        setShowOrderDetails(false)
        setSelectedOrder(null)
        // Reload orders to get updated data
        loadOrders()
      } else {
        showError('Failed to submit confirmations. Please try again.', 'Submission Failed')
      }
    } catch (error) {
      console.error('Error submitting confirmations:', error)
      showError('Error submitting confirmations. Please try again.', 'Error')
    } finally {
      setSubmittingConfirmations(false)
    }
  }

  // Handle proceed to checkout
  const handleProceedToCheckout = (order: Order) => {
    console.log('Proceeding to payment for order:', order)
    // Navigate to new streamlined payment page with order ID
    navigate(`/payment?orderId=${order.id}`)
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

  // Handle review image upload
  const handleReviewImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    // Limit to 5 images
    if (reviewImages.length + files.length > 5) {
      setReviewResultModal({
        show: true,
        success: false,
        title: 'Too Many Images',
        message: 'You can upload a maximum of 5 images per review.'
      })
      return
    }

    // Convert files to base64 and add to reviewImages
    Array.from(files).forEach((file) => {
      // Check file size (max 5MB per image)
      if (file.size > 5 * 1024 * 1024) {
        setReviewResultModal({
          show: true,
          success: false,
          title: 'File Too Large',
          message: `Image "${file.name}" is too large. Maximum size is 5MB per image.`
        })
        return
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        setReviewResultModal({
          show: true,
          success: false,
          title: 'Invalid File Type',
          message: `File "${file.name}" is not an image. Please upload PNG or JPG files only.`
        })
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        setReviewImages((prev) => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  // Remove review image
  const removeReviewImage = (index: number) => {
    setReviewImages((prev) => prev.filter((_, i) => i !== index))
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
      showInfo('Re-upload functionality will be implemented with backend API', 'Feature Coming Soon')
      
      // Close modal and reload orders
      handleCloseReuploadModal()
      loadOrders()
    } catch (error) {
      console.error('Error re-uploading files:', error)
      showError('Error re-uploading files. Please try again.', 'Upload Error')
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
      {/* Payment Success Notification */}
      {paymentSuccessNotification.show && (
        <div className="mb-6 bg-green-50 border-l-4 border-green-500 rounded-lg p-6 shadow-lg animate-fade-in">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-xl font-bold text-green-900 mb-2">
                Payment Successful! 🎉
              </h3>
              <p className="text-green-800 mb-2">
                Your payment has been processed successfully. Your order is now being prepared.
              </p>
              <div className="text-sm text-green-700 space-y-1">
                <p>
                  <strong>Payment Method:</strong> {' '}
                  {paymentSuccessNotification.paymentMethod === 'paypal' ? 'PayPal' : 
                   paymentSuccessNotification.paymentMethod === 'stripe' ? 'Credit Card' : 
                   'Payment Completed'}
                </p>
                {paymentSuccessNotification.orderId && (
                  <p>
                    <strong>Order ID:</strong> #{paymentSuccessNotification.orderId}
                  </p>
                )}
                <p className="mt-2">
                  ✓ You'll receive updates on your order status below
                </p>
                <p>✓ Estimated delivery: 3-5 business days after production</p>
              </div>
              <button
                onClick={() => setPaymentSuccessNotification({ show: false })}
                className="mt-3 inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Got it, thanks!
              </button>
            </div>
            <button
              onClick={() => setPaymentSuccessNotification({ show: false })}
              className="ml-4 text-green-500 hover:text-green-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <div className="mb-8 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-100 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-4 mb-2">
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">My Orders</h1>
              {/* WebSocket connection status */}
              <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full ${
                isConnected ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'
              }`}>
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className={`text-xs font-bold ${isConnected ? 'text-green-700' : 'text-red-700'}`}>
                  {isConnected ? 'Live Updates Active' : 'Offline Mode'}
                </span>
              </div>
            </div>
            <p className="text-gray-700 font-medium">Track and manage all your orders in one place</p>
          </div>
          <Package className="w-16 h-16 text-blue-400 opacity-50" />
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-8 bg-white rounded-xl p-5 shadow-sm border border-gray-200">
        <div className="space-y-4 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
          <div className="flex-1 max-w-lg">
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Search Orders</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by order number or product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Status Filter</label>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 pr-8 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold bg-white appearance-none cursor-pointer"
                >
                  <option value="all">All Orders</option>
                  <option value="pending-review">Being Reviewed</option>
                  <option value="rejected-needs-upload">Needs Your Attention</option>
                  <option value="picture-reply-pending">Design Sample Ready</option>
                  <option value="picture-reply-rejected">We're Making Adjustments</option>
                  <option value="picture-reply-approved">Design Approved</option>
                  <option value="pending-payment">Ready for Payment</option>
                  <option value="approved-processing">Being Prepared</option>
                  <option value="ready-for-production">Ready to Make</option>
                  <option value="in-production">Being Made</option>
                  <option value="shipped">On the Way</option>
                  <option value="delivered">Delivered</option>
                  <option value="ready-for-checkout">Ready to Order</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
                className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold bg-white appearance-none cursor-pointer"
              >
                <option value="newest">⬇️ Newest First</option>
                <option value="oldest">⬆️ Oldest First</option>
              </select>
            </div>
          </div>
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
            <div key={order.id} className={`rounded-xl hover:shadow-lg transition-all duration-300 overflow-hidden ${getCardStyling(order)}`}>
              {/* Order Header */}
              <div className="px-6 py-5 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                  {/* Left Section - Order Info */}
                  <div className="flex items-start space-x-4">
                    {/* Status Badge */}
                    <div className="flex flex-col items-center space-y-2.5">
                      <div className={`flex items-center justify-center w-14 h-14 rounded-full border-2 shadow-sm ${getIconBackgroundColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                      </div>
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wide ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                      {order.refundStatus && order.refundStatus !== 'none' && (
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 ${
                          order.refundStatus === 'requested' ? 'bg-red-100 text-red-800 border border-red-300' :
                          order.refundStatus === 'partial' ? 'bg-orange-100 text-orange-800 border border-orange-300' :
                          'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}>
                          <RotateCcw className="w-3 h-3" />
                          {order.refundStatus === 'requested' ? 'Refund Pending' :
                           order.refundStatus === 'partial' ? 'Partial Refund' :
                           'Full Refund'}
                        </span>
                      )}
                    </div>
                    
                    {/* Order Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-gray-900 mb-2 tracking-tight">
                        Order #{order.orderNumber}
                      </h3>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-5 text-sm">
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">Placed {formatDateWithoutTimezone(order.orderDate)}</span>
                        </div>
                        {order.reviewedAt && (
                          <div className="flex items-center space-x-2 text-emerald-700">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            <span className="font-medium">Reviewed {formatDateWithoutTimezone(order.reviewedAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Section - Total & Actions */}
                  <div className="flex flex-col sm:items-end space-y-3">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-500 mb-1">Order Total</p>
                      <p className="text-3xl font-bold text-gray-900 tracking-tight">${calculateCorrectOrderTotal(order).toFixed(2)}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        <span className="font-semibold">{order.items.length}</span> item{order.items.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewDetails(order)}
                        className="w-full sm:w-auto bg-white hover:bg-gray-50 border-gray-300 text-gray-700 font-semibold shadow-sm"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                      
                      {/* Order Received button - show only for delivered orders not yet confirmed and no refund */}
                      {order.status === 'delivered' && 
                       !isOrderReceived(order.id) && 
                       (!order.refundStatus || order.refundStatus === 'none') && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleOrderReceived(order.id)}
                          className="w-full sm:w-auto bg-green-50 text-green-700 border-green-500 hover:bg-green-100 font-bold shadow-sm"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Confirm Received
                        </Button>
                      )}
                      
                      {/* Refund button - show only if order not received yet and no refund requested */}
                      {(order.status === 'delivered' || order.status === 'shipped') && !isOrderReceived(order.id) && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleRequestRefund(order)}
                          disabled={order.refundStatus === 'requested' || order.refundStatus === 'partial' || order.refundStatus === 'full'}
                          className={`w-full sm:w-auto font-bold shadow-sm ${
                            order.refundStatus === 'requested' || order.refundStatus === 'partial' || order.refundStatus === 'full'
                              ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                              : 'bg-blue-50 text-blue-700 border-blue-500 hover:bg-blue-100'
                          }`}
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          {order.refundStatus === 'requested' ? 'Refund Pending' : 
                           order.refundStatus === 'partial' || order.refundStatus === 'full' ? 'Refund Processed' : 
                           'Request Refund'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Progress Bar */}
              <div className="px-6 py-3 bg-white border-b border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Order Progress</span>
                  <span className="text-xs font-bold text-gray-900">{getOrderProgress(order.status)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(order.status)}`}
                    style={{ width: `${getOrderProgress(order.status)}%` }}
                  >
                    <div className="h-full w-full bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
                  </div>
                </div>
              </div>

              {/* Order Items Preview */}
              <div className="px-6 py-4 bg-gradient-to-b from-white to-gray-50">
                <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Order Items</h4>
                <div className="space-y-3">
                  {order.items.slice(0, 2).map((item) => (
                    <div key={item.id} className="flex items-center space-x-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
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
                        <h4 className="text-base font-bold text-gray-900 truncate mb-1">{item.productName}</h4>
                        <p className="text-sm text-gray-600 font-medium mb-2">
                          ${getPricingBreakdown(item, backendProducts).totalPrice.toFixed(2)} <span className="text-gray-400">×</span> {item.quantity}
                        </p>
                        
                        {/* Simplified Customization Display */}
                        {item.customization && (
                          <div className="flex flex-wrap gap-1.5">
                            {(item.customization as any).designs && (item.customization as any).designs.length > 0 ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-100 text-cyan-800 border border-cyan-200">
                                🎨 {(item.customization as any).designs.length} Design{(item.customization as any).designs.length !== 1 ? 's' : ''}
                              </span>
                            ) : item.customization.design ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-100 text-cyan-800 border border-cyan-200">
                                🎨 Custom Design
                              </span>
                            ) : null}
                            
                            {item.customization.placement && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                📍 {item.customization.placement.replace('-', ' ')}
                              </span>
                            )}
                            
                            {item.customization.size && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                📏 {item.customization.size}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-gray-500 mb-1">Item Total</p>
                        <p className="text-lg font-bold text-gray-900">
                          ${(getPricingBreakdown(item, backendProducts).totalPrice * (item.quantity || 1)).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {/* Show more items indicator */}
                  {order.items.length > 2 && (
                    <div className="text-center py-3">
                      <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full border border-gray-300">
                        <Package className="w-4 h-4 text-gray-600 mr-2" />
                        <span className="text-sm text-gray-700 font-bold">
                          +{order.items.length - 2} more item{order.items.length - 2 !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Item Reviews Section - Only show after customer confirms order received and no refund */}
              {order.status === 'delivered' && 
               isOrderReceived(order.id) && 
               (!order.refundStatus || order.refundStatus === 'none') && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-700">Review Items:</p>
                    <p className="text-xs text-gray-500">
                      {order.items.filter(item => {
                        const isReviewable = !isNaN(parseInt(String(item.productId))) && String(item.productId) !== 'custom-embroidery'
                        return isReviewable && isItemReviewed(order.id, item.productId)
                      }).length} of {order.items.filter(item => !isNaN(parseInt(String(item.productId))) && String(item.productId) !== 'custom-embroidery').length} reviewed
                    </p>
                  </div>
                  <div className="space-y-2">
                    {order.items.map((item) => {
                      const itemReviewed = isItemReviewed(order.id, item.productId)
                      const isReviewable = !isNaN(parseInt(String(item.productId))) && String(item.productId) !== 'custom-embroidery'
                      
                      if (!isReviewable) return null
                      
                      {
                        const review = getItemReview(order.id, item.productId)
                        
                        return (
                          <div key={item.id} className={`rounded border ${
                            itemReviewed 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-white border-gray-200'
                          }`}>
                            {/* Item Header */}
                            <div className="flex items-center justify-between p-2">
                              <div className="flex items-center flex-1 min-w-0">
                                <img 
                                  src={item.productImage} 
                                  alt={item.productName}
                                  className="w-10 h-10 rounded object-cover flex-shrink-0"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = 'https://via.placeholder.com/40/f3f4f6/9ca3af?text=?';
                                  }}
                                />
                                <span className="ml-2 text-sm text-gray-900 truncate">{item.productName}</span>
                              </div>
                              
                              {itemReviewed ? (
                                <span className="text-xs text-green-600 flex items-center flex-shrink-0 ml-2 font-medium">
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Reviewed
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleLeaveItemReview(item, order.id, order.orderNumber)}
                                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center flex-shrink-0 ml-2 px-3 py-1 border border-blue-600 rounded hover:bg-blue-50"
                                >
                                  <Star className="w-3 h-3 mr-1" />
                                  Review
                                </button>
                              )}
                            </div>
                            
                            {/* Show Review Content if Reviewed */}
                            {itemReviewed && review && (
                              <div className="px-3 pb-3 pt-1 border-t border-green-200 bg-white">
                                {/* Rating */}
                                <div className="flex items-center space-x-2 mb-2">
                                  <div className="flex">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        className={`w-4 h-4 ${
                                          star <= review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    review.status === 'approved' 
                                      ? 'bg-green-100 text-green-700' 
                                      : review.status === 'pending'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-red-100 text-red-700'
                                  }`}>
                                    {review.status === 'approved' ? '✓ Published' : review.status === 'pending' ? '⏱ Pending' : '✗ Not Approved'}
                                  </span>
                                </div>
                                
                                {/* Review Comment */}
                                {review.comment && (
                                  <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                                    "{review.comment}"
                                  </p>
                                )}
                                
                                {/* Review Images */}
                                {review.images && review.images.length > 0 && (
                                  <div className="flex space-x-1 mb-2">
                                    {review.images.slice(0, 3).map((image: string, idx: number) => (
                                      <img
                                        key={idx}
                                        src={image}
                                        alt={`Review ${idx + 1}`}
                                        className="w-12 h-12 rounded object-cover border border-gray-200"
                                      />
                                    ))}
                                    {review.images.length > 3 && (
                                      <div className="w-12 h-12 rounded bg-gray-100 border border-gray-200 flex items-center justify-center text-xs text-gray-600">
                                        +{review.images.length - 3}
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {/* Admin Response */}
                                {review.adminResponse && (
                                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                                    <p className="font-medium text-blue-900 mb-1">Store Response:</p>
                                    <p className="text-blue-800">{review.adminResponse}</p>
                                  </div>
                                )}
                                
                                {/* Link to full review */}
                                <div className="mt-2">
                                  <button
                                    onClick={() => navigate('/my-reviews')}
                                    className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                                  >
                                    View full review →
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      }
                    })}
                  </div>
                  {order.items.filter(item => {
                    const isReviewable = !isNaN(parseInt(String(item.productId))) && String(item.productId) !== 'custom-embroidery'
                    return isReviewable && !isItemReviewed(order.id, item.productId)
                  }).length === 0 && (
                    <div className="mt-2 p-3 bg-green-100 border border-green-200 rounded-lg text-center">
                      <p className="text-sm text-green-800 font-medium">
                        ✓ All items reviewed - Thank you!
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Admin Notes - Red styling for rejected orders */}
              {order.adminNotes && (
                <div className={`px-6 py-3 border-t ${
                  order.status === 'rejected-needs-upload' 
                    ? 'bg-red-50 border-red-100' 
                    : 'bg-blue-50 border-blue-100'
                }`}>
                  <div className="flex items-start space-x-3">
                    <MessageSquare className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                      order.status === 'rejected-needs-upload' 
                        ? 'text-red-600' 
                        : 'text-blue-600'
                    }`} />
                    <div className="flex-1">
                      <p className={`text-sm font-semibold mb-1 ${
                        order.status === 'rejected-needs-upload' 
                          ? 'text-red-800' 
                          : 'text-blue-800'
                      }`}>
                        {order.status === 'rejected-needs-upload' ? '⚠️ Rejection Reason' : 'Admin Message'}
                      </p>
                      <p className={`text-sm ${
                        order.status === 'rejected-needs-upload' 
                          ? 'text-red-700' 
                          : 'text-blue-700'
                      }`}>{order.adminNotes}</p>
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

              {order.status === 'shipped' && (
                <div className="px-6 py-4 bg-purple-50 border-t border-purple-100">
                  <div className="flex items-start space-x-3">
                    <Package className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-purple-800 mb-2">Shipped</p>
                      <p className="text-sm text-purple-700 mb-3">
                        Your order is on its way! Track your package using the information below.
                      </p>
                      {order.trackingNumber ? (
                        <div className="bg-white rounded-lg p-3 border border-purple-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-600">Courier:</span>
                            <span className="text-sm font-semibold text-gray-900">{order.shippingCarrier || 'N/A'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-600">Tracking Number:</span>
                            <span className="text-sm font-mono font-semibold text-purple-700">{order.trackingNumber}</span>
                          </div>
                          {order.shippedAt && (
                            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                              <span className="text-xs font-medium text-gray-600">Shipped On:</span>
                              <span className="text-xs text-gray-700">{formatDateWithoutTimezone(order.shippedAt)}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-white rounded-lg p-3 border border-purple-200">
                          <p className="text-sm text-gray-600 italic">Tracking information will be available soon.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {order.status === 'delivered' && (
                <div className="px-6 py-4 bg-green-50 border-t border-green-100">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-green-800 mb-2">Delivered</p>
                      <p className="text-sm text-green-700 mb-3">
                        Your order has been delivered successfully! Thank you for your purchase.
                      </p>
                      {order.trackingNumber ? (
                        <div className="bg-white rounded-lg p-3 border border-green-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-600">Courier:</span>
                            <span className="text-sm font-semibold text-gray-900">{order.shippingCarrier || 'N/A'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-600">Tracking Number:</span>
                            <span className="text-sm font-mono font-semibold text-green-700">{order.trackingNumber}</span>
                          </div>
                          {order.deliveredAt && (
                            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                              <span className="text-xs font-medium text-gray-600">Delivered On:</span>
                              <span className="text-xs text-gray-700">{formatDateWithoutTimezone(order.deliveredAt)}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-white rounded-lg p-3 border border-green-200">
                          <p className="text-sm text-gray-600 italic">Tracking information not available.</p>
                        </div>
                      )}
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
                        {formatDateWithoutTimezone(selectedOrder.orderDate)}
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
                      <p className="text-lg font-semibold text-gray-900">${calculateCorrectOrderTotal(selectedOrder, backendProducts).toFixed(2)}</p>
                      
                      {/* Order Total Breakdown */}
                      <div className="mt-2 text-xs text-gray-600 space-y-1">
                        <div className="flex justify-between">
                          <span>Items Subtotal:</span>
                          <span>${selectedOrder.items.reduce((total, item) => {
                            // Use getPricingBreakdown to get the correct total price (includes base + embroidery + options)
                            const pricing = getPricingBreakdown(item, backendProducts);
                            return total + (pricing.totalPrice * (item.quantity || 1))
                          }, 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Shipping:</span>
                          <span>${(Number(selectedOrder.shipping) || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tax:</span>
                          <span>${(Number(selectedOrder.tax) || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-medium border-t border-gray-200 pt-1">
                          <span>Order Total:</span>
                          <span>${calculateCorrectOrderTotal(selectedOrder, backendProducts).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    {selectedOrder.reviewedAt && (
                    <div>
                        <p className="text-sm font-medium text-gray-500">Reviewed Date</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {formatDateWithoutTimezone(selectedOrder.reviewedAt)}
                        </p>
                      </div>
                    )}
                    {selectedOrder.adminNotes && (
                      <div className="col-span-2">
                        <p className={`text-sm font-medium ${
                          selectedOrder.status === 'rejected-needs-upload' 
                            ? 'text-red-600' 
                            : 'text-gray-500'
                        }`}>
                          {selectedOrder.status === 'rejected-needs-upload' ? '⚠️ Rejection Reason' : 'Admin Notes'}
                        </p>
                        <div className={`mt-1 p-3 border rounded ${
                          selectedOrder.status === 'rejected-needs-upload' 
                            ? 'bg-red-50 border-red-200' 
                            : 'bg-blue-50 border-blue-200'
                        }`}>
                          <p className={`text-sm ${
                            selectedOrder.status === 'rejected-needs-upload' 
                              ? 'text-red-800 font-medium' 
                              : 'text-blue-800'
                          }`}>{selectedOrder.adminNotes}</p>
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

                {/* Tracking Information - Shipped Status */}
                {selectedOrder && selectedOrder.status === 'shipped' && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <Package className="h-6 w-6 text-purple-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-purple-800 mb-2">Order Shipped!</h3>
                        <p className="text-sm text-purple-700 mb-3">
                          Your order is on its way! Track your package using the information below.
                        </p>
                        {selectedOrder.trackingNumber ? (
                          <div className="bg-white rounded-lg p-4 space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs font-medium text-gray-600 mb-1">Shipping Courier</p>
                                <p className="text-base font-semibold text-gray-900">{selectedOrder.shippingCarrier || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-600 mb-1">Tracking Number</p>
                                <p className="text-base font-mono font-semibold text-purple-700">{selectedOrder.trackingNumber}</p>
                              </div>
                            </div>
                            {selectedOrder.shippedAt && (
                              <div className="pt-3 border-t border-gray-200">
                                <p className="text-xs font-medium text-gray-600 mb-1">Shipped Date</p>
                                <p className="text-sm text-gray-900">{new Date(selectedOrder.shippedAt).toLocaleString()}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-white rounded-lg p-4">
                            <p className="text-sm text-gray-600 italic">Tracking information will be available soon.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tracking Information - Delivered Status */}
                {selectedOrder && selectedOrder.status === 'delivered' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="h-6 w-6 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-green-800 mb-2">Order Delivered!</h3>
                        <p className="text-sm text-green-700 mb-3">
                          Your order has been delivered successfully. Thank you for your purchase!
                        </p>
                        {selectedOrder.trackingNumber ? (
                          <div className="bg-white rounded-lg p-4 space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs font-medium text-gray-600 mb-1">Shipping Courier</p>
                                <p className="text-base font-semibold text-gray-900">{selectedOrder.shippingCarrier || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-600 mb-1">Tracking Number</p>
                                <p className="text-base font-mono font-semibold text-green-700">{selectedOrder.trackingNumber}</p>
                              </div>
                            </div>
                            {selectedOrder.deliveredAt && (
                              <div className="pt-3 border-t border-gray-200">
                                <p className="text-xs font-medium text-gray-600 mb-1">Delivered Date</p>
                                <p className="text-sm text-gray-900">{new Date(selectedOrder.deliveredAt).toLocaleString()}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-white rounded-lg p-4">
                            <p className="text-sm text-gray-600 italic">Tracking information not available.</p>
                          </div>
                        )}
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
                                className="w-24 h-24 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => {
                                  setEnlargedImage(item.customization?.mockup || item.productImage);
                                  setEnlargedImageTitle(`${item.productName} - Final Product`);
                                }}
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
                                              className="w-16 h-16 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                                              onClick={() => {
                                                setEnlargedImage(imageSrc);
                                                setEnlargedImageTitle(`${design.name || `Design ${index + 1}`}`);
                                              }}
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
                                        className="w-16 h-16 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => {
                                          setEnlargedImage(item.customization?.design?.preview || '');
                                          setEnlargedImageTitle(item.customization?.design?.name || 'Design');
                                        }}
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
                                        className="w-16 h-16 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => {
                                          setEnlargedImage(item.customization?.embroideryData?.designImage || '');
                                          setEnlargedImageTitle(item.customization?.embroideryData?.designName || 'Design');
                                        }}
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
                                        <div key={design.id || index} className="ml-4 mb-2">
                                          <p className="text-xs font-medium text-gray-700">
                                            • {design.name || `Design ${index + 1}`}
                                          </p>
                                          {design.notes && (
                                            <p className="text-xs text-gray-600 ml-4 mt-1 italic">
                                              <strong>Placement:</strong> {design.notes}
                                            </p>
                                          )}
                                        </div>
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
                {selectedOrder.adminPictureReplies && Array.isArray(selectedOrder.adminPictureReplies) && selectedOrder.adminPictureReplies.length > 0 && (
                  <div>
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-6 border border-blue-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center space-x-2">
                        <MessageSquare className="w-5 h-5 text-blue-600" />
                        <span>Your Design Samples Are Ready!</span>
                      </h3>
                      <p className="text-sm text-gray-700">
                        We've created sample versions of your design. Please review them and let us know if you love them or want any changes.
                      </p>
                    </div>
                    
                    {/* Group replies by item */}
                    <div className="space-y-6">
                      {selectedOrder.items.map((item, itemIndex) => {
                        // Find replies for this specific item - USE EXACT MATCHING ONLY
                        const itemReplies = selectedOrder.adminPictureReplies?.filter(reply => {
                          // Convert to strings for comparison
                          const replyItemIdStr = String(reply.itemId || '');
                          const itemIdStr = String(item.id || '');
                          const productIdStr = String(item.productId || '');
                          
                          // STRICT EXACT MATCH ONLY - no fuzzy matching
                          const matches = 
                            replyItemIdStr === itemIdStr || 
                            replyItemIdStr === productIdStr;
                          
                          console.log('🔍 Item reply matching (exact):', {
                            itemId: item.id,
                            productId: item.productId,
                            replyItemId: reply.itemId,
                            matches,
                            itemName: item.productName
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
                                          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl rounded-bl-md px-4 py-3 shadow-lg">
                                            <div className="flex items-start space-x-3">
                                              <div className="flex-shrink-0">
                                                <img
                                                  src={reply.image}
                                                  alt="Your design sample"
                                                  className={`w-20 h-20 object-cover rounded-lg border-2 border-white shadow-md ${
                                                    selectedOrder.status !== 'refunded' 
                                                      ? 'cursor-pointer hover:opacity-90 transition-all hover:scale-105' 
                                                      : 'opacity-75 cursor-not-allowed'
                                                  }`}
                                                  onClick={() => {
                                                    if (selectedOrder.status !== 'refunded') {
                                                      window.open(reply.image, '_blank')
                                                    }
                                                  }}
                                                  title={selectedOrder.status !== 'refunded' ? "Click to view full size" : "Design samples not available for refunded orders"}
                                                />
                                                {selectedOrder.status !== 'refunded' && (
                                                  <p className="text-xs text-center text-blue-100 mt-1">Click to enlarge</p>
                                                )}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center space-x-2 mb-1">
                                                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                                  <p className="text-sm font-semibold text-white">Our Design Team</p>
                                                </div>
                                                {reply.notes && (
                                                  <div className="bg-blue-600 bg-opacity-50 rounded-lg p-2 mb-2">
                                                    <p className="text-sm text-white leading-relaxed">{reply.notes}</p>
                                                  </div>
                                                )}
                                                <p className="text-xs text-blue-100 opacity-90">
                                                  Sent on {reply.uploadedAt ? new Date(reply.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unknown'}
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
                                            <div className="bg-gradient-to-br from-green-50 to-green-100 text-green-900 rounded-2xl rounded-br-md px-4 py-3 shadow-md border-2 border-green-300">
                                              <div className="flex items-center space-x-2 mb-2">
                                                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                                  <Check className="h-5 w-5 text-white" />
                                                </div>
                                                <div>
                                                  <p className="text-sm font-semibold">You Approved This!</p>
                                                  <p className="text-xs text-green-700">Great choice!</p>
                                                </div>
                                              </div>
                                              <div className="bg-white bg-opacity-50 rounded-lg p-2">
                                                <p className="text-sm">
                                                  {selectedOrder.status === 'pending-payment' 
                                                    ? '🎉 Design approved! Please complete payment to start production.'
                                                    : '✨ Design approved and in progress. We\'ll notify you when it\'s ready!'
                                                  }
                                                </p>
                                              </div>
                                            </div>
                                          ) : (
                                            // Only show approval buttons if order hasn't moved to payment or beyond
                                            selectedOrder.status !== 'pending-payment' &&
                                            selectedOrder.status !== 'approved-processing' &&
                                            selectedOrder.status !== 'ready-for-production' &&
                                            selectedOrder.status !== 'in-production' &&
                                            selectedOrder.status !== 'ready-for-checkout' &&
                                            selectedOrder.status !== 'shipped' &&
                                            selectedOrder.status !== 'delivered' ? (
                                              <div className="bg-white rounded-2xl rounded-br-md px-4 py-4 shadow-md border-2 border-gray-200">
                                                <div className="flex items-center space-x-2 mb-3">
                                                  <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                                                    <User className="h-4 w-4 text-white" />
                                                  </div>
                                                  <p className="text-sm font-semibold text-gray-900">What Do You Think?</p>
                                                </div>
                                                
                                                <div className="space-y-3">
                                                  <p className="text-sm text-gray-700">Does this design look good to you?</p>
                                                  <div className="grid grid-cols-2 gap-3">
                                                    <label className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                                      pictureConfirmations[reply.itemId]?.confirmed === true 
                                                        ? 'border-green-500 bg-green-50' 
                                                        : 'border-gray-300 hover:border-green-300 hover:bg-green-50'
                                                    }`}>
                                                      <input
                                                        type="radio"
                                                        name={`confirmation-${reply.itemId}`}
                                                        checked={pictureConfirmations[reply.itemId]?.confirmed === true}
                                                        onChange={() => handlePictureConfirmationChange(reply.itemId, true)}
                                                        className="sr-only"
                                                      />
                                                      <CheckCircle className={`h-8 w-8 mb-1 ${
                                                        pictureConfirmations[reply.itemId]?.confirmed === true 
                                                          ? 'text-green-600' 
                                                          : 'text-gray-400'
                                                      }`} />
                                                      <span className={`text-sm font-medium ${
                                                        pictureConfirmations[reply.itemId]?.confirmed === true 
                                                          ? 'text-green-700' 
                                                          : 'text-gray-700'
                                                      }`}>Love It!</span>
                                                      <span className="text-xs text-gray-500 mt-1">Looks perfect</span>
                                                    </label>
                                                    <label className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                                      pictureConfirmations[reply.itemId]?.confirmed === false 
                                                        ? 'border-orange-500 bg-orange-50' 
                                                        : 'border-gray-300 hover:border-orange-300 hover:bg-orange-50'
                                                    }`}>
                                                      <input
                                                        type="radio"
                                                        name={`confirmation-${reply.itemId}`}
                                                        checked={pictureConfirmations[reply.itemId]?.confirmed === false}
                                                        onChange={() => handlePictureConfirmationChange(reply.itemId, false)}
                                                        className="sr-only"
                                                      />
                                                      <AlertCircle className={`h-8 w-8 mb-1 ${
                                                        pictureConfirmations[reply.itemId]?.confirmed === false 
                                                          ? 'text-orange-600' 
                                                          : 'text-gray-400'
                                                      }`} />
                                                      <span className={`text-sm font-medium ${
                                                        pictureConfirmations[reply.itemId]?.confirmed === false 
                                                          ? 'text-orange-700' 
                                                          : 'text-gray-700'
                                                      }`}>Need Changes</span>
                                                      <span className="text-xs text-gray-500 mt-1">Let's adjust</span>
                                                    </label>
                                                  </div>
                                                  
                                                  {/* Notes */}
                                                  <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                      Any Comments? (Optional)
                                                    </label>
                                                    <textarea
                                                      value={pictureConfirmations[reply.itemId]?.notes || ''}
                                                      onChange={(e) => handlePictureConfirmationNotesChange(reply.itemId, e.target.value)}
                                                      rows={2}
                                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm resize-none"
                                                      placeholder="Tell us what you'd like to change..."
                                                    />
                                                  </div>
                                                </div>
                                              </div>
                                            ) : null
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
                          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <Clock className="h-8 w-8 text-gray-400" />
                          </div>
                          <h3 className="text-lg font-medium text-gray-900">Hang Tight!</h3>
                          <p className="mt-2 text-sm text-gray-600 max-w-sm mx-auto">
                            Our design team is working on your samples. We'll notify you as soon as they're ready to review!
                          </p>
                          <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                            Usually ready within 24-48 hours
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}


              </div>

              <div className="mt-6 flex justify-between items-center">
                <div className="flex space-x-3">
                  <Button onClick={handleCloseModal}>
                    Close
                  </Button>
                  
                  {/* Submit Picture Confirmations Button - Only show for orders still in design approval phase */}
                  {selectedOrder.adminPictureReplies && 
                   Array.isArray(selectedOrder.adminPictureReplies) && 
                   selectedOrder.adminPictureReplies.length > 0 && 
                   Object.values(pictureConfirmations).some(c => c.confirmed !== null) && 
                   selectedOrder.status !== 'pending-payment' && 
                   selectedOrder.status !== 'approved-processing' && 
                   selectedOrder.status !== 'ready-for-production' &&
                   selectedOrder.status !== 'in-production' &&
                   selectedOrder.status !== 'ready-for-checkout' &&
                   selectedOrder.status !== 'shipped' &&
                   selectedOrder.status !== 'delivered' && (
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

      {/* Image Enlargement Modal */}
      {enlargedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4" onClick={() => setEnlargedImage(null)}>
          <div className="relative max-w-7xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setEnlargedImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 bg-black bg-opacity-50 rounded-full p-2"
            >
              <X className="w-6 h-6" />
            </button>
            {enlargedImageTitle && (
              <div className="absolute -top-12 left-0 text-white text-lg font-medium bg-black bg-opacity-50 px-4 py-2 rounded">
                {enlargedImageTitle}
              </div>
            )}
            <img
              src={enlargedImage}
              alt="Enlarged view"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={() => setEnlargedImage(null)}
            />
          </div>
        </div>
      )}

      {/* Product Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-black opacity-50" onClick={() => setShowReviewModal(false)}></div>
            
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  {reviewItem ? `Review: ${reviewItem.productName}` : 'Write a Review'}
                </h3>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Show product image in modal */}
              {reviewItem && (
                <div className="flex justify-center mb-4">
                  <img 
                    src={reviewItem.productImage}
                    alt={reviewItem.productName}
                    className="w-24 h-24 object-cover rounded-lg shadow-md"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://via.placeholder.com/100/f3f4f6/9ca3af?text=Product';
                    }}
                  />
                </div>
              )}

              <div className="space-y-4">
                {/* Rating */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rating
                  </label>
                  <div className="flex items-center space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className={`text-3xl transition-colors ${
                          star <= rating ? 'text-yellow-400' : 'text-gray-300'
                        } hover:text-yellow-400`}
                      >
                        ★
                      </button>
                    ))}
                    <span className="text-sm text-gray-600 ml-2">({rating}/5)</span>
                  </div>
                </div>

                {/* Review Text */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Review
                  </label>
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Share your experience with this product..."
                  />
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Add Photos (Optional)
                  </label>
                  <div className="space-y-3">
                    {/* Upload Button */}
                    {reviewImages.length < 5 && (
                      <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                        <div className="text-center">
                          <ImageIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            Click to upload images ({reviewImages.length}/5)
                          </span>
                          <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB each</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleReviewImageUpload}
                          className="hidden"
                        />
                      </label>
                    )}

                    {/* Image Previews */}
                    {reviewImages.length > 0 && (
                      <div className="grid grid-cols-3 gap-3">
                        {reviewImages.map((image, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={image}
                              alt={`Review ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg border border-gray-200"
                            />
                            <button
                              onClick={() => removeReviewImage(index)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    onClick={() => {
                      setShowReviewModal(false);
                      setRating(5);
                      setReviewText('');
                      setReviewImages([]);
                    }}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!reviewItem || !reviewOrderId) return;
                      setSubmittingReview(true);
                      try {
                        // Use the specific product from reviewItem
                        const productIdStr = String(reviewItem.productId);
                        const productId = parseInt(productIdStr);

                        // Validate productId before sending
                        if (!productId || isNaN(productId) || productId <= 0) {
                          console.error('❌ Invalid productId:', { 
                            productId, 
                            productIdStr,
                            reviewItem
                          });
                          setReviewResultModal({
                            show: true,
                            success: false,
                            title: 'Error',
                            message: 'Invalid product information. Please try again or contact support.'
                          });
                          return;
                        }

                        console.log('📝 Submitting review for specific item:', {
                          productId,
                          productName: reviewItem.productName,
                          orderId: reviewOrderId,
                          rating,
                          hasComment: !!reviewText,
                          hasImages: reviewImages.length > 0
                        });

                        const response = await productReviewApiService.createReview({
                          productId,
                          orderId: reviewOrderId,
                          rating,
                          title: `Review for ${reviewItem.productName}`,
                          comment: reviewText,
                          images: reviewImages.length > 0 ? reviewImages : undefined,
                        });

                        if (response.success) {
                          // Mark this specific item as reviewed
                          if (reviewItem) {
                            setReviewedItems(prev => {
                              const newSet = new Set(prev)
                              newSet.add(`${reviewItem.orderId}-${reviewItem.productId}`)
                              return newSet
                            })
                          }
                          
                          setShowReviewModal(false);
                          setRating(5);
                          setReviewText('');
                          setReviewImages([]);
                          setReviewItem(null);
                          // Reload reviews to update the UI
                          loadExistingReviews();
                          setReviewResultModal({
                            show: true,
                            success: true,
                            title: 'Review Submitted!',
                            message: `Thank you for reviewing ${reviewItem?.productName || 'this product'}! It will be published after admin approval.`
                          });
                        } else {
                          setReviewResultModal({
                            show: true,
                            success: false,
                            title: 'Submission Failed',
                            message: response.message || 'Failed to submit review. Please try again.'
                          });
                        }
                      } catch (error: any) {
                        console.error('Error submitting review:', error);
                        console.error('Error response data:', error.response?.data);
                        console.error('Error status:', error.response?.status);
                        const errorMessage = error.response?.data?.message || error.message || 'Failed to submit review. Please try again.';
                        setReviewResultModal({
                          show: true,
                          success: false,
                          title: 'Error',
                          message: errorMessage
                        });
                      } finally {
                        setSubmittingReview(false);
                      }
                    }}
                    disabled={submittingReview || !reviewText.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                  >
                    {submittingReview ? 'Submitting...' : 'Submit Review'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Result Modal */}
      {reviewResultModal.show && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-black opacity-50" onClick={() => setReviewResultModal({ ...reviewResultModal, show: false })}></div>
            
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="text-center">
                {/* Icon */}
                {reviewResultModal.success ? (
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                ) : (
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                    <XCircle className="h-8 w-8 text-red-600" />
                  </div>
                )}

                {/* Title */}
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {reviewResultModal.title}
                </h3>

                {/* Message */}
                <p className="text-gray-600 mb-6">
                  {reviewResultModal.message}
                </p>

                {/* Close Button */}
                <Button
                  onClick={() => setReviewResultModal({ ...reviewResultModal, show: false })}
                  className={`w-full ${
                    reviewResultModal.success 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-gray-600 hover:bg-gray-700'
                  } text-white`}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refund Request Modal - Enhanced with item selection */}
      {showRefundModal && refundOrderId && (
        <RefundRequestModalEnhanced
          isOpen={showRefundModal}
          onClose={() => setShowRefundModal(false)}
          orderId={refundOrderId}
          orderNumber={refundOrderNumber}
          orderTotal={refundOrderTotal}
          orderSubtotal={refundOrderSubtotal}
          orderShipping={refundOrderShipping}
          orderTax={refundOrderTax}
          orderItems={refundOrderItems}
          onSuccess={handleRefundSuccess}
        />
      )}

    </main>
  )
}
