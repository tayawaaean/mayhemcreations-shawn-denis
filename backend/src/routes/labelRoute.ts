// Label Routes
// API routes for shipping label creation and management

import express from 'express'
import { labelController } from '../controllers/labelController'
import { sessionAuthenticate, requireAdmin } from '../middlewares/auth'

const router = express.Router()

/**
 * @route   POST /api/v1/labels/create
 * @desc    Create shipping label for an order
 * @access  Private (Admin only)
 * @body    { orderId: number, rateId?: string }
 */
router.post('/create', sessionAuthenticate, requireAdmin, labelController.createLabel.bind(labelController))

/**
 * @route   GET /api/v1/labels/order/:orderId
 * @desc    Get label information for a specific order
 * @access  Private (Admin only)
 * @param   orderId - Order ID
 */
router.get('/order/:orderId', sessionAuthenticate, requireAdmin, labelController.getLabelByOrderId.bind(labelController))

/**
 * @route   GET /api/v1/labels/all
 * @desc    Get all labels (admin overview)
 * @access  Private (Admin only)
 * @query   limit, offset
 */
router.get('/all', sessionAuthenticate, requireAdmin, labelController.getAllLabels.bind(labelController))

/**
 * @route   GET /api/v1/labels/check/:orderId
 * @desc    Check existing label status for an order
 * @access  Private (Admin only)
 * @param   orderId - Order ID
 */
router.get('/check/:orderId', sessionAuthenticate, requireAdmin, labelController.checkExistingLabel.bind(labelController))

export default router

