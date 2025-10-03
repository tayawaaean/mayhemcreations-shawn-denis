/**
 * Payment Routes
 * Handles payment-related API endpoints
 */

import { Router } from 'express';
import { 
  createPaymentIntentHandler,
  createCheckoutSessionHandler,
  getPaymentIntentStatus,
  getCheckoutSessionStatus,
  createOrRetrieveCustomer
} from '../controllers/paymentController';
import { handleStripeWebhook } from '../controllers/webhookController';
import { hybridAuthenticate } from '../middlewares/auth';
import { webhookBodyParser } from '../middlewares/webhookMiddleware';

const router = Router();

// Webhook route (no authentication required - called by Stripe)
router.post('/webhook', webhookBodyParser, handleStripeWebhook);

// All other payment routes require authentication (supports session or bearer)
router.use(hybridAuthenticate);

/**
 * @route POST /api/v1/payments/create-intent
 * @desc Create a payment intent for one-time payments
 * @access Private (Customer only)
 */
router.post('/create-intent', createPaymentIntentHandler);

/**
 * @route POST /api/v1/payments/create-checkout-session
 * @desc Create a checkout session for hosted payments
 * @access Private (Customer only)
 */
router.post('/create-checkout-session', createCheckoutSessionHandler);

/**
 * @route GET /api/v1/payments/intent/:paymentIntentId
 * @desc Get payment intent status
 * @access Private
 */
router.get('/intent/:paymentIntentId', getPaymentIntentStatus);

/**
 * @route GET /api/v1/payments/session/:sessionId
 * @desc Get checkout session status
 * @access Private
 */
router.get('/session/:sessionId', getCheckoutSessionStatus);

/**
 * @route POST /api/v1/payments/customer
 * @desc Create or retrieve Stripe customer
 * @access Private (Customer only)
 */
router.post('/customer', createOrRetrieveCustomer);

export default router;
