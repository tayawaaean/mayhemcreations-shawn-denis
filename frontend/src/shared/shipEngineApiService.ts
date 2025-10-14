/**
 * ShipEngine API Service
 * Frontend service for ShipEngine shipping rate calculations
 */

import { apiAuthService } from './apiAuthService';

// TypeScript interfaces
export interface ShippingAddress {
  firstName?: string;
  lastName?: string;
  name?: string;
  phone?: string;
  street?: string;
  street1?: string;
  apartment?: string;
  street2?: string;
  city: string;
  state: string;
  zipCode?: string;
  postalCode?: string;
  country?: string;
}

export interface CartItem {
  id: string | number;
  name: string;
  quantity: number;
  price: number;
  weight?: {
    value: number;
    unit: 'ounce' | 'pound' | 'gram' | 'kilogram';
  };
}

export interface ShippingRate {
  serviceName: string;
  serviceCode: string;
  carrier: string;
  carrierCode: string;
  shipmentCost: number;
  otherCost: number;
  totalCost: number;
  estimatedDeliveryDays?: number;
  estimatedDeliveryDate?: string;
  guaranteed?: boolean;
  trackable?: boolean;
}

export interface ShippingRatesResponse {
  success: boolean;
  data?: {
    rates: ShippingRate[];
    recommendedRate: ShippingRate;
    origin: {
      city: string;
      state: string;
      postalCode: string;
    };
    warning?: string;
  };
  message: string;
  timestamp: string;
}

export interface AddressValidationResponse {
  success: boolean;
  data?: {
    status: 'verified' | 'unverified' | 'warning' | 'error';
    original_address: any;
    matched_address: any;
    messages: string[];
  };
  message: string;
  timestamp: string;
}

export interface TrackingResponse {
  success: boolean;
  data?: {
    tracking_number: string;
    carrier_code: string;
    status_code: string;
    status_description: string;
    events: any[];
  };
  message: string;
  timestamp: string;
}

/**
 * ShipEngine API Service Class
 */
export class ShipEngineApiService {
  /**
   * Calculate shipping rates using ShipEngine
   * Compares rates from multiple carriers automatically
   */
  static async calculateRates(
    address: ShippingAddress,
    items: CartItem[]
  ): Promise<ShippingRatesResponse> {
    try {
      const response = await apiAuthService.post<ShippingRatesResponse>(
        '/shipping/shipengine/rates',
        { address, items },
        true
      );

      return response as ShippingRatesResponse;
    } catch (error: any) {
      console.error('Error calculating shipping rates:', error);
      throw error.response?.data || {
        success: false,
        message: 'Failed to calculate shipping rates',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Validate and normalize an address
   * Useful before calculating rates to ensure address is valid
   */
  static async validateAddress(
    address: ShippingAddress
  ): Promise<AddressValidationResponse> {
    try {
      const response = await apiAuthService.post<AddressValidationResponse>(
        '/shipping/shipengine/validate-address',
        { address },
        true
      );

      return response as AddressValidationResponse;
    } catch (error: any) {
      console.error('Error validating address:', error);
      throw error.response?.data || {
        success: false,
        message: 'Failed to validate address',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Track a shipment by carrier code and tracking number
   */
  static async trackShipment(
    carrierCode: string,
    trackingNumber: string
  ): Promise<TrackingResponse> {
    try {
      const response = await apiAuthService.get<TrackingResponse>(
        `/shipping/shipengine/track/${carrierCode}/${trackingNumber}`,
        true
      );

      return response as TrackingResponse;
    } catch (error: any) {
      console.error('Error tracking shipment:', error);
      throw error.response?.data || {
        success: false,
        message: 'Failed to track shipment',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get list of available carriers (Admin only)
   */
  static async getCarriers(): Promise<any> {
    try {
      const response = await apiAuthService.get<any>(
        '/shipping/shipengine/carriers',
        true
      );

      return response;
    } catch (error: any) {
      console.error('Error getting carriers:', error);
      throw error.response?.data || {
        success: false,
        message: 'Failed to get carriers',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get services for a specific carrier (Admin only)
   */
  static async getCarrierServices(carrierId: string): Promise<any> {
    try {
      const response = await apiAuthService.get<any>(
        `/shipping/shipengine/carriers/${carrierId}/services`,
        true
      );

      return response;
    } catch (error: any) {
      console.error('Error getting carrier services:', error);
      throw error.response?.data || {
        success: false,
        message: 'Failed to get carrier services',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Check ShipEngine configuration status (Admin only)
   */
  static async getStatus(): Promise<any> {
    try {
      const response = await apiAuthService.get<any>(
        '/shipping/shipengine/status',
        true
      );

      return response;
    } catch (error: any) {
      console.error('Error getting ShipEngine status:', error);
      throw error.response?.data || {
        success: false,
        message: 'Failed to get ShipEngine status',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Format shipping rate for display
   */
  static formatRate(rate: ShippingRate): string {
    return `$${rate.totalCost.toFixed(2)}`;
  }

  /**
   * Get delivery estimate text
   */
  static getDeliveryEstimate(rate: ShippingRate): string {
    if (rate.estimatedDeliveryDate) {
      const date = new Date(rate.estimatedDeliveryDate);
      return `Estimated delivery: ${date.toLocaleDateString()}`;
    }
    
    if (rate.estimatedDeliveryDays) {
      if (rate.estimatedDeliveryDays === 1) {
        return 'Estimated delivery: 1 business day';
      }
      return `Estimated delivery: ${rate.estimatedDeliveryDays} business days`;
    }
    
    return 'Delivery estimate not available';
  }

  /**
   * Get cheapest rate from a list of rates
   */
  static getCheapestRate(rates: ShippingRate[]): ShippingRate | null {
    if (!rates || rates.length === 0) return null;
    return rates.reduce((cheapest, current) =>
      current.totalCost < cheapest.totalCost ? current : cheapest
    );
  }

  /**
   * Get fastest rate from a list of rates
   */
  static getFastestRate(rates: ShippingRate[]): ShippingRate | null {
    if (!rates || rates.length === 0) return null;
    
    const ratesWithDays = rates.filter(r => r.estimatedDeliveryDays);
    if (ratesWithDays.length === 0) return null;
    
    return ratesWithDays.reduce((fastest, current) =>
      (current.estimatedDeliveryDays || Infinity) < (fastest.estimatedDeliveryDays || Infinity)
        ? current
        : fastest
    );
  }

  /**
   * Filter rates by carrier
   */
  static filterByCarrier(
    rates: ShippingRate[],
    carrierCode: string
  ): ShippingRate[] {
    return rates.filter(rate => rate.carrierCode === carrierCode);
  }

  /**
   * Get unique carriers from rates
   */
  static getUniqueCarriers(rates: ShippingRate[]): string[] {
    return [...new Set(rates.map(rate => rate.carrier))];
  }
}

export default ShipEngineApiService;

