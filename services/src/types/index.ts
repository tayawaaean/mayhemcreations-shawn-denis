// Chat message types that match the main backend
export interface ChatMessage {
  messageId: string;
  text?: string | null;
  sender: 'user' | 'admin';
  customerId: string;
  type?: 'text' | 'image' | 'file';
  attachment?: any | null;
  name?: string | null;
  email?: string | null;
  timestamp: string;
}

// Order item interface for email notifications
export interface OrderItem {
  id: string | number;
  productId: number;
  productName: string;
  variantName?: string;
  quantity: number;
  price: number;
  subtotal: number;
  customization?: any;
  imageUrl?: string;
}

// Address interface for shipping/billing addresses
export interface Address {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

// Payment information interface
export interface PaymentInfo {
  paymentMethod: string;
  paymentProvider: string;
  transactionId?: string;
  cardLast4?: string;
  cardBrand?: string;
  paidAmount: number;
}

// Shipping information interface
export interface ShippingInfo {
  carrier: string;
  service: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDeliveryDate?: string;
  shippingCost: number;
}

// Refund information interface
export interface RefundInfo {
  refundId: string;
  refundAmount: number;
  refundReason?: string;
  refundMethod: string;
  refundDate: string;
  itemsRefunded?: OrderItem[];
}

// Webhook payload from main backend - now includes all event types
export interface ChatWebhookPayload {
  event: 
    | 'chat_message' 
    | 'chat_connected' 
    | 'chat_disconnected' 
    | 'conversation_summary' 
    | 'unread_messages' 
    | 'new_customer'
    | 'order_confirmed'
    | 'shipping_confirmed'
    | 'delivered'
    | 'refund_confirmed'
    | 'payment_receipt'
    | 'review_request'
    | 'newsletter'
    | 'account_update';
  data: ChatMessage | {
    customerId: string;
    name?: string | null;
    email?: string | null;
    timestamp: string;
    // Additional fields for chat events
    customerEmail?: string;
    customerName?: string;
    isGuest?: boolean;
    messages?: Array<{
      text: string;
      sender: 'user' | 'admin';
      timestamp: Date;
      type: string;
    }>;
    unreadCount?: number;
    lastMessage?: string;
    // Fields for order confirmation
    orderId?: string | number;
    orderNumber?: string;
    orderItems?: OrderItem[];
    orderTotal?: number;
    subtotal?: number;
    tax?: number;
    shippingCost?: number;
    shippingAddress?: Address;
    billingAddress?: Address;
    // Fields for shipping confirmation
    shippingInfo?: ShippingInfo;
    // Fields for payment receipt
    paymentInfo?: PaymentInfo;
    // Fields for refund
    refundInfo?: RefundInfo;
    // Fields for review request
    reviewUrl?: string;
    // Fields for newsletter
    newsletterContent?: string;
    newsletterTitle?: string;
    unsubscribeUrl?: string;
    // Fields for account update
    updateType?: string;
    updateDetails?: string;
    actionRequired?: boolean;
  };
}

// Email notification types
export interface EmailNotification {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// User profile for email context
export interface UserProfile {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  isGuest: boolean;
}

// Email template data
export interface EmailTemplateData {
  customerName: string;
  customerEmail?: string;
  message: string;
  timestamp: string;
  isGuest: boolean;
  adminName: string;
  companyName: string;
}
