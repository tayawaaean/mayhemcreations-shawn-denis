/**
 * Address API Service
 * Handles address-related API calls
 */

import { Address } from '../types/address';
import { apiClient } from './axiosConfig';

export interface AddressApiService {
  getDefaultOriginAddress(): Promise<Address | null>;
  getAllAddresses(): Promise<Address[]>;
  getAddressesByType(type: 'origin' | 'return' | 'warehouse'): Promise<Address[]>;
}

class AddressApiServiceImpl implements AddressApiService {
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('token');
    const method = (options.method || 'GET').toUpperCase();
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...(options.headers || {}),
    } as any;
    const data = options.body ? JSON.parse(options.body as string) : undefined;

    const response = await apiClient.request({ url: endpoint, method, headers, data, withCredentials: true });
    if (response.status >= 400) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
    return response.data?.data ?? response.data;
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
