import { Request, Response } from 'express';
import { shipStationService } from '../services/shipStationService';
import { logger } from '../utils/logger';

/**
 * ShipStation Controller
 * Handles ShipStation API operations
 */
export class ShipStationController {
  /**
   * Test ShipStation connection
   */
  public static async testConnection(req: Request, res: Response): Promise<void> {
    try {
      if (!shipStationService.isConfigured()) {
        res.status(400).json({
          success: false,
          message: 'ShipStation API credentials not configured',
          code: 'SHIPSTATION_NOT_CONFIGURED',
        });
        return;
      }

      const isConnected = await shipStationService.testConnection();
      
      res.json({
        success: isConnected,
        message: isConnected ? 'ShipStation connection successful' : 'ShipStation connection failed',
        data: { connected: isConnected },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('ShipStation connection test error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to test ShipStation connection',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get available carriers
   */
  public static async getCarriers(req: Request, res: Response): Promise<void> {
    try {
      if (!shipStationService.isConfigured()) {
        res.status(400).json({
          success: false,
          message: 'ShipStation API credentials not configured',
          code: 'SHIPSTATION_NOT_CONFIGURED',
        });
        return;
      }

      const carriers = await shipStationService.getCarriers();
      
      res.json({
        success: true,
        message: 'Carriers retrieved successfully',
        data: carriers,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error fetching carriers:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch carriers',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get shipping rates
   */
  public static async getRates(req: Request, res: Response): Promise<void> {
    try {
      if (!shipStationService.isConfigured()) {
        res.status(400).json({
          success: false,
          message: 'ShipStation API credentials not configured',
          code: 'SHIPSTATION_NOT_CONFIGURED',
        });
        return;
      }

      const rates = await shipStationService.getRates(req.body);
      
      res.json({
        success: true,
        message: 'Shipping rates retrieved successfully',
        data: rates,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error getting shipping rates:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get shipping rates',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Create shipping label
   */
  public static async createLabel(req: Request, res: Response): Promise<void> {
    try {
      if (!shipStationService.isConfigured()) {
        res.status(400).json({
          success: false,
          message: 'ShipStation API credentials not configured',
          code: 'SHIPSTATION_NOT_CONFIGURED',
        });
        return;
      }

      const label = await shipStationService.createLabel(req.body);
      
      res.json({
        success: true,
        message: 'Shipping label created successfully',
        data: label,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error creating shipping label:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create shipping label',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get shipment details
   */
  public static async getShipment(req: Request, res: Response): Promise<void> {
    try {
      if (!shipStationService.isConfigured()) {
        res.status(400).json({
          success: false,
          message: 'ShipStation API credentials not configured',
          code: 'SHIPSTATION_NOT_CONFIGURED',
        });
        return;
      }

      const { shipmentId } = req.params;
      const shipment = await shipStationService.getShipment(shipmentId);
      
      res.json({
        success: true,
        message: 'Shipment retrieved successfully',
        data: shipment,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error fetching shipment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch shipment',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get tracking information
   */
  public static async getTracking(req: Request, res: Response): Promise<void> {
    try {
      if (!shipStationService.isConfigured()) {
        res.status(400).json({
          success: false,
          message: 'ShipStation API credentials not configured',
          code: 'SHIPSTATION_NOT_CONFIGURED',
        });
        return;
      }

      const { trackingNumber } = req.params;
      const tracking = await shipStationService.getTracking(trackingNumber);
      
      res.json({
        success: true,
        message: 'Tracking information retrieved successfully',
        data: tracking,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error fetching tracking info:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch tracking information',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Create order in ShipStation
   */
  public static async createOrder(req: Request, res: Response): Promise<void> {
    try {
      if (!shipStationService.isConfigured()) {
        res.status(400).json({
          success: false,
          message: 'ShipStation API credentials not configured',
          code: 'SHIPSTATION_NOT_CONFIGURED',
        });
        return;
      }

      const order = await shipStationService.createOrder(req.body);
      
      res.json({
        success: true,
        message: 'Order created in ShipStation successfully',
        data: order,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error creating order:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create order in ShipStation',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get orders from ShipStation
   */
  public static async getOrders(req: Request, res: Response): Promise<void> {
    try {
      if (!shipStationService.isConfigured()) {
        res.status(400).json({
          success: false,
          message: 'ShipStation API credentials not configured',
          code: 'SHIPSTATION_NOT_CONFIGURED',
        });
        return;
      }

      const orders = await shipStationService.getOrders(req.query);
      
      res.json({
        success: true,
        message: 'Orders retrieved successfully',
        data: orders,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error fetching orders:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch orders',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Update order status
   */
  public static async updateOrderStatus(req: Request, res: Response): Promise<void> {
    try {
      if (!shipStationService.isConfigured()) {
        res.status(400).json({
          success: false,
          message: 'ShipStation API credentials not configured',
          code: 'SHIPSTATION_NOT_CONFIGURED',
        });
        return;
      }

      const { orderId } = req.params;
      const { status } = req.body;
      
      const order = await shipStationService.updateOrderStatus(orderId, status);
      
      res.json({
        success: true,
        message: 'Order status updated successfully',
        data: order,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error updating order status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update order status',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get warehouses
   */
  public static async getWarehouses(req: Request, res: Response): Promise<void> {
    try {
      if (!shipStationService.isConfigured()) {
        res.status(400).json({
          success: false,
          message: 'ShipStation API credentials not configured',
          code: 'SHIPSTATION_NOT_CONFIGURED',
        });
        return;
      }

      const warehouses = await shipStationService.getWarehouses();
      
      res.json({
        success: true,
        message: 'Warehouses retrieved successfully',
        data: warehouses,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error fetching warehouses:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch warehouses',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get stores (sales channels)
   */
  public static async getStores(req: Request, res: Response): Promise<void> {
    try {
      if (!shipStationService.isConfigured()) {
        res.status(400).json({
          success: false,
          message: 'ShipStation API credentials not configured',
          code: 'SHIPSTATION_NOT_CONFIGURED',
        });
        return;
      }

      const stores = await shipStationService.getStores();
      
      res.json({
        success: true,
        message: 'Stores retrieved successfully',
        data: stores,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error fetching stores:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch stores',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
