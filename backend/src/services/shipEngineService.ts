/**
 * ShipEngine Service
 * Handles shipping rate calculations using ShipEngine API
 * Documentation: https://www.shipengine.com/docs/rates/
 */

import axios from 'axios';
import { logger } from '../utils/logger';
import { getOriginAddress } from './addressService';

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

// Origin address will be fetched dynamically from database

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
  items?: ShipEngineProduct[]; // Products for tax calculations
}

export interface ShipEngineProduct {
  product_id: string;
  product_code: string;
  product_name: string;
  product_category: string;
  unit_price: {
    currency: string;
    amount: number;
  };
  quantity: number;
  harmonized_tariff_code: string;
  country_of_origin: string;
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
    customs?: {
      contents: string;
      customs_items: Array<{
        description: string;
        quantity: number;
        value: number;
        harmonized_tariff_code?: string;
        country_of_origin?: string;
      }>;
      non_delivery: 'return_to_sender' | 'treat_as_abandoned';
    };
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
  taxAmount?: number; // Tax amount from ShipEngine
  insuranceCost?: number; // Insurance fees
  confirmationCost?: number; // Delivery confirmation fees
  otherCost: number; // Additional fees (fuel surcharge, residential, etc.)
  totalCost: number;
  estimatedDeliveryDays?: number;
  estimatedDeliveryDate?: string;
  guaranteed?: boolean;
  trackable?: boolean;
  rateId?: string; // ShipEngine rate ID for label creation
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

    // Get dynamic origin address
    const originAddress = await getOriginAddress();

    logger.info('Requesting shipping rates from ShipEngine', {
      destination: `${destinationAddress.city_locality}, ${destinationAddress.state_province} ${destinationAddress.postal_code}`,
      origin: `${originAddress.city_locality}, ${originAddress.state_province} ${originAddress.postal_code}`,
      packageCount: packages.length,
      totalWeight: packages.reduce((sum, pkg) => sum + pkg.weight.value, 0),
    });

    // Get carrier IDs if not provided
    let carrierIds: string[] = options?.carrierIds || [];
    
    if (carrierIds.length === 0) {
      // First, try to use configured production carriers from environment
      const configuredCarriers = process.env.SHIPENGINE_CARRIER_IDS;
      if (configuredCarriers) {
        carrierIds = configuredCarriers.split(',').map(id => id.trim()).filter(id => id);
        logger.info('Using configured production carriers', {
          carrierCount: carrierIds.length,
          carriers: carrierIds,
        });
      } else {
        // Fallback: fetch carriers from ShipEngine API
        try {
          logger.debug('Fetching carriers from ShipEngine API');
          const carriersResponse = await axios.get(`${SHIPENGINE_API_URL}/carriers`, {
            headers: {
              'API-Key': SHIPENGINE_API_KEY,
            },
          });
          
          const carriers = carriersResponse.data.carriers || [];
          carrierIds = carriers.map((carrier: any) => carrier.carrier_id).filter((id: string) => id);
          
          logger.info('Retrieved carrier IDs from ShipEngine API', {
            carrierCount: carrierIds.length,
            carriers: carriers.map((c: any) => c.friendly_name || c.carrier_code),
          });
        } catch (carrierError: any) {
          logger.error('Failed to fetch carriers from API:', carrierError.response?.data || carrierError.message);
          
          // Final fallback to test carrier
          const testCarrierId = process.env.SHIPENGINE_TEST_CARRIER_ID || 'se-3697717';
          logger.warn(`Using fallback test carrier ID: ${testCarrierId}`);
          carrierIds = [testCarrierId];
        }
      }
    }

    // Prepare customs items from packages for tax calculation
    const allCustomsItems: Array<{
      description: string;
      quantity: number;
      value: number;
      harmonized_tariff_code: string;
      country_of_origin: string;
    }> = [];
    
    // Extract items from all packages to create shipment-level customs items
    packages.forEach(pkg => {
      if (pkg.items) {
        pkg.items.forEach(item => {
          allCustomsItems.push({
            description: item.product_name,
            quantity: item.quantity,
            value: item.unit_price.amount,
            harmonized_tariff_code: item.harmonized_tariff_code,
            country_of_origin: item.country_of_origin,
          });
        });
      }
    });

    // Prepare rate request
    const rateRequest: ShipEngineRateRequest = {
      shipment: {
        validate_address: 'validate_and_clean',
        ship_from: originAddress,
        ship_to: destinationAddress,
        packages: packages,
        confirmation: options?.confirmation || 'none',
        // Add customs items at shipment level for tax calculation
        ...(allCustomsItems.length > 0 && {
          customs: {
            contents: 'merchandise',
            customs_items: allCustomsItems,
            non_delivery: 'return_to_sender', // Required field for customs
          },
        }),
      },
      rate_options: {
        carrier_ids: carrierIds,
        service_codes: options?.serviceCodes,
        calculate_tax_amount: true, // Now safe to enable with customs items
      },
    };

    logger.info('ShipEngine customs items for tax calculation:', {
      customsItemCount: allCustomsItems.length,
      sampleItems: allCustomsItems.slice(0, 2).map(item => ({
        description: item.description,
        quantity: item.quantity,
        value: item.value,
        tariff_code: item.harmonized_tariff_code,
        origin: item.country_of_origin,
      })),
    });

