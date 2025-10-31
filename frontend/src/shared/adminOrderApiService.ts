/**
 * Admin Order API Service
 * Handles order-related API calls for the admin dashboard
 */

import { Order } from '../admin/types';
import MultiAccountStorageService from './multiAccountStorage';
import { apiClient } from './axiosConfig';

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
  ): Promise<OrderApiResponse<T>> {
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
    paymentStatus?: string;
    customerId?: number;
  } = {}): Promise<OrderApiResponse<OrderListResponse>> {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.status) searchParams.append('status', params.status);
    if (params.paymentStatus) searchParams.append('paymentStatus', params.paymentStatus);
    if (params.customerId) searchParams.append('customerId', params.customerId.toString());

    const queryString = searchParams.toString();
    // Changed to use the new admin orders endpoint
    const endpoint = `/admin/orders${queryString ? `?${queryString}` : ''}`;

    return this.makeRequest<OrderListResponse>(endpoint);
  }

  /**
   * Get order details by ID
   */
  async getOrderById(orderId: string): Promise<OrderApiResponse<Order>> {
    // Changed to use the new admin orders endpoint
    return this.makeRequest<Order>(`/admin/orders/${orderId}`);
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string,
    status: string,
    adminNotes?: string,
    trackingNumber?: string,
    shippingCarrier?: string
  ): Promise<OrderApiResponse<Order>> {
    // Changed to use the new admin orders endpoint
    return this.makeRequest<Order>(`/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ 
        status, 
        adminNotes,
        trackingNumber,
        shippingCarrier
      }),
    });
  }

  /**
   * Transform API order data to Order format
   * Updated to handle the new orders table structure
   */
  transformOrderData(apiOrder: any): Order {
    // Parse JSON fields if they are strings
    const items = typeof apiOrder.items === 'string' ? JSON.parse(apiOrder.items) : apiOrder.items;
    const shippingAddress = typeof apiOrder.shippingAddress === 'string' ? JSON.parse(apiOrder.shippingAddress) : apiOrder.shippingAddress;
    const billingAddress = apiOrder.billingAddress && typeof apiOrder.billingAddress === 'string' 
      ? JSON.parse(apiOrder.billingAddress) 
      : apiOrder.billingAddress;

    return {
      id: apiOrder.id.toString(),
      orderNumber: apiOrder.orderNumber || `ORD-${apiOrder.id}`,
      customerId: apiOrder.userId.toString(),
      customer: {
        id: apiOrder.userId.toString(),
        name: `${apiOrder.user_first_name || shippingAddress?.firstName || ''} ${apiOrder.user_last_name || shippingAddress?.lastName || ''}`.trim(),
        email: apiOrder.user_email || shippingAddress?.email || '',
        phone: apiOrder.user_phone || shippingAddress?.phone || '',
        address: {
          street: shippingAddress?.street || '',
          city: shippingAddress?.city || '',
          state: shippingAddress?.state || '',
          zipCode: shippingAddress?.zipCode || '',
          country: shippingAddress?.country || 'US'
        },
        orders: [],
        totalSpent: parseFloat(apiOrder.total.toString()),
        avatar: '',
        status: 'active',
        createdAt: new Date(apiOrder.createdAt || new Date()),
        lastOrderDate: new Date(apiOrder.createdAt || new Date())
      },
      items: items || [],
      status: apiOrder.status || 'preparing',
      total: parseFloat(apiOrder.total.toString()),
      subtotal: parseFloat(apiOrder.subtotal.toString()) || 0,
      shipping: parseFloat(apiOrder.shipping.toString()) || 0,
      tax: parseFloat(apiOrder.tax.toString()) || 0,
      shippingAddress: {
        street: shippingAddress?.street || '',
        city: shippingAddress?.city || '',
        state: shippingAddress?.state || '',
        zipCode: shippingAddress?.zipCode || '',
        country: shippingAddress?.country || 'US'
      },
      billingAddress: billingAddress || shippingAddress || {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'US'
      },
      paymentMethod: apiOrder.paymentMethod || 'Credit Card',
      paymentStatus: apiOrder.paymentStatus || 'completed',
      paymentProvider: apiOrder.paymentProvider || 'stripe',
      paymentDetails: {
        transactionId: apiOrder.transactionId || '',
        providerTransactionId: apiOrder.paymentIntentId || '',
        cardLast4: apiOrder.cardLast4 || '',
        cardBrand: apiOrder.cardBrand || '',
        processedAt: apiOrder.createdAt ? new Date(apiOrder.createdAt) : undefined
      },
      trackingNumber: apiOrder.trackingNumber || undefined,
      shippingCarrier: apiOrder.shippingCarrier || undefined,
      notes: apiOrder.adminNotes || apiOrder.customerNotes || apiOrder.internalNotes 
        ? [apiOrder.adminNotes, apiOrder.customerNotes, apiOrder.internalNotes].filter(Boolean) 
        : [],
      createdAt: new Date(apiOrder.createdAt || new Date()),
      updatedAt: new Date(apiOrder.updatedAt || new Date())
    };
  }
}

export const adminOrderApiService = new AdminOrderApiService();
