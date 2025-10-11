/**
 * Payment Log Service
 * Handles logging of all payment transactions from Stripe and PayPal
 */

import Payment from '../models/paymentModel';
import { logger } from '../utils/logger';
import { sequelize } from '../config/database';

export interface PaymentLogData {
  orderId?: number;
  orderNumber?: string;
  customerId?: number;
  customerName?: string;
  customerEmail?: string;
  amount: number;
  currency?: string;
  provider: 'stripe' | 'paypal';
  paymentMethod?: 'card' | 'bank_transfer' | 'digital_wallet' | 'crypto' | 'cash' | 'check';
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  transactionId: string;
  providerTransactionId: string;
  gatewayResponse?: any;
  fees?: number;
  netAmount?: number;
  metadata?: any;
  notes?: string;
}

/**
 * Log a payment transaction
 */
export const logPaymentTransaction = async (data: PaymentLogData): Promise<Payment | null> => {
  try {
    // Generate transaction ID if not provided
    const transactionId = data.transactionId || `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate net amount if not provided
    const fees = data.fees || 0;
    const netAmount = data.netAmount !== undefined ? data.netAmount : (data.amount - fees);

    // Set timestamps based on status
    const timestamps: any = {};
    if (data.status === 'completed') {
      timestamps.processedAt = new Date();
    } else if (data.status === 'failed') {
      timestamps.failedAt = new Date();
    } else if (data.status === 'refunded') {
      timestamps.refundedAt = new Date();
    }

    // Create payment log entry
    const payment = await Payment.create({
      orderId: data.orderId || 0, // Temporary fallback for non-order payments
      orderNumber: data.orderNumber || 'N/A',
      customerId: data.customerId || 0,
      customerName: data.customerName || 'Unknown',
      customerEmail: data.customerEmail || 'unknown@example.com',
      amount: data.amount,
      currency: data.currency || 'USD',
      provider: data.provider,
      paymentMethod: data.paymentMethod || 'digital_wallet',
      status: data.status,
      transactionId,
      providerTransactionId: data.providerTransactionId,
      gatewayResponse: data.gatewayResponse || null,
      fees,
      netAmount,
      metadata: data.metadata || null,
      notes: data.notes || null,
      ...timestamps,
    } as any);

    logger.info(`✅ Payment transaction logged: ${data.provider} - ${data.status}`, {
      paymentId: payment.id,
      transactionId,
      providerTransactionId: data.providerTransactionId,
      amount: data.amount,
      status: data.status,
    });

    return payment;
  } catch (error: any) {
    logger.error(`❌ Failed to log payment transaction:`, {
      error: error.message,
      provider: data.provider,
      transactionId: data.providerTransactionId,
    });
    return null;
  }
};

/**
 * Update an existing payment log
 */
export const updatePaymentLog = async (
  providerTransactionId: string,
  updates: Partial<PaymentLogData>
): Promise<Payment | null> => {
  try {
    const [payment] = await sequelize.query(
      `SELECT * FROM payments WHERE provider_transaction_id = ? LIMIT 1`,
      { replacements: [providerTransactionId] }
    );

    if (!payment || (payment as any[]).length === 0) {
      logger.warn(`Payment log not found for update: ${providerTransactionId}`);
      return null;
    }

    const paymentId = (payment as any[])[0].id;

    // Build update fields
    const updateFields: any = {};
    if (updates.status) updateFields.status = updates.status;
    if (updates.amount !== undefined) updateFields.amount = updates.amount;
    if (updates.fees !== undefined) updateFields.fees = updates.fees;
    if (updates.netAmount !== undefined) updateFields.net_amount = updates.netAmount;
    if (updates.gatewayResponse) updateFields.gateway_response = JSON.stringify(updates.gatewayResponse);
    if (updates.metadata) updateFields.metadata = JSON.stringify(updates.metadata);
    if (updates.notes) updateFields.notes = updates.notes;

    // Add timestamps based on status
    if (updates.status === 'completed') updateFields.processed_at = new Date();
    if (updates.status === 'failed') updateFields.failed_at = new Date();
    if (updates.status === 'refunded') updateFields.refunded_at = new Date();

    if (Object.keys(updateFields).length === 0) {
      return null;
    }

    // Build SET clause
    const setClause = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updateFields);

    await sequelize.query(
      `UPDATE payments SET ${setClause}, updated_at = NOW() WHERE id = ?`,
      { replacements: [...values, paymentId] }
    );

    logger.info(`✅ Payment log updated: ${providerTransactionId}`, {
      paymentId,
      updates: Object.keys(updateFields),
    });

    // Return updated payment
    const [updatedPayment] = await sequelize.query(
      `SELECT * FROM payments WHERE id = ? LIMIT 1`,
      { replacements: [paymentId] }
    );

    return (updatedPayment as any[])[0] as Payment;
  } catch (error: any) {
    logger.error(`❌ Failed to update payment log:`, {
      error: error.message,
      providerTransactionId,
    });
    return null;
  }
};

/**
 * Get all payment logs with filters
 */
export const getPaymentLogs = async (filters?: {
  provider?: 'stripe' | 'paypal';
  status?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}): Promise<{ payments: any[]; total: number }> => {
  try {
    const whereConditions: string[] = [];
    const replacements: any[] = [];

    if (filters?.provider) {
      whereConditions.push('provider = ?');
      replacements.push(filters.provider);
    }

    if (filters?.status) {
      whereConditions.push('status = ?');
      replacements.push(filters.status);
    }

    if (filters?.startDate) {
      whereConditions.push('created_at >= ?');
      replacements.push(filters.startDate);
    }

    if (filters?.endDate) {
      whereConditions.push('created_at <= ?');
      replacements.push(filters.endDate);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    // Get total count
    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM payments ${whereClause}`,
      { replacements }
    );
    const total = (countResult as any[])[0].total;

    // Get payments
    const [payments] = await sequelize.query(
      `SELECT * FROM payments ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      { replacements: [...replacements, limit, offset] }
    );

    return { payments: payments as any[], total };
  } catch (error: any) {
    logger.error(`❌ Failed to get payment logs:`, error);
    return { payments: [], total: 0 };
  }
};

/**
 * Get payment statistics
 */
export const getPaymentStats = async (): Promise<any> => {
  try {
    const [stats] = await sequelize.query(`
      SELECT 
        provider,
        status,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        SUM(fees) as total_fees,
        SUM(net_amount) as total_net
      FROM payments
      GROUP BY provider, status
    `);

    return stats;
  } catch (error: any) {
    logger.error(`❌ Failed to get payment stats:`, error);
    return [];
  }
};

