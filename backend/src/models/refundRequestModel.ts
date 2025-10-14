/**
 * Refund Request Model
 * Handles customer refund requests and processing
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

// Define the attributes interface for RefundRequest
export interface RefundRequestAttributes {
  id: number;
  orderId: number;
  orderNumber: string;
  userId: number;
  paymentId?: number | null;
  refundType: 'full' | 'partial';
  refundAmount: number;
  originalAmount: number;
  currency: string;
  reason: 'damaged_defective' | 'wrong_item' | 'not_as_described' | 'changed_mind' | 
          'duplicate_order' | 'shipping_delay' | 'quality_issues' | 'other';
  description?: string | null;
  customerEmail: string;
  customerName: string;
  imagesUrls?: any | null;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 
          'processing' | 'completed' | 'failed' | 'cancelled';
  adminNotes?: string | null;
  rejectionReason?: string | null;
  refundMethod: 'original_payment' | 'store_credit' | 'manual';
  paymentProvider?: 'stripe' | 'paypal' | null;
  providerRefundId?: string | null;
  providerResponse?: any | null;
  refundItems?: any | null;
  inventoryRestored: boolean;
  inventoryRestoredAt?: Date | null;
  requestedAt: Date;
  reviewedAt?: Date | null;
  processedAt?: Date | null;
  completedAt?: Date | null;
  failedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Define creation attributes - fields that are optional during creation
export interface RefundRequestCreationAttributes
  extends Optional<
    RefundRequestAttributes,
    'id' | 'paymentId' | 'description' | 'imagesUrls' | 'adminNotes' | 
    'rejectionReason' | 'paymentProvider' | 'providerRefundId' | 
    'providerResponse' | 'refundItems' | 'inventoryRestoredAt' | 
    'reviewedAt' | 'processedAt' | 'completedAt' | 'failedAt' | 
    'createdAt' | 'updatedAt'
  > {}

// Define the RefundRequest model class
export class RefundRequest
  extends Model<RefundRequestAttributes, RefundRequestCreationAttributes>
  implements RefundRequestAttributes {
  
  // Primary key
  public id!: number;
  
  // Reference fields
  public orderId!: number;
  public orderNumber!: string;
  public userId!: number;
  public paymentId?: number | null;
  
  // Refund details
  public refundType!: 'full' | 'partial';
  public refundAmount!: number;
  public originalAmount!: number;
  public currency!: string;
  
  // Request information
  public reason!: 'damaged_defective' | 'wrong_item' | 'not_as_described' | 'changed_mind' | 
                  'duplicate_order' | 'shipping_delay' | 'quality_issues' | 'other';
  public description?: string | null;
  public customerEmail!: string;
  public customerName!: string;
  public imagesUrls?: any | null;
  
  // Status tracking
  public status!: 'pending' | 'under_review' | 'approved' | 'rejected' | 
                  'processing' | 'completed' | 'failed' | 'cancelled';
  
  // Processing details
  public adminNotes?: string | null;
  public rejectionReason?: string | null;
  public refundMethod!: 'original_payment' | 'store_credit' | 'manual';
  
  // Payment provider details
  public paymentProvider?: 'stripe' | 'paypal' | null;
  public providerRefundId?: string | null;
  public providerResponse?: any | null;
  
  // Items being refunded
  public refundItems?: any | null;
  
  // Inventory restoration
  public inventoryRestored!: boolean;
  public inventoryRestoredAt?: Date | null;
  
  // Timeline
  public requestedAt!: Date;
  public reviewedAt?: Date | null;
  public processedAt?: Date | null;
  public completedAt?: Date | null;
  public failedAt?: Date | null;
  
  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  /**
   * Helper method to get images as array
   * Handles JSON parsing safely
   */
  public getImages(): string[] {
    if (!this.imagesUrls) return [];
    try {
      return typeof this.imagesUrls === 'string' 
        ? JSON.parse(this.imagesUrls) 
        : this.imagesUrls;
    } catch (error) {
      console.error('Error parsing images URLs:', error);
      return [];
    }
  }

  /**
   * Helper method to set images from array
   * Stores as JSON in database
   */
  public setImages(images: string[]): void {
    this.imagesUrls = images && images.length > 0 ? JSON.stringify(images) : null;
  }

  /**
   * Helper method to get refund items as array
   * Handles JSON parsing safely
   */
  public getRefundItems(): any[] {
    if (!this.refundItems) return [];
    try {
      return typeof this.refundItems === 'string' 
        ? JSON.parse(this.refundItems) 
        : this.refundItems;
    } catch (error) {
      console.error('Error parsing refund items:', error);
      return [];
    }
  }

  /**
   * Helper method to set refund items from array
   * Stores as JSON in database
   */
  public setRefundItems(items: any[]): void {
    this.refundItems = items && items.length > 0 ? JSON.stringify(items) : null;
  }

  /**
   * Helper method to get provider response as parsed JSON
   * Handles JSON parsing safely
   */
  public getProviderResponse(): any {
    if (!this.providerResponse) return null;
    try {
      return typeof this.providerResponse === 'string' 
        ? JSON.parse(this.providerResponse) 
        : this.providerResponse;
    } catch (error) {
      console.error('Error parsing provider response:', error);
      return null;
    }
  }

  /**
   * Helper method to set provider response
   * Stores as JSON in database
   */
  public setProviderResponse(data: any): void {
    this.providerResponse = data ? JSON.stringify(data) : null;
  }

  /**
   * Check if refund is in a final state (completed, rejected, failed, cancelled)
   */
  public isFinalState(): boolean {
    return ['completed', 'rejected', 'failed', 'cancelled'].includes(this.status);
  }

  /**
   * Check if refund can be cancelled
   * Only pending and under_review refunds can be cancelled
   */
  public canBeCancelled(): boolean {
    return ['pending', 'under_review'].includes(this.status);
  }

  /**
   * Check if refund can be approved
   * Pending, under_review, and failed refunds can be approved
   * Failed refunds can be retried with corrected information
   */
  public canBeApproved(): boolean {
    return ['pending', 'under_review', 'failed'].includes(this.status);
  }

  /**
   * Get human-readable status
   */
  public getStatusLabel(): string {
    const labels: Record<string, string> = {
      pending: 'Pending Review',
      under_review: 'Under Review',
      approved: 'Approved',
      rejected: 'Rejected',
      processing: 'Processing',
      completed: 'Completed',
      failed: 'Failed',
      cancelled: 'Cancelled'
    };
    return labels[this.status] || this.status;
  }

  /**
   * Get human-readable reason
   */
  public getReasonLabel(): string {
    const labels: Record<string, string> = {
      damaged_defective: 'Product Damaged or Defective',
      wrong_item: 'Wrong Item Received',
      not_as_described: 'Item Not as Described',
      changed_mind: 'Changed My Mind',
      duplicate_order: 'Duplicate Order',
      shipping_delay: 'Shipping Took Too Long',
      quality_issues: 'Quality Issues',
      other: 'Other Reason'
    };
    return labels[this.reason] || this.reason;
  }
}

