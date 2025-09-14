import { envConfig } from './envConfig';

export interface EmbroideryOption {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string; // Base64 encoded image
  stitches: number;
  estimatedTime: string;
  category: 'coverage' | 'threads' | 'material' | 'border' | 'backing' | 'upgrades' | 'cutting';
  level: 'basic' | 'standard' | 'premium' | 'luxury';
  isPopular: boolean;
  isActive: boolean;
  isIncompatible?: string; // JSON string of incompatible option IDs
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmbroideryOptionData {
  name: string;
  description: string;
  price: number;
  image: string;
  stitches: number;
  estimatedTime: string;
  category: 'coverage' | 'threads' | 'material' | 'border' | 'backing' | 'upgrades' | 'cutting';
  level: 'basic' | 'standard' | 'premium' | 'luxury';
  isPopular: boolean;
  isActive: boolean;
  isIncompatible?: string[];
}

export interface EmbroideryOptionFilters {
  category?: string;
  level?: string;
  isActive?: boolean;
  isPopular?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

class EmbroideryOptionApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${envConfig.getApiBaseUrl()}/embroidery-options`;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    requireAuth: boolean = true
  ): Promise<T> {
    const token = localStorage.getItem('authToken');
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(requireAuth && token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get all embroidery options with optional filtering
   */
  async getEmbroideryOptions(filters: EmbroideryOptionFilters = {}): Promise<{
    success: boolean;
    data: EmbroideryOption[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const params = new URLSearchParams();
    
    if (filters.category) params.append('category', filters.category);
    if (filters.level) params.append('level', filters.level);
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters.isPopular !== undefined) params.append('isPopular', filters.isPopular.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const endpoint = queryString ? `?${queryString}` : '';

    return this.makeRequest<{
      success: boolean;
      data: EmbroideryOption[];
      pagination?: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>(endpoint, {}, false); // No auth required for public access
  }

  /**
   * Get a single embroidery option by ID
   */
  async getEmbroideryOptionById(id: number): Promise<{
    success: boolean;
    data: EmbroideryOption;
  }> {
    return this.makeRequest<{
      success: boolean;
      data: EmbroideryOption;
    }>(`/${id}`, {}, false); // No auth required for public access
  }

  /**
   * Create a new embroidery option
   */
  async createEmbroideryOption(embroideryOptionData: CreateEmbroideryOptionData): Promise<{
    success: boolean;
    data: EmbroideryOption;
    message: string;
  }> {
    return this.makeRequest<{
      success: boolean;
      data: EmbroideryOption;
      message: string;
    }>('', {
      method: 'POST',
      body: JSON.stringify(embroideryOptionData),
    }, true); // Auth required
  }

  /**
   * Update an existing embroidery option
   */
  async updateEmbroideryOption(id: number, embroideryOptionData: Partial<CreateEmbroideryOptionData>): Promise<{
    success: boolean;
    data: EmbroideryOption;
    message: string;
  }> {
    return this.makeRequest<{
      success: boolean;
      data: EmbroideryOption;
      message: string;
    }>(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(embroideryOptionData),
    }, true); // Auth required
  }

  /**
   * Delete an embroidery option
   */
  async deleteEmbroideryOption(id: number): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.makeRequest<{
      success: boolean;
      message: string;
    }>(`/${id}`, {
      method: 'DELETE',
    }, true); // Auth required
  }

  /**
   * Toggle embroidery option active status
   */
  async toggleEmbroideryOptionStatus(id: number, isActive: boolean): Promise<{
    success: boolean;
    data: EmbroideryOption;
    message: string;
  }> {
    return this.makeRequest<{
      success: boolean;
      data: EmbroideryOption;
      message: string;
    }>(`/${id}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }, true); // Auth required
  }

  /**
   * Get embroidery options by category
   */
  async getEmbroideryOptionsByCategory(category: string): Promise<{
    success: boolean;
    data: EmbroideryOption[];
  }> {
    return this.getEmbroideryOptions({ category, isActive: true });
  }

  /**
   * Get active embroidery options for ecommerce
   */
  async getActiveEmbroideryOptions(): Promise<{
    success: boolean;
    data: EmbroideryOption[];
  }> {
    return this.getEmbroideryOptions({ isActive: true });
  }
}

export const embroideryOptionApiService = new EmbroideryOptionApiService();
