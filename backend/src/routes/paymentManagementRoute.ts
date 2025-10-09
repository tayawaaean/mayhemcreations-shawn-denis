/**
 * Payment Management Routes
 * Routes for admin payment management
 */

import { Router } from 'express';
import { 
  getAllPaymentsHandler, 
  getPaymentStatsHandler, 
  getPaymentByIdHandler, 
  updatePaymentNotesHandler 
} from '../controllers/paymentManagementController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all payments with pagination and filters
router.get('/', getAllPaymentsHandler);

// Get payment statistics
router.get('/stats', getPaymentStatsHandler);

// Get payment details by ID
router.get('/:id', getPaymentByIdHandler);

// Update payment notes
router.put('/:id/notes', updatePaymentNotesHandler);

export default router;
