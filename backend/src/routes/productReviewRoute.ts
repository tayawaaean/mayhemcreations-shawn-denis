/**
 * Product Review Routes
 * Defines all routes for product review operations
 */

import express from 'express';
import { hybridAuthenticate, requireRole } from '../middlewares/auth';
import {
  createReview,
  getProductReviews,
  getAllReviews,
  updateReviewStatus,
  deleteReview,
  markReviewHelpful
} from '../controllers/productReviewController';

const router = express.Router();

/**
 * @route   POST /api/v1/reviews
 * @desc    Create a new product review
 * @access  Private (Customer only)
 */
router.post('/', hybridAuthenticate, createReview);

/**
 * @route   GET /api/v1/reviews/product/:productId
 * @desc    Get all approved reviews for a product
 * @access  Public
 */
router.get('/product/:productId', getProductReviews);

/**
 * @route   GET /api/v1/reviews/admin/all
 * @desc    Get all reviews (with filtering)
 * @access  Private (Admin only)
 */
router.get('/admin/all', hybridAuthenticate, requireRole(['admin']), getAllReviews);

/**
 * @route   PATCH /api/v1/reviews/admin/:id/status
 * @desc    Update review status (approve/reject)
 * @access  Private (Admin only)
 */
router.patch('/admin/:id/status', hybridAuthenticate, requireRole(['admin']), updateReviewStatus);

/**
 * @route   DELETE /api/v1/reviews/admin/:id
 * @desc    Delete a review
 * @access  Private (Admin only)
 */
router.delete('/admin/:id', hybridAuthenticate, requireRole(['admin']), deleteReview);

/**
 * @route   POST /api/v1/reviews/:id/helpful
 * @desc    Mark a review as helpful
 * @access  Public
 */
router.post('/:id/helpful', markReviewHelpful);

export default router;

