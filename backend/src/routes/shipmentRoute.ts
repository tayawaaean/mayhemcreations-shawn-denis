/**
 * Shipment Routes
 * Handles shipping label creation, tracking, and shipment management
 */

import express from 'express';
import {
  createLabel,
  trackShipment,
  voidShippingLabel,
  batchCreate,
  getOrderShipment
} from '../controllers/shipmentController';
import { authenticate } from '../middlewares/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route POST /api/v1/shipments/create-label
 * @desc Create shipping label for an order
 * @access Private (Admin only)
 */
router.post('/create-label', createLabel);

/**
 * @route POST /api/v1/shipments/batch-create-labels
 * @desc Create shipping labels for multiple orders
 * @access Private (Admin only)
 */
router.post('/batch-create-labels', batchCreate);

/**
 * @route POST /api/v1/shipments/void-label
 * @desc Void a shipping label
 * @access Private (Admin only)
 */
router.post('/void-label', voidShippingLabel);

/**
 * @route GET /api/v1/shipments/track/:carrierCode/:trackingNumber
 * @desc Get tracking information for a shipment
 * @access Private
 */
router.get('/track/:carrierCode/:trackingNumber', trackShipment);

/**
 * @route GET /api/v1/shipments/order/:orderId
 * @desc Get shipment details for an order
 * @access Private
 */
router.get('/order/:orderId', getOrderShipment);

export default router;

