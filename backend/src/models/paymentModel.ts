/**
 * Payment Model
 * Handles payment tracking and logging
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface PaymentAttributes {
  id: number;
  orderId: number;
  orderNumber: string;
  customerId: number;
  customerName: string;
  customerEmail: string;
  amount: number;
  currency: string;
  provider: 'stripe' | 'paypal';
  paymentMethod: 'card' | 'bank_transfer' | 'digital_wallet' | 'crypto' | 'cash' | 'check';
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  transactionId: string;
  providerTransactionId: string;
  gatewayResponse: any;
  processedAt?: Date | null;
  failedAt?: Date | null;
  refundedAt?: Date | null;
  refundAmount?: number | null;
  fees: number;
  netAmount: number;
  metadata: any;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentCreationAttributes extends Optional<PaymentAttributes, 'id' | 'createdAt' | 'updatedAt' | 'processedAt' | 'failedAt' | 'refundedAt' | 'refundAmount' | 'notes'> {}

export class Payment extends Model<PaymentAttributes, PaymentCreationAttributes> implements PaymentAttributes {
  public id!: number;
  public orderId!: number;
  public orderNumber!: string;
  public customerId!: number;
  public customerName!: string;
  public customerEmail!: string;
  public amount!: number;
  public currency!: string;
  public provider!: 'stripe' | 'paypal';
  public paymentMethod!: 'card' | 'bank_transfer' | 'digital_wallet' | 'crypto' | 'cash' | 'check';
  public status!: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  public transactionId!: string;
  public providerTransactionId!: string;
  public gatewayResponse!: any;
  public processedAt?: Date | null;
  public failedAt?: Date | null;
  public refundedAt?: Date | null;
  public refundAmount?: number | null;
  public fees!: number;
  public netAmount!: number;
  public metadata!: any;
  public notes?: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  /**
   * Get gateway response as parsed JSON
   */
  public getGatewayResponse(): any {
    if (!this.gatewayResponse) return null;
    try {
      return typeof this.gatewayResponse === 'string' ? JSON.parse(this.gatewayResponse) : this.gatewayResponse;
    } catch (error) {
      console.error('Error parsing gateway response:', error);
      return null;
    }
  }

  /**
   * Set gateway response as JSON string
   */
  public setGatewayResponse(data: any): void {
    this.gatewayResponse = data ? JSON.stringify(data) : null;
  }

  /**
   * Get metadata as parsed JSON
   */
  public getMetadata(): any {
    if (!this.metadata) return null;
    try {
      return typeof this.metadata === 'string' ? JSON.parse(this.metadata) : this.metadata;
    } catch (error) {
      console.error('Error parsing metadata:', error);
      return null;
    }
  }

  /**
   * Set metadata as JSON string
   */
  public setMetadata(data: any): void {
    this.metadata = data ? JSON.stringify(data) : null;
  }
}

Payment.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'order_id',
      references: {
        model: 'order_reviews',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'Reference to the order this payment belongs to',
    },
    orderNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'order_number',
      comment: 'Human-readable order number (e.g., MC-2024-001)',
    },
    customerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'customer_id',
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'Reference to the customer who made the payment',
    },
    customerName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'customer_name',
      comment: 'Customer name at time of payment',
    },
    customerEmail: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'customer_email',
      comment: 'Customer email at time of payment',
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Payment amount in the specified currency',
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'USD',
      comment: 'Payment currency code (e.g., USD, EUR)',
    },
    provider: {
      type: DataTypes.ENUM('stripe', 'paypal'),
      allowNull: false,
      comment: 'Payment provider used',
    },
    paymentMethod: {
      type: DataTypes.ENUM('card', 'bank_transfer', 'digital_wallet', 'crypto', 'cash', 'check'),
      allowNull: false,
      field: 'payment_method',
      comment: 'Method used for payment',
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Current payment status',
    },
    transactionId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'transaction_id',
      comment: 'Internal transaction ID',
    },
    providerTransactionId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'provider_transaction_id',
      comment: 'Provider-specific transaction ID (e.g., Stripe payment intent ID)',
    },
    gatewayResponse: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'gateway_response',
      comment: 'Raw response from payment gateway',
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'processed_at',
      comment: 'When the payment was successfully processed',
    },
    failedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'failed_at',
      comment: 'When the payment failed',
    },
    refundedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'refunded_at',
      comment: 'When the payment was refunded',
    },
    refundAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'refund_amount',
      comment: 'Amount refunded (if any)',
    },
    fees: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Payment processing fees',
    },
    netAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Net amount after fees',
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional payment metadata (IP, user agent, etc.)',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Admin notes about the payment',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'Payment',
    tableName: 'payments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [], // Temporarily disabled to fix "too many keys" error
      },
      {
        fields: ['customer_id'],
      },
      {
        fields: ['provider'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['transaction_id'],
        unique: false, // Temporarily disabled
      },
      {
        fields: ['provider_transaction_id'],
      },
      {
        fields: ['created_at'],
      },
      {
        fields: ['customer_id', 'status'],
      },
    ],
  }
);

export default Payment;
