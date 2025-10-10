import { apiClient } from './axiosConfig';

export interface ShipStationCarrier {
  code: string;
  name: string;
  accountNumber?: string;
  requiresFundedAmount?: boolean;
  balance?: number;
  nickname?: string;
  shippingProviderId?: number;
  primaryService?: string;
  hasReturnServices?: boolean;
  packages?: string[];
  services?: ShipStationService[];
}

export interface ShipStationService {
  code: string;
  name: string;
  domestic?: boolean;
  international?: boolean;
}

export interface ShipStationRate {
  serviceCode: string;
  serviceName: string;
  shipmentCost: number;
  otherCost: number;
  totalCost: number;
  currency: string;
  retailRate?: number;
  retailCurrency?: string;
  deliveryDays?: number;
  estimatedDeliveryDate?: string;
  carrierCode: string;
  carrierName: string;
  packageType: string;
  guaranteedService?: boolean;
  trackingNumber?: string;
}

export interface ShipStationLabel {
  shipmentId: number;
  shipmentCost: number;
  insuranceCost: number;
  trackingNumber: string;
  labelData: string;
  formData?: string;
  labelUrl?: string;
  formUrl?: string;
}

export interface ShipStationShipment {
  shipmentId: number;
  orderId: number;
  orderKey?: string;
  userId?: number;
  customerEmail?: string;
  orderNumber?: string;
  createDate?: string;
  shipDate?: string;
  shipmentCost?: number;
  insuranceCost?: number;
  trackingNumber?: string;
  isReturnLabel?: boolean;
  batchNumber?: string;
  carrierCode?: string;
  serviceCode?: string;
  packageCode?: string;
  confirmation?: string;
  warehouseId?: number;
  voided?: boolean;
  voidDate?: string;
  marketplaceNotified?: boolean;
  notifyErrorMessage?: string;
  shipTo?: ShipStationAddress;
  weight?: ShipStationWeight;
  dimensions?: ShipStationDimensions;
  insuranceOptions?: ShipStationInsuranceOptions;
  advancedOptions?: ShipStationAdvancedOptions;
  shipmentItems?: ShipStationShipmentItem[];
}

export interface ShipStationAddress {
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
}

export interface ShipStationWeight {
  value: number;
  units: 'pounds' | 'ounces' | 'grams' | 'kilograms';
}

export interface ShipStationDimensions {
  length: number;
  width: number;
  height: number;
  units: 'inches' | 'centimeters';
}

export interface ShipStationInsuranceOptions {
  provider?: string;
  insureShipment?: boolean;
  insuredValue?: number;
}

export interface ShipStationAdvancedOptions {
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
}

export interface ShipStationShipmentItem {
  orderItemId?: number;
  lineItemKey?: string;
  sku?: string;
  name: string;
  imageUrl?: string;
  weight?: ShipStationWeight;
  quantity: number;
  unitPrice: number;
  taxAmount?: number;
  shippingAmount?: number;
  productId?: number;
  fulfillmentSku?: string;
}

export interface ShipStationTracking {
  trackingNumber: string;
  statusCode?: string;
  statusDescription?: string;
  carrierCode?: string;
  carrierDescription?: string;
  shipDate?: string;
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  exceptionDescription?: string;
  events?: ShipStationTrackingEvent[];
}

export interface ShipStationTrackingEvent {
  eventDate: string;
  eventTime?: string;
  eventTimeOffset?: string;
  eventCity?: string;
  eventStateOrProvince?: string;
  eventPostalCode?: string;
  eventCountryCode?: string;
  eventDescription: string;
  eventType?: string;
}

export interface ShipStationOrder {
  orderId?: number;
  orderNumber: string;
  orderKey?: string;
  orderDate: string;
  paymentDate?: string;
  orderStatus: 'awaiting_payment' | 'awaiting_shipment' | 'shipped' | 'on_hold' | 'cancelled';
  customerId?: number;
  customerUsername?: string;
  customerEmail?: string;
  billTo?: ShipStationAddress;
  shipTo?: ShipStationAddress;
  items?: ShipStationOrderItem[];
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
  weight?: ShipStationWeight;
  dimensions?: ShipStationDimensions;
  insuranceOptions?: ShipStationInsuranceOptions;
  internationalOptions?: ShipStationInternationalOptions;
  advancedOptions?: ShipStationAdvancedOptions;
  tagIds?: number[];
  userId?: number;
  externallyFulfilled?: boolean;
  externallyFulfilledBy?: string;
  labelMessages?: string[];
  shipmentCost?: number;
  shipmentCostOverride?: number;
  shippingCostOverride?: number;
  orderTotal?: number;
  externallyFulfilledBy?: string;
  externallyFulfilledBy?: string;
}

export interface ShipStationOrderItem {
  orderItemId?: number;
  lineItemKey?: string;
  sku?: string;
  name: string;
  imageUrl?: string;
  weight?: ShipStationWeight;
  quantity: number;
  unitPrice: number;
  taxAmount?: number;
  shippingAmount?: number;
  productId?: number;
  fulfillmentSku?: string;
  adjustment?: boolean;
  upc?: string;
  createDate?: string;
  modifyDate?: string;
}