    logger.info('ShipEngine API Request:', {
      url: `${SHIPENGINE_API_URL}/rates`,
      hasApiKey: !!SHIPENGINE_API_KEY,
      apiKeyPrefix: SHIPENGINE_API_KEY?.substring(0, 12) + '...',
      carrierIds: rateRequest.rate_options?.carrier_ids,
      calculateTax: rateRequest.rate_options?.calculate_tax_amount,
      hasCustoms: !!rateRequest.shipment.customs,
      customsItemCount: rateRequest.shipment.customs?.customs_items?.length || 0,
      packages: rateRequest.shipment.packages.map(p => ({
        package_code: p.package_code,
        weight: p.weight,
        dimensions: p.dimensions,
        itemCount: p.items?.length || 0,
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

    if (!rateResponse || !rateResponse.rates || rateResponse.rates.length === 0) {
      logger.warn('No shipping rates returned from ShipEngine', {
        errors: rateResponse?.errors,
      });
      return {
        success: false,
        error: 'No shipping rates available for this destination',
      };
    }

    // Check for errors but only fail if we have NO rates at all
    if (rateResponse.errors && rateResponse.errors.length > 0) {
      logger.warn('ShipEngine rate errors (some carriers failed):', {
        errorCount: rateResponse.errors.length,
        failedCarriers: rateResponse.errors.map((e: any) => e.carrier_name || e.carrier_code),
        availableRatesCount: rateResponse.rates?.length || 0
      });
      
      // Only return error if we have NO successful rates
      if (!rateResponse.rates || rateResponse.rates.length === 0) {
        logger.error('All carriers failed to return rates');
        return {
          success: false,
          error: 'No shipping carriers available for this address. Please verify your address is correct.',
          warning: rateResponse.errors[0]?.message || 'All carriers failed'
        };
      }
    }

    // Transform ShipEngine rates to simplified format
    const simplifiedRates: SimplifiedRate[] = rateResponse.rates
      .filter(rate => {
        const hasErrors = rate.error_messages && rate.error_messages.length > 0;
        if (hasErrors) {
          logger.debug(`Filtering out failed rate: ${rate.carrier_friendly_name} - ${rate.service_type}`);
        }
        return !hasErrors;
      })
      .map(rate => ({
        serviceName: rate.service_type,
        serviceCode: rate.service_code,
        carrier: rate.carrier_friendly_name,
        carrierCode: rate.carrier_code,
        shipmentCost: rate.shipping_amount.amount,
        taxAmount: rate.tax_amount?.amount || 0, // Tax amount from ShipEngine
        insuranceCost: rate.insurance_amount?.amount || 0, // Insurance fees
        confirmationCost: rate.confirmation_amount?.amount || 0, // Delivery confirmation fees
        otherCost: rate.other_amount?.amount || 0, // Additional fees (fuel surcharge, residential, etc.)
        totalCost: rate.shipping_amount.amount + 
                   (rate.tax_amount?.amount || 0) + // Include tax in total cost
                   (rate.insurance_amount?.amount || 0) + 
                   (rate.confirmation_amount?.amount || 0) + 
                   (rate.other_amount?.amount || 0),
        estimatedDeliveryDays: rate.delivery_days,
        estimatedDeliveryDate: rate.estimated_delivery_date,
        guaranteed: rate.guaranteed_service || false,
        trackable: rate.trackable !== false,
        rateId: rate.rate_id, // Include rate ID for label creation
      }));

    // Sort by cost (cheapest first)
    simplifiedRates.sort((a, b) => a.totalCost - b.totalCost);

    logger.info('ShipEngine rates retrieved successfully', {
      ratesCount: simplifiedRates.length,
      cheapestRate: simplifiedRates[0]?.totalCost,
      carriers: [...new Set(simplifiedRates.map(r => r.carrier))],
      failedCarriers: rateResponse.errors?.map((e: any) => e.carrier_name).filter(Boolean) || []
    });

    return {
      success: true,
      rates: simplifiedRates,
      warning: rateResponse.errors?.length > 0 
        ? `Some carriers unavailable: ${rateResponse.errors.map((e: any) => e.carrier_name).join(', ')}` 
        : undefined
    };
  } catch (error: any) {
    logger.error('Error fetching shipping rates from ShipEngine:', {
      error: error.message,
      responseData: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText,
      requestUrl: error.config?.url,
      hasApiKey: !!SHIPENGINE_API_KEY,
      apiKeyLength: SHIPENGINE_API_KEY?.length,
      stack: error.stack,
      fullError: error,
    });

    // Log the full error object
    logger.error('Full error details:', error);

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
  
  // Convert items to ShipEngine product format for tax calculations
  const products = items.map(item => ({
    product_id: item.id || item.productId || `product_${Math.random().toString(36).substr(2, 9)}`,
    product_code: item.sku || item.productCode || 'DEFAULT',
    product_name: item.name || item.productName || 'Product',
    product_category: item.category || 'general',
    unit_price: {
      currency: 'usd',
      amount: parseFloat(item.price || item.unitPrice || 0),
    },
    quantity: parseInt(item.quantity || 1),
    harmonized_tariff_code: item.harmonizedTariffCode || '9999999999', // Default HTS code
    country_of_origin: item.countryOfOrigin || 'US',
  }));

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
    items: products, // Include products for tax calculations
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

// Export getOriginAddress function for reference
/**
 * Get all configured production carriers
 */
export const getConfiguredCarriers = (): string[] => {
  const configuredCarriers = process.env.SHIPENGINE_CARRIER_IDS;
  if (configuredCarriers) {
    return configuredCarriers.split(',').map(id => id.trim()).filter(id => id);
  }
  return [];
};

/**
 * Get default carrier ID for label creation
 */
export const getDefaultCarrierId = (): string => {
  return process.env.SHIPENGINE_DEFAULT_CARRIER_ID || 
         process.env.SHIPENGINE_CARRIER_ID || 
         'se-3938918'; // Stamps.com as fallback
};

export { getOriginAddress };

