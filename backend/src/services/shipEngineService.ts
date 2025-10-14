/**
 * ShipEngine Service
 * Handles shipping rate calculations using ShipEngine API
 * Documentation: https://www.shipengine.com/docs/rates/
 */

import axios from 'axios';
import { logger } from '../utils/logger';

// ShipEngine API configuration
const SHIPENGINE_API_URL = 'https://api.shipengine.com/v1';
const SHIPENGINE_API_KEY = process.env.SHIPSTATION_API_KEY || ''; // ShipEngine uses same key as ShipStation

// ShipEngine interfaces
export interface ShipEngineAddress {
  name?: string;
  phone?: string;
  company_name?: string;
  address_line1: string;
  address_line2?: string;
  address_line3?: string;
  city_locality: string;
  state_province: string;
  postal_code: string;
  country_code: string;
  address_residential_indicator?: 'yes' | 'no' | 'unknown';
}

// Origin address configuration (Newark, OH warehouse)
const ORIGIN_ADDRESS: ShipEngineAddress = {
  name: 'Mayhem Creations',
  phone: process.env.ORIGIN_PHONE || '614-715-4742', // Business phone number
  company_name: 'Mayhem Creations',
  address_line1: '128 Persimmon Dr',
  city_locality: 'Newark',
  state_province: 'OH',
  postal_code: '43055',
  country_code: 'US',
  address_residential_indicator: 'no' as const // Commercial address
};

export interface ShipEnginePackage {
  package_code?: string; // e.g., "package", "flat_rate_envelope", etc.
  weight: {
    value: number;
    unit: 'pound' | 'ounce' | 'gram' | 'kilogram';
  };
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'inch' | 'centimeter';
  };
}

export interface ShipEngineRateRequest {
  shipment: {
    validate_address?: 'no_validation' | 'validate_only' | 'validate_and_clean';
    carrier_ids?: string[];
    service_codes?: string[];
    ship_to: ShipEngineAddress;
    ship_from?: ShipEngineAddress;
    packages: ShipEnginePackage[];
    confirmation?: 'none' | 'delivery' | 'signature' | 'adult_signature' | 'direct_signature';
    advanced_options?: {
      bill_to_account?: string;
      bill_to_country_code?: string;
      bill_to_party?: string;
      bill_to_postal_code?: string;
      contains_alcohol?: boolean;
      delivered_duty_paid?: boolean;
      non_machinable?: boolean;
      saturday_delivery?: boolean;
      dry_ice?: boolean;
      dry_ice_weight?: {
        value: number;
        unit: string;
      };
    };
  };
  rate_options?: {
    carrier_ids?: string[];
    service_codes?: string[];
    package_types?: string[];
    calculate_tax_amount?: boolean;
    preferred_currency?: string;
  };
}

export interface ShipEngineRate {
  rate_id: string;
  rate_type: string;
  carrier_id: string;
  carrier_code: string;
  carrier_nickname: string;
  carrier_friendly_name: string;
  service_type: string;
  service_code: string;
  shipping_amount: {
    currency: string;
    amount: number;
  };
  insurance_amount: {
    currency: string;
    amount: number;
  };
  confirmation_amount: {
    currency: string;
    amount: number;
  };
  other_amount: {
    currency: string;
    amount: number;
  };
  tax_amount?: {
    currency: string;
    amount: number;
  };
  zone?: number;
  package_type?: string;
  delivery_days?: number;
  guaranteed_service?: boolean;
  estimated_delivery_date?: string;
  carrier_delivery_days?: string;
  ship_date?: string;
  negotiated_rate?: boolean;
  trackable?: boolean;
  validation_status?: string;
  warning_messages?: string[];
  error_messages?: string[];
}

export interface ShipEngineRatesResponse {
  rate_response: {
    rates: ShipEngineRate[];
    invalid_rates: any[];
    rate_request_id: string;
    shipment_id?: string;
    created_at: string;
    status: string;
    errors: any[];
  };
}

