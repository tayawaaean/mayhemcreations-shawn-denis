import { envConfig } from './envConfig';

export interface Product {
  id: number;
  title: string;
  slug: string;
  description: string;
  price: number;
  image: string;
  alt: string;
  categoryId: number;
  subcategoryId?: number;
  status: 'active' | 'inactive' | 'draft';
  featured: boolean;
  badges?: string[];
  availableColors?: string[];
  availableSizes?: string[];
  averageRating?: number;
  totalReviews?: number;
  stock?: number;
  sku?: string;
  weight?: number;
  dimensions?: string;
  materials?: string[];
  careInstructions?: string;
  createdAt: string;
  updatedAt: string;
  category?: {
    id: number;
    name: string;
    slug: string;
  };
  subcategory?: {
    id: number;
    name: string;
    slug: string;
  };
}

export interface CreateProductData {
  title: string;
  slug: string;
  description: string;
  price: number;
  image: string;
  alt: string;
  categoryId: number;
  subcategoryId?: number;
  status?: 'active' | 'inactive' | 'draft';
  featured?: boolean;
  badges?: string[];
  availableColors?: string[];
  availableSizes?: string[];
  averageRating?: number;
  totalReviews?: number;
  stock?: number;
  sku?: string;
  weight?: number;
  dimensions?: string;
  materials?: string[];
  careInstructions?: string;
}

export interface ProductFilters {
  categoryId?: number;
  subcategoryId?: number;
  status?: 'active' | 'inactive' | 'draft';
  featured?: boolean;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

export interface ProductCreateData {
  title: string;
  slug: string;
  description: string;
  price: number;
  image: string;
  alt: string;
  categoryId: number;
  subcategoryId?: number;
  status?: 'active' | 'inactive' | 'draft';
  featured?: boolean;
  badges?: string[];
  availableColors?: string[];
  availableSizes?: string[];
  averageRating?: number;
  totalReviews?: number;
  stock?: number;
  sku?: string;
  weight?: number;
  dimensions?: string;
  materials?: string[];
  careInstructions?: string;
}

export interface ProductStats {
  total: number;
  active: number;
  inactive: number;
  draft: number;
  featured: number;
  outOfStock: number;
}

class ProductApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${envConfig.getApiBaseUrl()}/products`;
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
   * Get all products with optional filtering and pagination
   */
  async getProducts(filters: ProductFilters = {}): Promise<{
    success: boolean;
    data: Product[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const params = new URLSearchParams();
    
    if (filters.categoryId) params.append('categoryId', filters.categoryId.toString());
    if (filters.subcategoryId) params.append('subcategoryId', filters.subcategoryId.toString());
    if (filters.status) params.append('status', filters.status);
    if (filters.featured !== undefined) params.append('featured', filters.featured.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.minPrice !== undefined) params.append('minPrice', filters.minPrice.toString());
    if (filters.maxPrice !== undefined) params.append('maxPrice', filters.maxPrice.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const endpoint = queryString ? `?${queryString}` : '';

    return this.makeRequest<{
      success: boolean;
      data: Product[];
      pagination?: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>(endpoint, {}, false); // No auth required
  }

  /**
   * Get a single product by ID
   */
  async getProductById(id: number): Promise<{
    success: boolean;
    data: Product;
  }> {
    return this.makeRequest<{
      success: boolean;
      data: Product;
    }>(`/${id}`, {}, false); // No auth required
  }

  /**
   * Get a single product by slug
   */
  async getProductBySlug(slug: string): Promise<{
    success: boolean;
    data: Product;
  }> {
    return this.makeRequest<{
      success: boolean;
      data: Product;
    }>(`/slug/${slug}`, {}, false); // No auth required
  }

  /**
   * Create a new product
   */
  async createProduct(productData: ProductCreateData): Promise<{
    success: boolean;
    data: Product;
    message: string;
  }> {
    return this.makeRequest<{
      success: boolean;
      data: Product;
      message: string;
    }>('', {
      method: 'POST',
      body: JSON.stringify(productData),
    }, false); // No auth required
  }

  /**
   * Update an existing product
   */
  async updateProduct(id: number, productData: Partial<ProductCreateData>): Promise<{
    success: boolean;
    data: Product;
    message: string;
  }> {
    return this.makeRequest<{
      success: boolean;
      data: Product;
      message: string;
    }>(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    }, false); // No auth required
  }

  /**
   * Delete a product
   */
  async deleteProduct(id: number): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.makeRequest<{
      success: boolean;
      message: string;
    }>(`/${id}`, {
      method: 'DELETE',
    }, false); // No auth required
  }

  /**
   * Get product statistics
   */
  async getProductStats(): Promise<{
    success: boolean;
    data: ProductStats;
  }> {
    return this.makeRequest<{
      success: boolean;
      data: ProductStats;
    }>('/stats', {}, false); // No auth required
  }

  /**
   * Get products by category slug
   */
  async getProductsByCategory(categorySlug: string, subcategorySlug?: string): Promise<{
    success: boolean;
    data: Product[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    // First get the category ID from the category API
    const categoryResponse = await fetch(`${envConfig.getApiBaseUrl()}/categories?slug=${categorySlug}`);
    const categoryData = await categoryResponse.json();
    
    if (!categoryData.success || !categoryData.data.length) {
      throw new Error('Category not found');
    }

    const category = categoryData.data[0];
    let subcategoryId: number | undefined;

    if (subcategorySlug) {
      const subcategory = category.children?.find((child: any) => child.slug === subcategorySlug);
      if (subcategory) {
        subcategoryId = subcategory.id;
      }
    }

    return this.getProducts({
      categoryId: category.id,
      subcategoryId,
      status: 'active'
    });
  }
}

export const productApiService = new ProductApiService();
