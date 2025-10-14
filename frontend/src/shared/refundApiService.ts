/**
 * Refund API Service
 * Handles all API calls related to refund management
 */

import { apiAuthService } from './apiAuthService';

// TypeScript interfaces for Refund data
export interface RefundRequest {
  id: number;
  orderId: number;
  orderNumber: string;
  userId: number;
  paymentId?: number | null;
  refundType: 'full' | 'partial';
  refundAmount: number;
  originalAmount: number;
  currency: string;
  reason: 'damaged_defective' | 'wrong_item' | 'not_as_described' | 'changed_mind' | 
          'duplicate_order' | 'shipping_delay' | 'quality_issues' | 'other';
  description?: string | null;
  customerEmail: string;
  customerName: string;
  imagesUrls?: string[] | null;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 
          'processing' | 'completed' | 'failed' | 'cancelled';
  adminNotes?: string | null;
  rejectionReason?: string | null;
  refundMethod: 'original_payment' | 'store_credit' | 'manual';
  paymentProvider?: 'stripe' | 'paypal' | null;
  providerRefundId?: string | null;
  providerResponse?: any | null;
  refundItems?: any[] | null;
  inventoryRestored: boolean;
  inventoryRestoredAt?: string | null;
  requestedAt: string;
  reviewedAt?: string | null;
  processedAt?: string | null;
  completedAt?: string | null;
  failedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  // Included associations (optional)
  order?: {
    id: number;
    orderNumber: string;
    total: number;
    status: string;
  };
  user?: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface RefundStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  completed: number;
  failed: number;
  totalRefundedAmount: number;
}

export interface CreateRefundRequestData {
  orderId: number;
  reason: string;
  description?: string;
  refundType?: 'full' | 'partial';
  refundAmount?: number;
  refundItems?: any[];
  imagesUrls?: string[];
}

export interface RefundFilters {
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// Refund API Service class
export class RefundApiService {
  /**
   * Get all refund requests (Admin only)
   * Supports filtering and pagination
   */
  static async getAllRefunds(filters?: RefundFilters): Promise<{
    success: boolean;
    data: RefundRequest[];
    pagination?: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
    message?: string;
  }> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.status && filters.status !== 'all') {
        params.append('status', filters.status);
      }
      if (filters?.search) {
        params.append('search', filters.search);
      }
      if (filters?.startDate) {
        params.append('startDate', filters.startDate);
      }
      if (filters?.endDate) {
        params.append('endDate', filters.endDate);
      }
      if (filters?.page) {
        params.append('page', filters.page.toString());
      }
      if (filters?.limit) {
        params.append('limit', filters.limit.toString());
      }

