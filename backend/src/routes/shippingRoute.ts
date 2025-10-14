/**
 * Shipping Routes
 * Handles shipping rate calculations and label creation via ShipEngine
 */

import express from 'express';
import {
  calculateShipEngineRates,
  validateAddress,
  getCarriers,
  getCarrierServices,
  trackShipment,
  testShipEngineConnection,
  getShipEngineStatus,
} from '../controllers/shipEngineController';
import { authenticate } from '../middlewares/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * ShipEngine Routes
 */

/**
 * @route POST /api/v1/shipping/shipengine/rates
 * @desc Calculate shipping rates using ShipEngine API
 * @access Private
 */
router.post('/shipengine/rates', calculateShipEngineRates);

/**
 * @route POST /api/v1/shipping/shipengine/validate-address
 * @desc Validate and normalize an address
 * @access Private
 */
router.post('/shipengine/validate-address', validateAddress);

/**
 * @route GET /api/v1/shipping/shipengine/carriers
 * @desc Get list of available carriers
 * @access Private (Admin only)
 */
router.get('/shipengine/carriers', getCarriers);

/**
 * @route GET /api/v1/shipping/shipengine/carriers/:carrierId/services
 * @desc Get services for a specific carrier
 * @access Private (Admin only)
 */
router.get('/shipengine/carriers/:carrierId/services', getCarrierServices);

/**
 * @route GET /api/v1/shipping/shipengine/track/:carrierCode/:trackingNumber
 * @desc Track a shipment
 * @access Private
 */
router.get('/shipengine/track/:carrierCode/:trackingNumber', trackShipment);

/**
 * @route GET /api/v1/shipping/shipengine/test
 * @desc Test ShipEngine API connection using address validation
 * @access Private (Admin only)
 */
router.get('/shipengine/test', testShipEngineConnection);

/**
 * @route GET /api/v1/shipping/shipengine/status
 * @desc Check ShipEngine configuration status
 * @access Private (Admin only)
 */
router.get('/shipengine/status', getShipEngineStatus);

export default router;