export interface ShipStationInternationalOptions {
  contents?: string;
  customsItems?: ShipStationCustomsItem[];
  nonDelivery?: string;
}

export interface ShipStationCustomsItem {
  description: string;
  quantity: number;
  value: number;
  harmonizedTariffCode?: string;
  countryOfOrigin?: string;
}

export interface ShipStationWarehouse {
  warehouseId: number;
  warehouseName: string;
  originAddress?: ShipStationAddress;
  returnAddress?: ShipStationAddress;
  isDefault?: boolean;
}

export interface ShipStationStore {
  storeId: number;
  storeName: string;
  marketplaceId?: number;
  marketplaceName?: string;
  accountName?: string;
  email?: string;
  integrationUrl?: string;
  active?: boolean;
  companyName?: string;
  phone?: string;
  publicEmail?: string;
  website?: string;
  refreshDate?: string;
  lastRefreshAttempt?: string;
  createDate?: string;
  modifyDate?: string;
  autoRefresh?: boolean;
  statusMappings?: ShipStationStatusMapping[];
}

export interface ShipStationStatusMapping {
  orderStatus: string;
  flag?: string;
}

export interface ShipStationApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  timestamp: string;
}

/**
 * ShipStation API Service for Frontend
 */
export class ShipStationApiService {
  private baseUrl = '/api/v1/shipstation';

  /**
   * Test ShipStation connection
   */
  async testConnection(): Promise<ShipStationApiResponse<{ connected: boolean }>> {
    const response = await apiClient.get(`${this.baseUrl}/test-connection`);
    return response.data;
  }

  /**
   * Get available carriers
   */
  async getCarriers(): Promise<ShipStationApiResponse<ShipStationCarrier[]>> {
    const response = await apiClient.get(`${this.baseUrl}/carriers`);
    return response.data;
  }

  /**
   * Get shipping rates
   */
  async getRates(request: {
    carrierCode: string;
    serviceCode?: string;
    packageCode?: string;
    fromPostalCode: string;
    toState: string;
    toCountry: string;
    toPostalCode: string;
    weight: ShipStationWeight;
    dimensions?: ShipStationDimensions;
  }): Promise<ShipStationApiResponse<ShipStationRate[]>> {
    const response = await apiClient.post(`${this.baseUrl}/rates`, request);
    return response.data;
  }

  /**
   * Create shipping label
   */
  async createLabel(request: {
    carrierCode: string;
    serviceCode: string;
    packageCode: string;
    confirmation?: string;
    shipDate: string;
    weight: ShipStationWeight;
    dimensions?: ShipStationDimensions;
    shipFrom: ShipStationAddress;
    shipTo: ShipStationAddress;
    testLabel?: boolean;
  }): Promise<ShipStationApiResponse<ShipStationLabel>> {
    const response = await apiClient.post(`${this.baseUrl}/labels`, request);
    return response.data;
  }

  /**
   * Get shipment details
   */
  async getShipment(shipmentId: string): Promise<ShipStationApiResponse<ShipStationShipment>> {
    const response = await apiClient.get(`${this.baseUrl}/shipments/${shipmentId}`);
    return response.data;
  }

  /**
   * Get tracking information
   */
  async getTracking(trackingNumber: string): Promise<ShipStationApiResponse<ShipStationTracking>> {
    const response = await apiClient.get(`${this.baseUrl}/tracking/${trackingNumber}`);
    return response.data;
  }

  /**
   * Create order in ShipStation
   */
  async createOrder(orderData: ShipStationOrder): Promise<ShipStationApiResponse<ShipStationOrder>> {
    const response = await apiClient.post(`${this.baseUrl}/orders`, orderData);
    return response.data;
  }

  /**
   * Get orders from ShipStation
   */
  async getOrders(params?: {
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
  }): Promise<ShipStationApiResponse<{ orders: ShipStationOrder[]; total: number; page: number; pages: number }>> {
    const response = await apiClient.get(`${this.baseUrl}/orders`, { params });
    return response.data;
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, status: string): Promise<ShipStationApiResponse<ShipStationOrder>> {
    const response = await apiClient.put(`${this.baseUrl}/orders/${orderId}/status`, { status });
    return response.data;
  }

  /**
   * Get warehouses
   */
  async getWarehouses(): Promise<ShipStationApiResponse<ShipStationWarehouse[]>> {
    const response = await apiClient.get(`${this.baseUrl}/warehouses`);
    return response.data;
  }

  /**
   * Get stores (sales channels)
   */
  async getStores(): Promise<ShipStationApiResponse<ShipStationStore[]>> {
    const response = await apiClient.get(`${this.baseUrl}/stores`);
    return response.data;
  }
}

// Export singleton instance
export const shipStationApiService = new ShipStationApiService();
