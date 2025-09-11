/**
 * API Service for Admin Dashboard
 * Handles all API calls to the backend
 */

import AuthStorageService from '../../shared/authStorage';
import { envConfig } from '../../shared/envConfig';

const API_BASE_URL = envConfig.getApiBaseUrl();

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any[];
  timestamp: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  role: {
    id: number;
    name: string;
    displayName: string;
    permissions: string[];
  };
}

interface UserListResponse {
  users: User[];
  pagination: PaginationInfo;
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  verifiedUsers: number;
  newUsersThisMonth: number;
  usersByRole: Array<{
    roleName: string;
    roleDisplayName: string;
    count: number;
  }>;
}

class ApiService {
  private baseURL: string;
  private defaultHeaders: HeadersInit;

  constructor() {
    this.baseURL = API_BASE_URL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get authentication headers with JWT token
   */
  private getAuthHeaders(): HeadersInit {
    const authHeader = AuthStorageService.getAuthHeader();
    return {
      ...this.defaultHeaders,
      ...(authHeader && { Authorization: authHeader }),
    };
  }

  /**
   * Make HTTP request with error handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
      credentials: 'include', // Include cookies for session authentication
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication methods
  async login(email: string, password: string, expectedRole?: string): Promise<ApiResponse> {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, expectedRole }),
    });

    // Store auth data in localStorage on successful login
    if (response.success && response.data) {
      const { user, sessionId, accessToken, refreshToken } = response.data;
      AuthStorageService.storeAuthData({
        user,
        session: {
          sessionId,
          accessToken,
          refreshToken,
          loginTime: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
        },
      });
    }

    return response;
  }

  async register(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }): Promise<ApiResponse> {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    return response;
  }

  async logout(): Promise<ApiResponse> {
    try {
      // Use secure logout that calls backend and clears localStorage
      const success = await AuthStorageService.secureLogout();
      
      return {
        success,
        message: success ? 'Logout successful' : 'Logout completed with warnings',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local storage even if there's an error
      AuthStorageService.clearAuthData();
      
      return {
        success: false,
        message: 'Logout failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getProfile(): Promise<ApiResponse<{ user: User }>> {
    return this.request('/auth/profile');
  }

  async refreshToken(): Promise<ApiResponse<{ accessToken: string }> | null> {
    try {
      const response = await this.request('/auth/refresh', {
        method: 'POST',
      });

      if (response.success && response.data?.accessToken) {
        AuthStorageService.updateAccessToken(response.data.accessToken);
      }

      return response;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  }

  // User management methods
  async getUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'active' | 'inactive' | 'all';
    role?: string;
    verified?: 'email' | 'phone' | 'both' | 'none' | 'all';
    sortBy?: 'createdAt' | 'updatedAt' | 'firstName' | 'lastName' | 'email' | 'lastLoginAt';
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<ApiResponse<UserListResponse>> {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString());
      }
    });

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/users?${queryString}` : '/users';
    
    return this.request(endpoint);
  }

  async getUserById(id: number): Promise<ApiResponse<{ user: User }>> {
    return this.request(`/users/${id}`);
  }

  async updateUser(id: number, userData: Partial<User>): Promise<ApiResponse<{ user: User }>> {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async updateUserStatus(id: number, isActive: boolean): Promise<ApiResponse<{ user: User }>> {
    return this.request(`/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  }

  async getUserStats(): Promise<ApiResponse<UserStats>> {
    return this.request('/users/stats');
  }

  // Health check
  async healthCheck(): Promise<ApiResponse> {
    return this.request('/health');
  }
}

// Create and export a singleton instance
export const apiService = new ApiService();
export default apiService;

// Export types for use in components
export type { User, UserListResponse, UserStats, PaginationInfo, ApiResponse };
