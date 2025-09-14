import { envConfig } from './envConfig';

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

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Update inventory for a single product
   */
  async updateInventory(
    productId: number, 
    quantity: number, 
    operation: 'add' | 'subtract' | 'set', 
    reason?: string
  ): Promise<InventoryUpdateResponse> {
    const response = await this.makeRequest<{
      success: boolean;
      data: InventoryUpdateResponse;
      message: string;
    }>(`/${productId}/inventory`, {
      method: 'PUT',
      body: JSON.stringify({ quantity, operation, reason }),
    });

    if (!response.success) {
      throw new Error(response.message || 'Failed to update inventory');
    }

    return response.data;
  }

  /**
   * Get inventory status for products
   */
  async getInventoryStatus(
    lowStockThreshold?: number,
    outOfStock?: boolean
  ): Promise<InventoryStatus> {
    const params = new URLSearchParams();
    if (lowStockThreshold !== undefined) {
      params.append('lowStockThreshold', lowStockThreshold.toString());
    }
    if (outOfStock !== undefined) {
      params.append('outOfStock', outOfStock.toString());
    }

    const queryString = params.toString();
    const endpoint = `/inventory/status${queryString ? `?${queryString}` : ''}`;

    const response = await this.makeRequest<{
      success: boolean;
      data: InventoryStatus;
      message: string;
    }>(endpoint, {
      method: 'GET',
    });

    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch inventory status');
    }

    return response.data;
  }

  /**
   * Bulk update inventory for multiple products
   */
  async bulkUpdateInventory(updates: InventoryUpdate[]): Promise<BulkUpdateResponse> {
    const response = await this.makeRequest<{
      success: boolean;
      data: BulkUpdateResponse;
      message: string;
    }>('/inventory/bulk', {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });

    if (!response.success) {
      throw new Error(response.message || 'Failed to perform bulk inventory update');
    }

    return response.data;
  }

  /**
   * Quick stock adjustment (add or subtract)
   */
  async adjustStock(
    productId: number, 
    adjustment: number, 
    reason?: string
  ): Promise<InventoryUpdateResponse> {
    const operation = adjustment >= 0 ? 'add' : 'subtract';
    const quantity = Math.abs(adjustment);
    
    return this.updateInventory(productId, quantity, operation, reason);
  }

  /**
   * Set stock to a specific value
   */
  async setStock(
    productId: number, 
    stock: number, 
    reason?: string
  ): Promise<InventoryUpdateResponse> {
    return this.updateInventory(productId, stock, 'set', reason);
  }
}

export const inventoryApiService = new InventoryApiService();
