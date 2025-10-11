import { apiAuthService } from './apiAuthService';

export interface OrderReviewItem {
  productId: string;
  quantity: number;
  customization?: any;
  reviewStatus: 'pending' | 'approved' | 'rejected' | 'needs-changes';
  product?: any;
}

export interface SubmitForReviewRequest {
  items: OrderReviewItem[];
  subtotal: number;
  shipping: number;
  tax?: number; // Optional - will be calculated at checkout
  total: number;
  submittedAt: string;
}

export interface OrderReview {
  id: number;
  user_id: number;
  user_email?: string;
  first_name?: string;
  last_name?: string;
  order_data: OrderReviewItem[] | string;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  status: 'pending' | 'approved' | 'rejected' | 'needs-changes' | 'pending-payment' | 'approved-processing' | 'picture-reply-pending' | 'picture-reply-rejected' | 'picture-reply-approved' | 'ready-for-production' | 'in-production' | 'ready-for-checkout' | 'shipped' | 'delivered';
  submitted_at: string;
  reviewed_at?: string;
  admin_notes?: string;
  admin_picture_replies?: PictureReply[];
  customer_confirmations?: CustomerConfirmation[];
  picture_reply_uploaded_at?: string;
  customer_confirmed_at?: string;
  // Payment and shipping fields
  order_number?: string;
  shipping_address?: any; // JSON address object
  billing_address?: any; // JSON address object
  payment_method?: string;
  payment_status?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded';
  payment_provider?: 'stripe' | 'paypal' | 'google_pay' | 'apple_pay' | 'square' | 'manual';
  payment_intent_id?: string;
  transaction_id?: string;
  card_last4?: string;
  card_brand?: string;
  tracking_number?: string;
  shipping_carrier?: string;
  shipped_at?: string;
  delivered_at?: string;
  estimated_delivery_date?: string;
  customer_notes?: string;
  internal_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PictureReply {
  itemId: string;
  image: string; // Base64 encoded image
  notes?: string;
  uploadedAt?: string;
  // Enhanced fields for multi-design support
  designId?: string; // Optional design ID for multi-design items
  designName?: string; // Optional design name for reference
  embroideryStyle?: string; // Optional embroidery style info
}

export interface CustomerConfirmation {
  itemId: string;
  confirmed: boolean;
  notes?: string;
  confirmedAt?: string;
  // Enhanced fields for multi-design support
  designId?: string; // Optional design ID for multi-design items
  designName?: string; // Optional design name for reference
  embroideryStyle?: string; // Optional embroidery style info
}

export interface UpdateReviewStatusRequest {
  status: 'pending' | 'approved' | 'rejected' | 'needs-changes' | 'pending-payment' | 'approved-processing' | 'picture-reply-pending' | 'picture-reply-rejected' | 'picture-reply-approved' | 'ready-for-production' | 'in-production' | 'ready-for-checkout' | 'shipped' | 'delivered';
  adminNotes?: string;
  trackingNumber?: string;
  shippingCarrier?: string;
}

class OrderReviewApiService {
  /**
   * Submit order for admin review
   */
  async submitForReview(data: SubmitForReviewRequest) {
    return apiAuthService.post<{ orderReviewId: number; status: string; submittedAt: string; itemCount: number }>('/orders/submit-for-review', data, true);
  }

  /**
   * Get user's submitted orders for review
   */
  async getUserReviewOrders() {
    return apiAuthService.get<OrderReview[]>('/orders/review-orders', true);
  }

  /**
   * Get all orders for admin review (Admin only)
   */
  async getAllReviewOrders() {
    return apiAuthService.get<OrderReview[]>('/orders/admin/review-orders', true);
  }

  /**
   * Update order review status (Admin only)
   */
  async updateReviewStatus(orderId: number, data: UpdateReviewStatusRequest) {
    return apiAuthService.patch<{ id: number; status: string; adminNotes?: string; reviewedAt: string }>(`/orders/admin/review-orders/${orderId}`, data, true);
  }

  /**
   * Upload picture reply for order review (Admin only)
   */
  async uploadPictureReply(orderId: number, pictureReplies: PictureReply[]) {
    return apiAuthService.post<{ id: number; pictureReplies: PictureReply[]; uploadedAt: string }>(`/orders/admin/review-orders/${orderId}/picture-reply`, { pictureReplies }, true);
  }

  /**
   * Customer confirm picture replies
   */
  async confirmPictureReplies(orderId: number, confirmations: CustomerConfirmation[]) {
    // Backend also returns status (e.g., 'pending-payment') after confirmation
    return apiAuthService.post<{ id: number; confirmations: CustomerConfirmation[]; status?: string; confirmedAt: string }>(`/orders/review-orders/${orderId}/confirm-pictures`, { confirmations }, true);
  }
}

export const orderReviewApiService = new OrderReviewApiService();
