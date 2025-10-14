/**
 * Payment Log Controller
 * Handles admin API endpoints for viewing payment logs
 */

import { Request, Response, NextFunction } from 'express';
import { getAllPayments, getPaymentsByOrderId, getPaymentsByCustomerId } from '../services/paymentRecordService';
import { logger } from '../utils/logger';
import { sequelize } from '../config/database';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

/**
 * Get all payment logs with filters and pagination
 * @route GET /api/v1/admin/payment-logs
 * @access Private (Admin/Manager only)
 */
export const getAllPaymentLogs = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 50,
      status,
      provider,
      customerId,
      startDate,
      endDate
    } = req.query;

    const filters: any = {};
    if (status) filters.status = status;
    if (provider) filters.provider = provider;
    if (customerId) filters.customerId = parseInt(customerId as string);

    const result = await getAllPayments(
      parseInt(page as string),
      parseInt(limit as string),
      filters
    );

    res.status(200).json({
      success: true,
      data: {
        payments: result.payments,
        pagination: {
          currentPage: parseInt(page as string),
          totalPages: result.pages,
          totalItems: result.total,
          itemsPerPage: parseInt(limit as string),
        },
      },
      message: 'Payment logs retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Error fetching payment logs:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get payment statistics and summary
 * @route GET /api/v1/admin/payment-logs/stats
 * @access Private (Admin/Manager only)
 */
export const getPaymentStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get statistics by status
    const [byStatus] = await sequelize.query(`
      SELECT 
        status,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        SUM(fees) as total_fees,
        SUM(net_amount) as total_net
      FROM payments
      GROUP BY status
    `);

    // Get statistics by provider
    const [byProvider] = await sequelize.query(`
      SELECT 
        provider,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_amount,
        SUM(CASE WHEN status = 'completed' THEN fees ELSE 0 END) as total_fees,
        SUM(CASE WHEN status = 'completed' THEN net_amount ELSE 0 END) as total_net
      FROM payments
      GROUP BY provider
    `);

    // Get recent transactions (last 24 hours)
    const [recentStats] = await sequelize.query(`
      SELECT 
        COUNT(*) as count,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_amount,
        SUM(CASE WHEN status = 'completed' THEN fees ELSE 0 END) as total_fees,
        SUM(CASE WHEN status = 'completed' THEN net_amount ELSE 0 END) as total_net
      FROM payments
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `);

    // Get monthly revenue for the last 12 months
    const [monthlyRevenue] = await sequelize.query(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_amount,
        SUM(CASE WHEN status = 'completed' THEN fees ELSE 0 END) as total_fees,
        SUM(CASE WHEN status = 'completed' THEN net_amount ELSE 0 END) as total_net
      FROM payments
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month DESC
    `);

    // Get refund statistics
    const [refundStats] = await sequelize.query(`
      SELECT 
        COUNT(*) as total_refunds,
        SUM(CASE WHEN status = 'refunded' THEN ABS(amount) ELSE 0 END) as total_refunded_amount,
        SUM(CASE WHEN status = 'pending' AND amount < 0 THEN 1 ELSE 0 END) as pending_refunds,
        SUM(CASE WHEN status = 'failed' AND amount < 0 THEN 1 ELSE 0 END) as failed_refunds
      FROM payments
      WHERE amount < 0
    `);

    // Get payment vs refund summary
    const [paymentVsRefund] = await sequelize.query(`
      SELECT 
        SUM(CASE WHEN amount > 0 AND status = 'completed' THEN amount ELSE 0 END) as total_payments,
        SUM(CASE WHEN amount < 0 AND status = 'refunded' THEN ABS(amount) ELSE 0 END) as total_refunds,
        SUM(CASE WHEN amount > 0 AND status = 'completed' THEN amount 
                  WHEN amount < 0 AND status = 'refunded' THEN amount 
                  ELSE 0 END) as net_revenue
      FROM payments
    `);

    res.status(200).json({
      success: true,
      data: {
        byStatus: byStatus,
        byProvider: byProvider,
        recent: (recentStats as any[])[0] || { count: 0, total_amount: 0, total_fees: 0, total_net: 0 },
        monthlyRevenue: monthlyRevenue,
        refunds: (refundStats as any[])[0] || { 
          total_refunds: 0, 
          total_refunded_amount: 0, 
          pending_refunds: 0, 
          failed_refunds: 0 
        },
        summary: (paymentVsRefund as any[])[0] || { 
          total_payments: 0, 
          total_refunds: 0, 
          net_revenue: 0 
        }
      },
      message: 'Payment statistics retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Error fetching payment statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get payment logs by order ID
 * @route GET /api/v1/admin/payment-logs/order/:orderId
 * @access Private (Admin/Manager only)
 */
export const getPaymentLogsByOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      res.status(400).json({
        success: false,
        message: 'Order ID is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const payments = await getPaymentsByOrderId(parseInt(orderId));

    res.status(200).json({
      success: true,
      data: { payments },
      message: 'Payment logs for order retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Error fetching payment logs by order:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get payment logs by customer ID
 * @route GET /api/v1/admin/payment-logs/customer/:customerId
 * @access Private (Admin/Manager only)
 */
export const getPaymentLogsByCustomer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { customerId } = req.params;

    if (!customerId) {
      res.status(400).json({
        success: false,
        message: 'Customer ID is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const payments = await getPaymentsByCustomerId(parseInt(customerId));

    res.status(200).json({
      success: true,
      data: { payments },
      message: 'Payment logs for customer retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Error fetching payment logs by customer:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get detailed payment log by ID
 * @route GET /api/v1/admin/payment-logs/:id
 * @access Private (Admin/Manager only)
 */
export const getPaymentLogById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Payment ID is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const [payment] = await sequelize.query(`
      SELECT 
        p.*,
        u.email as customer_email_current,
        u.first_name as customer_first_name,
        u.last_name as customer_last_name,
        o.status as order_status
      FROM payments p
      LEFT JOIN users u ON p.customer_id = u.id
      LEFT JOIN order_reviews o ON p.order_id = o.id
      WHERE p.id = ?
    `, {
      replacements: [id]
    });

    if (!payment || (payment as any[]).length === 0) {
      res.status(404).json({
        success: false,
        message: 'Payment log not found',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { payment: (payment as any[])[0] },
      message: 'Payment log retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Error fetching payment log by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
};

