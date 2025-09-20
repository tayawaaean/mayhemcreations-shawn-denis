import { envConfig } from './envConfig';
import { apiAuthService, ApiResponse } from './apiAuthService';

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentId?: number;
  status: 'active' | 'inactive';
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  children?: Category[];
  parent?: Category;
}

export interface CategoryCreateData {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentId?: number;
  status: 'active' | 'inactive';
  sortOrder: number;
}

export interface CategoryUpdateData extends Partial<CategoryCreateData> {}

export interface CategoryFilters {
  status?: 'active' | 'inactive';
  parentId?: number | null;
  includeChildren?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

export interface CategoryStats {
  total: number;
  active: number;
  inactive: number;
  rootCategories: number;
  categoriesWithChildren: number;
}

class CategoryApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${envConfig.getApiBaseUrl()}/categories`;
  }

  /**
   * Get all categories with optional filtering
   */
  async getCategories(filters: CategoryFilters = {}): Promise<ApiResponse<Category[]>> {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.parentId !== undefined) {
      params.append('parentId', filters.parentId === null ? 'null' : filters.parentId.toString());
    }
    if (filters.includeChildren !== undefined) {
      params.append('includeChildren', filters.includeChildren.toString());
    }
    if (filters.search) params.append('search', filters.search);
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const endpoint = `/categories${queryString ? `?${queryString}` : ''}`;

    return apiAuthService.get<Category[]>(endpoint, false); // No auth required for public read
  }

  /**
   * Get a single category by ID
   */
  async getCategoryById(id: number, includeChildren: boolean = true): Promise<ApiResponse<Category>> {
    return apiAuthService.get<Category>(`/categories/${id}?includeChildren=${includeChildren}`, false); // No auth required for public read
  }

  /**
   * Create a new category (Admin only)
   */
  async createCategory(categoryData: CategoryCreateData): Promise<ApiResponse<Category>> {
    return apiAuthService.post<Category>(`/categories`, categoryData, true); // Auth required
  }

  /**
   * Update a category (Admin only)
   */
  async updateCategory(id: number, categoryData: CategoryUpdateData): Promise<ApiResponse<Category>> {
    return apiAuthService.put<Category>(`/categories/${id}`, categoryData, true); // Auth required
  }

  /**
   * Delete a category (Admin only)
   */
  async deleteCategory(id: number, force: boolean = false): Promise<ApiResponse> {
    return apiAuthService.delete(`/categories/${id}?force=${force}`, true); // Auth required
  }

  /**
   * Get category statistics
   */
  async getCategoryStats(): Promise<ApiResponse<CategoryStats>> {
    return apiAuthService.get<CategoryStats>(`/categories/stats`, false); // No auth required for public read
  }

  /**
   * Get root categories (categories without parent)
   */
  async getRootCategories(): Promise<Category[]> {
    const response = await this.getCategories({
      parentId: null,
      includeChildren: true,
      sortBy: 'sortOrder',
      sortOrder: 'ASC'
    });
    return response.data || [];
  }

  /**
   * Get active categories only
   */
  async getActiveCategories(includeChildren: boolean = true): Promise<Category[]> {
    const response = await this.getCategories({
      status: 'active',
      includeChildren,
      sortBy: 'sortOrder',
      sortOrder: 'ASC'
    });
    return response.data || [];
  }

  /**
   * Search categories by name or description
   */
  async searchCategories(query: string): Promise<Category[]> {
    const response = await this.getCategories({
      search: query,
      includeChildren: false,
      sortBy: 'name',
      sortOrder: 'ASC'
    });
    return response.data || [];
  }
}

// Export singleton instance
export const categoryApiService = new CategoryApiService();
export default categoryApiService;
