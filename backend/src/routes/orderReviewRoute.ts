/**
 * Order Review Routes
 * Handles order review submission and admin review functionality
 */

import { Router } from 'express';
import { hybridAuthenticate, requireRole } from '../middlewares/auth';
import {
  submitForReview,
  getUserReviewOrders,
  getAllReviewOrders,
  updateReviewStatus,
  uploadPictureReply,
  confirmPictureReplies,
} from '../controllers/orderReviewController';

const router = Router();


/**
 * @route POST /api/v1/orders/submit-for-review
 * @desc Submit order for admin review
 * @access Private (Customer only)
 */
router.post('/submit-for-review', hybridAuthenticate, requireRole(['customer']), submitForReview);

/**
 * @route GET /api/v1/orders/review-orders
 * @desc Get user's submitted orders for review
 * @access Private (Customer only)
 */
router.get('/review-orders', hybridAuthenticate, requireRole(['customer']), getUserReviewOrders);

/**
 * @route GET /api/v1/orders/admin/review-orders
 * @desc Get all orders for admin review
 * @access Private (Admin only)
 */
router.get('/admin/review-orders', hybridAuthenticate, requireRole(['admin']), getAllReviewOrders);

/**
 * @route PATCH /api/v1/orders/admin/review-orders/:id
 * @desc Update order review status (Admin only)
 * @access Private (Admin only)
 */
router.patch('/admin/review-orders/:id', hybridAuthenticate, requireRole(['admin']), updateReviewStatus);

/**
 * @route POST /api/v1/orders/admin/review-orders/:id/picture-reply
 * @desc Upload picture reply for order review (Admin only)
 * @access Private (Admin only)
 */
router.post('/admin/review-orders/:id/picture-reply', hybridAuthenticate, requireRole(['admin']), uploadPictureReply);

/**
 * @route POST /api/v1/orders/review-orders/:id/confirm-pictures
 * @desc Customer confirm picture replies
 * @access Private (Customer only)
 */
router.post('/review-orders/:id/confirm-pictures', hybridAuthenticate, requireRole(['customer']), confirmPictureReplies);

export default router;
