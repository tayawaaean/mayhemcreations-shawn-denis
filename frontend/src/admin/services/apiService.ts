/**
 * API Service for Admin Dashboard
 * Handles all API calls to the backend
 */

import AuthStorageService from '../../shared/authStorage';
import { envConfig } from '../../shared/envConfig';
import { apiClient } from '../../shared/axiosConfig';
import { centralizedAuthService } from '../../shared/centralizedAuthService';

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
    try {
      const response = await apiClient.request({
        url: endpoint,
        method: options.method || 'GET',
        data: options.body ? JSON.parse(options.body as string) : undefined,
        headers: options.headers,
        ...options,
      });

      return response.data;
    } catch (error: any) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication methods
  async login(email: string, password: string, expectedRole?: string): Promise<ApiResponse> {
    // Use centralized auth service for login
    const success = await centralizedAuthService.login(email, password);
    
    if (success) {
      return { success: true, message: 'Login successful', timestamp: new Date().toISOString() };
    } else {
      return { success: false, message: 'Login failed', timestamp: new Date().toISOString() };
    }
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
      // Use centralized auth service for logout
      await centralizedAuthService.logout();
      
      return {
        success: true,
        message: 'Logout successful',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Logout error:', error);
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
