// Label Controller
// Handles API requests for creating and managing shipping labels

import { Request, Response } from 'express'
import { QueryTypes } from 'sequelize'
import { shipEngineLabelService } from '../services/shipEngineLabelService'
import { sequelize } from '../config/database'

export class LabelController {
  /**
   * Create shipping label for an order
   * POST /api/v1/labels/create
   * 
   * Request body:
   * {
   *   orderId: number,      // Required: Order ID
   *   rateId?: string       // Optional: Rate ID from checkout (faster if available)
   * }
   */
  async createLabel(req: Request, res: Response): Promise<void> {
    try {
      const { orderId, rateId } = req.body

      // Validate required fields
      if (!orderId) {
        res.status(400).json({ 
          success: false,
          error: 'Order ID is required' 
        })
        return
      }

      console.log(`📦 Creating label for order ${orderId}${rateId ? ` with rate ${rateId}` : ''}`)

      // Check if order exists and get current label status
      const [orderCheck] = await sequelize.query(
        'SELECT id, order_number, tracking_number, shipping_label_url, carrier_code, service_code, status FROM order_reviews WHERE id = ?',
        {
          replacements: [orderId],
          type: QueryTypes.SELECT
        }
      ) as any[]

      if (!orderCheck) {
        res.status(404).json({
          success: false,
          error: 'Order not found'
        })
        return
      }

      const order = orderCheck

      // Check if label already exists and log current status
      console.log(`🔍 Current label status for order ${orderId}:`, {
        trackingNumber: order.tracking_number || 'None',
        hasLabelUrl: !!order.shipping_label_url,
        labelUrlLength: order.shipping_label_url?.length || 0,
        carrierCode: order.carrier_code || 'None',
        serviceCode: order.service_code || 'None',
        status: order.status
      })

      if (order.tracking_number) {
        console.log(`⚠️ Label already exists for order ${orderId}: ${order.tracking_number}`)
        console.log(`🔄 Proceeding to create new label and update database...`)
      }

      let labelData

      // If we have a rate ID from checkout, use it (faster)
      if (rateId) {
        console.log(`⚡ Using existing rate ${rateId} for faster label creation`)
        labelData = await shipEngineLabelService.createLabelFromRate(rateId, orderId)
      } else {
        // Otherwise, create label from scratch
        console.log(`🔨 Creating label from shipment details`)
        labelData = await shipEngineLabelService.createLabelFromShipment(orderId)
      }

      // Save label info to database
      await shipEngineLabelService.saveLabelToOrder(orderId, labelData)

      console.log(`✅ Label created and saved for order ${orderId}`)

      // Return success response
      const wasUpdate = !!order.tracking_number
      res.status(200).json({
        success: true,
        message: wasUpdate ? 'Shipping label updated successfully' : 'Shipping label created successfully',
        data: {
          orderId: orderId,
          orderNumber: order.order_number,
          trackingNumber: labelData.trackingNumber,
          labelDownloadPdf: labelData.labelDownloadPdf,
          labelDownloadPng: labelData.labelDownloadPng,
          carrierCode: labelData.carrierCode,
          serviceCode: labelData.serviceCode,
          shipmentCost: labelData.shipmentCost,
          wasUpdate: wasUpdate,
          previousTrackingNumber: wasUpdate ? order.tracking_number : null
        }
      })
    } catch (error: any) {
      console.error('❌ Label creation error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to create shipping label',
        details: error.message
      })
    }
  }

  /**
   * Get label information for an order
   * GET /api/v1/labels/order/:orderId
   */
  async getLabelByOrderId(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params

      // Validate order ID
      if (!orderId || isNaN(Number(orderId))) {
        res.status(400).json({
          success: false,
          error: 'Valid order ID is required'
        })
        return
      }

      // Fetch label information from database
      const [order] = await sequelize.query(
        `SELECT 
          id,
          order_number,
          tracking_number, 
          shipping_label_url, 
          carrier_code, 
          service_code, 
          shipped_at, 
          status,
          shipping_carrier
         FROM order_reviews 
         WHERE id = ?`,
        {
          replacements: [orderId],
          type: QueryTypes.SELECT
        }
      ) as any[]

      if (!order) {
        res.status(404).json({
          success: false,
          error: 'Order not found'
        })
        return
      }

      // Check if label exists
      if (!order.tracking_number) {
        res.status(404).json({
          success: false,
          error: 'Shipping label not found for this order',
          data: {
            orderId: order.id,
            orderNumber: order.order_number,
            status: order.status
          }
        })
        return
      }

      // Return label information
      res.status(200).json({
        success: true,
        data: {
          orderId: order.id,
          orderNumber: order.order_number,
          trackingNumber: order.tracking_number,
          shippingLabelUrl: order.shipping_label_url,
          carrierCode: order.carrier_code,
          serviceCode: order.service_code,
          shippingCarrier: order.shipping_carrier,
          shippedAt: order.shipped_at,
          status: order.status
        }
      })
    } catch (error: any) {
      console.error('❌ Get label error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve label information',
        details: error.message
      })
    }
  }

  /**
   * List all labels (optional - for admin overview)
   * GET /api/v1/labels/all
   */
  async getAllLabels(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 50, offset = 0 } = req.query

      // Fetch all orders with labels
      const orders = await sequelize.query(
        `SELECT 
          id,
          order_number,
          tracking_number,
          carrier_code,
          service_code,
          status,
          shipped_at,
          created_at
         FROM order_reviews 
         WHERE tracking_number IS NOT NULL
         ORDER BY shipped_at DESC, created_at DESC
         LIMIT ? OFFSET ?`,
        {
          replacements: [limit, offset],
          type: QueryTypes.SELECT
        }
      )

      // Get total count
      const [countResult] = await sequelize.query(
        'SELECT COUNT(*) as total FROM order_reviews WHERE tracking_number IS NOT NULL',
        {
          type: QueryTypes.SELECT
        }
      ) as any[]

      res.status(200).json({
        success: true,
        data: orders,
        pagination: {
          total: parseInt(countResult.total),
          limit: Number(limit),
          offset: Number(offset)
        }
      })
    } catch (error: any) {
      console.error('❌ Get all labels error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve labels',
        details: error.message
      })
    }
  }

  /**
   * Check existing label status for an order
   * GET /api/v1/labels/check/:orderId
   */
  async checkExistingLabel(req: Request, res: Response): Promise<void> {
    try {
      const orderId = req.params.orderId

      if (!orderId) {
        res.status(400).json({ 
          success: false,
          error: 'Order ID is required' 
        })
        return
      }

      console.log(`🔍 Checking existing label for order ${orderId}`)

      // Check if order exists and get label status
      const [order] = await sequelize.query(
        'SELECT id, order_number, tracking_number, shipping_label_url, carrier_code, service_code, status, shipped_at FROM order_reviews WHERE id = ?',
        {
          replacements: [orderId],
          type: QueryTypes.SELECT
        }
      ) as any[]

      if (!order) {
        res.status(404).json({
          success: false,
          error: 'Order not found'
        })
        return
      }

      const hasLabel = !!order.tracking_number
      const hasLabelUrl = !!order.shipping_label_url

      res.status(200).json({
        success: true,
        data: {
          orderId: order.id,
          orderNumber: order.order_number,
          hasLabel,
          hasLabelUrl,
          trackingNumber: order.tracking_number || null,
          labelUrlLength: order.shipping_label_url?.length || 0,
          carrierCode: order.carrier_code || null,
          serviceCode: order.service_code || null,
          status: order.status,
          shippedAt: order.shipped_at || null,
          canCreateNew: true // Always allow creating/updating labels
        }
      })
    } catch (error: any) {
      console.error('❌ Check existing label error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to check existing label',
        details: error.message
      })
    }
  }
}

export const labelController = new LabelController()

