import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { EmailNotificationService } from '../services/emailNotificationService';
import { sequelize } from '../config/database';

// ShipEngine webhook event interface
interface ShipEngineWebhookEvent {
  event: string;
  event_id: string;
  timestamp: string;
  data: any;
}

/**
 * Main webhook handler for ShipEngine events
 */
export const handleShipStationWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const event: ShipEngineWebhookEvent = req.body;

    logger.info(`Received ShipEngine webhook event: ${event.event}`, {
      eventId: event.event_id,
      timestamp: event.timestamp,
    });

    // Handle different webhook event types
    switch (event.event) {
      case 'track':
        await handleTrackingEvent(event);
        break;
      
      case 'batch':
        await handleBatchEvent(event);
        break;
      
      case 'carrier_connected':
        await handleCarrierConnectedEvent(event);
        break;
      
      case 'order_source_refresh_complete':
        await handleOrderSourceRefreshEvent(event);
        break;
      
      case 'rate':
        await handleRateEvent(event);
        break;
      
      case 'report_complete':
        await handleReportCompleteEvent(event);
        break;
      
      case 'sales_order_imported':
        await handleSalesOrderImportedEvent(event);
        break;
      
      default:
        logger.info(`Unhandled ShipEngine webhook event type: ${event.event}`);
    }

    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logger.error('ShipEngine webhook processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Handle tracking events
 */
const handleTrackingEvent = async (event: ShipEngineWebhookEvent) => {
  try {
    logger.info('Processing tracking event', {
      eventType: event.event,
      timestamp: event.timestamp,
    });

    const trackingData = event.data;
    
    if (!trackingData) {
      logger.warn('No tracking data in webhook event');
      return;
    }

    // Extract tracking information
    const trackingNumber = trackingData.tracking_number;
    const statusCode = trackingData.status_code;
    const carrierCode = trackingData.carrier_code;
    const statusDescription = trackingData.status_description;

    // Find order by tracking number
    const [orderResult] = await sequelize.query(`
      SELECT id, order_data, shipping_address, customer_email, customer_name
      FROM order_reviews 
      WHERE tracking_number = ? OR JSON_EXTRACT(order_data, '$.trackingNumber') = ?
    `, {
      replacements: [trackingNumber, trackingNumber]
    }) as any[];

    if (orderResult && orderResult.length > 0) {
      const order = orderResult[0];
      const orderId = order.id;
      
      // Update order with tracking data
      await updateOrderWithTrackingData(orderId, {
        trackingNumber,
        status: statusDescription,
        statusCode,
        carrier: carrierCode,
        timestamp: new Date().toISOString(),
      });

      // Send email notifications based on status
      if (statusCode === 'DE') { // Delivered
        const orderData = typeof order.order_data === 'string' ? JSON.parse(order.order_data) : order.order_data;
        
        await EmailNotificationService.sendDeliveryNotification({
          customerName: order.customer_name || 'Customer',
          customerEmail: order.customer_email,
          orderNumber: orderData?.orderNumber || `#${orderId}`,
          orderId: orderId,
          deliveryDate: new Date().toISOString(),
          orderItems: orderData?.items || [],
        });
      } else if (statusCode === 'IT') { // In Transit
        // Send shipping confirmation if not already sent
        const orderData = typeof order.order_data === 'string' ? JSON.parse(order.order_data) : order.order_data;
        const shippingAddress = typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : order.shipping_address;

        await EmailNotificationService.sendShippingConfirmation({
          customerName: order.customer_name || 'Customer',
          customerEmail: order.customer_email,
          orderNumber: orderData?.orderNumber || `#${orderId}`,
          orderId: orderId,
          shippingInfo: {
            carrier: carrierCode,
            service: 'Standard Shipping',
            trackingNumber: trackingNumber,
            trackingUrl: `https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=${trackingNumber}`,
            estimatedDeliveryDate: trackingData.estimated_delivery_date,
          },
          orderItems: orderData?.items || [],
          shippingAddress: {
            firstName: shippingAddress?.firstName || '',
            lastName: shippingAddress?.lastName || '',
            addressLine1: shippingAddress?.street || '',
            city: shippingAddress?.city || '',
            state: shippingAddress?.state || '',
            postalCode: shippingAddress?.zipCode || '',
            country: shippingAddress?.country || 'US',
          },
        });
      }

      logger.info('Tracking event processed successfully', {
        orderId,
        trackingNumber,
        statusCode,
        statusDescription,
      });
    } else {
      logger.warn('No order found for tracking number', { trackingNumber });
    }
  } catch (error: any) {
    logger.error('Error processing tracking event:', error);
    throw error;
  }
};

/**
 * Handle batch events
 */
const handleBatchEvent = async (event: ShipEngineWebhookEvent) => {
  try {
    logger.info('Processing batch event', {
      eventType: event.event,
      timestamp: event.timestamp,
      data: event.data,
    });

    // Handle batch processing events
    // This could include batch label creation, batch rate calculations, etc.
    
  } catch (error: any) {
    logger.error('Error processing batch event:', error);
    throw error;
  }
};

/**
 * Handle carrier connected events
 */
const handleCarrierConnectedEvent = async (event: ShipEngineWebhookEvent) => {
  try {
    logger.info('Processing carrier connected event', {
      eventType: event.event,
      timestamp: event.timestamp,
      data: event.data,
    });

    // Handle carrier connection events
    // This could include updating carrier status, sending notifications, etc.
    
  } catch (error: any) {
    logger.error('Error processing carrier connected event:', error);
    throw error;
  }
};

/**
 * Handle order source refresh complete events
 */
const handleOrderSourceRefreshEvent = async (event: ShipEngineWebhookEvent) => {
  try {
    logger.info('Processing order source refresh complete event', {
      eventType: event.event,
      timestamp: event.timestamp,
      data: event.data,
    });

    // Handle order source refresh events
    // This could include updating order data, sending notifications, etc.
    
  } catch (error: any) {
    logger.error('Error processing order source refresh event:', error);
    throw error;
  }
};

/**
 * Handle rate events
 */
const handleRateEvent = async (event: ShipEngineWebhookEvent) => {
  try {
    logger.info('Processing rate event', {
      eventType: event.event,
      timestamp: event.timestamp,
      data: event.data,
    });

    // Handle rate calculation events
    // This could include logging rate calculations, updating caches, etc.
    
  } catch (error: any) {
    logger.error('Error processing rate event:', error);
    throw error;
  }
};

/**
 * Handle report complete events
 */
const handleReportCompleteEvent = async (event: ShipEngineWebhookEvent) => {
  try {
    logger.info('Processing report complete event', {
      eventType: event.event,
      timestamp: event.timestamp,
      data: event.data,
    });

    // Handle report completion events
    // This could include sending report notifications, updating status, etc.
    
  } catch (error: any) {
    logger.error('Error processing report complete event:', error);
    throw error;
  }
};

/**
 * Handle sales order imported events
 */
const handleSalesOrderImportedEvent = async (event: ShipEngineWebhookEvent) => {
  try {
    logger.info('Processing sales order imported event', {
      eventType: event.event,
      timestamp: event.timestamp,
      data: event.data,
    });

    // Handle sales order import events
    // This could include processing new orders, sending notifications, etc.
    
  } catch (error: any) {
    logger.error('Error processing sales order imported event:', error);
    throw error;
  }
};

// Placeholder for updating order with tracking data
const updateOrderWithTrackingData = async (orderId: number, trackingData: any) => {
  logger.info(`Updating order ${orderId} with tracking data:`, trackingData);
  // Implement actual database update logic here
  // Example: Update order_reviews table with tracking status, delivery date, etc.
  await sequelize.query(`
    UPDATE order_reviews
    SET
      tracking_status = ?,
      delivered_at = ?,
      updated_at = NOW()
    WHERE id = ?
  `, {
    replacements: [
      trackingData.status,
      trackingData.statusCode === 'DE' ? new Date() : null,
      orderId
    ]
  });
};