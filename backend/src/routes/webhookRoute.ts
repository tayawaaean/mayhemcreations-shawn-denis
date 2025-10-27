/**
 * Webhook Routes
 * Handles webhook events from various services
 */

import express from 'express';
import { handleStripeWebhook } from '../controllers/webhookController';
import { handleShipStationWebhook } from '../controllers/shipStationWebhookController';
import { shipEngineWebhookMiddleware } from '../middlewares/shipStationWebhookMiddleware';
import { webhookBodyParser } from '../middlewares/webhookMiddleware';

const router = express.Router();

/**
 * Stripe Webhook
 * @route POST /api/v1/webhooks/stripe
 * @access Public (Stripe only)
 */
router.post('/stripe', webhookBodyParser, handleStripeWebhook);

/**
 * ShipEngine Webhook
 * @route POST /api/v1/webhooks/shipstation
 * @access Public (ShipEngine only)
 */
router.post('/shipstation', shipEngineWebhookMiddleware, handleShipStationWebhook);

export default router;
