/**
 * Payment Record Service
 * Handles creation and management of payment records in the database
 */

import { Payment, PaymentAttributes } from '../models/paymentModel';
import { logger } from '../utils/logger';

export interface CreatePaymentRecordData {
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
  gatewayResponse?: any;
  fees?: number;
  netAmount?: number;
  metadata?: any;
  notes?: string;
}

export interface PaymentRecordResult {
  success: boolean;
  paymentId?: number;
  error?: string;
}

/**
 * Create a payment record in the database
 */
export const createPaymentRecord = async (data: CreatePaymentRecordData): Promise<PaymentRecordResult> => {
  try {
    logger.info('Creating payment record', {
      orderId: data.orderId,
      provider: data.provider,
      amount: data.amount,
      transactionId: data.transactionId,
    });

    // Calculate fees and net amount if not provided
    const fees = data.fees || 0;
    const netAmount = data.netAmount || (data.amount - fees);

    // Create payment record
    const payment = await Payment.create({
      orderId: data.orderId,
      orderNumber: data.orderNumber,
      customerId: data.customerId,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      amount: data.amount,
      currency: data.currency,
      provider: data.provider,
      paymentMethod: data.paymentMethod,
      status: data.status,
      transactionId: data.transactionId,
      providerTransactionId: data.providerTransactionId,
      gatewayResponse: data.gatewayResponse,
      fees: fees,
      netAmount: netAmount,
      metadata: data.metadata,
      notes: data.notes,
      processedAt: data.status === 'completed' ? new Date() : null,
      failedAt: data.status === 'failed' ? new Date() : null,
    });

    logger.info('Payment record created successfully', {
      paymentId: payment.id,
      orderId: data.orderId,
      provider: data.provider,
      status: data.status,
    });

    return {
      success: true,
      paymentId: payment.id,
    };

  } catch (error: any) {
    logger.error('Error creating payment record:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Update payment record status
 */
export const updatePaymentStatus = async (
  paymentId: number,
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled',
  additionalData?: {
    gatewayResponse?: any;
    notes?: string;
    refundAmount?: number;
  }
): Promise<PaymentRecordResult> => {
  try {
    logger.info('Updating payment status', {
      paymentId,
      status,
    });

    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    // Set appropriate timestamp based on status
    if (status === 'completed') {
      updateData.processedAt = new Date();
    } else if (status === 'failed') {
      updateData.failedAt = new Date();
    } else if (status === 'refunded') {
      updateData.refundedAt = new Date();
      if (additionalData?.refundAmount) {
        updateData.refundAmount = additionalData.refundAmount;
      }
    }

    // Add additional data if provided
    if (additionalData?.gatewayResponse) {
      updateData.gatewayResponse = additionalData.gatewayResponse;
    }
    if (additionalData?.notes) {
      updateData.notes = additionalData.notes;
    }

    await Payment.update(updateData, {
      where: { id: paymentId },
    });

    logger.info('Payment status updated successfully', {
      paymentId,
      status,
    });

    return {
      success: true,
      paymentId,
    };

  } catch (error: any) {
    logger.error('Error updating payment status:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get payment records by order ID
 */
export const getPaymentsByOrderId = async (orderId: number): Promise<Payment[]> => {
  try {
    return await Payment.findAll({
      where: { orderId },
      order: [['createdAt', 'DESC']],
    });
  } catch (error: any) {
    logger.error('Error fetching payments by order ID:', error);
    throw error;
  }
};

/**
 * Get payment records by customer ID
 */
export const getPaymentsByCustomerId = async (customerId: number): Promise<Payment[]> => {
  try {
    return await Payment.findAll({
      where: { customerId },
      order: [['createdAt', 'DESC']],
    });
  } catch (error: any) {
    logger.error('Error fetching payments by customer ID:', error);
    throw error;
  }
};

/**
 * Get all payment records with pagination
 */
export const getAllPayments = async (
  page: number = 1,
  limit: number = 50,
  filters?: {
    status?: string;
    provider?: string;
    customerId?: number;
  }
): Promise<{ payments: Payment[]; total: number; pages: number }> => {
  try {
    const offset = (page - 1) * limit;
    const whereClause: any = {};

    if (filters?.status) {
      whereClause.status = filters.status;
    }
    if (filters?.provider) {
      whereClause.provider = filters.provider;
    }
    if (filters?.customerId) {
      whereClause.customerId = filters.customerId;
    }

    const { count, rows } = await Payment.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return {
      payments: rows,
      total: count,
      pages: Math.ceil(count / limit),
    };

  } catch (error: any) {
    logger.error('Error fetching all payments:', error);
    throw error;
  }
};

/**
 * Generate order number
 */
export const generateOrderNumber = (orderId: number): string => {
  const year = new Date().getFullYear();
  const paddedId = orderId.toString().padStart(3, '0');
  return `MC-${year}-${paddedId}`;
};
