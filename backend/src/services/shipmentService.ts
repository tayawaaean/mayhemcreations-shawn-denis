/**
 * Shipment Service
 * Handles shipping label creation, tracking, and shipment management
 * Integrates with ShipEngine API for automated shipping workflow
 */

import axios from 'axios';
import { logger } from '../utils/logger';
import { OrderReview } from '../models/orderReviewModel';
import { sequelize } from '../config/database';

// ShipEngine API configuration
const SHIPENGINE_API_URL = 'https://api.shipengine.com/v1';
const SHIPENGINE_API_KEY = process.env.SHIPSTATION_API_KEY || '';

// Origin address (Newark, OH)
const ORIGIN_ADDRESS = {
  name: 'Mayhem Creations',
  phone: process.env.ORIGIN_PHONE || '',
  company_name: 'Mayhem Creations',
  address_line1: '128 Persimmon Dr',
  city_locality: 'Newark',
  state_province: 'OH',
  postal_code: '43055',
  country_code: 'US',
  address_residential_indicator: 'no' as const
};

export interface CreateLabelRequest {
  orderId: number;
  serviceCode?: string; // e.g., 'usps_priority_mail'
  carrierCode?: string; // e.g., 'stamps_com'
  testLabel?: boolean; // Create test label without actual shipping charge
}

export interface ShipmentLabel {
  labelId: string;
  status: string;
  shipmentId: string;
  trackingNumber: string;
  trackingUrl: string;
  carrierCode: string;
  serviceCode: string;
  packageCode: string;
  labelDownload: {
    pdf: string;
    png?: string;
    zpl?: string;
  };
  shipDate: string;
  shipmentCost: number;
  insuranceCost: number;
}

/**
 * Create shipping label for an order
 * Automatically uses the shipping method selected during checkout
 */
