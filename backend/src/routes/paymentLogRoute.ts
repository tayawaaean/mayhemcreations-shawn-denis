/**
 * Payment Log Routes
 * Admin routes for viewing payment transaction logs
 */

import { Router } from 'express';
import {
  getAllPaymentLogs,
  getPaymentStats,
  getPaymentLogsByOrder,
  getPaymentLogsByCustomer,
  getPaymentLogById
} from '../controllers/paymentLogController';
import { hybridAuthenticate, requireRole } from '../middlewares/auth';

const router = Router();

// All routes require admin or manager role
router.use(hybridAuthenticate);
router.use(requireRole(['admin', 'manager']));

// Get all payment logs with filters and pagination
router.get('/', getAllPaymentLogs);

// Get payment statistics
router.get('/stats', getPaymentStats);

// Get payment logs by order ID
router.get('/order/:orderId', getPaymentLogsByOrder);

// Get payment logs by customer ID
router.get('/customer/:customerId', getPaymentLogsByCustomer);

// Get detailed payment log by ID
router.get('/:id', getPaymentLogById);

export default router;

