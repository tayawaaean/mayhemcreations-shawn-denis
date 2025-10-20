import { Router } from 'express';
import {
  getMessagesByCustomer,
  getChatThreads,
  getRecentMessages
} from '../controllers/messageController';
import { sessionAuthenticate, requireRole } from '../middlewares/auth';

const router = Router();

/**
 * @route GET /api/v1/messages/customer/:customerId
 * @desc Get chat messages for a specific customer
 * @access Private (Admin only)
 */
router.get('/customer/:customerId', sessionAuthenticate, requireRole(['admin']), getMessagesByCustomer);

/**
 * @route GET /api/v1/messages/threads
 * @desc Get all chat threads (conversations) for admin
 * @access Private (Admin only)
 */
router.get('/threads', sessionAuthenticate, requireRole(['admin']), getChatThreads);

/**
 * @route GET /api/v1/messages/recent
 * @desc Get recent messages across all customers
 * @access Private (Admin only)
 */
router.get('/recent', sessionAuthenticate, requireRole(['admin']), getRecentMessages);

export default router;
















































