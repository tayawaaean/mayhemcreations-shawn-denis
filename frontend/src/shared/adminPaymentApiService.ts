/**
 * Admin Payment API Service
 * Handles payment-related API calls for the admin dashboard
 */

import { PaymentLog, PaymentLogStats } from '../admin/types/paymentLogs';

export interface PaymentApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp?: string;
}

export interface PaymentListResponse {
  payments: PaymentLog[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export interface PaymentStatsResponse {
  byStatus: Array<{
    status: string;
    count: number;
    total_amount: number;
    total_fees: number;
    total_net: number;
  }>;
  byProvider: Array<{
    provider: string;
    count: number;
    total_amount: number;
    total_fees: number;
    total_net: number;
  }>;
  recent: {
    count: number;
    total_amount: number;
    total_fees: number;
    total_net: number;
  };
  monthlyRevenue: Array<{
    month: string;
    count: number;
    total_amount: number;
    total_fees: number;
    total_net: number;
  }>;
}

class AdminPaymentApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/v1';
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<PaymentApiResponse<T>> {
    try {
      // Get token from the same storage as other services
      const authData = localStorage.getItem('mayhem_auth');
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
      console.error('Payment API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * Get all payments with pagination and filters
   */
  async getPayments(params: {
    page?: number;
    limit?: number;
    status?: string;
    provider?: string;
    customerId?: number;
  } = {}): Promise<PaymentApiResponse<PaymentListResponse>> {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.status) searchParams.append('status', params.status);
    if (params.provider) searchParams.append('provider', params.provider);
    if (params.customerId) searchParams.append('customerId', params.customerId.toString());

    const queryString = searchParams.toString();
    const endpoint = `/admin/payments${queryString ? `?${queryString}` : ''}`;

    return this.makeRequest<PaymentListResponse>(endpoint);
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(): Promise<PaymentApiResponse<PaymentStatsResponse>> {
    return this.makeRequest<PaymentStatsResponse>('/admin/payments/stats');
  }

  /**
   * Get payment details by ID
   */
  async getPaymentById(paymentId: string): Promise<PaymentApiResponse<PaymentLog>> {
    return this.makeRequest<PaymentLog>(`/admin/payments/${paymentId}`);
  }

  /**
   * Update payment notes
   */
  async updatePaymentNotes(
    paymentId: string,
    notes: string
  ): Promise<PaymentApiResponse<{ notes: string }>> {
    return this.makeRequest<{ notes: string }>(`/admin/payments/${paymentId}/notes`, {
      method: 'PUT',
      body: JSON.stringify({ notes }),
    });
  }

  /**
   * Transform API payment data to PaymentLog format
   */
  transformPaymentData(apiPayment: any): PaymentLog {
    return {
      id: apiPayment.id,
      orderId: apiPayment.orderId,
      orderNumber: apiPayment.orderNumber,
      customerId: apiPayment.customerId,
      customerName: apiPayment.customerName,
      customerEmail: apiPayment.customerEmail,
      amount: apiPayment.amount,
      currency: apiPayment.currency,
      provider: apiPayment.provider,
      paymentMethod: apiPayment.paymentMethod,
      status: apiPayment.status,
      transactionId: apiPayment.transactionId,
      providerTransactionId: apiPayment.providerTransactionId,
      gatewayResponse: apiPayment.gatewayResponse,
      createdAt: apiPayment.createdAt,
      updatedAt: apiPayment.updatedAt,
      processedAt: apiPayment.processedAt,
      failedAt: apiPayment.failedAt,
      refundedAt: apiPayment.refundedAt,
      refundAmount: apiPayment.refundAmount,
      fees: apiPayment.fees,
      netAmount: apiPayment.netAmount,
      metadata: apiPayment.metadata,
      notes: apiPayment.notes,
      refunds: apiPayment.refunds || [],
    };
  }

  /**
   * Transform API stats data to PaymentLogStats format
   */
  transformStatsData(apiStats: PaymentStatsResponse): PaymentLogStats {
    return {
      totalPayments: apiStats.recent.count,
      totalAmount: apiStats.recent.total_amount,
      totalFees: apiStats.recent.total_fees,
      netAmount: apiStats.recent.total_net,
      byStatus: apiStats.byStatus.reduce((acc, item) => {
        acc[item.status] = {
          count: item.count,
          amount: item.total_amount,
          fees: item.total_fees,
          netAmount: item.total_net,
        };
        return acc;
      }, {} as Record<string, { count: number; amount: number; fees: number; netAmount: number }>),
      byProvider: apiStats.byProvider.reduce((acc, item) => {
        acc[item.provider] = {
          count: item.count,
          amount: item.total_amount,
          fees: item.total_fees,
          netAmount: item.total_net,
        };
        return acc;
      }, {} as Record<string, { count: number; amount: number; fees: number; netAmount: number }>),
      monthlyRevenue: apiStats.monthlyRevenue.map(item => ({
        month: item.month,
        amount: item.total_amount,
        count: item.count,
        fees: item.total_fees,
        netAmount: item.total_net,
      })),
    };
  }
}

export const adminPaymentApiService = new AdminPaymentApiService();
