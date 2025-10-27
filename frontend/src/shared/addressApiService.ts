/**
 * Address API Service
 * Handles address-related API calls
 */

import { Address } from '../types/address';

const API_BASE_URL = '/api/v1';

export interface AddressApiService {
  getDefaultOriginAddress(): Promise<Address | null>;
  getAllAddresses(): Promise<Address[]>;
  getAddressesByType(type: 'origin' | 'return' | 'warehouse'): Promise<Address[]>;
}

class AddressApiServiceImpl implements AddressApiService {
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || data;
  }

  async getDefaultOriginAddress(): Promise<Address | null> {
    try {
      return await this.makeRequest<Address>('/admin/addresses/default/origin');
    } catch (error) {
      console.error('Failed to fetch default origin address:', error);
      return null;
    }
  }

  async getAllAddresses(): Promise<Address[]> {
    try {
      return await this.makeRequest<Address[]>('/admin/addresses');
    } catch (error) {
      console.error('Failed to fetch addresses:', error);
      return [];
    }
  }

  async getAddressesByType(type: 'origin' | 'return' | 'warehouse'): Promise<Address[]> {
    try {
      return await this.makeRequest<Address[]>(`/admin/addresses?type=${type}`);
    } catch (error) {
      console.error(`Failed to fetch ${type} addresses:`, error);
      return [];
    }
  }
}

export const addressApiService = new AddressApiServiceImpl();
export default addressApiService;