// Initialize the RefundRequest model with Sequelize
RefundRequest.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      comment: 'Primary key for refund request'
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'order_id',
      comment: 'Foreign key to order_reviews table'
    },
    orderNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'order_number',
      comment: 'Human-readable order number'
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      comment: 'Foreign key to users table'
    },
    paymentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'payment_id',
      comment: 'Foreign key to payments table'
    },
    refundType: {
      type: DataTypes.ENUM('full', 'partial'),
      allowNull: false,
      defaultValue: 'full',
      field: 'refund_type',
      comment: 'Full or partial refund'
    },
    refundAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'refund_amount',
      comment: 'Amount to be refunded'
    },
    originalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'original_amount',
      comment: 'Original order amount'
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'USD',
      comment: 'Currency code (USD, EUR, etc.)'
    },
    reason: {
      type: DataTypes.ENUM(
        'damaged_defective',
        'wrong_item',
        'not_as_described',
        'changed_mind',
        'duplicate_order',
        'shipping_delay',
        'quality_issues',
        'other'
      ),
      allowNull: false,
      comment: 'Reason for refund request'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Customer detailed explanation'
    },
    customerEmail: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'customer_email',
      comment: 'Customer email at time of request'
    },
    customerName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'customer_name',
      comment: 'Customer name at time of request'
    },
    imagesUrls: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'images_urls',
      comment: 'Array of image URLs for proof of damage/defect'
    },
    status: {
      type: DataTypes.ENUM(
        'pending',
        'under_review',
        'approved',
        'rejected',
        'processing',
        'completed',
        'failed',
        'cancelled'
      ),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Current status of refund request'
    },
    adminNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'admin_notes',
      comment: 'Admin internal notes about the refund'
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'rejection_reason',
      comment: 'Reason provided to customer for rejection'
    },
    refundMethod: {
      type: DataTypes.ENUM('original_payment', 'store_credit', 'manual'),
      allowNull: false,
      defaultValue: 'original_payment',
      field: 'refund_method',
      comment: 'How refund will be issued'
    },
    paymentProvider: {
      type: DataTypes.ENUM('stripe', 'paypal'),
      allowNull: true,
      field: 'payment_provider',
      comment: 'Payment gateway used'
    },
    providerRefundId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'provider_refund_id',
      comment: 'Refund ID from Stripe/PayPal'
    },
    providerResponse: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'provider_response',
      comment: 'Full response from payment gateway'
    },
    refundItems: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'refund_items',
      comment: 'Array of items with quantities being refunded'
    },
    inventoryRestored: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'inventory_restored',
      comment: 'Whether stock has been restored'
    },
    inventoryRestoredAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'inventory_restored_at',
      comment: 'When stock was restored'
    },
    requestedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'requested_at',
      comment: 'When customer submitted request'
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'reviewed_at',
      comment: 'When admin reviewed the request'
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'processed_at',
      comment: 'When payment processing started'
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'completed_at',
      comment: 'When refund was completed'
    },
    failedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'failed_at',
      comment: 'When refund processing failed'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
      defaultValue: DataTypes.NOW,
      comment: 'Record creation timestamp'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
      defaultValue: DataTypes.NOW,
      comment: 'Record last update timestamp'
    },
  },
  {
    sequelize,
    modelName: 'RefundRequest',
    tableName: 'refund_requests',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [] // Indexes already created in migration
  }
);

export default RefundRequest;



