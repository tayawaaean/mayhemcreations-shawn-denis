import { envConfig } from './envConfig';

export interface Variant {
  id: number;
  productId: number;
  name: string;
  color?: string;
  colorHex?: string;
  size?: string;
  sku: string;
  stock: number;
  price?: number;
  image?: string;
  weight?: number;
  dimensions?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  product?: {
    id: number;
    title: string;
    slug: string;
    price: number;
    image: string;
    category?: {
      id: number;
      name: string;
      slug: string;
    };
  };
}

export interface CreateVariantData {
  productId: number;
  name: string;
  color?: string;
  colorHex?: string;
  size?: string;
  sku: string;
  stock?: number;
  price?: number;
  image?: string;
  weight?: number;
  dimensions?: string;
  isActive?: boolean;
}

export interface VariantFilters {
  productId?: number;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface VariantInventoryUpdate {
  variantId: number;
  quantity: number;
  operation: 'add' | 'subtract' | 'set';
  reason?: string;
}

export interface VariantInventoryUpdateResponse {
  variantId: number;
  name: string;
  sku: string;
  previousStock: number;
  newStock: number;
  operation: string;
  quantity: number;
  reason: string | null;
}

export interface VariantInventoryStatus {
  variants: Variant[];
  statistics: {
    total: number;
    outOfStock: number;
    lowStock: number;
    lowStockThreshold: number;
  };
}

class VariantApiService {
  private baseUrl = `${envConfig.getApiBaseUrl()}/variants`;

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
   * Get all variants with optional filtering
   */
  async getVariants(filters: VariantFilters = {}): Promise<{
    success: boolean;
    data: Variant[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const params = new URLSearchParams();
    
    if (filters.productId) params.append('productId', filters.productId.toString());
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

    const queryString = params.toString();
    const endpoint = `${queryString ? `?${queryString}` : ''}`;

    return this.makeRequest<{
      success: boolean;
      data: Variant[];
      pagination?: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>(endpoint, {
      method: 'GET',
    });
  }

  /**
   * Get a single variant by ID
   */
  async getVariantById(id: number): Promise<{
    success: boolean;
    data: Variant;
  }> {
    return this.makeRequest<{
      success: boolean;
      data: Variant;
    }>(`/${id}`, {
      method: 'GET',
    });
  }

  /**
   * Create a new variant
   */
  async createVariant(variantData: CreateVariantData): Promise<{
    success: boolean;
    data: Variant;
    message: string;
  }> {
    return this.makeRequest<{
      success: boolean;
      data: Variant;
      message: string;
    }>('', {
      method: 'POST',
      body: JSON.stringify(variantData),
    });
  }

  /**
   * Update a variant
   */
  async updateVariant(id: number, variantData: Partial<CreateVariantData>): Promise<{
    success: boolean;
    data: Variant;
    message: string;
  }> {
    return this.makeRequest<{
      success: boolean;
      data: Variant;
      message: string;
    }>(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(variantData),
    });
  }

  /**
   * Delete a variant
   */
  async deleteVariant(id: number): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.makeRequest<{
      success: boolean;
      message: string;
    }>(`/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Update variant inventory (add or subtract stock)
   */
  async updateVariantInventory(
    variantId: number, 
    quantity: number, 
    operation: 'add' | 'subtract' | 'set', 
    reason?: string
  ): Promise<VariantInventoryUpdateResponse> {
    const response = await this.makeRequest<{
      success: boolean;
      data: VariantInventoryUpdateResponse;
      message: string;
    }>(`/${variantId}/inventory`, {
      method: 'PUT',
      body: JSON.stringify({ quantity, operation, reason }),
    });

    if (!response.success) {
      throw new Error(response.message || 'Failed to update variant inventory');
    }

    return response.data;
  }

  /**
   * Get variant inventory status
   */
  async getVariantInventoryStatus(
    lowStockThreshold?: number,
    outOfStock?: boolean,
    productId?: number
  ): Promise<VariantInventoryStatus> {
    const params = new URLSearchParams();
    if (lowStockThreshold !== undefined) {
      params.append('lowStockThreshold', lowStockThreshold.toString());
    }
    if (outOfStock !== undefined) {
      params.append('outOfStock', outOfStock.toString());
    }
    if (productId !== undefined) {
      params.append('productId', productId.toString());
    }

    const queryString = params.toString();
    const endpoint = `/inventory/status${queryString ? `?${queryString}` : ''}`;

    const response = await this.makeRequest<{
      success: boolean;
      data: VariantInventoryStatus;
      message: string;
    }>(endpoint, {
      method: 'GET',
    });

    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch variant inventory status');
    }

    return response.data;
  }

  /**
   * Quick stock adjustment (add or subtract)
   */
  async adjustVariantStock(
    variantId: number, 
    adjustment: number, 
    reason?: string
  ): Promise<VariantInventoryUpdateResponse> {
    const operation = adjustment >= 0 ? 'add' : 'subtract';
    const quantity = Math.abs(adjustment);
    
    return this.updateVariantInventory(variantId, quantity, operation, reason);
  }

  /**
   * Set variant stock to a specific value
   */
  async setVariantStock(
    variantId: number, 
    stock: number, 
    reason?: string
  ): Promise<VariantInventoryUpdateResponse> {
    return this.updateVariantInventory(variantId, stock, 'set', reason);
  }
}

export const variantApiService = new VariantApiService();
