import { envConfig } from './envConfig';
import { apiAuthService, ApiResponse } from './apiAuthService';

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

  /**
   * Get all variants with optional filtering
   */
  async getVariants(filters: VariantFilters = {}): Promise<ApiResponse<Variant[]>> {
    const params = new URLSearchParams();
    
    if (filters.productId) params.append('productId', filters.productId.toString());
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

    const queryString = params.toString();
    const endpoint = `/variants${queryString ? `?${queryString}` : ''}`;

    return apiAuthService.get<Variant[]>(endpoint, false); // No auth required for public read
  }

  /**
   * Get a single variant by ID
   */
  async getVariantById(id: number): Promise<ApiResponse<Variant>> {
    return apiAuthService.get<Variant>(`/variants/${id}`, false); // No auth required for public read
  }

  /**
   * Create a new variant (Admin/Seller only)
   */
  async createVariant(variantData: CreateVariantData): Promise<ApiResponse<Variant>> {
    return apiAuthService.post<Variant>(`/variants`, variantData, true); // Auth required
  }

  /**
   * Update a variant (Admin/Seller only)
   */
  async updateVariant(id: number, variantData: Partial<CreateVariantData>): Promise<ApiResponse<Variant>> {
    return apiAuthService.put<Variant>(`/variants/${id}`, variantData, true); // Auth required
  }

  /**
   * Delete a variant (Admin/Seller only)
   */
  async deleteVariant(id: number): Promise<ApiResponse> {
    return apiAuthService.delete(`/variants/${id}`, true); // Auth required
  }

  /**
   * Update variant inventory (add or subtract stock) (Admin/Seller only)
   */
  async updateVariantInventory(
    variantId: number, 
    quantity: number, 
    operation: 'add' | 'subtract' | 'set', 
    reason?: string
  ): Promise<ApiResponse<VariantInventoryUpdateResponse>> {
    return apiAuthService.put<VariantInventoryUpdateResponse>(
      `/variants/${variantId}/inventory`, 
      { quantity, operation, reason }, 
      true
    ); // Auth required
  }

  /**
   * Get variant inventory status
   */
  async getVariantInventoryStatus(
    lowStockThreshold?: number,
    outOfStock?: boolean,
    productId?: number
  ): Promise<ApiResponse<VariantInventoryStatus>> {
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
    const endpoint = `/variants/inventory/status${queryString ? `?${queryString}` : ''}`;

    return apiAuthService.get<VariantInventoryStatus>(endpoint, false); // No auth required for public read
  }

  /**
   * Quick stock adjustment (add or subtract) (Admin/Seller only)
   */
  async adjustVariantStock(
    variantId: number, 
    adjustment: number, 
    reason?: string
  ): Promise<ApiResponse<VariantInventoryUpdateResponse>> {
    const operation = adjustment >= 0 ? 'add' : 'subtract';
    const quantity = Math.abs(adjustment);
    
    return this.updateVariantInventory(variantId, quantity, operation, reason);
  }

  /**
   * Set variant stock to a specific value (Admin/Seller only)
   */
  async setVariantStock(
    variantId: number, 
    stock: number, 
    reason?: string
  ): Promise<ApiResponse<VariantInventoryUpdateResponse>> {
    return this.updateVariantInventory(variantId, stock, 'set', reason);
  }
}

export const variantApiService = new VariantApiService();
