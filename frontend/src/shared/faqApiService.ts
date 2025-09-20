import { envConfig } from './envConfig';
import { apiAuthService, ApiResponse } from './apiAuthService';

export interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface CreateFAQData {
  question: string;
  answer: string;
  category: string;
  sortOrder?: number;
  status?: 'active' | 'inactive';
}

export interface UpdateFAQData extends Partial<CreateFAQData> {}

export interface FAQFilters {
  status?: 'active' | 'inactive';
  category?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

export interface FAQOrderUpdate {
  id: number;
  sortOrder: number;
}

class FAQApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${envConfig.getApiBaseUrl()}/faqs`;
  }

  /**
   * Get all FAQs with optional filtering
   */
  async getFAQs(filters: FAQFilters = {}): Promise<ApiResponse<FAQ[]>> {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.category) params.append('category', filters.category);
    if (filters.search) params.append('search', filters.search);
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const endpoint = `/faqs${queryString ? `?${queryString}` : ''}`;

    return apiAuthService.get<FAQ[]>(endpoint, false); // No auth required for public read
  }

  /**
   * Get a single FAQ by ID
   */
  async getFAQById(id: number): Promise<ApiResponse<FAQ>> {
    return apiAuthService.get<FAQ>(`/faqs/${id}`, false); // No auth required for public read
  }

  /**
   * Create a new FAQ (Admin only)
   */
  async createFAQ(faqData: CreateFAQData): Promise<ApiResponse<FAQ>> {
    return apiAuthService.post<FAQ>(`/faqs`, faqData, true); // Auth required
  }

  /**
   * Update an existing FAQ (Admin only)
   */
  async updateFAQ(id: number, faqData: UpdateFAQData): Promise<ApiResponse<FAQ>> {
    return apiAuthService.put<FAQ>(`/faqs/${id}`, faqData, true); // Auth required
  }

  /**
   * Delete an FAQ (Admin only)
   */
  async deleteFAQ(id: number): Promise<ApiResponse> {
    return apiAuthService.delete(`/faqs/${id}`, true); // Auth required
  }

  /**
   * Toggle FAQ status (Admin only)
   */
  async toggleFAQStatus(id: number): Promise<ApiResponse<FAQ>> {
    return apiAuthService.patch<FAQ>(`/faqs/${id}/toggle`, {}, true); // Auth required
  }

  /**
   * Update FAQ sort order (Admin only)
   */
  async updateFAQsOrder(faqs: FAQOrderUpdate[]): Promise<ApiResponse> {
    return apiAuthService.put(`/faqs/order`, { faqs }, true); // Auth required
  }

  /**
   * Get FAQ categories
   */
  async getFAQCategories(): Promise<ApiResponse<string[]>> {
    return apiAuthService.get<string[]>(`/faqs/categories`, false); // No auth required for public read
  }

  /**
   * Get active FAQs for public display
   */
  async getActiveFAQs(): Promise<ApiResponse<FAQ[]>> {
    return this.getFAQs({ status: 'active', sortBy: 'sortOrder', sortOrder: 'ASC' });
  }

  /**
   * Get FAQs by category
   */
  async getFAQsByCategory(category: string): Promise<ApiResponse<FAQ[]>> {
    return this.getFAQs({ category, status: 'active', sortBy: 'sortOrder', sortOrder: 'ASC' });
  }
}

export const faqApiService = new FAQApiService();

