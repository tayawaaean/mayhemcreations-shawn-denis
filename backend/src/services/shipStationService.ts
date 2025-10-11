/**
 * ShipStation Service
 * Handles shipping rate calculations and label creation via ShipStation API
 */

import axios from 'axios';
import { logger } from '../utils/logger';

// ShipStation API configuration
const SHIPSTATION_API_URL = 'https://ssapi.shipstation.com';
const SHIPSTATION_API_KEY = process.env.SHIPSTATION_API_KEY || '';
const SHIPSTATION_API_SECRET = process.env.SHIPSTATION_API_SECRET || '';

// Create base64 encoded auth token
const authToken = Buffer.from(`${SHIPSTATION_API_KEY}:${SHIPSTATION_API_SECRET}`).toString('base64');

export interface ShipStationAddress {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface ShipStationItem {
  sku?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  weight?: {
    value: number;
    units: 'ounces' | 'pounds' | 'grams';
  };
}

export interface ShippingRateRequest {
  carrierCode?: string; // e.g., 'stamps_com', 'ups', 'fedex', 'usps'
  fromPostalCode: string;
  toState: string;
  toCountry: string;
  toPostalCode: string;
  toCity: string;
  weight: {
    value: number;
    units: 'ounces' | 'pounds' | 'grams';
  };
  dimensions?: {
    length: number;
    width: number;
    height: number;
    units: 'inches' | 'centimeters';
  };
  confirmation?: 'none' | 'delivery' | 'signature' | 'adult_signature';
  residential?: boolean;
}

export interface ShippingRate {
  serviceName: string;
  serviceCode: string;
  shipmentCost: number;
  otherCost: number;
  totalCost: number;
  estimatedDeliveryDays?: number;
  carrier: string;
}

export interface ShippingRatesResponse {
  success: boolean;
  rates?: ShippingRate[];
  error?: string;
}

/**
 * Get shipping rates from ShipStation
 */
export const getShippingRates = async (request: ShippingRateRequest): Promise<ShippingRatesResponse> => {
  try {
    if (!SHIPSTATION_API_KEY || !SHIPSTATION_API_SECRET) {
      throw new Error('ShipStation API credentials not configured');
    }

    logger.info('Requesting shipping rates from ShipStation', {
      toPostalCode: request.toPostalCode,
      toCity: request.toCity,
      weight: request.weight,
    });

    const response = await axios.post(
      `${SHIPSTATION_API_URL}/shipments/getrates`,
      {
        carrierCode: request.carrierCode || 'stamps_com', // USPS by default
        fromPostalCode: request.fromPostalCode,
        toState: request.toState,
        toCountry: request.toCountry,
        toPostalCode: request.toPostalCode,
        toCity: request.toCity,
        weight: request.weight,
        dimensions: request.dimensions || {
          length: 12,
          width: 12,
          height: 6,
          units: 'inches',
        },
        confirmation: request.confirmation || 'none',
        residential: request.residential !== false, // Default to residential
      },
      {
        headers: {
          'Authorization': `Basic ${authToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.data || response.data.length === 0) {
      logger.warn('No shipping rates returned from ShipStation');
      return {
        success: false,
        error: 'No shipping rates available for this destination',
      };
    }

    // Transform ShipStation response to our format
    const rates: ShippingRate[] = response.data.map((rate: any) => ({
      serviceName: rate.serviceName,
      serviceCode: rate.serviceCode,
      shipmentCost: parseFloat(rate.shipmentCost),
      otherCost: parseFloat(rate.otherCost),
      totalCost: parseFloat(rate.shipmentCost) + parseFloat(rate.otherCost),
      estimatedDeliveryDays: rate.transitDays,
      carrier: rate.carrierCode || 'USPS',
    }));

    // Sort by cost (cheapest first)
    rates.sort((a, b) => a.totalCost - b.totalCost);

    logger.info('Shipping rates retrieved successfully', {
      ratesCount: rates.length,
      cheapestRate: rates[0]?.totalCost,
    });

    return {
      success: true,
      rates,
    };
  } catch (error: any) {
    logger.error('Error fetching shipping rates from ShipStation:', {
      error: error.message,
      response: error.response?.data,
    });

    // Return fallback rates if API fails
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to fetch shipping rates',
    };
  }
};

/**
 * Calculate total weight of cart items
 * Default weight per item if not specified
 */
export const calculateTotalWeight = (items: any[]): { value: number; units: 'ounces' } => {
  const DEFAULT_ITEM_WEIGHT_OZ = 8; // 8 oz per item default
  
  let totalOunces = 0;
  
  items.forEach((item) => {
    const itemWeight = item.weight?.value || DEFAULT_ITEM_WEIGHT_OZ;
    const quantity = item.quantity || 1;
    
    // Convert to ounces if needed
    if (item.weight?.units === 'pounds') {
      totalOunces += itemWeight * 16 * quantity;
    } else if (item.weight?.units === 'grams') {
      totalOunces += (itemWeight / 28.35) * quantity;
    } else {
      totalOunces += itemWeight * quantity;
    }
  });

  return {
    value: Math.max(totalOunces, 1), // Minimum 1 oz
    units: 'ounces',
  };
};

/**
 * Get fallback shipping rates (used when API is unavailable)
 */
export const getFallbackRates = (destinationState: string): ShippingRate[] => {
  // Basic flat rate options
  return [
    {
      serviceName: 'Standard Shipping',
      serviceCode: 'usps_priority_mail',
      shipmentCost: 9.99,
      otherCost: 0,
      totalCost: 9.99,
      estimatedDeliveryDays: 3,
      carrier: 'USPS',
    },
    {
      serviceName: 'Express Shipping',
      serviceCode: 'usps_priority_mail_express',
      shipmentCost: 24.99,
      otherCost: 0,
      totalCost: 24.99,
      estimatedDeliveryDays: 2,
      carrier: 'USPS',
    },
  ];
};

/**
 * ShipStation Service Class
 * Object-oriented wrapper for ShipStation API operations
 */
class ShipStationService {
  /**
   * Check if ShipStation is configured
   */
  isConfigured(): boolean {
    return !!(SHIPSTATION_API_KEY && SHIPSTATION_API_SECRET);
  }

  /**
   * Test ShipStation connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await axios.get(`${SHIPSTATION_API_URL}/accounts/listtags`, {
        headers: {
          Authorization: `Basic ${authToken}`,
        },
      });
      return response.status === 200;
    } catch (error) {
      logger.error('ShipStation connection test failed:', error);
      return false;
    }
  }

  /**
   * Get available carriers
   */
  async getCarriers(): Promise<any[]> {
    try {
      const response = await axios.get(`${SHIPSTATION_API_URL}/carriers`, {
        headers: {
          Authorization: `Basic ${authToken}`,
        },
      });
      return response.data;
    } catch (error: any) {
      logger.error('Error fetching carriers:', error);
      throw new Error(`Failed to fetch carriers: ${error.message}`);
    }
  }

  /**
   * Get shipping rates
   */
  async getRates(rateRequest: any): Promise<any> {
    try {
      const response = await axios.post(
        `${SHIPSTATION_API_URL}/shipments/getrates`,
        rateRequest,
        {
          headers: {
            Authorization: `Basic ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error: any) {
      logger.error('Error getting rates:', error);
      throw new Error(`Failed to get rates: ${error.message}`);
    }
  }

  /**
   * Create shipping label
   */
  async createLabel(labelData: any): Promise<any> {
    try {
      const response = await axios.post(
        `${SHIPSTATION_API_URL}/orders/createlabelfororder`,
        labelData,
        {
          headers: {
            Authorization: `Basic ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error: any) {
      logger.error('Error creating label:', error);
      throw new Error(`Failed to create label: ${error.message}`);
    }
  }

  /**
   * Get shipment details
   */
  async getShipment(shipmentId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${SHIPSTATION_API_URL}/shipments/${shipmentId}`,
        {
          headers: {
            Authorization: `Basic ${authToken}`,
          },
        }
      );
      return response.data;
    } catch (error: any) {
      logger.error('Error fetching shipment:', error);
      throw new Error(`Failed to fetch shipment: ${error.message}`);
    }
  }

  /**
   * Get tracking information
   */
  async getTracking(trackingNumber: string): Promise<any> {
    try {
      const response = await axios.get(
        `${SHIPSTATION_API_URL}/shipments?trackingNumber=${trackingNumber}`,
        {
          headers: {
            Authorization: `Basic ${authToken}`,
          },
        }
      );
      return response.data;
    } catch (error: any) {
      logger.error('Error fetching tracking:', error);
      throw new Error(`Failed to fetch tracking: ${error.message}`);
    }
  }

  /**
   * Create order in ShipStation
   */
  async createOrder(orderData: any): Promise<any> {
    try {
      const response = await axios.post(
        `${SHIPSTATION_API_URL}/orders/createorder`,
        orderData,
        {
          headers: {
            Authorization: `Basic ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error: any) {
      logger.error('Error creating order:', error);
      throw new Error(`Failed to create order: ${error.message}`);
    }
  }

  /**
   * Get orders from ShipStation
   */
  async getOrders(queryParams: any): Promise<any> {
    try {
      const params = new URLSearchParams(queryParams).toString();
      const response = await axios.get(
        `${SHIPSTATION_API_URL}/orders?${params}`,
        {
          headers: {
            Authorization: `Basic ${authToken}`,
          },
        }
      );
      return response.data;
    } catch (error: any) {
      logger.error('Error fetching orders:', error);
      throw new Error(`Failed to fetch orders: ${error.message}`);
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, status: string): Promise<any> {
    try {
      const response = await axios.post(
        `${SHIPSTATION_API_URL}/orders/holduntil`,
        {
          orderId,
          holdUntilDate: status,
        },
        {
          headers: {
            Authorization: `Basic ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error: any) {
      logger.error('Error updating order status:', error);
      throw new Error(`Failed to update order status: ${error.message}`);
    }
  }

  /**
   * Get warehouses
   */
  async getWarehouses(): Promise<any[]> {
    try {
      const response = await axios.get(`${SHIPSTATION_API_URL}/warehouses`, {
        headers: {
          Authorization: `Basic ${authToken}`,
        },
      });
      return response.data;
    } catch (error: any) {
      logger.error('Error fetching warehouses:', error);
      throw new Error(`Failed to fetch warehouses: ${error.message}`);
    }
  }

  /**
   * Get stores (sales channels)
   */
  async getStores(): Promise<any[]> {
    try {
      const response = await axios.get(`${SHIPSTATION_API_URL}/stores`, {
        headers: {
          Authorization: `Basic ${authToken}`,
        },
      });
      return response.data;
    } catch (error: any) {
      logger.error('Error fetching stores:', error);
      throw new Error(`Failed to fetch stores: ${error.message}`);
    }
  }
}

// Export singleton instance for use in controllers
export const shipStationService = new ShipStationService();


