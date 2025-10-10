import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { logger } from '../utils/logger';

/**
 * ShipStation API Service
 * Handles all interactions with ShipStation API
 */
export class ShipStationService {
  private apiClient: AxiosInstance;
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.SHIPSTATION_API_KEY || '';
    this.apiSecret = process.env.SHIPSTATION_API_SECRET || '';
    this.baseUrl = process.env.SHIPSTATION_BASE_URL || 'https://ssapi.shipstation.com';
    
    if (!this.apiKey || !this.apiSecret) {
      logger.warn('⚠️ ShipStation API credentials not configured');
    }

    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      auth: {
        username: this.apiKey,
        password: this.apiSecret,
      },
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Add request/response interceptors for logging
    this.apiClient.interceptors.request.use(
      (config) => {
        logger.info(`🚢 ShipStation API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('🚢 ShipStation API Request Error:', error);
        return Promise.reject(error);
      }
    );

    this.apiClient.interceptors.response.use(
      (response) => {
        logger.info(`🚢 ShipStation API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        logger.error('🚢 ShipStation API Response Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Check if ShipStation is properly configured
   */
  public isConfigured(): boolean {
    return !!(this.apiKey && this.apiSecret);
  }

  /**
   * Test API connection
   */
  public async testConnection(): Promise<boolean> {
    try {
      const response = await this.apiClient.get('/carriers');
      return response.status === 200;
    } catch (error) {
      logger.error('🚢 ShipStation connection test failed:', error);
      return false;
    }
  }

  /**
   * Get available carriers
   */
  public async getCarriers(): Promise<any[]> {
    try {
      const response = await this.apiClient.get('/carriers');
      return response.data;
    } catch (error) {
      logger.error('🚢 Error fetching carriers:', error);
      throw error;
    }
  }

  /**
   * Get shipping rates for a shipment
   */
  public async getRates(request: {
    carrierCode: string;
    serviceCode?: string;
    packageCode?: string;
    fromPostalCode: string;
    toState: string;
    toCountry: string;
    toPostalCode: string;
    weight: {
      value: number;
      units: 'pounds' | 'ounces' | 'grams' | 'kilograms';
    };
    dimensions?: {
      length: number;
      width: number;
      height: number;
      units: 'inches' | 'centimeters';
    };
  }): Promise<any[]> {
    try {
      const response = await this.apiClient.post('/shipments/getrates', request);
      return response.data;
    } catch (error) {
      logger.error('🚢 Error getting shipping rates:', error);
      throw error;
    }
  }

  /**
   * Create a shipping label
   */
  public async createLabel(request: {
    carrierCode: string;
    serviceCode: string;
    packageCode: string;
    confirmation?: string;
    shipDate: string;
    weight: {
      value: number;
      units: 'pounds' | 'ounces' | 'grams' | 'kilograms';
    };
    dimensions?: {
      length: number;
      width: number;
      height: number;
      units: 'inches' | 'centimeters';
    };
    shipFrom: {
      name: string;
      company?: string;
      street1: string;
      street2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
      phone?: string;
      residential?: boolean;
    };
    shipTo: {
      name: string;
      company?: string;
      street1: string;
      street2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
      phone?: string;
      residential?: boolean;
    };
    testLabel?: boolean;
  }): Promise<any> {
    try {
      const response = await this.apiClient.post('/shipments/createlabel', request);
      return response.data;
    } catch (error) {
      logger.error('🚢 Error creating shipping label:', error);
      throw error;
    }
  }

  /**
   * Get shipment details by ID
   */
  public async getShipment(shipmentId: string): Promise<any> {
    try {
      const response = await this.apiClient.get(`/shipments/${shipmentId}`);
      return response.data;
    } catch (error) {
      logger.error('🚢 Error fetching shipment:', error);
      throw error;
    }
  }

  /**
   * Get tracking information
   */
  public async getTracking(trackingNumber: string): Promise<any> {
    try {
      const response = await this.apiClient.get(`/shipments/tracking/${trackingNumber}`);
      return response.data;
    } catch (error) {
      logger.error('🚢 Error fetching tracking info:', error);
      throw error;
    }
  }

  /**
   * Create an order in ShipStation
   */
  public async createOrder(orderData: {
    orderNumber: string;
    orderKey?: string;
    orderDate: string;
    paymentDate?: string;
    orderStatus: 'awaiting_payment' | 'awaiting_shipment' | 'shipped' | 'on_hold' | 'cancelled';
    billTo: {
      name: string;
      company?: string;
      street1: string;
      street2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
      phone?: string;
      residential?: boolean;
    };
    shipTo: {
      name: string;
      company?: string;
      street1: string;
      street2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
      phone?: string;
      residential?: boolean;
    };
    items: Array<{
      lineItemKey?: string;
      sku?: string;
      name: string;
      imageUrl?: string;
      weight?: {
        value: number;
        units: 'pounds' | 'ounces' | 'grams' | 'kilograms';
      };
      quantity: number;
      unitPrice: number;
      taxAmount?: number;
      shippingAmount?: number;
      productId?: number;
      fulfillmentSku?: string;
    }>;
    amountPaid?: number;
    taxAmount?: number;
    shippingAmount?: number;
    customerNotes?: string;
    internalNotes?: string;
    gift?: boolean;
    giftMessage?: string;
    paymentMethod?: string;
    requestedShippingService?: string;
    carrierCode?: string;
    serviceCode?: string;
    packageCode?: string;
    confirmation?: string;
    shipDate?: string;
    holdUntilDate?: string;
    weight?: {
      value: number;
      units: 'pounds' | 'ounces' | 'grams' | 'kilograms';
    };
    dimensions?: {
      length: number;
      width: number;
      height: number;
      units: 'inches' | 'centimeters';
    };
    insuranceOptions?: {
      provider?: string;
      insureShipment?: boolean;
      insuredValue?: number;
    };
    internationalOptions?: {
      contents?: string;
      customsItems?: Array<{
        description: string;
        quantity: number;
        value: number;
        harmonizedTariffCode?: string;
        countryOfOrigin?: string;
      }>;
      nonDelivery?: string;
    };
    advancedOptions?: {
      warehouseId?: number;
      nonMachinable?: boolean;
      saturdayDelivery?: boolean;
      containsAlcohol?: boolean;
      mergedOrSplit?: boolean;
      mergedIds?: number[];
      parentId?: number;
      storeId?: number;
      customField1?: string;
      customField2?: string;
      customField3?: string;
      source?: string;
      billToParty?: string;
      billToAccount?: string;
      billToPostalCode?: string;
      billToCountryCode?: string;
    };
    tagIds?: number[];
  }): Promise<any> {
    try {
      const response = await this.apiClient.post('/orders/createorder', orderData);
      return response.data;
    } catch (error) {
      logger.error('🚢 Error creating order:', error);
      throw error;
    }
  }

  /**
   * Get orders from ShipStation
   */
  public async getOrders(params?: {
    orderStatus?: string;
    customerId?: string;
    itemKeyword?: string;
    createDateStart?: string;
    createDateEnd?: string;
    modifyDateStart?: string;
    modifyDateEnd?: string;
    orderDateStart?: string;
    orderDateEnd?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortDir?: 'ASC' | 'DESC';
  }): Promise<{ orders: any[]; total: number; page: number; pages: number }> {
    try {
      const response = await this.apiClient.get('/orders', { params });
      return response.data;
    } catch (error) {
      logger.error('🚢 Error fetching orders:', error);
      throw error;
    }
  }

  /**
   * Update order status
   */
  public async updateOrderStatus(orderId: string, status: string): Promise<any> {
    try {
      const response = await this.apiClient.put(`/orders/${orderId}`, { orderStatus: status });
      return response.data;
    } catch (error) {
      logger.error('🚢 Error updating order status:', error);
      throw error;
    }
  }

  /**
   * Get warehouses
   */
  public async getWarehouses(): Promise<any[]> {
    try {
      const response = await this.apiClient.get('/warehouses');
      return response.data;
    } catch (error) {
      logger.error('🚢 Error fetching warehouses:', error);
      throw error;
    }
  }

  /**
   * Get stores (sales channels)
   */
  public async getStores(): Promise<any[]> {
    try {
      const response = await this.apiClient.get('/stores');
      return response.data;
    } catch (error) {
      logger.error('🚢 Error fetching stores:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const shipStationService = new ShipStationService();
