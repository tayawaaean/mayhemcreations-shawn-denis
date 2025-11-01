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
import { EmailNotificationService } from '../services/emailNotificationService';

// Extend Request type to include user
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    roleId: number;
  };
}

/**
 * @swagger
 * /api/v1/refunds/request:
 *   post:
 *     tags: [Refunds]
 *     summary: Create a new refund request
 *     description: Allows customers to create a refund request for an order. Requires order ID and reason.
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - reason
 *             properties:
 *               orderId:
 *                 type: integer
 *                 example: 123
 *                 description: Order ID to request refund for
 *               reason:
 *                 type: string
 *                 enum: [damaged_defective, wrong_item, not_as_described, changed_mind, duplicate_order, shipping_delay, quality_issues, other]
 *                 example: damaged_defective
 *                 description: Reason for refund request
 *               description:
 *                 type: string
 *                 description: Additional details about the refund request
 *               refundType:
 *                 type: string
 *                 enum: [full, partial]
 *                 example: full
 *                 description: Type of refund (full or partial)
 *               refundAmount:
 *                 type: number
 *                 format: float
 *                 example: 99.99
 *                 description: Partial refund amount (if refundType is partial)
 *               refundItems:
 *                 type: array
 *                 description: Items to refund (if partial refund)
 *                 items:
 *                   type: integer
 *               imagesUrls:
 *                 type: array
 *                 description: Image URLs supporting the refund request
 *                 items:
 *                   type: string
 *                   format: uri
 *     responses:
 *       201:
 *         description: Refund request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         status:
 *                           type: string
 *                           example: pending
 *       400:
 *         description: Invalid request data or missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @swagger
 * /api/v1/refunds/user:
 *   get:
 *     tags: [Refunds]
 *     summary: Get user's refund requests
 *     description: Retrieves all refund requests created by the authenticated customer.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, cancelled, processing, completed]
 *         description: Filter by refund status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Refund requests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @swagger
 * /api/v1/refunds/{id}:
 *   get:
 *     tags: [Refunds]
 *     summary: Get refund request by ID
 *     description: Retrieves a specific refund request by ID. Customers can only view their own refunds, admins can view all.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Refund request ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Refund request retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Access denied (customer trying to view another customer's refund)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Refund request not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @swagger
 * /api/v1/refunds/{id}/cancel:
 *   post:
 *     tags: [Refunds]
 *     summary: Cancel refund request
 *     description: Allows customer to cancel their own refund request if it's still pending.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Refund request ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Refund request cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           example: cancelled
 *       400:
 *         description: Cannot cancel refund (not pending or already processed)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Access denied (customer trying to cancel another customer's refund)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Refund request not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @swagger
 * /api/v1/refunds/admin/all:
 *   get:
 *     tags: [Refunds, Admin]
 *     summary: Get all refund requests
 *     description: Retrieves all refund requests. Admin-only endpoint for managing refunds.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, cancelled, processing, completed]
 *         description: Filter by refund status
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: Filter by user ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Refund requests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @swagger
 * /api/v1/refunds/admin/stats:
 *   get:
 *     tags: [Refunds, Admin]
 *     summary: Get refund statistics
 *     description: Retrieves refund statistics and analytics for the admin dashboard.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for statistics range
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for statistics range
 *     responses:
 *       200:
 *         description: Refund statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         totalRefunds:
 *                           type: integer
 *                         refundsByStatus:
 *                           type: object
 *                         totalRefundAmount:
 *                           type: number
 *                         averageRefundAmount:
 *                           type: number
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @swagger
 * /api/v1/refunds/{id}/review:
 *   put:
 *     tags: [Refunds, Admin]
 *     summary: Review refund request
 *     description: Allows admin to review and update refund request details before approval or rejection.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Refund request ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               adminNotes:
 *                 type: string
 *                 description: Admin notes or comments
 *               refundAmount:
 *                 type: number
 *                 format: float
 *                 description: Adjusted refund amount
 *               processingNotes:
 *                 type: string
 *                 description: Notes for processing the refund
 *     responses:
 *       200:
 *         description: Refund request reviewed successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Refund request not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @swagger
 * /api/v1/refunds/{id}/approve:
 *   post:
 *     tags: [Refunds, Admin]
 *     summary: Approve refund request
 *     description: Approves a refund request and initiates the refund process through the payment gateway. Admin-only endpoint.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Refund request ID
 *         example: 1
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               adminNotes:
 *                 type: string
 *                 description: Admin notes for approval
 *               refundAmount:
 *                 type: number
 *                 format: float
 *                 description: Override refund amount (if different from request)
 *     responses:
 *       200:
 *         description: Refund approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           example: approved
 *                         refundId:
 *                           type: string
 *                           description: Payment gateway refund ID
 *       400:
 *         description: Cannot approve refund (invalid status or missing payment)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Refund request not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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

    // Send refund confirmation email
    try {
      const refund = await RefundRequest.findByPk(id, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['email', 'firstName', 'lastName']
          },
          {
            model: OrderReview,
            as: 'order',
            attributes: ['orderNumber', 'id']
          }
        ]
      });

      if (refund && refund.user) {
        const customerName = `${refund.user.firstName || ''} ${refund.user.lastName || ''}`.trim() || 'Customer';
        const customerEmail = refund.user.email;

        await EmailNotificationService.sendRefundConfirmation({
          customerName,
          customerEmail,
          orderNumber: refund.order?.orderNumber || `ORD-${refund.orderId}`,
          orderId: refund.orderId,
          refundInfo: {
            refundId: `REF-${refund.id}`,
            refundAmount: parseFloat(refund.refundAmount as any),
            refundReason: refund.reason,
            refundMethod: refund.refundMethod || 'Original Payment Method',
            refundDate: refund.updatedAt.toISOString()
          }
        });

        logger.info('Refund confirmation email sent', {
          refundId: id,
          customerEmail
        });
      }
    } catch (emailError) {
      logger.error('Error sending refund confirmation email:', emailError);
      // Don't fail the request if email fails
    }

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
 * @swagger
 * /api/v1/refunds/{id}/reject:
 *   post:
 *     tags: [Refunds, Admin]
 *     summary: Reject refund request
 *     description: Rejects a refund request with optional admin notes explaining the rejection reason. Admin-only endpoint.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Refund request ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rejectionReason
 *             properties:
 *               rejectionReason:
 *                 type: string
 *                 description: Reason for rejecting the refund request
 *                 example: Item does not meet refund policy requirements
 *               adminNotes:
 *                 type: string
 *                 description: Additional admin notes
 *     responses:
 *       200:
 *         description: Refund request rejected successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           example: rejected
 *       400:
 *         description: Missing rejection reason or invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Refund request not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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

    // Send refund rejection email
    try {
      const refund = await RefundRequest.findByPk(id, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['email', 'firstName', 'lastName']
          },
          {
            model: OrderReview,
            as: 'order',
            attributes: ['orderNumber', 'id']
          }
        ]
      });

      if (refund && refund.user) {
        const customerName = `${refund.user.firstName || ''} ${refund.user.lastName || ''}`.trim() || 'Customer';
        const customerEmail = refund.user.email;

        await EmailNotificationService.sendRefundRejection({
          customerName,
          customerEmail,
          orderNumber: refund.order?.orderNumber || `ORD-${refund.orderId}`,
          orderId: refund.orderId,
          rejectionReason,
          refundAmount: parseFloat(refund.refundAmount as any),
          requestedReason: refund.reason
        });

        logger.info('Refund rejection email sent', {
          refundId: id,
          customerEmail
        });
      }
    } catch (emailError) {
      logger.error('Error sending refund rejection email:', emailError);
      // Don't fail the request if email fails
    }

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

