/**
 * Shipping API Service
 * Handles shipping rate calculations via backend API
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/v1';

export interface ShippingAddress {
  street1: string;
  street2?: string;
  city: string;
  state: string;
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
  try {
    const response = await axios.post(
      `${API_BASE_URL}/shipping/rates`,
      {
        address: {
          street1: address.street1,
          street2: address.street2 || '',
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          country: address.country || 'US',
        },
        items: items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          weight: item.weight || { value: 8, units: 'ounces' }, // Default 8oz
        })),
      },
      {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Error calculating shipping rates:', error);
    
    // Return fallback rates on error
    return {
      success: true,
      data: {
        rates: [
          {
            serviceName: 'Standard Shipping',
            serviceCode: 'standard',
            shipmentCost: 9.99,
            otherCost: 0,
            totalCost: 9.99,
            estimatedDeliveryDays: 5,
            carrier: 'USPS',
          },
          {
            serviceName: 'Express Shipping',
            serviceCode: 'express',
            shipmentCost: 24.99,
            otherCost: 0,
            totalCost: 24.99,
            estimatedDeliveryDays: 2,
            carrier: 'USPS',
          },
        ],
        recommendedRate: {
          serviceName: 'Standard Shipping',
          serviceCode: 'standard',
          shipmentCost: 9.99,
          otherCost: 0,
          totalCost: 9.99,
          estimatedDeliveryDays: 5,
          carrier: 'USPS',
        },
        warning: 'Using estimated rates. Actual shipping cost may vary.',
      },
      message: 'Shipping rates calculated (estimated)',
    };
  }
};

export const shippingApiService = {
  calculateShippingRates,
};

