/**
 * Admin Order API Service
 * Handles order-related API calls for the admin dashboard
 */

import { Order } from '../admin/types';
import MultiAccountStorageService from './multiAccountStorage';

export interface OrderApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp?: string;
}

export interface OrderListResponse {
  orders: Order[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

class AdminOrderApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/v1';
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<OrderApiResponse<T>> {
    try {
      // Get token from the same storage as other services
      const currentAccount = MultiAccountStorageService.getCurrentAccountData();
      const authData = currentAccount ? JSON.stringify(currentAccount) : null;
      let token = null;
      
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          token = parsed.session?.accessToken;
        } catch (error) {
          console.error('Error parsing auth data:', error);
        }
      }
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || `HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        data: data.data,
        message: data.message,
      };
    } catch (error) {
      console.error('Order API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * Get all orders with pagination and filters
   */
  async getOrders(params: {
    page?: number;
    limit?: number;
    status?: string;
    customerId?: number;
  } = {}): Promise<OrderApiResponse<OrderListResponse>> {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.status) searchParams.append('status', params.status);
    if (params.customerId) searchParams.append('customerId', params.customerId.toString());

    const queryString = searchParams.toString();
    const endpoint = `/orders/admin/review-orders${queryString ? `?${queryString}` : ''}`;

    return this.makeRequest<OrderListResponse>(endpoint);
  }

  /**
   * Get order details by ID
   */
  async getOrderById(orderId: string): Promise<OrderApiResponse<Order>> {
    return this.makeRequest<Order>(`/orders/review-orders/${orderId}`);
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string,
    status: string,
    adminNotes?: string
  ): Promise<OrderApiResponse<Order>> {
    return this.makeRequest<Order>(`/orders/review-orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, adminNotes }),
    });
  }

  /**
   * Transform API order data to Order format
   */
  transformOrderData(apiOrder: any): Order {
    return {
      id: apiOrder.id.toString(),
      customerId: apiOrder.user_id.toString(),
      customer: {
        id: apiOrder.user_id.toString(),
        name: `${apiOrder.user?.first_name || ''} ${apiOrder.user?.last_name || ''}`.trim(),
        email: apiOrder.user?.email || '',
        phone: apiOrder.user?.phone || '',
        address: {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'US'
        },
        avatar: '',
        status: 'active',
        createdAt: apiOrder.user?.created_at || new Date().toISOString(),
        lastLogin: apiOrder.user?.last_login || new Date().toISOString()
      },
      items: apiOrder.order_data || [],
      status: apiOrder.status,
      total: parseFloat(apiOrder.total.toString()),
      subtotal: parseFloat(apiOrder.subtotal.toString()),
      shipping: parseFloat(apiOrder.shipping.toString()),
      tax: parseFloat(apiOrder.tax.toString()),
      shippingAddress: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'US'
      },
      billingAddress: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'US'
      },
      paymentMethod: 'Credit Card', // Default, will be updated from payment data
      paymentStatus: apiOrder.status === 'approved-processing' ? 'completed' : 'pending',
      paymentProvider: 'stripe', // Default, will be updated from payment data
      paymentDetails: {
        transactionId: '',
        providerTransactionId: '',
        processedAt: apiOrder.reviewed_at ? new Date(apiOrder.reviewed_at) : undefined
      },
      notes: apiOrder.admin_notes ? [apiOrder.admin_notes] : [],
      createdAt: new Date(apiOrder.created_at),
      updatedAt: new Date(apiOrder.updated_at)
    };
  }
}

export const adminOrderApiService = new AdminOrderApiService();
