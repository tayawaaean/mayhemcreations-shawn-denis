/**
 * Shipping API Service
 * Handles shipping rate calculations via backend API
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/v1';

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
  otherCost: number;
  totalCost: number;
  estimatedDeliveryDays?: number;
  carrier: string;
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
    console.log('🌐 shippingApiService: calculateShippingRates called')
  console.log('📍 API_BASE_URL:', API_BASE_URL)
  console.log('📍 Full URL:', `${API_BASE_URL}/shipping/shipengine/rates`)
  console.log('📍 Address:', address)
  console.log('📦 Items:', items)
  
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
    
    console.log('📤 Request body:', JSON.stringify(requestBody, null, 2))
    
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

    console.log('✅ API Response Status:', response.status)
    console.log('✅ API Response Data:', response.data)
    
    return response.data;
  } catch (error: any) {
    console.error('❌❌❌ SHIPPING API ERROR - FULL DETAILS ❌❌❌');
    console.error('Error type:', typeof error);
    console.error('Error name:', error?.name);
    console.error('Error message:', error?.message);
    console.error('Error code:', error?.code);
    console.error('Has response:', !!error?.response);
    
    let errorMessage = 'Failed to calculate shipping rates. Please try again.';
    let errorDetails = null;
    
    if (error?.response) {
      console.error('Response status:', error.response.status);
      console.error('Response statusText:', error.response.statusText);
      console.error('Response data:', error.response.data);
      console.error('Response headers:', error.response.headers);
      
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
      console.error('Request was made but no response:', error.request);
    }
    
    console.error('Error config:', {
      url: error?.config?.url,
      method: error?.config?.method,
      baseURL: error?.config?.baseURL,
      headers: error?.config?.headers
    });
    
    console.error('❌ THROWING ERROR TO CALLER - NO FALLBACK RATES');
    
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

