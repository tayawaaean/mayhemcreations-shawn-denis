/**
 * Address Service
 * Handles address-related operations
 */

import { Address } from '../models/addressModel';
import { logger } from '../utils/logger';

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

/**
 * Get the default origin address for shipping
 */
export const getDefaultOriginAddress = async (): Promise<ShipEngineAddress | null> => {
  try {
    const address = await Address.getDefaultOrigin();
    
    if (!address) {
      logger.warn('No default origin address found');
      return null;
    }

    return address.toShipEngineFormat();
  } catch (error) {
    logger.error('Error fetching default origin address:', error);
    return null;
  }
};

/**
 * Get origin address with fallback to hardcoded values
 */
export const getOriginAddress = async (): Promise<ShipEngineAddress> => {
  const dynamicAddress = await getDefaultOriginAddress();
  
  if (dynamicAddress) {
    return dynamicAddress;
  }

  // Fallback to hardcoded address
  logger.warn('Using fallback origin address - no default address configured');
  return {
    name: 'Mayhem Creations',
    phone: '614-715-4742',
    company_name: 'Mayhem Creations',
    address_line1: '128 Persimmon Dr',
    city_locality: 'Newark',
    state_province: 'OH',
    postal_code: '43055',
    country_code: 'US',
    address_residential_indicator: 'no'
  };
};

/**
 * Get all addresses by type
 */
export const getAddressesByType = async (type: 'origin' | 'return' | 'warehouse'): Promise<Address[]> => {
  try {
    return await Address.getByType(type);
  } catch (error) {
    logger.error(`Error fetching ${type} addresses:`, error);
    return [];
  }
};

export default {
  getDefaultOriginAddress,
  getOriginAddress,
  getAddressesByType
};
