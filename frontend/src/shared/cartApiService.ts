/**
 * Cart API Service
 * Handles cart operations with database persistence
 */

import { apiAuthService, ApiResponse } from './apiAuthService';

export interface CartItem {
  id?: number;
  productId: string;
  quantity: number;
  customization?: {
    design: {
      name: string;
      size: number;
      preview: string;
    } | null;
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
  };
  product?: any; // Product details from backend
}

class CartApiService {
  /**
   * Get user's cart items from database
   */
  async getCart(): Promise<ApiResponse<CartItem[]>> {
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
