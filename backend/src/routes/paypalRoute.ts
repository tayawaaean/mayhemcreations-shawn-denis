/**
 * PayPal Routes
 * Handles PayPal payment-related API endpoints
 */

import { Router } from 'express';
import { 
  createPayPalOrderHandler,
  capturePayPalOrderHandler,
  getPayPalOrderStatus,
  handlePayPalWebhook
} from '../controllers/paypalController';
import { hybridAuthenticate } from '../middlewares/auth';

const router = Router();

// Webhook route (no authentication required - called by PayPal)
router.post('/webhook', handlePayPalWebhook);

// All other PayPal routes require authentication (supports session or bearer)
router.use(hybridAuthenticate);

/**
 * @route POST /api/v1/payments/paypal/create-order
 * @desc Create a PayPal order
 * @access Private (Customer only)
 */
router.post('/create-order', createPayPalOrderHandler);

/**
 * @route POST /api/v1/payments/paypal/capture-order
 * @desc Capture a PayPal order
 * @access Private (Customer only)
 */
router.post('/capture-order', capturePayPalOrderHandler);

/**
 * @route GET /api/v1/payments/paypal/order/:orderId
 * @desc Get PayPal order status
 * @access Private
 */
router.get('/order/:orderId', getPayPalOrderStatus);

export default router;
