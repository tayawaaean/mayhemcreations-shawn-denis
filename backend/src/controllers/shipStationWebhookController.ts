import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { getWebSocketService } from '../services/websocketService';

/**
 * ShipStation Webhook Controller
 * Handles webhook notifications from ShipStation
 */
export class ShipStationWebhookController {
  /**
   * Handle order status updates
   */
  public static async handleOrderUpdate(req: Request, res: Response): Promise<void> {
    try {
      const webhookData = req.body;
      
      logger.info('🚢 ShipStation webhook received:', {
        type: webhookData.type,
        orderNumber: webhookData.orderNumber,
        orderStatus: webhookData.orderStatus,
        timestamp: new Date().toISOString()
      });

      // Validate webhook data
      if (!webhookData.orderNumber || !webhookData.orderStatus) {
        logger.warn('🚢 Invalid ShipStation webhook data:', webhookData);
        res.status(400).json({
          success: false,
          message: 'Invalid webhook data',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Process different types of webhook events
      switch (webhookData.type) {
        case 'order_created':
          await ShipStationWebhookController.handleOrderCreated(webhookData);
          break;
        case 'order_updated':
          await ShipStationWebhookController.handleOrderUpdated(webhookData);
          break;
        case 'order_shipped':
          await ShipStationWebhookController.handleOrderShipped(webhookData);
          break;
        case 'order_delivered':
          await ShipStationWebhookController.handleOrderDelivered(webhookData);
          break;
        case 'order_cancelled':
          await ShipStationWebhookController.handleOrderCancelled(webhookData);
          break;
        default:
          logger.info('🚢 Unknown ShipStation webhook type:', webhookData.type);
      }

      // Send real-time notification to admin users
      const webSocketService = getWebSocketService();
      if (webSocketService) {
        webSocketService.emitToAdminRoom('shipstation_update', {
          type: webhookData.type,
          orderNumber: webhookData.orderNumber,
          orderStatus: webhookData.orderStatus,
          timestamp: new Date().toISOString(),
          data: webhookData
        });
      }

      res.json({
        success: true,
        message: 'Webhook processed successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('🚢 ShipStation webhook error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process webhook',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Handle shipment updates
   */
  public static async handleShipmentUpdate(req: Request, res: Response): Promise<void> {
    try {
      const webhookData = req.body;
      
      logger.info('🚢 ShipStation shipment webhook received:', {
        type: webhookData.type,
        trackingNumber: webhookData.trackingNumber,
        shipmentId: webhookData.shipmentId,
        timestamp: new Date().toISOString()
      });

      // Validate webhook data
      if (!webhookData.trackingNumber || !webhookData.shipmentId) {
        logger.warn('🚢 Invalid ShipStation shipment webhook data:', webhookData);
        res.status(400).json({
          success: false,
          message: 'Invalid shipment webhook data',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Process shipment events
      switch (webhookData.type) {
        case 'shipment_created':
          await ShipStationWebhookController.handleShipmentCreated(webhookData);
          break;
        case 'shipment_updated':
          await ShipStationWebhookController.handleShipmentUpdated(webhookData);
          break;
        case 'shipment_delivered':
          await ShipStationWebhookController.handleShipmentDelivered(webhookData);
          break;
        case 'shipment_exception':
          await ShipStationWebhookController.handleShipmentException(webhookData);
          break;
        default:
          logger.info('🚢 Unknown ShipStation shipment webhook type:', webhookData.type);
      }

      // Send real-time notification to admin users
      const webSocketService = getWebSocketService();
      if (webSocketService) {
        webSocketService.emitToAdminRoom('shipstation_shipment_update', {
          type: webhookData.type,
          trackingNumber: webhookData.trackingNumber,
          shipmentId: webhookData.shipmentId,
          timestamp: new Date().toISOString(),
          data: webhookData
        });
      }

      res.json({
        success: true,
        message: 'Shipment webhook processed successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('🚢 ShipStation shipment webhook error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process shipment webhook',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Private helper methods for different webhook types
  private static async handleOrderCreated(data: any): Promise<void> {
    logger.info('🚢 Order created in ShipStation:', data.orderNumber);
    // TODO: Update local order status, send notifications, etc.
  }

  private static async handleOrderUpdated(data: any): Promise<void> {
    logger.info('🚢 Order updated in ShipStation:', data.orderNumber, 'Status:', data.orderStatus);
    // TODO: Update local order status, send notifications, etc.
  }

  private static async handleOrderShipped(data: any): Promise<void> {
    logger.info('🚢 Order shipped in ShipStation:', data.orderNumber);
    // TODO: Update local order status, send customer notification, etc.
  }

  private static async handleOrderDelivered(data: any): Promise<void> {
    logger.info('🚢 Order delivered in ShipStation:', data.orderNumber);
    // TODO: Update local order status, send customer notification, etc.
  }

  private static async handleOrderCancelled(data: any): Promise<void> {
    logger.info('🚢 Order cancelled in ShipStation:', data.orderNumber);
    // TODO: Update local order status, handle refunds, etc.
  }

  private static async handleShipmentCreated(data: any): Promise<void> {
    logger.info('🚢 Shipment created in ShipStation:', data.trackingNumber);
    // TODO: Update local shipment data, send customer notification, etc.
  }

  private static async handleShipmentUpdated(data: any): Promise<void> {
    logger.info('🚢 Shipment updated in ShipStation:', data.trackingNumber);
    // TODO: Update local shipment data, send customer notification, etc.
  }

  private static async handleShipmentDelivered(data: any): Promise<void> {
    logger.info('🚢 Shipment delivered in ShipStation:', data.trackingNumber);
    // TODO: Update local shipment data, send customer notification, etc.
  }

  private static async handleShipmentException(data: any): Promise<void> {
    logger.warn('🚢 Shipment exception in ShipStation:', data.trackingNumber, data.exceptionDescription);
    // TODO: Handle shipment exception, notify customer and admin, etc.
  }
}
