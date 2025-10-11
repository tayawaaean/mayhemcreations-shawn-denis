/**
 * Order Review Model
 * Handles order review and approval workflow
 */

import { DataTypes, Model, Optional, Sequelize } from 'sequelize';
import { sequelize } from '../config/database';

export interface OrderReviewAttributes {
  id: number;
  userId: number;
  orderData: any; // JSON data containing order details
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  status: 'pending' | 'approved' | 'rejected' | 'needs-changes' | 'pending-payment' | 'approved-processing' | 'picture-reply-pending' | 'picture-reply-rejected' | 'picture-reply-approved' | 'ready-for-production' | 'in-production' | 'ready-for-checkout' | 'shipped' | 'delivered';
  submittedAt: Date;
  reviewedAt?: Date | null;
  adminNotes?: string | null;
  adminPictureReplies?: any | null; // JSON data for picture replies
  customerConfirmations?: any | null; // JSON data for customer confirmations
  pictureReplyUploadedAt?: Date | null;
  customerConfirmedAt?: Date | null;
  // Payment and shipping fields
  shippingAddress?: any | null; // JSON data for shipping address
  billingAddress?: any | null; // JSON data for billing address
  paymentMethod?: string | null;
  paymentStatus?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded' | null;
  paymentProvider?: 'stripe' | 'paypal' | 'google_pay' | 'apple_pay' | 'square' | 'manual' | null;
  paymentIntentId?: string | null;
  transactionId?: string | null;
  cardLast4?: string | null;
  cardBrand?: string | null;
  orderNumber?: string | null;
  trackingNumber?: string | null;
  shippingCarrier?: string | null;
  shippedAt?: Date | null;
  deliveredAt?: Date | null;
  estimatedDeliveryDate?: Date | null;
  customerNotes?: string | null;
  internalNotes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderReviewCreationAttributes extends Optional<OrderReviewAttributes, 'id' | 'reviewedAt' | 'adminNotes' | 'adminPictureReplies' | 'customerConfirmations' | 'pictureReplyUploadedAt' | 'customerConfirmedAt' | 'shippingAddress' | 'billingAddress' | 'paymentMethod' | 'paymentStatus' | 'paymentProvider' | 'paymentIntentId' | 'transactionId' | 'cardLast4' | 'cardBrand' | 'orderNumber' | 'trackingNumber' | 'shippingCarrier' | 'shippedAt' | 'deliveredAt' | 'estimatedDeliveryDate' | 'customerNotes' | 'internalNotes' | 'createdAt' | 'updatedAt'> {}

export class OrderReview extends Model<OrderReviewAttributes, OrderReviewCreationAttributes> implements OrderReviewAttributes {
  public id!: number;
  public userId!: number;
  public orderData!: any;
  public subtotal!: number;
  public shipping!: number;
  public tax!: number;
  public total!: number;
  public status!: 'pending' | 'approved' | 'rejected' | 'needs-changes' | 'pending-payment' | 'approved-processing' | 'picture-reply-pending' | 'picture-reply-rejected' | 'picture-reply-approved' | 'ready-for-production' | 'in-production' | 'ready-for-checkout';
  public submittedAt!: Date;
  public reviewedAt?: Date | null;
  public adminNotes?: string | null;
  public adminPictureReplies?: any | null;
  public customerConfirmations?: any | null;
  public pictureReplyUploadedAt?: Date | null;
  public customerConfirmedAt?: Date | null;
  // Payment and shipping fields
  public shippingAddress?: any | null;
  public billingAddress?: any | null;
  public paymentMethod?: string | null;
  public paymentStatus?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded' | null;
  public paymentProvider?: 'stripe' | 'paypal' | 'google_pay' | 'apple_pay' | 'square' | 'manual' | null;
  public paymentIntentId?: string | null;
  public transactionId?: string | null;
  public cardLast4?: string | null;
  public cardBrand?: string | null;
  public orderNumber?: string | null;
  public trackingNumber?: string | null;
  public shippingCarrier?: string | null;
  public shippedAt?: Date | null;
  public deliveredAt?: Date | null;
  public estimatedDeliveryDate?: Date | null;
  public customerNotes?: string | null;
  public internalNotes?: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  /**
   * Get order data as parsed JSON
   */
  public getOrderData(): any {
    if (!this.orderData) return null;
    try {
      return typeof this.orderData === 'string' ? JSON.parse(this.orderData) : this.orderData;
    } catch (error) {
      console.error('Error parsing order data:', error);
      return null;
    }
  }

  /**
   * Set order data as JSON string
   */
  public setOrderData(data: any): void {
    this.orderData = data ? JSON.stringify(data) : null;
  }

