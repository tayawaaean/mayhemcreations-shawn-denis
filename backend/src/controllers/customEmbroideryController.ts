import { Request, Response } from 'express'
import { CustomEmbroidery } from '../models/customEmbroideryModel'

export class CustomEmbroideryController {
  /**
   * Create a new custom embroidery order
   */
  static async createOrder(req: Request, res: Response): Promise<Response | void> {
    try {
      const {
        designName,
        designFile,
        designPreview,
        dimensions,
        selectedStyles,
        notes = ''
      } = req.body

      const userId = (req as any).user?.id

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
          code: 'UNAUTHORIZED'
        })
      }

      // Validate required fields
      if (!designName || !designFile || !designPreview || !dimensions || !selectedStyles) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields',
          code: 'MISSING_FIELDS'
        })
      }

      // Calculate material costs (simplified calculation)
      const area = dimensions.width * dimensions.height
      const baseCostPerSquareInch = 2.50 // Base cost per square inch
      
      const materialCosts = {
        fabricCost: area * 0.75,
        patchAttachCost: area * 0.25,
        threadCost: area * 0.50,
        bobbinCost: area * 0.15,
        cutAwayStabilizerCost: area * 0.30,
        washAwayStabilizerCost: area * 0.25,
        totalCost: area * baseCostPerSquareInch
      }

      // Calculate options price
      const allSelectedOptions = [
        selectedStyles.coverage,
        selectedStyles.material,
        selectedStyles.border,
        selectedStyles.backing,
        selectedStyles.cutting,
        ...selectedStyles.threads,
        ...selectedStyles.upgrades
      ].filter(Boolean)

      const optionsPrice = allSelectedOptions.reduce((sum: number, option: any) => {
        return sum + (option.price || 0)
      }, 0)

      const totalPrice = materialCosts.totalCost + optionsPrice

      // Create the order
      const order = await CustomEmbroidery.create({
        userId,
        designName,
        designFile,
        designPreview,
        dimensions,
        selectedStyles,
        materialCosts,
        optionsPrice,
        totalPrice,
        notes,
        status: 'pending'
      })

      res.status(201).json({
        success: true,
        data: order,
        message: 'Custom embroidery order created successfully'
      })

    } catch (error) {
      console.error('Error creating custom embroidery order:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR'
      })
    }
  }

  /**
   * Get user's custom embroidery orders
   */
  static async getUserOrders(req: Request, res: Response): Promise<Response | void> {
    try {
      const userId = (req as any).user?.id

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
          code: 'UNAUTHORIZED'
        })
      }

      const orders = await CustomEmbroidery.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']]
      })

      res.json({
        success: true,
        data: orders,
        message: 'Orders retrieved successfully'
      })

    } catch (error) {
      console.error('Error fetching user orders:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR'
      })
    }
  }

  /**
   * Get all custom embroidery orders (admin only)
   */
  static async getAllOrders(req: Request, res: Response): Promise<Response | void> {
    try {
      const orders = await CustomEmbroidery.findAll({
        order: [['createdAt', 'DESC']]
      })

      res.json({
        success: true,
        data: orders,
        message: 'All orders retrieved successfully'
      })

    } catch (error) {
      console.error('Error fetching all orders:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR'
      })
    }
  }

  /**
   * Get a specific custom embroidery order
   */
  static async getOrderById(req: Request, res: Response): Promise<Response | void> {
    try {
      const { id } = req.params
      const userId = (req as any).user?.id

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
          code: 'UNAUTHORIZED'
        })
      }

      const order = await CustomEmbroidery.findOne({
        where: { id, userId }
      })

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found',
          code: 'ORDER_NOT_FOUND'
        })
      }

      res.json({
        success: true,
        data: order,
        message: 'Order retrieved successfully'
      })

    } catch (error) {
      console.error('Error fetching order:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR'
      })
    }
  }

  /**
   * Update order status (admin only)
   */
  static async updateOrderStatus(req: Request, res: Response): Promise<Response | void> {
    try {
      const { id } = req.params
      const { status, estimatedCompletionDate } = req.body

      const order = await CustomEmbroidery.findByPk(id)

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found',
          code: 'ORDER_NOT_FOUND'
        })
      }

      await order.update({
        status,
        estimatedCompletionDate
      })

      res.json({
        success: true,
        data: order,
        message: 'Order status updated successfully'
      })

    } catch (error) {
      console.error('Error updating order status:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR'
      })
    }
  }

  /**
   * Delete a custom embroidery order
   */
  static async deleteOrder(req: Request, res: Response): Promise<Response | void> {
    try {
      const { id } = req.params
      const userId = (req as any).user?.id

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
          code: 'UNAUTHORIZED'
        })
      }

      const order = await CustomEmbroidery.findOne({
        where: { id, userId }
      })

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found',
          code: 'ORDER_NOT_FOUND'
        })
      }

      await order.destroy()

      res.json({
        success: true,
        message: 'Order deleted successfully'
      })

    } catch (error) {
      console.error('Error deleting order:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR'
      })
    }
  }
}
