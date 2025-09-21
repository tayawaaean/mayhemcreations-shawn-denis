/**
 * Custom Embroidery API Service
 * Handles custom embroidery order operations
 */

import { apiAuthService, ApiResponse } from './apiAuthService';

export interface CustomEmbroideryOrder {
  id: number;
  userId: number;
  designName: string;
  designFile: string; // Base64 encoded file
  designPreview: string; // Base64 preview image
  dimensions: {
    width: number;
    height: number;
  };
  selectedStyles: {
    coverage: {
      id: string;
      name: string;
      price: number;
    } | null;
    material: {
      id: string;
      name: string;
      price: number;
    } | null;
    border: {
      id: string;
      name: string;
      price: number;
    } | null;
    threads: {
      id: string;
      name: string;
      price: number;
    }[];
    backing: {
      id: string;
      name: string;
      price: number;
    } | null;
    upgrades: {
      id: string;
      name: string;
      price: number;
    }[];
    cutting: {
      id: string;
      name: string;
      price: number;
    } | null;
  };
  materialCosts: {
    fabricCost: number;
    patchAttachCost: number;
    threadCost: number;
    bobbinCost: number;
    cutAwayStabilizerCost: number;
    washAwayStabilizerCost: number;
    totalCost: number;
  };
  optionsPrice: number;
  totalPrice: number;
  status: 'pending' | 'approved' | 'in_production' | 'completed' | 'cancelled';
  notes: string;
  estimatedCompletionDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomEmbroideryRequest {
  designName: string;
  designFile: string;
  designPreview: string;
  dimensions: {
    width: number;
    height: number;
  };
  selectedStyles: {
    coverage: {
      id: string;
      name: string;
      price: number;
    } | null;
    material: {
      id: string;
      name: string;
      price: number;
    } | null;
    border: {
      id: string;
      name: string;
      price: number;
    } | null;
    threads: {
      id: string;
      name: string;
      price: number;
    }[];
    backing: {
      id: string;
      name: string;
      price: number;
    } | null;
    upgrades: {
      id: string;
      name: string;
      price: number;
    }[];
    cutting: {
      id: string;
      name: string;
      price: number;
    } | null;
  };
  notes?: string;
}

class CustomEmbroideryApiService {
  /**
   * Create a new custom embroidery order
   */
  async createOrder(data: CreateCustomEmbroideryRequest): Promise<ApiResponse<CustomEmbroideryOrder>> {
    return apiAuthService.post<CustomEmbroideryOrder>('/custom-embroidery', data, true);
  }

  /**
   * Get user's custom embroidery orders
   */
  async getUserOrders(): Promise<ApiResponse<CustomEmbroideryOrder[]>> {
    return apiAuthService.get<CustomEmbroideryOrder[]>('/custom-embroidery/my-orders', true);
  }

  /**
   * Get all custom embroidery orders (admin)
   */
  async getAllOrders(): Promise<ApiResponse<CustomEmbroideryOrder[]>> {
    return apiAuthService.get<CustomEmbroideryOrder[]>('/custom-embroidery', true);
  }

  /**
   * Get a specific custom embroidery order by ID
   */
  async getOrderById(id: number): Promise<ApiResponse<CustomEmbroideryOrder>> {
    return apiAuthService.get<CustomEmbroideryOrder>(`/custom-embroidery/${id}`, true);
  }

  /**
   * Update order status (admin)
   */
  async updateOrderStatus(id: number, status: string, estimatedCompletionDate?: string): Promise<ApiResponse<CustomEmbroideryOrder>> {
    return apiAuthService.patch<CustomEmbroideryOrder>(`/custom-embroidery/${id}/status`, {
      status,
      estimatedCompletionDate
    }, true);
  }

  /**
   * Delete a custom embroidery order
   */
  async deleteOrder(id: number): Promise<ApiResponse> {
    return apiAuthService.delete(`/custom-embroidery/${id}`, true);
  }
}

// Export singleton instance
export const customEmbroideryApiService = new CustomEmbroideryApiService();
export default customEmbroideryApiService;
