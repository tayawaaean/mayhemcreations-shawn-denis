/**
 * Admin Customer API Service
 * Handles customer-related API calls for the admin dashboard
 */

import { Customer } from '../admin/types';
import MultiAccountStorageService from './multiAccountStorage';
import { apiClient } from './axiosConfig';

export interface CustomerApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp?: string;
}

export interface CustomerListResponse {
  customers: Customer[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

class AdminCustomerApiService {
  private baseUrl: string;

  constructor() {
    const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_REACT_APP_API_URL;
    if (envUrl) {
      this.baseUrl = envUrl;
    } else if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      // Production: use relative URL (nginx will proxy)
      this.baseUrl = '/api/v1';
    } else {
      // Development fallback
      this.baseUrl = 'http://localhost:5001/api/v1';
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<CustomerApiResponse<T>> {
    try {
      // Get token from the same storage as other services
      const currentAccount = MultiAccountStorageService.getCurrentAccountData();
      const authData = currentAccount ? JSON.stringify(currentAccount) : null;
      let token = null;
      
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          // For session-based auth, we don't need access tokens
          // Authentication is handled by cookies
          token = null;
        } catch (error) {
          console.error('Error parsing auth data:', error);
        }
      }
      
      const method = (options.method || 'GET').toUpperCase();
      const url = `${this.baseUrl}${endpoint}`;
      const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) } as any;
      const body = options.body ? JSON.parse(options.body as string) : undefined;

      const response = await apiClient.request({ url, method, headers, data: body, withCredentials: true });

      const data = response.data;

      if (!data?.success && response.status >= 400) {
        return {
          success: false,
          error: data?.message || `HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        data: data?.data,
        message: data?.message,
      };
    } catch (error) {
      console.error('Customer API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * Get all customers with pagination and filters
   */
  async getCustomers(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  } = {}): Promise<CustomerApiResponse<CustomerListResponse>> {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.search) searchParams.append('search', params.search);
    if (params.status) searchParams.append('status', params.status.toString());

    const queryString = searchParams.toString();
    const endpoint = `/users${queryString ? `?${queryString}` : ''}`;

    return this.makeRequest<CustomerListResponse>(endpoint);
  }

  /**
   * Get customer details by ID
   */
  async getCustomerById(customerId: string): Promise<CustomerApiResponse<Customer>> {
    return this.makeRequest<Customer>(`/users/${customerId}`);
  }

  /**
   * Update customer status
   */
  async updateCustomerStatus(
    customerId: string,
    status: string
  ): Promise<CustomerApiResponse<Customer>> {
    return this.makeRequest<Customer>(`/users/${customerId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  /**
   * Transform API customer data to Customer format
   */
  transformCustomerData(apiCustomer: any): Customer {
    return {
      id: apiCustomer.id.toString(),
      name: `${apiCustomer.first_name || ''} ${apiCustomer.last_name || ''}`.trim(),
      email: apiCustomer.email,
      phone: apiCustomer.phone || '',
      address: {
        street: apiCustomer.address || '',
        city: apiCustomer.city || '',
        state: apiCustomer.state || '',
        zipCode: apiCustomer.zip_code || '',
        country: apiCustomer.country || 'US'
      },
      avatar: apiCustomer.avatar || '',
      status: apiCustomer.is_active ? 'active' : 'inactive',
      createdAt: new Date(apiCustomer.created_at),
      lastLogin: apiCustomer.last_login ? new Date(apiCustomer.last_login) : new Date(apiCustomer.created_at)
    };
  }
}

export const adminCustomerApiService = new AdminCustomerApiService();
