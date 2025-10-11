/**
 * Product Review API Service
 * Handles all API calls related to product reviews
 */

import { apiAuthService } from './apiAuthService';

// TypeScript interfaces
export interface ProductReview {
  id: number;
  product_id: number;
  user_id: number;
  order_id: number;
  rating: number;
  title: string;
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  is_verified: boolean;
  helpful_votes: number;
  images?: string;
  admin_response?: string;
  admin_responded_at?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  first_name?: string;
  last_name?: string;
  email?: string;
  product_title?: string;
  product_sku?: string;
}

export interface CreateReviewRequest {
  productId: number;
  orderId: number;
  rating: number;
  title: string;
  comment: string;
  images?: string[];
}

export interface UpdateReviewStatusRequest {
  status: 'pending' | 'approved' | 'rejected';
  adminResponse?: string;
}

export interface ReviewStats {
  totalReviews: number;
  averageRating: string;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export interface ProductReviewsResponse {
  reviews: ProductReview[];
  stats: ReviewStats;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
  timestamp: string;
  error?: string;
}

class ProductReviewApiService {
  /**
   * Create a new product review
   */
  async createReview(reviewData: CreateReviewRequest): Promise<ApiResponse<ProductReview>> {
    try {
      const response = await apiAuthService.post<ProductReview>('/reviews', reviewData, true);
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create review');
    }
  }

  /**
   * Get all approved reviews for a specific product
   */
  async getProductReviews(productId: number): Promise<ApiResponse<ProductReviewsResponse>> {
    try {
      const response = await apiAuthService.get<ProductReviewsResponse>(`/reviews/product/${productId}`, false);
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch product reviews');
    }
  }

  /**
   * Get all reviews by the current user
   */
  async getMyReviews(): Promise<ApiResponse<ProductReview[]>> {
    try {
      const response = await apiAuthService.get<ProductReview[]>('/reviews/my-reviews', true);
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch your reviews');
    }
  }

  /**
   * Get all reviews (Admin only)
   */
  async getAllReviews(status?: 'all' | 'pending' | 'approved' | 'rejected'): Promise<ApiResponse<ProductReview[]>> {
    try {
      const queryParam = status ? `?status=${status}` : '';
      const response = await apiAuthService.get<ProductReview[]>(`/reviews/admin/all${queryParam}`, true);
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch reviews');
    }
  }

  /**
   * Update review status (Admin only)
   */
  async updateReviewStatus(reviewId: number, statusData: UpdateReviewStatusRequest): Promise<ApiResponse<ProductReview>> {
    try {
      const response = await apiAuthService.patch<ProductReview>(`/reviews/admin/${reviewId}/status`, statusData, true);
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update review status');
    }
  }

  /**
   * Delete a review (Admin only)
   */
  async deleteReview(reviewId: number): Promise<ApiResponse<null>> {
    try {
      const response = await apiAuthService.delete<null>(`/reviews/admin/${reviewId}`, true);
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete review');
    }
  }

  /**
   * Mark a review as helpful
   */
  async markReviewHelpful(reviewId: number): Promise<ApiResponse<ProductReview>> {
    try {
      const response = await apiAuthService.post<ProductReview>(`/reviews/${reviewId}/helpful`, {}, false);
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to mark review as helpful');
    }
  }
}

// Export singleton instance
export const productReviewApiService = new ProductReviewApiService();

