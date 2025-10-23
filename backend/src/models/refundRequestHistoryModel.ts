/**
 * Refund Request History Model
 * Tracks all actions and status changes for refund requests
 * Used for audit trail and abuse prevention
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

// Define the attributes interface for RefundRequestHistory
interface RefundRequestHistoryAttributes {
  id: number;
  refundRequestId: number;
  userId: number;
  orderId: number;
  orderNumber: string;
  action: 'created' | 'approved' | 'rejected' | 'cancelled' | 'modified' | 'under_review';
  previousStatus?: string;
  newStatus: string;
  adminId?: number;
  adminEmail?: string;
  adminNotes?: string;
  rejectionReason?: string;
  refundAmount: number;
  refundType: 'full' | 'partial';
  reason: string;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// Define attributes that are optional during creation
interface RefundRequestHistoryCreationAttributes
  extends Optional<RefundRequestHistoryAttributes, 'id' | 'previousStatus' | 'adminId' | 'adminEmail' | 'adminNotes' | 'rejectionReason' | 'description' | 'ipAddress' | 'userAgent' | 'createdAt'> {}

// Define the RefundRequestHistory model class
class RefundRequestHistory
  extends Model<RefundRequestHistoryAttributes, RefundRequestHistoryCreationAttributes>
  implements RefundRequestHistoryAttributes
{
  public id!: number;
  public refundRequestId!: number;
  public userId!: number;
  public orderId!: number;
  public orderNumber!: string;
  public action!: 'created' | 'approved' | 'rejected' | 'cancelled' | 'modified' | 'under_review';
  public previousStatus?: string;
  public newStatus!: string;
  public adminId?: number;
  public adminEmail?: string;
  public adminNotes?: string;
  public rejectionReason?: string;
  public refundAmount!: number;
  public refundType!: 'full' | 'partial';
  public reason!: string;
  public description?: string;
  public ipAddress?: string;
  public userAgent?: string;
  public readonly createdAt!: Date;
}

// Initialize the model with schema definition
RefundRequestHistory.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      comment: 'Primary key for refund history record'
    },
    refundRequestId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'refund_request_id',
      comment: 'Reference to the refund request',
      references: {
        model: 'refund_requests',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      comment: 'User who made the refund request',
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'order_id',
      comment: 'Order associated with the refund',
      references: {
        model: 'order_reviews',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    orderNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'order_number',
      comment: 'Order number for easy reference'
    },
    action: {
      type: DataTypes.ENUM('created', 'approved', 'rejected', 'cancelled', 'modified', 'under_review'),
      allowNull: false,
      comment: 'Action taken on the refund request'
    },
    previousStatus: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'previous_status',
      comment: 'Status before the action was taken'
    },
    newStatus: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'new_status',
      comment: 'Status after the action was taken'
    },
    adminId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'admin_id',
      comment: 'Admin user who performed the action'
    },
    adminEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'admin_email',
      comment: 'Email of admin who performed the action'
    },
    adminNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'admin_notes',
      comment: 'Internal notes from admin'
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'rejection_reason',
      comment: 'Reason provided when refund is rejected'
    },
    refundAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'refund_amount',
      comment: 'Amount requested for refund at time of action'
    },
    refundType: {
      type: DataTypes.ENUM('full', 'partial'),
      allowNull: false,
      field: 'refund_type',
      comment: 'Type of refund requested'
    },
    reason: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Reason code for the refund request'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Detailed description from customer'
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'ip_address',
      comment: 'IP address of the request (for abuse tracking)'
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'user_agent',
      comment: 'User agent of the request (for abuse tracking)'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
      comment: 'Timestamp when this history entry was created'
    }
  },
  {
    sequelize,
    tableName: 'refund_request_history',
    timestamps: false, // Only createdAt, no updatedAt
    comment: 'Tracks complete history of refund request actions for audit and abuse prevention',
    indexes: [
      {
        name: 'idx_refund_request_id',
        fields: ['refund_request_id']
      },
      {
        name: 'idx_user_id',
        fields: ['user_id']
      },
      {
        name: 'idx_order_id',
        fields: ['order_id']
      },
      {
        name: 'idx_action',
        fields: ['action']
      },
      {
        name: 'idx_created_at',
        fields: ['created_at']
      }
    ]
  }
);

export { RefundRequestHistory };









