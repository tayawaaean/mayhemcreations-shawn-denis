import { envConfig } from './envConfig';
import { apiAuthService, ApiResponse } from './apiAuthService';

export interface InventoryUpdate {
  productId: number;
  quantity: number;
  operation: 'add' | 'subtract' | 'set';
  reason?: string;
}

export interface InventoryUpdateResponse {
  productId: number;
  title: string;
  previousStock: number;
  newStock: number;
  operation: string;
  quantity: number;
  reason: string | null;
}

export interface InventoryStatus {
  products: Array<{
    id: number;
    title: string;
    slug: string;
    sku: string;
    stock: number;
    status: string;
    price: number;
    category?: {
      id: number;
      name: string;
      slug: string;
    };
  }>;
  statistics: {
    total: number;
    outOfStock: number;
    lowStock: number;
    lowStockThreshold: number;
  };
}

export interface BulkUpdateResponse {
  successful: InventoryUpdateResponse[];
  failed: Array<{
    productId: number;
    error: string;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

class InventoryApiService {
  private baseUrl = `${envConfig.getApiBaseUrl()}/products`;

  /**
   * Update inventory for a single product (Admin/Seller only)
   */
  async updateInventory(
    productId: number, 
    quantity: number, 
    operation: 'add' | 'subtract' | 'set', 
    reason?: string
  ): Promise<ApiResponse<InventoryUpdateResponse>> {
    return apiAuthService.put<InventoryUpdateResponse>(
      `/products/${productId}/inventory`, 
      { quantity, operation, reason }, 
      true
    ); // Auth required
  }

  /**
   * Get inventory status for products
   */
  async getInventoryStatus(
    lowStockThreshold?: number,
    outOfStock?: boolean
  ): Promise<ApiResponse<InventoryStatus>> {
    const params = new URLSearchParams();
    if (lowStockThreshold !== undefined) {
      params.append('lowStockThreshold', lowStockThreshold.toString());
    }
    if (outOfStock !== undefined) {
      params.append('outOfStock', outOfStock.toString());
    }

    const queryString = params.toString();
    const endpoint = `/products/inventory/status${queryString ? `?${queryString}` : ''}`;

    return apiAuthService.get<InventoryStatus>(endpoint, false); // No auth required for public read
  }

  /**
   * Bulk update inventory for multiple products (Admin/Seller only)
   */
  async bulkUpdateInventory(updates: InventoryUpdate[]): Promise<ApiResponse<BulkUpdateResponse>> {
    return apiAuthService.put<BulkUpdateResponse>(
      `/products/inventory/bulk`, 
      { updates }, 
      true
    ); // Auth required
  }

  /**
   * Quick stock adjustment (add or subtract) (Admin/Seller only)
   */
  async adjustStock(
    productId: number, 
    adjustment: number, 
    reason?: string
  ): Promise<ApiResponse<InventoryUpdateResponse>> {
    const operation = adjustment >= 0 ? 'add' : 'subtract';
    const quantity = Math.abs(adjustment);
    
    return this.updateInventory(productId, quantity, operation, reason);
  }

  /**
   * Set stock to a specific value (Admin/Seller only)
   */
  async setStock(
    productId: number, 
    stock: number, 
    reason?: string
  ): Promise<ApiResponse<InventoryUpdateResponse>> {
    return this.updateInventory(productId, stock, 'set', reason);
  }
}

export const inventoryApiService = new InventoryApiService();
