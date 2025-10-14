/**
 * Refund Controller
 * Handles all refund-related API endpoints for customers and admins
 */

import { Request, Response, NextFunction } from 'express';
import { RefundRequest } from '../models/refundRequestModel';
import { OrderReview } from '../models/orderReviewModel';
import { User } from '../models/userModel';
import { Payment } from '../models/paymentModel';
import { RefundService } from '../services/refundService';
import { logger } from '../utils/logger';
import { Op } from 'sequelize';

// Extend Request type to include user
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    roleId: number;
  };
}

/**
 * Create a new refund request (Customer)
 * @route POST /api/v1/refunds/request
 * @access Private (Customer only)
 */
export const createRefundRequest = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    const {
      orderId,
      reason,
      description,
      refundType,
      refundAmount,
      refundItems,
      imagesUrls
    } = req.body;

    // Validate required fields
    if (!orderId || !reason) {
      res.status(400).json({
        success: false,
        message: 'Order ID and reason are required',
        code: 'MISSING_FIELDS'
      });
      return;
    }

    // Validate reason
    const validReasons = [
      'damaged_defective',
      'wrong_item',
      'not_as_described',
      'changed_mind',
      'duplicate_order',
      'shipping_delay',
      'quality_issues',
      'other'
    ];

    if (!validReasons.includes(reason)) {
      res.status(400).json({
        success: false,
        message: 'Invalid refund reason',
        code: 'INVALID_REASON'
      });
      return;
    }

    // Create refund request using service
    const result = await RefundService.createRefundRequest({
      orderId,
      userId,
      reason,
      description,
      refundType,
      refundAmount,
      refundItems,
      imagesUrls
    });

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: result.message,
        code: 'REFUND_REQUEST_FAILED'
      });
      return;
    }

    logger.info(`Refund request created by user ${userId} for order ${orderId}`);

    res.status(201).json({
      success: true,
      message: result.message,
      data: result.refundRequest
    });
  } catch (error: any) {
    logger.error('Error creating refund request:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all refund requests for logged-in user (Customer)
 * @route GET /api/v1/refunds/user
 * @access Private (Customer only)
 */
export const getUserRefunds = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const refunds = await RefundRequest.findAll({
      where: { userId },
      include: [
        {
          model: OrderReview,
          as: 'order',
          attributes: ['id', 'orderNumber', 'total', 'status']
        }
      ],
      order: [['requestedAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: refunds,
      count: refunds.length
    });
  } catch (error: any) {
    logger.error('Error getting user refunds:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get specific refund request by ID
 * @route GET /api/v1/refunds/:id
 * @access Private (Customer or Admin)
 */
export const getRefundById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const refund = await RefundRequest.findByPk(id, {
      include: [
        {
          model: OrderReview,
          as: 'order',
          attributes: ['id', 'orderNumber', 'total', 'status', 'orderData']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'firstName', 'lastName']
        },
        {
          model: Payment,
          as: 'payment',
          attributes: ['id', 'amount', 'provider', 'status', 'transactionId']
        }
      ]
    });

    if (!refund) {
      res.status(404).json({
        success: false,
        message: 'Refund request not found'
      });
      return;
    }

    // Verify user has access (owner or admin)
    const isAdmin = req.user?.roleId === 1; // Assuming roleId 1 is admin
    if (!isAdmin && refund.userId !== userId) {
      res.status(403).json({
        success: false,
        message: 'Unauthorized to view this refund request'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: refund
    });
  } catch (error: any) {
    logger.error('Error getting refund by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Cancel a refund request (Customer or Admin)
 * @route POST /api/v1/refunds/:id/cancel
 * @access Private
 */
export const cancelRefund = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const result = await RefundService.cancelRefund(parseInt(id), userId);

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: result.message
      });
      return;
    }

    logger.info(`Refund ${id} cancelled by user ${userId}`);

    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error: any) {
    logger.error('Error cancelling refund:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all refund requests (Admin)
 * @route GET /api/v1/refunds/admin/all
 * @access Private (Admin only)
 */
export const getAllRefunds = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      status,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;

    // Build where clause for filtering
    const where: any = {};

    if (status && status !== 'all') {
      where.status = status;
    }

    if (search) {
      where[Op.or] = [
        { orderNumber: { [Op.like]: `%${search}%` } },
        { customerEmail: { [Op.like]: `%${search}%` } },
        { customerName: { [Op.like]: `%${search}%` } }
      ];
    }

    if (startDate) {
      where.requestedAt = { ...where.requestedAt, [Op.gte]: new Date(startDate as string) };
    }

    if (endDate) {
      where.requestedAt = { ...where.requestedAt, [Op.lte]: new Date(endDate as string) };
    }

    // Pagination
    const offset = (Number(page) - 1) * Number(limit);

    const { rows: refunds, count } = await RefundRequest.findAndCountAll({
      where,
      include: [
        {
          model: OrderReview,
          as: 'order',
          attributes: ['id', 'orderNumber', 'total', 'status']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'firstName', 'lastName']
        }
      ],
      order: [['requestedAt', 'DESC']],
      limit: Number(limit),
      offset
    });

    res.status(200).json({
      success: true,
      data: refunds,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(count / Number(limit))
      }
    });
  } catch (error: any) {
    logger.error('Error getting all refunds:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get refund statistics (Admin)
 * @route GET /api/v1/refunds/admin/stats
 * @access Private (Admin only)
 */
export const getRefundStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    const filters: any = {};

    if (startDate) {
      filters.startDate = new Date(startDate as string);
    }

    if (endDate) {
      filters.endDate = new Date(endDate as string);
    }

    const stats = await RefundService.getRefundStats(filters);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    logger.error('Error getting refund stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update refund status to under review (Admin)
 * @route PUT /api/v1/refunds/:id/review
 * @access Private (Admin only)
 */
export const reviewRefund = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;

    const refund = await RefundRequest.findByPk(id);

    if (!refund) {
      res.status(404).json({
        success: false,
        message: 'Refund request not found'
      });
      return;
    }

    if (refund.status !== 'pending') {
      res.status(400).json({
        success: false,
        message: 'Only pending refunds can be marked as under review'
      });
      return;
    }

    await refund.update({
      status: 'under_review',
      adminNotes: adminNotes || refund.adminNotes,
      reviewedAt: new Date()
    });

    logger.info(`Refund ${id} marked as under review`);

    res.status(200).json({
      success: true,
      message: 'Refund marked as under review',
      data: refund
    });
  } catch (error: any) {
    logger.error('Error reviewing refund:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Approve a refund request (Admin)
 * @route POST /api/v1/refunds/:id/approve
 * @access Private (Admin only)
 */
export const approveRefund = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { adminNotes, manualCaptureId } = req.body;
    const adminUserId = req.user?.id;

    const result = await RefundService.approveRefund(
      parseInt(id),
      adminNotes,
      adminUserId,
      manualCaptureId
    );

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: result.message
      });
      return;
    }

    logger.info(`Refund ${id} approved by admin ${adminUserId}${manualCaptureId ? ' with manual capture ID' : ''}`);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.refund
    });
  } catch (error: any) {
    logger.error('Error approving refund:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Reject a refund request (Admin)
 * @route POST /api/v1/refunds/:id/reject
 * @access Private (Admin only)
 */
export const rejectRefund = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { rejectionReason, adminNotes } = req.body;

    if (!rejectionReason) {
      res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
      return;
    }

    const result = await RefundService.rejectRefund(
      parseInt(id),
      rejectionReason,
      adminNotes
    );

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: result.message
      });
      return;
    }

    logger.info(`Refund ${id} rejected`);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.refund
    });
  } catch (error: any) {
    logger.error('Error rejecting refund:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export default {
  createRefundRequest,
  getUserRefunds,
  getRefundById,
  cancelRefund,
  getAllRefunds,
  getRefundStats,
  reviewRefund,
  approveRefund,
  rejectRefund
};

