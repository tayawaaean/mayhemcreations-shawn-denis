/**
 * Cart API Service
 * Handles cart operations with database persistence
 */

import { apiAuthService, ApiResponse } from './apiAuthService';
import MultiAccountStorageService from './multiAccountStorage';

export interface CartItem {
  id?: number;
  productId: string;
  quantity: number;
  reviewStatus: 'pending' | 'approved' | 'rejected' | 'needs-changes';
  customization?: {
    design: {
      name: string;
      size: number;
      preview: string;
      base64?: string;
    } | null;
    mockup?: string;
    selectedStyles: {
      coverage: { id: string; name: string; price: number } | null;
      material: { id: string; name: string; price: number } | null;
      border: { id: string; name: string; price: number } | null;
      threads: { id: string; name: string; price: number }[];
      backing: { id: string; name: string; price: number } | null;
      upgrades: { id: string; name: string; price: number }[];
      cutting: { id: string; name: string; price: number } | null;
    };
    placement: 'front' | 'back' | 'left-chest' | 'right-chest' | 'sleeve' | 'manual';
    size: 'small' | 'medium' | 'large' | 'extra-large' | '';
    color: string;
    notes: string;
    designPosition: {
      x: number;
      y: number;
    };
    designScale: number;
    designRotation: number;
    // Embroidery-specific data
    embroideryData?: {
      dimensions: {
        width: number;
        height: number;
      };
      materialCosts: {
        fabricCost: number;
        patchAttachCost: number;
        threadCost: number;
        bobbinCost: number;
        cutAwayStabilizerCost: number;
        washAwayStabilizerCost: number;
        totalCost: number;
      };
      optionsPrice: number;
      totalPrice: number;
      reviewStatus: 'pending' | 'approved' | 'rejected' | 'needs-changes';
    };
  };
  product?: any; // Product details from backend
}

class CartApiService {
  /**
   * Get user's cart items from database
   * Only call this when user is logged in - will return 403 if not authenticated
   */
  async getCart(): Promise<ApiResponse<CartItem[]>> {
    // Check authentication status before making API call to prevent 403 errors
    // This prevents the API call from being made when user is not logged in
    try {
      const isAuthenticated = MultiAccountStorageService.isAccountAuthenticated('customer');
      
      if (!isAuthenticated) {
        // Return error response without making API call - prevents 403 errors
        // No console.error or API call - just return silently
        return {
          success: false,
          message: 'Authentication required',
          errors: ['AUTH_REQUIRED'],
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      // If check fails, assume not authenticated - return error without making API call
      return {
        success: false,
        message: 'Authentication required',
        errors: ['AUTH_REQUIRED'],
        timestamp: new Date().toISOString(),
      };
    }
    
    // User is authenticated, proceed with API call
    return apiAuthService.get<CartItem[]>('/cart', true);
  }

  /**
   * Add item to cart in database
   */
  async addToCart(
    productId: string, 
    quantity: number = 1, 
    customization?: CartItem['customization']
  ): Promise<ApiResponse<CartItem>> {
    return apiAuthService.post<CartItem>('/cart', {
      productId,
      quantity,
      customization,
    }, true);
  }

  /**
   * Update cart item quantity in database
   */
  async updateCartItem(
    itemId: number, 
    quantity: number, 
    customization?: CartItem['customization']
  ): Promise<ApiResponse<CartItem>> {
    return apiAuthService.put<CartItem>(`/cart/${itemId}`, {
      quantity,
      customization,
    }, true);
  }

  /**
   * Remove item from cart in database
   */
  async removeFromCart(itemId: number): Promise<ApiResponse> {
    return apiAuthService.delete(`/cart/${itemId}`, true);
  }

  /**
   * Clear user's cart in database
   */
  async clearCart(): Promise<ApiResponse> {
    return apiAuthService.delete('/cart', true);
  }

  /**
   * Sync cart from localStorage to database
   */
  async syncCart(items: CartItem[]): Promise<ApiResponse<CartItem[]>> {
    return apiAuthService.post<CartItem[]>('/cart/sync', { items }, true);
  }
}

// Export singleton instance
export const cartApiService = new CartApiService();
export default cartApiService;
