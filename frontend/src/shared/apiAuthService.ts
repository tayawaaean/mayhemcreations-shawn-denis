/**
 * Unified API Authentication Service
 * Provides consistent authentication handling for all API services
 */

import AuthStorageService from './authStorage';
import MultiAccountStorageService from './multiAccountStorage';
import { envConfig } from './envConfig';

export interface ApiRequestOptions extends RequestInit {
  requireAuth?: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any[];
  timestamp: string;
}

class ApiAuthService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = envConfig.getApiBaseUrl();
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

    const url = `${this.baseUrl}${endpoint}`;
    
    // If authentication is required, ensure a session exists
    if (requireAuth) {
      const isAuthenticated = AuthStorageService.isAuthenticated() || 
                             MultiAccountStorageService.isAccountAuthenticated('customer');
      
      if (!isAuthenticated) {
        return {
          success: false,
          message: 'Authentication required',
          errors: [{ code: 'AUTH_REQUIRED', message: 'Authentication required' }],
          timestamp: new Date().toISOString(),
        };
      }
    }

    const config: RequestInit = {
      ...requestOptions,
      headers: {
        ...this.getAuthHeaders(),
        ...requestOptions.headers,
      },
      credentials: 'include', // Include cookies for session management
    };

    try {
      console.log('Making API request to:', url);
      console.log('Request config:', config);
      const response = await fetch(url, config);
      const data = await response.json();
      console.log('API response status:', response.status);
      console.log('API response data:', data);

      // Handle 401 Unauthorized - session might be expired
      if (response.status === 401 && requireAuth) {
        return {
          success: false,
          message: 'Authentication required - please login',
          errors: ['AUTHENTICATION_REQUIRED'],
          timestamp: new Date().toISOString(),
        };
      }

      if (!response.ok) {
        return {
          success: false,
          message: data.message || `HTTP ${response.status}: ${response.statusText}`,
          errors: data.errors || [],
          timestamp: new Date().toISOString(),
        };
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('API request failed:', error);
      return {
        success: false,
        message: error.message || 'Network error occurred',
        errors: [error.message],
        timestamp: new Date().toISOString(),
      };
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
