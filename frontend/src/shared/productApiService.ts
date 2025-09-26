import { envConfig } from './envConfig';
import { apiAuthService, ApiResponse } from './apiAuthService';

export interface ProductVariant {
  id: number;
  name: string;
  color?: string;
  colorHex?: string;
  size?: string;
  sku: string;
  stock: number;
  price?: number;
  isActive: boolean;
}

export interface Product {
  id: number;
  title: string;
  slug: string;
  description: string;
  price: number;
  image: string;
  images?: string[];
  primaryImageIndex?: number;
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
  hasSizing?: boolean;
  createdAt: string;
  updatedAt: string;
  variants?: ProductVariant[];
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
  images?: string[];
  primaryImageIndex?: number;
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

  /**
   * Get all products with optional filtering and pagination
   */
  async getProducts(filters: ProductFilters = {}): Promise<ApiResponse<Product[]>> {
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
    const endpoint = `/products${queryString ? `?${queryString}` : ''}`;

    return apiAuthService.get<Product[]>(endpoint, false); // No auth required for public read
  }

  /**
   * Get a single product by ID
   */
  async getProductById(id: number): Promise<ApiResponse<Product>> {
    return apiAuthService.get<Product>(`/products/${id}`, false); // No auth required for public read
  }

  /**
   * Get a single product by slug
   */
  async getProductBySlug(slug: string): Promise<ApiResponse<Product>> {
    return apiAuthService.get<Product>(`/products/slug/${slug}`, false); // No auth required for public read
  }

  /**
   * Create a new product (Admin/Seller only)
   */
  async createProduct(productData: ProductCreateData): Promise<ApiResponse<Product>> {
    return apiAuthService.post<Product>(`/products`, productData, true); // Auth required
  }

  /**
   * Update an existing product (Admin/Seller only)
   */
  async updateProduct(id: number, productData: Partial<ProductCreateData>): Promise<ApiResponse<Product>> {
    return apiAuthService.put<Product>(`/products/${id}`, productData, true); // Auth required
  }

  /**
   * Delete a product (Admin/Seller only)
   */
  async deleteProduct(id: number): Promise<ApiResponse> {
    return apiAuthService.delete(`/products/${id}`, true); // Auth required
  }

  /**
   * Get product statistics
   */
  async getProductStats(): Promise<ApiResponse<ProductStats>> {
    return apiAuthService.get<ProductStats>(`/products/stats`, false); // No auth required for public read
  }

  /**
   * Get products by category slug
   */
  async getProductsByCategory(categorySlug: string, subcategorySlug?: string): Promise<ApiResponse<Product[]>> {
    // First get the category ID from the category API
    const categoryResponse = await apiAuthService.get(`/categories?slug=${categorySlug}`, false);
    
    if (!categoryResponse.success || !categoryResponse.data?.length) {
      return {
        success: false,
        message: 'Category not found',
        errors: ['CATEGORY_NOT_FOUND'],
        timestamp: new Date().toISOString(),
      };
    }

    const category = categoryResponse.data[0];
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
