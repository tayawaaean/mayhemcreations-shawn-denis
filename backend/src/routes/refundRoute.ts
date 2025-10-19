/**
 * Refund Routes
 * Defines all API endpoints for refund management
 */

import express from 'express';
import * as refundController from '../controllers/refundController';
import { sessionAuthenticate, requireAdmin } from '../middlewares/auth';

const router = express.Router();

// Customer routes - require authentication (supports both session and token)
router.post('/request', sessionAuthenticate, refundController.createRefundRequest);
router.get('/user', sessionAuthenticate, refundController.getUserRefunds);
router.get('/:id', sessionAuthenticate, refundController.getRefundById);
router.post('/:id/cancel', sessionAuthenticate, refundController.cancelRefund);

// Admin routes - require authentication and admin role
router.get('/admin/all', sessionAuthenticate, requireAdmin, refundController.getAllRefunds);
router.get('/admin/stats', sessionAuthenticate, requireAdmin, refundController.getRefundStats);
router.put('/:id/review', sessionAuthenticate, requireAdmin, refundController.reviewRefund);
router.post('/:id/approve', sessionAuthenticate, requireAdmin, refundController.approveRefund);
router.post('/:id/reject', sessionAuthenticate, requireAdmin, refundController.rejectRefund);

export default router;

