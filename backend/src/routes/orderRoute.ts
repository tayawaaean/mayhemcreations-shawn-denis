/**
 * Order Routes
 * Routes for order management
 */

import express from 'express';
import { hybridAuthenticate, requireRole } from '../middlewares/auth';
import {
  getAllOrders,
  getOrderById,
  getUserOrders,
  updateOrderStatus
} from '../controllers/orderController';

const router = express.Router();

// Admin routes - require admin role (supports both session and bearer token)
router.get('/', hybridAuthenticate, requireRole(['admin']), getAllOrders); // GET all orders (admin only)
router.get('/:id', hybridAuthenticate, requireRole(['admin']), getOrderById); // GET single order by ID (admin only)
router.patch('/:id/status', hybridAuthenticate, requireRole(['admin']), updateOrderStatus); // UPDATE order status (admin only)

// User routes - authenticated users
router.get('/my-orders', hybridAuthenticate, getUserOrders); // GET user's own orders

export default router;

