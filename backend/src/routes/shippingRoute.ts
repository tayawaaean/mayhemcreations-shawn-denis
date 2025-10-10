/**
 * Shipping Routes
 * Handles shipping rate calculations
 */

import express from 'express';
import { calculateShippingRates } from '../controllers/shippingController';
import { authenticate } from '../middlewares/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route POST /api/v1/shipping/rates
 * @desc Calculate shipping rates for an address
 * @access Private
 */
router.post('/rates', calculateShippingRates);

export default router;

