/**
 * Unified API Authentication Service
 * Provides consistent authentication handling for all API services
 */

import AuthStorageService from './authStorage';
import MultiAccountStorageService from './multiAccountStorage';
import { envConfig } from './envConfig';
import { apiClient } from './axiosConfig';

export interface ApiRequestOptions extends RequestInit {
  requireAuth?: boolean;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any[];
  timestamp: string;
  pagination?: PaginationInfo;
}

class ApiAuthService {
  private baseUrl: string;

  constructor() {
    // In development, use relative URL to leverage Vite proxy
    const apiUrl = envConfig.getApiBaseUrl();
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      // Use relative URL in development to leverage Vite proxy
      this.baseUrl = '/api/v1';
    } else {
      this.baseUrl = apiUrl;
    }
  }

  /**
   * Get authentication headers
   * Note: Backend uses session-based authentication (cookies), not token-based
   */
  private getAuthHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      // Note: Authentication is handled via cookies (credentials: 'include')
      // No Authorization header needed for session-based auth
    };
  }

  // Token refresh not needed for session-based authentication

  /**
   * Make authenticated API request using session-based authentication
   */
  async request<T = any>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const { requireAuth = true, ...requestOptions } = options;

    try {
      console.log('Making API request to:', endpoint);
      
      // Use axios client with automatic token refresh
      const response = await apiClient.request({
        url: endpoint,
        method: requestOptions.method || 'GET',
        data: requestOptions.body ? JSON.parse(requestOptions.body as string) : undefined,
        headers: requestOptions.headers,
        ...requestOptions,
      });

      console.log('API response status:', response.status);
      console.log('API response data:', response.data);
      
      return response.data;
    } catch (error: any) {
      console.error('API request error:', error);
      
      // Handle axios errors
      if (error.response) {
        // Server responded with error status
        return {
          success: false,
          message: error.response.data?.message || `HTTP ${error.response.status}: ${error.response.statusText}`,
          errors: error.response.data?.errors || [error.response.data?.message || 'Request failed'],
          timestamp: new Date().toISOString(),
        };
      } else if (error.request) {
        // Network error
        return {
          success: false,
          message: 'Network error - please check your connection',
          errors: ['NETWORK_ERROR'],
          timestamp: new Date().toISOString(),
        };
      } else {
        // Other error
        return {
          success: false,
          message: error.message || 'An error occurred',
          errors: [error.message || 'Request failed'],
          timestamp: new Date().toISOString(),
        };
      }
    }
  }

  /**
   * Make GET request
   */
  async get<T = any>(endpoint: string, requireAuth: boolean = true): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'GET',
      requireAuth,
    });
  }

  /**
   * Make POST request
   */
  async post<T = any>(
    endpoint: string, 
    data?: any, 
    requireAuth: boolean = true
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      requireAuth,
    });
  }

  /**
   * Make PUT request
   */
  async put<T = any>(
    endpoint: string, 
    data?: any, 
    requireAuth: boolean = true
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      requireAuth,
    });
  }

  /**
   * Make PATCH request
   */
  async patch<T = any>(
    endpoint: string, 
    data?: any, 
    requireAuth: boolean = true
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      requireAuth,
    });
  }

  /**
   * Make DELETE request
   */
  async delete<T = any>(endpoint: string, requireAuth: boolean = true): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      requireAuth,
    });
  }

  /**
   * Check if user is authenticated (supports both single and multi-account)
   */
  isAuthenticated(): boolean {
    return AuthStorageService.isAuthenticated() || 
           MultiAccountStorageService.isAccountAuthenticated('customer');
  }

  /**
   * Get current user (supports both single and multi-account)
   */
  getCurrentUser() {
    const singleUser = AuthStorageService.getUser();
    if (singleUser) return singleUser;
    
    const multiUser = MultiAccountStorageService.getAccountAuthData('customer')?.user;
    return multiUser || null;
  }

  /**
   * Get user role (supports both single and multi-account)
   */
  getUserRole(): string | null {
    const singleRole = AuthStorageService.getUserRole();
    if (singleRole) return singleRole;
    
    const multiUser = MultiAccountStorageService.getAccountAuthData('customer')?.user;
    return multiUser?.role || null;
  }

  /**
   * Check if user has specific role (supports both single and multi-account)
   */
  hasRole(roleName: string): boolean {
    const singleHasRole = AuthStorageService.hasRole(roleName);
    if (singleHasRole) return true;
    
    const multiUser = MultiAccountStorageService.getAccountAuthData('customer')?.user;
    return multiUser?.role === roleName || false;
  }

  /**
   * Check if user has any of the specified roles (supports both single and multi-account)
   */
  hasAnyRole(roleNames: string[]): boolean {
    const singleHasAnyRole = AuthStorageService.hasAnyRole(roleNames);
    if (singleHasAnyRole) return true;
    
    const multiUser = MultiAccountStorageService.getAccountAuthData('customer')?.user;
    return multiUser ? roleNames.includes(multiUser.role) : false;
  }
}

// Export singleton instance
export const apiAuthService = new ApiAuthService();
export default apiAuthService;
