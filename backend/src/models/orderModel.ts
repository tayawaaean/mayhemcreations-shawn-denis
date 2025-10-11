/**
 * Order Model
 * Represents completed orders after payment
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

// Define the Order interface
export interface OrderAttributes {
  id: number;
  orderNumber: string; // Unique order number like ORD-12345
  userId: number;
  orderReviewId?: number; // Reference to the original order_review
  
  // Order items stored as JSON
  items: any[]; // Array of order items with product details, customization, etc.
  
  // Pricing
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  
  // Shipping Address
  shippingAddress: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  
  // Billing Address (optional, can be same as shipping)
  billingAddress?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  
  // Payment Details
  paymentMethod: string; // e.g., 'credit_card', 'paypal'
  paymentStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded';
  paymentProvider: 'stripe' | 'paypal' | 'google_pay' | 'apple_pay' | 'square' | 'manual';
  paymentIntentId?: string; // Stripe payment intent ID
  transactionId?: string; // Payment transaction ID
  cardLast4?: string;
  cardBrand?: string;
  
  // Order Status
  status: 'pending' | 'preparing' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  
  // Fulfillment
  trackingNumber?: string;
  shippingCarrier?: string;
  shippedAt?: Date;
  deliveredAt?: Date;
  estimatedDeliveryDate?: Date;
  
  // Notes and Metadata
  customerNotes?: string;
  adminNotes?: string;
  internalNotes?: string;
  metadata?: any; // Additional metadata as JSON
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Define the creation attributes (id is optional as it's auto-generated)
interface OrderCreationAttributes extends Optional<OrderAttributes, 'id'> {}

// Define the Order model class
class Order extends Model<OrderAttributes, OrderCreationAttributes> implements OrderAttributes {
  public id!: number;
  public orderNumber!: string;
  public userId!: number;
  public orderReviewId?: number;
  public items!: any[];
  public subtotal!: number;
  public shipping!: number;
  public tax!: number;
  public total!: number;
  public shippingAddress!: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  public billingAddress?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  public paymentMethod!: string;
  public paymentStatus!: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded';
  public paymentProvider!: 'stripe' | 'paypal' | 'google_pay' | 'apple_pay' | 'square' | 'manual';
  public paymentIntentId?: string;
  public transactionId?: string;
  public cardLast4?: string;
  public cardBrand?: string;
  public status!: 'pending' | 'preparing' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  public trackingNumber?: string;
  public shippingCarrier?: string;
  public shippedAt?: Date;
  public deliveredAt?: Date;
  public estimatedDeliveryDate?: Date;
  public customerNotes?: string;
  public adminNotes?: string;
  public internalNotes?: string;
  public metadata?: any;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// Initialize the Order model
Order.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      comment: 'Unique order ID'
    },
    orderNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: 'Human-readable order number (e.g., ORD-12345)'
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'User who placed the order'
    },
    orderReviewId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Reference to the original order_review if applicable'
    },
    items: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Order items with product details and customization'
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Subtotal before shipping and tax'
    },
    shipping: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Shipping cost'
    },
    tax: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Tax amount'
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Total order amount'
    },
    shippingAddress: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Shipping address details'
    },
    billingAddress: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Billing address details (optional)'
    },
    paymentMethod: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Payment method used'
    },
    paymentStatus: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'partially_refunded'),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Payment processing status'
    },
    paymentProvider: {
      type: DataTypes.ENUM('stripe', 'paypal', 'google_pay', 'apple_pay', 'square', 'manual'),
      allowNull: false,
      comment: 'Payment gateway provider'
    },
    paymentIntentId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Stripe payment intent ID'
    },
    transactionId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Payment transaction ID'
    },
    cardLast4: {
      type: DataTypes.STRING(4),
      allowNull: true,
      comment: 'Last 4 digits of card'
    },
    cardBrand: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Card brand (Visa, Mastercard, etc.)'
    },
    status: {
      type: DataTypes.ENUM('pending', 'preparing', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'),
      allowNull: false,
      defaultValue: 'preparing',
      comment: 'Order fulfillment status'
    },
    trackingNumber: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Shipping tracking number'
    },
    shippingCarrier: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Shipping carrier name'
    },
    shippedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the order was shipped'
    },
    deliveredAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the order was delivered'
    },
    estimatedDeliveryDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Estimated delivery date'
    },
    customerNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notes from customer'
    },
    adminNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Internal admin notes'
    },
    internalNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Internal processing notes'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional metadata'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Order creation timestamp'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Last update timestamp'
    }
  },
  {
    sequelize,
    tableName: 'orders',
    timestamps: true,
    indexes: [
      { fields: ['user_id'], name: 'idx_user_id' },
      { fields: ['order_number'], name: 'idx_order_number', unique: true },
      { fields: ['status'], name: 'idx_status' },
      { fields: ['payment_status'], name: 'idx_payment_status' },
      { fields: ['order_review_id'], name: 'idx_order_review_id' },
      { fields: ['created_at'], name: 'idx_created_at' },
      { fields: ['payment_intent_id'], name: 'idx_payment_intent_id' }
    ]
  }
);

export default Order;

