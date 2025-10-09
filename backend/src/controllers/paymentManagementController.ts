/**
 * Payment Management Controller
 * Handles payment data for admin dashboard
 */

import { Request, Response, NextFunction } from 'express';
import { Payment } from '../models/paymentModel';
import { User } from '../models/userModel';
import { OrderReview } from '../models/orderReviewModel';
import { getAllPayments, getPaymentsByOrderId, getPaymentsByCustomerId } from '../services/paymentRecordService';
import { logger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: string;
  };
}

/**
 * Get all payments with pagination and filters
 * @route GET /api/v1/admin/payments
 * @access Private (Admin only)
 */
export const getAllPaymentsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const status = req.query.status as string;
    const provider = req.query.provider as string;
    const customerId = req.query.customerId ? parseInt(req.query.customerId as string) : undefined;

    const result = await getAllPayments(page, limit, {
      status,
      provider,
      customerId,
    });

    // Transform data to match frontend expectations
    const transformedPayments = result.payments.map(payment => ({
      id: payment.id.toString(),
      orderId: payment.orderId.toString(),
      orderNumber: payment.orderNumber,
      customerId: payment.customerId.toString(),
      customerName: payment.customerName,
      customerEmail: payment.customerEmail,
      amount: parseFloat(payment.amount.toString()),
      currency: payment.currency.toUpperCase(),
      provider: payment.provider,
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      transactionId: payment.transactionId,
      providerTransactionId: payment.providerTransactionId,
      gatewayResponse: payment.getGatewayResponse(),
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
      processedAt: payment.processedAt?.toISOString(),
      failedAt: payment.failedAt?.toISOString(),
      refundedAt: payment.refundedAt?.toISOString(),
      refundAmount: payment.refundAmount ? parseFloat(payment.refundAmount.toString()) : undefined,
      fees: parseFloat(payment.fees.toString()),
      netAmount: parseFloat(payment.netAmount.toString()),
      metadata: payment.getMetadata(),
      notes: payment.notes,
      refunds: [], // TODO: Implement refunds if needed
    }));

    res.status(200).json({
      success: true,
      data: {
        payments: transformedPayments,
        pagination: {
          currentPage: page,
          totalPages: result.pages,
          totalItems: result.total,
          itemsPerPage: limit,
        },
      },
      message: 'Payments retrieved successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logger.error('Error fetching payments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get payment statistics
 * @route GET /api/v1/admin/payments/stats
 * @access Private (Admin only)
 */
export const getPaymentStatsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get payment counts by status
    const [statusCounts] = await Payment.sequelize!.query(`
      SELECT 
        status,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        SUM(fees) as total_fees,
        SUM(net_amount) as total_net
      FROM payments 
      GROUP BY status
    `);

    // Get payment counts by provider
    const [providerCounts] = await Payment.sequelize!.query(`
      SELECT 
        provider,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        SUM(fees) as total_fees,
        SUM(net_amount) as total_net
      FROM payments 
      GROUP BY provider
    `);

    // Get recent payments (last 30 days)
    const [recentPayments] = await Payment.sequelize!.query(`
      SELECT 
        COUNT(*) as count,
        SUM(amount) as total_amount,
        SUM(fees) as total_fees,
        SUM(net_amount) as total_net
      FROM payments 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

    // Get monthly revenue (last 12 months)
    const [monthlyRevenue] = await Payment.sequelize!.query(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        SUM(fees) as total_fees,
        SUM(net_amount) as total_net
      FROM payments 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        AND status = 'completed'
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month DESC
    `);

    const stats = {
      byStatus: statusCounts,
      byProvider: providerCounts,
      recent: recentPayments[0],
      monthlyRevenue: monthlyRevenue,
    };

    res.status(200).json({
      success: true,
      data: stats,
      message: 'Payment statistics retrieved successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logger.error('Error fetching payment statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get payment details by ID
 * @route GET /api/v1/admin/payments/:id
 * @access Private (Admin only)
 */
export const getPaymentByIdHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const paymentId = parseInt(req.params.id);
    
    if (isNaN(paymentId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid payment ID',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const payment = await Payment.findByPk(paymentId);

    if (!payment) {
      res.status(404).json({
        success: false,
        message: 'Payment not found',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Transform data to match frontend expectations
    const transformedPayment = {
      id: payment.id.toString(),
      orderId: payment.orderId.toString(),
      orderNumber: payment.orderNumber,
      customerId: payment.customerId.toString(),
      customerName: payment.customerName,
      customerEmail: payment.customerEmail,
      amount: parseFloat(payment.amount.toString()),
      currency: payment.currency.toUpperCase(),
      provider: payment.provider,
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      transactionId: payment.transactionId,
      providerTransactionId: payment.providerTransactionId,
      gatewayResponse: payment.getGatewayResponse(),
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
      processedAt: payment.processedAt?.toISOString(),
      failedAt: payment.failedAt?.toISOString(),
      refundedAt: payment.refundedAt?.toISOString(),
      refundAmount: payment.refundAmount ? parseFloat(payment.refundAmount.toString()) : undefined,
      fees: parseFloat(payment.fees.toString()),
      netAmount: parseFloat(payment.netAmount.toString()),
      metadata: payment.getMetadata(),
      notes: payment.notes,
      refunds: [], // TODO: Implement refunds if needed
    };

    res.status(200).json({
      success: true,
      data: transformedPayment,
      message: 'Payment details retrieved successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logger.error('Error fetching payment details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Update payment notes
 * @route PUT /api/v1/admin/payments/:id/notes
 * @access Private (Admin only)
 */
export const updatePaymentNotesHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const paymentId = parseInt(req.params.id);
    const { notes } = req.body;
    
    if (isNaN(paymentId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid payment ID',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const payment = await Payment.findByPk(paymentId);
    
    if (!payment) {
      res.status(404).json({
        success: false,
        message: 'Payment not found',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    await payment.update({ notes });

    res.status(200).json({
      success: true,
      data: { notes: payment.notes },
      message: 'Payment notes updated successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logger.error('Error updating payment notes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment notes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  }
};
