/**
 * Refund Routes
 * Defines all API endpoints for refund management
 */

import express from 'express';
import * as refundController from '../controllers/refundController';
import { hybridAuthenticate, requireAdmin } from '../middlewares/auth';

const router = express.Router();

// Customer routes - require authentication (supports both session and token)
router.post('/request', hybridAuthenticate, refundController.createRefundRequest);
router.get('/user', hybridAuthenticate, refundController.getUserRefunds);
router.get('/:id', hybridAuthenticate, refundController.getRefundById);
router.post('/:id/cancel', hybridAuthenticate, refundController.cancelRefund);

// Admin routes - require authentication and admin role
router.get('/admin/all', hybridAuthenticate, requireAdmin, refundController.getAllRefunds);
router.get('/admin/stats', hybridAuthenticate, requireAdmin, refundController.getRefundStats);
router.put('/:id/review', hybridAuthenticate, requireAdmin, refundController.reviewRefund);
router.post('/:id/approve', hybridAuthenticate, requireAdmin, refundController.approveRefund);
router.post('/:id/reject', hybridAuthenticate, requireAdmin, refundController.rejectRefund);

export default router;