  /**
   * Get admin picture replies as parsed JSON
   */
  public getAdminPictureReplies(): any {
    if (!this.adminPictureReplies) return null;
    try {
      return typeof this.adminPictureReplies === 'string' ? JSON.parse(this.adminPictureReplies) : this.adminPictureReplies;
    } catch (error) {
      console.error('Error parsing admin picture replies:', error);
      return null;
    }
  }

  /**
   * Set admin picture replies as JSON string
   */
  public setAdminPictureReplies(data: any): void {
    this.adminPictureReplies = data ? JSON.stringify(data) : null;
  }

  /**
   * Get customer confirmations as parsed JSON
   */
  public getCustomerConfirmations(): any {
    if (!this.customerConfirmations) return null;
    try {
      return typeof this.customerConfirmations === 'string' ? JSON.parse(this.customerConfirmations) : this.customerConfirmations;
    } catch (error) {
      console.error('Error parsing customer confirmations:', error);
      return null;
    }
  }

  /**
   * Set customer confirmations as JSON string
   */
  public setCustomerConfirmations(data: any): void {
    this.customerConfirmations = data ? JSON.stringify(data) : null;
  }
}

OrderReview.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'Reference to user who submitted the order',
    },
    orderData: {
      type: DataTypes.JSON,
      allowNull: false,
      field: 'order_data',
      comment: 'JSON data containing order details, cart items, etc.',
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'subtotal',
      comment: 'Order subtotal before tax and shipping',
    },
    shipping: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'shipping',
      comment: 'Shipping cost',
    },
    tax: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'tax',
      comment: 'Tax amount',
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'total',
      comment: 'Total order amount',
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'needs-changes', 'pending-payment', 'approved-processing', 'picture-reply-pending', 'picture-reply-rejected', 'picture-reply-approved', 'ready-for-production', 'in-production', 'ready-for-checkout', 'shipped', 'delivered'),
      allowNull: false,
      defaultValue: 'pending',
      field: 'status',
      comment: 'Review status of the order',
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'submitted_at',
      comment: 'When the order was submitted for review',
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'reviewed_at',
      comment: 'When the order was reviewed by admin',
    },
    adminNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'admin_notes',
      comment: 'Admin notes about the order review',
    },
    adminPictureReplies: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'admin_picture_replies',
      comment: 'JSON data for admin picture replies',
    },
    customerConfirmations: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'customer_confirmations',
      comment: 'JSON data for customer confirmations',
    },
    pictureReplyUploadedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'picture_reply_uploaded_at',
      comment: 'When admin uploaded picture replies',
    },
    customerConfirmedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'customer_confirmed_at',
      comment: 'When customer confirmed the order',
    },
    // Payment and shipping fields
    shippingAddress: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'shipping_address',
      comment: 'Customer shipping address as JSON',
    },
    billingAddress: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'billing_address',
      comment: 'Customer billing address as JSON',
    },
    paymentMethod: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'payment_method',
      comment: 'Payment method used',
    },
    paymentStatus: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'partially_refunded'),
      allowNull: true,
      defaultValue: null,
      field: 'payment_status',
      comment: 'Payment processing status',
    },
    paymentProvider: {
      type: DataTypes.ENUM('stripe', 'paypal', 'google_pay', 'apple_pay', 'square', 'manual'),
      allowNull: true,
      field: 'payment_provider',
      comment: 'Payment gateway provider',
    },
    paymentIntentId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'payment_intent_id',
      comment: 'Payment intent ID from provider',
    },
    transactionId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'transaction_id',
      comment: 'Transaction ID',
    },
    cardLast4: {
      type: DataTypes.STRING(4),
      allowNull: true,
      field: 'card_last4',
      comment: 'Last 4 digits of card',
    },
    cardBrand: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'card_brand',
      comment: 'Card brand (Visa, Mastercard, etc.)',
    },
    orderNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'order_number',
      comment: 'Unique order number generated after payment',
    },
    trackingNumber: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'tracking_number',
      comment: 'Shipping tracking number',
    },
    shippingCarrier: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'shipping_carrier',
      comment: 'Shipping carrier name',
    },
    shippedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'shipped_at',
      comment: 'When the order was shipped',
    },
    deliveredAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'delivered_at',
      comment: 'When the order was delivered',
    },
    estimatedDeliveryDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'estimated_delivery_date',
      comment: 'Estimated delivery date',
    },
    customerNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'customer_notes',
      comment: 'Notes from customer',
    },
    internalNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'internal_notes',
      comment: 'Internal admin notes',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    modelName: 'OrderReview',
    tableName: 'order_reviews',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [] // Temporarily disabled to fix "too many keys" error
  }
);

export default OrderReview;
