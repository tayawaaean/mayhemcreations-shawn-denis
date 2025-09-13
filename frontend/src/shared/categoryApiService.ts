import { envConfig } from './envConfig';

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

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    requireAuth: boolean = false
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
   * Get all categories with optional filtering
   */
  async getCategories(filters: CategoryFilters = {}): Promise<{
    success: boolean;
    data: Category[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
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
    const endpoint = queryString ? `?${queryString}` : '';

    return this.makeRequest<{
      success: boolean;
      data: Category[];
      pagination?: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>(endpoint, {}, false); // No auth required
  }

  /**
   * Get a single category by ID
   */
  async getCategoryById(id: number, includeChildren: boolean = true): Promise<{
    success: boolean;
    data: Category;
  }> {
    return this.makeRequest<{
      success: boolean;
      data: Category;
    }>(`/${id}?includeChildren=${includeChildren}`, {}, false); // No auth required
  }

  /**
   * Create a new category
   */
  async createCategory(categoryData: CategoryCreateData): Promise<{
    success: boolean;
    data: Category;
    message: string;
  }> {
    return this.makeRequest<{
      success: boolean;
      data: Category;
      message: string;
    }>('', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    }, false); // No auth required
  }

  /**
   * Update a category
   */
  async updateCategory(id: number, categoryData: CategoryUpdateData): Promise<{
    success: boolean;
    data: Category;
    message: string;
  }> {
    return this.makeRequest<{
      success: boolean;
      data: Category;
      message: string;
    }>(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(categoryData),
    }, false); // No auth required
  }

  /**
   * Delete a category
   */
  async deleteCategory(id: number, force: boolean = false): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.makeRequest<{
      success: boolean;
      message: string;
    }>(`/${id}?force=${force}`, {
      method: 'DELETE',
    }, false); // No auth required
  }

  /**
   * Get category statistics
   */
  async getCategoryStats(): Promise<{
    success: boolean;
    data: CategoryStats;
  }> {
    return this.makeRequest<{
      success: boolean;
      data: CategoryStats;
    }>('/stats', {}, false); // No auth required
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
    return response.data;
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
    return response.data;
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
    return response.data;
  }
}

// Export singleton instance
export const categoryApiService = new CategoryApiService();
export default categoryApiService;