      const response = await apiAuthService.get<RefundRequest[]>(`/refunds/admin/all?${params.toString()}`, true);
      return response as any;
    } catch (error: any) {
      console.error('Error fetching refunds:', error);
      throw error.response?.data || { success: false, message: 'Failed to fetch refunds' };
    }
  }

  /**
   * Get refund statistics (Admin only)
   */
  static async getRefundStats(filters?: {
    startDate?: string;
    endDate?: string;
  }): Promise<{
    success: boolean;
    data: RefundStats;
  }> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.startDate) {
        params.append('startDate', filters.startDate);
      }
      if (filters?.endDate) {
        params.append('endDate', filters.endDate);
      }

      const response = await apiAuthService.get<RefundStats>(`/refunds/admin/stats?${params.toString()}`, true);
      return response as any;
    } catch (error: any) {
      console.error('Error fetching refund stats:', error);
      throw error.response?.data || { success: false, message: 'Failed to fetch stats' };
    }
  }

  /**
   * Get specific refund by ID
   */
  static async getRefundById(id: number): Promise<{
    success: boolean;
    data: RefundRequest;
  }> {
    try {
      const response = await apiAuthService.get<RefundRequest>(`/refunds/${id}`, true);
      return response as any;
    } catch (error: any) {
      console.error('Error fetching refund:', error);
      throw error || { success: false, message: 'Failed to fetch refund' };
    }
  }

  /**
   * Mark refund as under review (Admin only)
   */
  static async reviewRefund(id: number, adminNotes?: string): Promise<{
    success: boolean;
    data: RefundRequest;
    message: string;
  }> {
    try {
      const response = await apiAuthService.put<RefundRequest>(`/refunds/${id}/review`, {
        adminNotes
      }, true);
      return response as any;
    } catch (error: any) {
      console.error('Error reviewing refund:', error);
      throw error.response?.data || { success: false, message: 'Failed to review refund' };
    }
  }

  /**
   * Approve a refund request (Admin only)
   * This will process the refund through payment gateway
   */
  static async approveRefund(id: number, adminNotes?: string, manualCaptureId?: string): Promise<{
    success: boolean;
    data: RefundRequest;
    message: string;
  }> {
    try {
      const response = await apiAuthService.post<RefundRequest>(`/refunds/${id}/approve`, {
        adminNotes,
        manualCaptureId
      }, true);
      return response as any;
    } catch (error: any) {
      console.error('Error approving refund:', error);
      throw error.response?.data || { success: false, message: 'Failed to approve refund' };
    }
  }

  /**
   * Reject a refund request (Admin only)
   */
  static async rejectRefund(id: number, rejectionReason: string, adminNotes?: string): Promise<{
    success: boolean;
    data: RefundRequest;
    message: string;
  }> {
    try {
      const response = await apiAuthService.post<RefundRequest>(`/refunds/${id}/reject`, {
        rejectionReason,
        adminNotes
      }, true);
      return response as any;
    } catch (error: any) {
      console.error('Error rejecting refund:', error);
      throw error.response?.data || { success: false, message: 'Failed to reject refund' };
    }
  }

  /**
   * Cancel a refund request
   */
  static async cancelRefund(id: number): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const response = await apiAuthService.post<any>(`/refunds/${id}/cancel`, {}, true);
      return response as any;
    } catch (error: any) {
      console.error('Error cancelling refund:', error);
      throw error || { success: false, message: 'Failed to cancel refund' };
    }
  }

  /**
   * Create a new refund request (Customer)
   */
  static async createRefundRequest(data: CreateRefundRequestData): Promise<{
    success: boolean;
    data: RefundRequest;
    message: string;
  }> {
    try {
      const response = await apiAuthService.post<RefundRequest>('/refunds/request', data, true);
      return response;
    } catch (error: any) {
      console.error('Error creating refund request:', error);
      throw error || { success: false, message: 'Failed to create refund request' };
    }
  }

  /**
   * Get user's refund requests (Customer)
   */
  static async getUserRefunds(): Promise<{
    success: boolean;
    data: RefundRequest[];
    count: number;
  }> {
    try {
      const response = await apiAuthService.get<RefundRequest[]>('/refunds/user', true);
      return response as any; // Cast to match expected return type
    } catch (error: any) {
      console.error('Error fetching user refunds:', error);
      throw error || { success: false, message: 'Failed to fetch refunds' };
    }
  }

  /**
   * Helper: Get human-readable reason label
   */
  static getReasonLabel(reason: string): string {
    const labels: Record<string, string> = {
      damaged_defective: 'Product Damaged or Defective',
      wrong_item: 'Wrong Item Received',
      not_as_described: 'Item Not as Described',
      changed_mind: 'Changed My Mind',
      duplicate_order: 'Duplicate Order',
      shipping_delay: 'Shipping Took Too Long',
      quality_issues: 'Quality Issues',
      other: 'Other Reason'
    };
    return labels[reason] || reason;
  }

  /**
   * Helper: Get human-readable status label
   */
  static getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pending Review',
      under_review: 'Under Review',
      approved: 'Approved',
      rejected: 'Rejected',
      processing: 'Processing',
      completed: 'Completed',
      failed: 'Failed',
      cancelled: 'Cancelled'
    };
    return labels[status] || status;
  }
}

export default RefundApiService;