// Simplified rate format for frontend
export interface SimplifiedRate {
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

export interface RatesResult {
  success: boolean;
  rates?: SimplifiedRate[];
  error?: string;
  warning?: string;
}

/**
 * Get shipping rates from ShipEngine
 * Uses rate shopping to get quotes from multiple carriers
 */
export const getShipEngineRates = async (
  destinationAddress: ShipEngineAddress,
  packages: ShipEnginePackage[],
  options?: {
    carrierIds?: string[];
    serviceCodes?: string[];
    confirmation?: 'none' | 'delivery' | 'signature' | 'adult_signature';
  }
): Promise<RatesResult> => {
  try {
    if (!SHIPENGINE_API_KEY) {
      throw new Error('ShipEngine API key not configured');
    }

    logger.info('Requesting shipping rates from ShipEngine', {
      destination: `${destinationAddress.city_locality}, ${destinationAddress.state_province} ${destinationAddress.postal_code}`,
      packageCount: packages.length,
      totalWeight: packages.reduce((sum, pkg) => sum + pkg.weight.value, 0),
    });

    // Get carrier IDs if not provided
    let carrierIds: string[] = options?.carrierIds || [];
    
    // Check for hardcoded test carrier ID in environment
    const testCarrierId = process.env.SHIPENGINE_TEST_CARRIER_ID || 'se-3697717';
    
    if (carrierIds.length === 0) {
      try {
        console.log('\n>>> Fetching carriers from ShipEngine...');
        const carriersResponse = await axios.get(`${SHIPENGINE_API_URL}/carriers`, {
          headers: {
            'API-Key': SHIPENGINE_API_KEY,
          },
        });
        
        const carriers = carriersResponse.data.carriers || [];
        carrierIds = carriers.map((carrier: any) => carrier.carrier_id).filter((id: string) => id);
        
        console.log('>>> Carriers Retrieved:');
        console.log(JSON.stringify(carriers.map((c: any) => ({
          carrier_id: c.carrier_id,
          friendly_name: c.friendly_name,
          carrier_code: c.carrier_code,
          primary: c.primary,
        })), null, 2));
        console.log('>>> Extracted Carrier IDs:', carrierIds);
        console.log('');
        
        logger.info('Retrieved carrier IDs from ShipEngine', {
          carrierCount: carrierIds.length,
          carriers: carriers.map((c: any) => c.friendly_name || c.carrier_code),
        });
        
        // If no carriers found via API, try using the test carrier ID
        if (carrierIds.length === 0) {
          console.log(`>>> No carriers in response, using test carrier: ${testCarrierId}\n`);
          logger.warn(`No carriers returned from API, using test carrier ID: ${testCarrierId}`);
          carrierIds = [testCarrierId];
        }
      } catch (carrierError: any) {
        console.log('>>> ERROR fetching carriers:');
        console.log(JSON.stringify(carrierError.response?.data, null, 2));
        console.log(`>>> Using test carrier ID: ${testCarrierId}\n`);
        
        logger.error('Failed to fetch carriers:', carrierError.response?.data || carrierError.message);
        logger.warn(`Falling back to test carrier ID: ${testCarrierId}`);
        carrierIds = [testCarrierId];
      }
    }

    // Prepare rate request
    const rateRequest: ShipEngineRateRequest = {
      shipment: {
        validate_address: 'validate_and_clean',
        ship_from: ORIGIN_ADDRESS,
        ship_to: destinationAddress,
        packages: packages,
        confirmation: options?.confirmation || 'none',
      },
      rate_options: {
        carrier_ids: carrierIds,
        service_codes: options?.serviceCodes,
        calculate_tax_amount: false,
      },
    };

    // Log the FULL request for debugging
    console.log('\n========== SHIPENGINE API REQUEST ==========');
    console.log('URL:', `${SHIPENGINE_API_URL}/rates`);
    console.log('API Key:', SHIPENGINE_API_KEY ? `${SHIPENGINE_API_KEY.substring(0, 12)}...` : 'NOT SET');
    console.log('Request Body (RAW JSON):');
    console.log(JSON.stringify(rateRequest, null, 2));
    console.log('============================================\n');
    
    logger.info('ShipEngine API Request:', {
      url: `${SHIPENGINE_API_URL}/rates`,
      hasApiKey: !!SHIPENGINE_API_KEY,
      apiKeyPrefix: SHIPENGINE_API_KEY?.substring(0, 12) + '...',
      carrierIds: rateRequest.rate_options?.carrier_ids,
      packages: rateRequest.shipment.packages.map(p => ({
        package_code: p.package_code,
        weight: p.weight,
        dimensions: p.dimensions
      })),
    });

    // Make API request to ShipEngine
    const response = await axios.post<ShipEngineRatesResponse>(
      `${SHIPENGINE_API_URL}/rates`,
      rateRequest,
      {
        headers: {
          'API-Key': SHIPENGINE_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    const rateResponse = response.data.rate_response;

    console.log('\n========== SHIPENGINE API RESPONSE ==========');
    console.log('Status:', response.status);
    console.log('Response Data (RAW JSON):');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('=============================================\n');

    if (!rateResponse || !rateResponse.rates || rateResponse.rates.length === 0) {
      console.log('>>> WARNING: No rates in response');
      console.log('>>> Errors:', rateResponse?.errors);
      
      logger.warn('No shipping rates returned from ShipEngine', {
        errors: rateResponse?.errors,
      });
      return {
        success: false,
        error: 'No shipping rates available for this destination',
      };
    }

    // Check for errors
    if (rateResponse.errors && rateResponse.errors.length > 0) {
      console.log('>>> ERROR: ShipEngine returned errors in response');
      console.log(JSON.stringify(rateResponse.errors, null, 2));
      
      logger.error('ShipEngine rate errors:', rateResponse.errors);
      return {
        success: false,
        error: rateResponse.errors[0]?.message || 'Failed to get shipping rates',
      };
    }

    // Transform ShipEngine rates to simplified format
    const simplifiedRates: SimplifiedRate[] = rateResponse.rates
      .filter(rate => !rate.error_messages || rate.error_messages.length === 0)
      .map(rate => ({
        serviceName: rate.service_type,
        serviceCode: rate.service_code,
        carrier: rate.carrier_friendly_name,
        carrierCode: rate.carrier_code,
        shipmentCost: rate.shipping_amount.amount,
        otherCost: (rate.insurance_amount?.amount || 0) + 
                   (rate.confirmation_amount?.amount || 0) + 
                   (rate.other_amount?.amount || 0),
        totalCost: rate.shipping_amount.amount + 
                   (rate.insurance_amount?.amount || 0) + 
                   (rate.confirmation_amount?.amount || 0) + 
                   (rate.other_amount?.amount || 0),
        estimatedDeliveryDays: rate.delivery_days,
        estimatedDeliveryDate: rate.estimated_delivery_date,
        guaranteed: rate.guaranteed_service || false,
        trackable: rate.trackable !== false,
      }));

    // Sort by cost (cheapest first)
    simplifiedRates.sort((a, b) => a.totalCost - b.totalCost);

    logger.info('ShipEngine rates retrieved successfully', {
      ratesCount: simplifiedRates.length,
      cheapestRate: simplifiedRates[0]?.totalCost,
      carriers: [...new Set(simplifiedRates.map(r => r.carrier))],
    });

    return {
      success: true,
      rates: simplifiedRates,
    };
  } catch (error: any) {
    // Log FULL error details with raw JSON
    console.log('\n========== SHIPENGINE API ERROR ==========');
    console.log('Error Message:', error.message);
    console.log('HTTP Status:', error.response?.status);
    console.log('Status Text:', error.response?.statusText);
    console.log('Response Data (RAW JSON):');
    console.log(JSON.stringify(error.response?.data, null, 2));
    console.log('Request URL:', error.config?.url);
    console.log('API Key Set:', !!SHIPENGINE_API_KEY);
    console.log('API Key Length:', SHIPENGINE_API_KEY?.length || 0);
    console.log('=========================================\n');
    
    logger.error('Error fetching shipping rates from ShipEngine:', {
      error: error.message,
      responseData: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText,
      requestUrl: error.config?.url,
      hasApiKey: !!SHIPENGINE_API_KEY,
      apiKeyLength: SHIPENGINE_API_KEY?.length,
    });

    // Extract detailed error message
    const errorData = error.response?.data;
    let errorMessage = 'Failed to fetch shipping rates';
    
    if (errorData) {
      if (errorData.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
        errorMessage = errorData.errors.map((e: any) => 
          `${e.error_code || ''}: ${e.message || e.error_message || JSON.stringify(e)}`
        ).join(', ');
      } else if (errorData.message) {
        errorMessage = errorData.message;
      } else if (typeof errorData === 'string') {
        errorMessage = errorData;
      }
    }

    return {
      success: false,
      error: `${errorMessage}${error.response?.status ? ` (Status: ${error.response.status})` : ''}`,
    };
  }
};

/**
 * Calculate total weight of cart items
 * Default weight per item if not specified
 */
export const calculatePackageWeight = (items: any[]): { value: number; unit: 'ounce' } => {
  const DEFAULT_ITEM_WEIGHT_OZ = 8; // 8 oz per item default
  
  let totalOunces = 0;
  
  items.forEach((item) => {
    const itemWeight = item.weight?.value || DEFAULT_ITEM_WEIGHT_OZ;
    const quantity = item.quantity || 1;
    
    // Convert to ounces if needed
    if (item.weight?.units === 'pounds' || item.weight?.unit === 'pound') {
      totalOunces += itemWeight * 16 * quantity;
    } else if (item.weight?.units === 'grams' || item.weight?.unit === 'gram') {
      totalOunces += (itemWeight / 28.35) * quantity;
    } else if (item.weight?.units === 'kilograms' || item.weight?.unit === 'kilogram') {
      totalOunces += (itemWeight * 35.274) * quantity;
    } else {
      totalOunces += itemWeight * quantity;
    }
  });

  return {
    value: Math.max(totalOunces, 1), // Minimum 1 oz
    unit: 'ounce',
  };
};

/**
 * Create ShipEngine package from cart items
 */
export const createPackageFromItems = (items: any[]): ShipEnginePackage => {
  const weight = calculatePackageWeight(items);
  
  return {
    package_code: 'package', // Standard package type
    weight: {
      value: weight.value,
      unit: weight.unit,
    },
    dimensions: {
      length: 12,
      width: 12,
      height: 6,
      unit: 'inch',
    },
  };
};

/**
 * Convert address from your format to ShipEngine format
 */
export const convertToShipEngineAddress = (address: {
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
}): ShipEngineAddress => {
  const fullName = address.name || `${address.firstName || ''} ${address.lastName || ''}`.trim();
  
  return {
    name: fullName,
    phone: address.phone,
    address_line1: address.street || address.street1 || '',
    address_line2: address.apartment || address.street2,
    city_locality: address.city,
    state_province: address.state,
    postal_code: address.zipCode || address.postalCode || '',
    country_code: address.country || 'US',
    address_residential_indicator: 'yes', // Assume residential for customers
  };
};

/**
 * Get fallback shipping rates (used when API is unavailable)
 */
export const getFallbackShippingRates = (destinationState: string): SimplifiedRate[] => {
  // Basic flat rate options based on state (adjust rates as needed)
  const isLocal = destinationState === 'OH'; // Same state as warehouse
  
  return [
    {
      serviceName: 'USPS Priority Mail',
      serviceCode: 'usps_priority_mail',
      carrier: 'USPS',
      carrierCode: 'stamps_com',
      shipmentCost: isLocal ? 7.99 : 9.99,
      otherCost: 0,
      totalCost: isLocal ? 7.99 : 9.99,
      estimatedDeliveryDays: isLocal ? 2 : 3,
      guaranteed: false,
      trackable: true,
    },
    {
      serviceName: 'USPS Priority Mail Express',
      serviceCode: 'usps_priority_mail_express',
      carrier: 'USPS',
      carrierCode: 'stamps_com',
      shipmentCost: isLocal ? 22.99 : 24.99,
      otherCost: 0,
      totalCost: isLocal ? 22.99 : 24.99,
      estimatedDeliveryDays: isLocal ? 1 : 2,
      guaranteed: true,
      trackable: true,
    },
  ];
};

/**
 * ShipEngine Service Class
 * Provides additional ShipEngine API functionality
 */
class ShipEngineService {
  /**
   * Check if ShipEngine is configured
   */
  isConfigured(): boolean {
    return !!SHIPENGINE_API_KEY;
  }

  /**
   * Test ShipEngine API connection with address validation
   * This is a simple test that doesn't require carrier configuration
   */
  async testConnection(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      if (!SHIPENGINE_API_KEY) {
        return {
          success: false,
          message: 'ShipEngine API key not configured. Please add SHIPSTATION_API_KEY to your .env file.',
        };
      }

      // Test with a known valid address
      const testAddress: ShipEngineAddress = {
        address_line1: '525 S Winchester Blvd',
        city_locality: 'San Jose',
        state_province: 'CA',
        postal_code: '95128',
        country_code: 'US',
      };

      logger.info('Testing ShipEngine API connection with address validation');

      const response = await axios.post(
        `${SHIPENGINE_API_URL}/addresses/validate`,
        [testAddress],
        {
          headers: {
            'API-Key': SHIPENGINE_API_KEY,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = response.data[0];
      
      logger.info('ShipEngine API test successful', {
        status: result.status,
        apiKeyValid: true,
      });

      return {
        success: true,
        message: 'ShipEngine API connection successful!',
        data: {
          status: result.status,
          original: result.original_address,
          matched: result.matched_address,
          apiKeyValid: true,
        },
      };
    } catch (error: any) {
      logger.error('ShipEngine API test failed:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      if (error.response?.status === 401) {
        return {
          success: false,
          message: 'Invalid API key. Please check your SHIPSTATION_API_KEY in .env file.',
        };
      }

      return {
        success: false,
        message: `API test failed: ${error.response?.data?.errors?.[0]?.message || error.message}`,
      };
    }
  }

  /**
   * Validate an address using ShipEngine
   */
  async validateAddress(address: ShipEngineAddress): Promise<any> {
    try {
      logger.info('Validating address with ShipEngine', {
        city: address.city_locality,
        state: address.state_province,
        country: address.country_code,
      });

      const response = await axios.post(
        `${SHIPENGINE_API_URL}/addresses/validate`,
        [address],
        {
          headers: {
            'API-Key': SHIPENGINE_API_KEY,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = response.data[0];
      
      logger.info('Address validation complete', {
        status: result.status,
        messages: result.messages,
      });

      return result;
    } catch (error: any) {
      logger.error('Error validating address:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      
      throw new Error(
        error.response?.data?.errors?.[0]?.message || 
        `Failed to validate address: ${error.message}`
      );
    }
  }

  /**
   * Get list of carriers
   */
  async getCarriers(): Promise<any[]> {
    try {
      const response = await axios.get(`${SHIPENGINE_API_URL}/carriers`, {
        headers: {
          'API-Key': SHIPENGINE_API_KEY,
        },
      });
      return response.data.carriers || [];
    } catch (error: any) {
      logger.error('Error fetching carriers:', error);
      throw new Error(`Failed to fetch carriers: ${error.message}`);
    }
  }

  /**
   * Get available services for a carrier
   */
  async getCarrierServices(carrierId: string): Promise<any[]> {
    try {
      const response = await axios.get(
        `${SHIPENGINE_API_URL}/carriers/${carrierId}/services`,
        {
          headers: {
            'API-Key': SHIPENGINE_API_KEY,
          },
        }
      );
      return response.data.services || [];
    } catch (error: any) {
      logger.error('Error fetching carrier services:', error);
      throw new Error(`Failed to fetch services: ${error.message}`);
    }
  }

  /**
   * Create a shipping label
   */
  async createLabel(labelData: any): Promise<any> {
    try {
      const response = await axios.post(
        `${SHIPENGINE_API_URL}/labels`,
        labelData,
        {
          headers: {
            'API-Key': SHIPENGINE_API_KEY,
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
   * Track a shipment
   */
  async trackShipment(carrierCode: string, trackingNumber: string): Promise<any> {
    try {
      const response = await axios.get(
        `${SHIPENGINE_API_URL}/tracking?carrier_code=${carrierCode}&tracking_number=${trackingNumber}`,
        {
          headers: {
            'API-Key': SHIPENGINE_API_KEY,
          },
        }
      );
      return response.data;
    } catch (error: any) {
      logger.error('Error tracking shipment:', error);
      throw new Error(`Failed to track shipment: ${error.message}`);
    }
  }
}

// Export singleton instance
export const shipEngineService = new ShipEngineService();

// Export origin address for reference
export { ORIGIN_ADDRESS };