export const createShippingLabel = async (
  request: CreateLabelRequest
): Promise<{ success: boolean; label?: ShipmentLabel; error?: string }> => {
  try {
    // Fetch order with shipping details
    const order = await OrderReview.findByPk(request.orderId);
    
    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    // Check if order has shipping address
    if (!order.shippingAddress) {
      return { success: false, error: 'Order does not have a shipping address' };
    }

    // Parse shipping address
    const shippingAddress = typeof order.shippingAddress === 'string'
      ? JSON.parse(order.shippingAddress)
      : order.shippingAddress;

    // Parse order data to get items for weight calculation
    const orderData = typeof order.orderData === 'string'
      ? JSON.parse(order.orderData)
      : order.orderData;

    // Calculate total weight
    const totalWeight = calculateOrderWeight(orderData);

    // Get shipping method from order (saved during checkout)
    // Format: { serviceCode: 'usps_priority_mail', carrierCode: 'stamps_com', cost: 9.99 }
    const shippingMethod = order.shippingMethod 
      ? (typeof order.shippingMethod === 'string' ? JSON.parse(order.shippingMethod) : order.shippingMethod)
      : null;

    // Use order's shipping method or provided override
    const serviceCode = request.serviceCode || shippingMethod?.serviceCode || 'usps_priority_mail';
    const carrierCode = request.carrierCode || shippingMethod?.carrierCode || 'stamps_com';

    logger.info('Creating shipping label', {
      orderId: request.orderId,
      serviceCode,
      carrierCode,
      weight: totalWeight,
      testLabel: request.testLabel
    });

    // Prepare ShipEngine label request
    const labelRequest = {
      shipment: {
        service_code: serviceCode,
        ship_to: {
          name: shippingAddress.firstName && shippingAddress.lastName
            ? `${shippingAddress.firstName} ${shippingAddress.lastName}`
            : shippingAddress.name || 'Customer',
          phone: shippingAddress.phone || '',
          address_line1: shippingAddress.street || shippingAddress.street1 || '',
          address_line2: shippingAddress.apartment || shippingAddress.street2 || '',
          city_locality: shippingAddress.city,
          state_province: shippingAddress.state,
          postal_code: shippingAddress.zipCode || shippingAddress.postalCode,
          country_code: shippingAddress.country || 'US',
          address_residential_indicator: 'yes' as const
        },
        ship_from: ORIGIN_ADDRESS,
        packages: [
          {
            weight: {
              value: totalWeight.value,
              unit: totalWeight.unit
            },
            dimensions: {
              length: 12,
              width: 12,
              height: 6,
              unit: 'inch' as const
            }
          }
        ]
      },
      test_label: request.testLabel || false,
      label_format: 'pdf',
      label_layout: '4x6'
    };

    // Create label via ShipEngine API
    const response = await axios.post(
      `${SHIPENGINE_API_URL}/labels`,
      labelRequest,
      {
        headers: {
          'API-Key': SHIPENGINE_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    const labelData = response.data;

    // Extract label information
    const label: ShipmentLabel = {
      labelId: labelData.label_id,
      status: labelData.status,
      shipmentId: labelData.shipment_id,
      trackingNumber: labelData.tracking_number,
      trackingUrl: labelData.tracking_url || '',
      carrierCode: labelData.carrier_code,
      serviceCode: labelData.service_code,
      packageCode: labelData.package_code || '',
      labelDownload: {
        pdf: labelData.label_download?.pdf || '',
        png: labelData.label_download?.png,
        zpl: labelData.label_download?.zpl
      },
      shipDate: labelData.ship_date,
      shipmentCost: labelData.shipment_cost?.amount || 0,
      insuranceCost: labelData.insurance_cost?.amount || 0
    };

    // Update order with shipping label information
    await sequelize.query(
      `UPDATE order_reviews 
       SET tracking_number = ?, 
           tracking_url = ?,
           label_url = ?,
           shipped_at = NOW(),
           status = 'shipped',
           updated_at = NOW()
       WHERE id = ?`,
      {
        replacements: [
          label.trackingNumber,
          label.trackingUrl,
          label.labelDownload.pdf,
          request.orderId
        ]
      }
    );

    logger.info('Shipping label created successfully', {
      orderId: request.orderId,
      labelId: label.labelId,
      trackingNumber: label.trackingNumber,
      cost: label.shipmentCost
    });

    return { success: true, label };
  } catch (error: any) {
    logger.error('Error creating shipping label:', {
      error: error.message,
      response: error.response?.data,
      orderId: request.orderId
    });

    return {
      success: false,
      error: error.response?.data?.errors?.[0]?.message || error.message || 'Failed to create shipping label'
    };
  }
};

/**
 * Get tracking information for a shipment
 */
export const getTrackingInfo = async (
  carrierCode: string,
  trackingNumber: string
): Promise<{ success: boolean; tracking?: any; error?: string }> => {
  try {
    const response = await axios.get(
      `${SHIPENGINE_API_URL}/tracking`,
      {
        params: {
          carrier_code: carrierCode,
          tracking_number: trackingNumber
        },
        headers: {
          'API-Key': SHIPENGINE_API_KEY
        }
      }
    );

    return { success: true, tracking: response.data };
  } catch (error: any) {
    logger.error('Error getting tracking info:', {
      error: error.message,
      carrierCode,
      trackingNumber
    });

    return {
      success: false,
      error: error.response?.data?.errors?.[0]?.message || 'Failed to get tracking information'
    };
  }
};

/**
 * Void a shipping label (if not yet shipped)
 */
export const voidLabel = async (
  labelId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    await axios.put(
      `${SHIPENGINE_API_URL}/labels/${labelId}/void`,
      {},
      {
        headers: {
          'API-Key': SHIPENGINE_API_KEY
        }
      }
    );

    logger.info('Label voided successfully', { labelId });
    return { success: true };
  } catch (error: any) {
    logger.error('Error voiding label:', {
      error: error.message,
      labelId
    });

    return {
      success: false,
      error: error.response?.data?.errors?.[0]?.message || 'Failed to void label'
    };
  }
};

/**
 * Calculate total weight of order items
 */
function calculateOrderWeight(orderData: any): { value: number; unit: 'ounce' } {
  const DEFAULT_ITEM_WEIGHT_OZ = 8;
  let totalOunces = 0;

  const items = Array.isArray(orderData) ? orderData : [];

  items.forEach((item: any) => {
    const itemWeight = item.weight?.value || DEFAULT_ITEM_WEIGHT_OZ;
    const quantity = item.quantity || 1;

    // Convert to ounces
    if (item.weight?.unit === 'pound') {
      totalOunces += itemWeight * 16 * quantity;
    } else if (item.weight?.unit === 'gram') {
      totalOunces += (itemWeight / 28.35) * quantity;
    } else if (item.weight?.unit === 'kilogram') {
      totalOunces += (itemWeight * 35.274) * quantity;
    } else {
      totalOunces += itemWeight * quantity;
    }
  });

  return {
    value: Math.max(totalOunces, 1), // Minimum 1 oz
    unit: 'ounce'
  };
}

/**
 * Batch create labels for multiple orders
 */
export const batchCreateLabels = async (
  orderIds: number[],
  options?: { serviceCode?: string; testLabel?: boolean }
): Promise<{
  success: boolean;
  results: Array<{ orderId: number; success: boolean; label?: ShipmentLabel; error?: string }>;
}> => {
  const results: Array<{ orderId: number; success: boolean; label?: ShipmentLabel; error?: string }> = [];

  for (const orderId of orderIds) {
    const result = await createShippingLabel({
      orderId,
      serviceCode: options?.serviceCode,
      testLabel: options?.testLabel
    });

    results.push({
      orderId,
      ...result
    });

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const successCount = results.filter(r => r.success).length;

  logger.info('Batch label creation complete', {
    total: orderIds.length,
    successful: successCount,
    failed: orderIds.length - successCount
  });

  return {
    success: successCount > 0,
    results
  };
};

export default {
  createShippingLabel,
  getTrackingInfo,
  voidLabel,
  batchCreateLabels
};

