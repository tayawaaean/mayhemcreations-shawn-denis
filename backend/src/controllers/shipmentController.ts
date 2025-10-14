/**
 * Shipment Controller
 * Handles shipping label creation and tracking for orders
 */

import { Request, Response } from 'express';
import {
  createShippingLabel,
  getTrackingInfo,
  voidLabel,
  batchCreateLabels
} from '../services/shipmentService';
import { logger } from '../utils/logger';
import { OrderReview } from '../models/orderReviewModel';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    firstName?: string;
    lastName?: string;
    roleId: number;
  };
}

/**
 * Create shipping label for an order
 * @route POST /api/v1/shipments/create-label
 * @access Private (Admin only)
 */
export const createLabel = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { orderId, serviceCode, carrierCode, testLabel } = req.body;

    if (!orderId) {
      res.status(400).json({
        success: false,
        message: 'Order ID is required',
        code: 'MISSING_ORDER_ID'
      });
      return;
    }

    // Verify user is admin
    if (req.user?.roleId !== 1) {
      res.status(403).json({
        success: false,
        message: 'Only administrators can create shipping labels',
        code: 'FORBIDDEN'
      });
      return;
    }

    logger.info('Creating shipping label', {
      orderId,
      userId: req.user?.id,
      serviceCode,
      testLabel
    });

    const result = await createShippingLabel({
      orderId,
      serviceCode,
      carrierCode,
      testLabel: testLabel || false
    });

    if (result.success) {
      res.status(200).json({
        success: true,
        data: result.label,
        message: 'Shipping label created successfully',
        timestamp: new Date().toISOString()
      });

      logger.info('Shipping label created', {
        orderId,
        labelId: result.label?.labelId,
        trackingNumber: result.label?.trackingNumber
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Failed to create shipping label',
        code: 'LABEL_CREATION_FAILED',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    logger.error('Create shipping label error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get tracking information
 * @route GET /api/v1/shipments/track/:carrierCode/:trackingNumber
 * @access Private
 */
export const trackShipment = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { carrierCode, trackingNumber } = req.params;

    if (!carrierCode || !trackingNumber) {
      res.status(400).json({
        success: false,
        message: 'Carrier code and tracking number are required',
        code: 'MISSING_PARAMETERS'
      });
      return;
    }

    const result = await getTrackingInfo(carrierCode, trackingNumber);

    if (result.success) {
      res.status(200).json({
        success: true,
        data: result.tracking,
        message: 'Tracking information retrieved successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Failed to get tracking information',
        code: 'TRACKING_FAILED',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    logger.error('Track shipment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Void a shipping label
 * @route POST /api/v1/shipments/void-label
 * @access Private (Admin only)
 */
export const voidShippingLabel = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { labelId, orderId } = req.body;

    if (!labelId) {
      res.status(400).json({
        success: false,
        message: 'Label ID is required',
        code: 'MISSING_LABEL_ID'
      });
      return;
    }

    // Verify user is admin
    if (req.user?.roleId !== 1) {
      res.status(403).json({
        success: false,
        message: 'Only administrators can void shipping labels',
        code: 'FORBIDDEN'
      });
      return;
    }

    const result = await voidLabel(labelId);

    if (result.success) {
      // Update order status if orderId provided
      if (orderId) {
        const { sequelize } = await import('../config/database');
        await sequelize.query(
          `UPDATE order_reviews 
           SET tracking_number = NULL,
               tracking_url = NULL,
               label_url = NULL,
               shipped_at = NULL,
               status = 'ready-for-checkout',
               updated_at = NOW()
           WHERE id = ?`,
          { replacements: [orderId] }
        );
      }

      res.status(200).json({
        success: true,
        message: 'Shipping label voided successfully',
        timestamp: new Date().toISOString()
      });

      logger.info('Shipping label voided', {
        labelId,
        orderId,
        userId: req.user?.id
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Failed to void shipping label',
        code: 'VOID_FAILED',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    logger.error('Void label error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Batch create shipping labels for multiple orders
 * @route POST /api/v1/shipments/batch-create-labels
 * @access Private (Admin only)
 */
export const batchCreate = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { orderIds, serviceCode, testLabel } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Order IDs array is required',
        code: 'MISSING_ORDER_IDS'
      });
      return;
    }

    // Verify user is admin
    if (req.user?.roleId !== 1) {
      res.status(403).json({
        success: false,
        message: 'Only administrators can create shipping labels',
        code: 'FORBIDDEN'
      });
      return;
    }

    logger.info('Batch creating shipping labels', {
      orderCount: orderIds.length,
      userId: req.user?.id
    });

    const result = await batchCreateLabels(orderIds, {
      serviceCode,
      testLabel: testLabel || false
    });

    res.status(200).json({
      success: result.success,
      data: result.results,
      message: `Created ${result.results.filter(r => r.success).length} of ${orderIds.length} labels`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Batch create labels error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get shipment details for an order
 * @route GET /api/v1/shipments/order/:orderId
 * @access Private
 */
export const getOrderShipment = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { orderId } = req.params;

    const order = await OrderReview.findByPk(orderId);

    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Order not found',
        code: 'ORDER_NOT_FOUND'
      });
      return;
    }

    // Check if user has access to this order
    const isAdmin = req.user?.roleId === 1;
    if (!isAdmin && order.userId !== req.user?.id) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to view this shipment',
        code: 'FORBIDDEN'
      });
      return;
    }

    const shipmentData = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      trackingNumber: order.trackingNumber,
      trackingUrl: order.trackingUrl,
      labelUrl: order.labelUrl,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      carrier: order.shippingCarrier,
      shippingMethod: order.shippingMethod 
        ? (typeof order.shippingMethod === 'string' ? JSON.parse(order.shippingMethod) : order.shippingMethod)
        : null
    };

    res.status(200).json({
      success: true,
      data: shipmentData,
      message: 'Shipment details retrieved successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Get order shipment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
};

export default {
  createLabel,
  trackShipment,
  voidShippingLabel,
  batchCreate,
  getOrderShipment
};

