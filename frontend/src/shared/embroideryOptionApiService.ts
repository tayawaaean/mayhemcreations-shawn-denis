import { envConfig } from './envConfig';
<<<<<<< HEAD
import { apiAuthService, ApiResponse } from './apiAuthService';
=======
import AuthStorageService from './authStorage';
import MultiAccountStorageService from './multiAccountStorage';
>>>>>>> b077f2f8f611f60b089563063bab35560156112e

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

<<<<<<< HEAD
=======
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    requireAuth: boolean = true
  ): Promise<T> {
    let authHeader = null;
    
    if (requireAuth) {
      // First try to get auth from regular customer auth
      authHeader = AuthStorageService.getAuthHeader();
      
      // If no customer auth, try employee auth (for admin operations)
      if (!authHeader) {
        const employeeAuth = MultiAccountStorageService.getAccountAuthData('employee');
        if (employeeAuth && MultiAccountStorageService.isAccountAuthenticated('employee')) {
          authHeader = `Bearer ${employeeAuth.session.accessToken}`;
        }
      }
    }
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { Authorization: authHeader }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

>>>>>>> b077f2f8f611f60b089563063bab35560156112e
  /**
   * Get all embroidery options with optional filtering
   */
  async getEmbroideryOptions(filters: EmbroideryOptionFilters = {}): Promise<ApiResponse<EmbroideryOption[]>> {
    const params = new URLSearchParams();
    
    if (filters.category) params.append('category', filters.category);
    if (filters.level) params.append('level', filters.level);
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters.isPopular !== undefined) params.append('isPopular', filters.isPopular.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const endpoint = `/embroidery-options${queryString ? `?${queryString}` : ''}`;

    return apiAuthService.get<EmbroideryOption[]>(endpoint, false); // No auth required for public access
  }

  /**
   * Get a single embroidery option by ID
   */
  async getEmbroideryOptionById(id: number): Promise<ApiResponse<EmbroideryOption>> {
    return apiAuthService.get<EmbroideryOption>(`/embroidery-options/${id}`, false); // No auth required for public access
  }

  /**
   * Create a new embroidery option (Admin/Seller only)
   */
  async createEmbroideryOption(embroideryOptionData: CreateEmbroideryOptionData): Promise<ApiResponse<EmbroideryOption>> {
    return apiAuthService.post<EmbroideryOption>(`/embroidery-options`, embroideryOptionData, true); // Auth required
  }

  /**
   * Update an existing embroidery option (Admin/Seller only)
   */
  async updateEmbroideryOption(id: number, embroideryOptionData: Partial<CreateEmbroideryOptionData>): Promise<ApiResponse<EmbroideryOption>> {
    return apiAuthService.put<EmbroideryOption>(`/embroidery-options/${id}`, embroideryOptionData, true); // Auth required
  }

  /**
   * Delete an embroidery option (Admin/Seller only)
   */
  async deleteEmbroideryOption(id: number): Promise<ApiResponse> {
    return apiAuthService.delete(`/embroidery-options/${id}`, true); // Auth required
  }

  /**
   * Toggle embroidery option active status (Admin/Seller only)
   */
  async toggleEmbroideryOptionStatus(id: number, isActive: boolean): Promise<ApiResponse<EmbroideryOption>> {
    return apiAuthService.patch<EmbroideryOption>(`/embroidery-options/${id}/toggle`, { isActive }, true); // Auth required
  }

  /**
   * Get embroidery options by category
   */
  async getEmbroideryOptionsByCategory(category: string): Promise<ApiResponse<EmbroideryOption[]>> {
    return this.getEmbroideryOptions({ category, isActive: true });
  }

  /**
   * Get active embroidery options for ecommerce
   */
  async getActiveEmbroideryOptions(): Promise<ApiResponse<EmbroideryOption[]>> {
    return this.getEmbroideryOptions({ isActive: true });
  }
}

export const embroideryOptionApiService = new EmbroideryOptionApiService();
