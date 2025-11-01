/**
 * Shipping API Service
 * Handles shipping rate calculations via backend API
 */

import axios from 'axios';

// Get API base URL from environment or use relative path (nginx will proxy)
const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_REACT_APP_API_URL;
  if (envUrl) return envUrl;
  
  // In production, nginx proxies /api/ to backend, so use relative URL
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return '/api/v1';
  }
  
  // Development fallback
  return 'http://localhost:5001/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

export interface ShippingAddress {
  firstName?: string;
  lastName?: string;
  name?: string;
  phone?: string;
  street?: string;
  street1: string;
  street2?: string;
  apartment?: string;
  city: string;
  state: string;
  zipCode?: string;
  postalCode: string;
  country: string;
}

export interface CartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  weight?: {
    value: number;
    units: 'ounces' | 'pounds' | 'grams';
  };
}

export interface ShippingRate {
  serviceName: string;
  serviceCode: string;
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
  carrier: string;
  carrierCode: string;
  rateId?: string; // ShipEngine rate ID for label creation
}

export interface ShippingRatesResponse {
  success: boolean;
  data?: {
    rates: ShippingRate[];
    recommendedRate: ShippingRate;
    warning?: string;
  };
  message?: string;
  error?: string;
}

/**
 * Calculate shipping rates for a given address and items
 */
export const calculateShippingRates = async (
  address: ShippingAddress,
  items: CartItem[]
): Promise<ShippingRatesResponse> => {
  try {
    const requestBody = {
      address: {
        firstName: address.firstName,
        lastName: address.lastName,
        name: address.name,
        phone: address.phone,
        street: address.street || address.street1,
        street1: address.street1,
        apartment: address.apartment || address.street2,
        street2: address.street2 || '',
        city: address.city,
        state: address.state,
        zipCode: address.zipCode || address.postalCode,
        postalCode: address.postalCode,
        country: address.country || 'US',
      },
      items: items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        weight: item.weight || { value: 8, units: 'ounces' }, // Default 8oz
      })),
    }
    
    const response = await axios.post(
      `${API_BASE_URL}/shipping/shipengine/rates`,
      requestBody,
      {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    return response.data;
  } catch (error: any) {
    let errorMessage = 'Failed to calculate shipping rates. Please try again.';
    let errorDetails = null;
    
    if (error?.response) {
      // Extract error message from response
      const responseData = error.response.data;
      
      // Handle ShipEngine error format
      if (responseData?.errors && Array.isArray(responseData.errors)) {
        const firstError = responseData.errors[0];
        if (firstError.error_code === 'invalid_address') {
          errorMessage = 'The shipping address could not be validated. Please check your address and try again.';
          errorDetails = firstError.message || 'Address not found';
        } else {
          errorMessage = firstError.message || errorMessage;
          errorDetails = firstError.detail_code || null;
        }
      } else if (responseData?.message) {
        errorMessage = responseData.message;
      }
    }
    
    if (error?.request && !error?.response) {
      errorMessage = 'Cannot connect to shipping service. Please check your internet connection.';
    }
    
    // Throw error instead of returning fallback rates
    throw {
      success: false,
      message: errorMessage,
      errorDetails: errorDetails,
      statusCode: error?.response?.status,
      originalError: error
    };
  }
};

export const shippingApiService = {
  calculateShippingRates,
};

