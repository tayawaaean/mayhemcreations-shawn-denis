/**
 * API Service for Admin Dashboard
 * Handles all API calls to the backend
 */

import MultiAccountStorageService from '../../shared/multiAccountStorage';
import { envConfig } from '../../shared/envConfig';
import { apiClient } from '../../shared/axiosConfig';
import { centralizedAuthService } from '../../shared/centralizedAuthService';

const API_BASE_URL = envConfig.getApiBaseUrl();

// Error categories for better handling
export type ErrorCategory = 'timeout' | 'network' | 'auth' | 'validation' | 'server' | 'rate_limit' | 'not_found' | 'unknown';

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any[];
  timestamp: string;
  errorCategory?: ErrorCategory;
  retryable?: boolean;
  retryAfter?: number;
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

// Helper: Categorize error
function categorizeError(error: any): { category: ErrorCategory; message: string; retryable: boolean; retryAfter?: number } {
  // Network connectivity check
  if (!navigator.onLine) {
    return {
      category: 'network',
      message: 'No internet connection detected. Please check your network.',
      retryable: true
    };
  }

  // Timeout errors
  if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
    return {
      category: 'timeout',
      message: 'Request timed out. The server is taking too long to respond.',
      retryable: true
    };
  }

  // Network errors (no response from server)
  if (!error?.response) {
    return {
      category: 'network',
      message: 'Network error. Unable to reach the server.',
      retryable: true
    };
  }

  const status = error.response?.status;
  const responseData = error.response?.data;

  // Rate limit errors
  if (status === 429) {
    const retryAfter = parseInt(error.response?.headers?.['retry-after'] || '60', 10);
    return {
      category: 'rate_limit',
      message: `Too many requests. Please wait ${retryAfter} seconds before trying again.`,
      retryable: false,
      retryAfter
    };
  }

  // Authentication errors
  if (status === 401 || status === 403) {
    return {
      category: 'auth',
      message: status === 401 ? 'Authentication required. Please log in.' : 'Access denied. You do not have permission.',
      retryable: false
    };
  }

  // Not found errors
  if (status === 404) {
    return {
      category: 'not_found',
      message: responseData?.message || 'The requested resource was not found.',
      retryable: false
    };
  }

  // Validation errors (400-level except above)
  if (status >= 400 && status < 500) {
    return {
      category: 'validation',
      message: responseData?.message || 'Invalid request. Please check your input.',
      retryable: false
    };
  }

  // Server errors (500-level)
  if (status >= 500) {
    return {
      category: 'server',
      message: 'Server error. Our systems are experiencing issues. Please try again later.',
      retryable: true
    };
  }

  // Unknown errors
  return {
    category: 'unknown',
    message: error?.message || 'An unexpected error occurred.',
    retryable: true
  };
}

// Helper: Sleep for retry backoff
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Exponential backoff calculation
function getBackoffDelay(attempt: number): number {
  const baseDelay = 1000; // 1 second
  const maxDelay = 10000; // 10 seconds
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  // Add jitter to prevent thundering herd
  return delay + Math.random() * 1000;
}

// Helper: Retry with exponential backoff
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  shouldRetry?: (error: any) => boolean
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if we should retry
      const errorInfo = categorizeError(error);
      const canRetry = shouldRetry ? shouldRetry(error) : errorInfo.retryable;
      
      if (!canRetry || attempt === maxAttempts - 1) {
        throw error;
      }
      
      // Calculate backoff delay
      const delay = getBackoffDelay(attempt);
      console.log(`⏳ Retry attempt ${attempt + 1}/${maxAttempts} after ${delay}ms...`);
      
      // Wait before retrying
      await sleep(delay);
    }
  }
  
  throw lastError;
}

// Timeout wrapper for requests
function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 30000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
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
    const currentAccount = MultiAccountStorageService.getCurrentAccountData();
    // For session-based auth, we don't need Bearer tokens
    const authHeader = null;
    return {
      ...this.defaultHeaders,
      ...(authHeader && { Authorization: authHeader }),
    };
  }

  /**
   * Make HTTP request with enhanced error handling, timeout, and retry logic
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit & { skipRetry?: boolean; timeoutMs?: number } = {}
  ): Promise<ApiResponse<T>> {
    const { skipRetry = false, timeoutMs = 30000, ...requestOptions } = options;
    
    const makeRequest = async (): Promise<ApiResponse<T>> => {
      try {
        const requestPromise = apiClient.request({
          url: endpoint,
          method: requestOptions.method || 'GET',
          data: requestOptions.body ? JSON.parse(requestOptions.body as string) : undefined,
          headers: requestOptions.headers,
          timeout: timeoutMs,
          ...requestOptions,
        });

        // Apply timeout wrapper
        const response = await withTimeout(requestPromise, timeoutMs);

        // Successful response
        return {
          ...response.data,
          success: true,
          timestamp: new Date().toISOString(),
          errorCategory: undefined,
          retryable: false
        };
      } catch (error: any) {
        // Categorize the error
        const errorInfo = categorizeError(error);
        
        console.error(`API request failed [${errorInfo.category}]:`, {
          endpoint,
          error: error.message,
          status: error.response?.status,
          retryable: errorInfo.retryable
        });

        // Construct enhanced error response
        const errorResponse: ApiResponse<T> = {
          success: false,
          message: errorInfo.message,
          timestamp: new Date().toISOString(),
          errorCategory: errorInfo.category,
          retryable: errorInfo.retryable,
          retryAfter: errorInfo.retryAfter,
          errors: error.response?.data?.errors
        };

        // Attach error info to error object for consumers
        error.apiResponse = errorResponse;
        throw error;
      }
    };

    // Apply retry logic for retryable errors (unless explicitly skipped)
    if (!skipRetry) {
      return retryWithBackoff(makeRequest, 3);
    }

    return makeRequest();
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

  async logoutAllSessions(userId: number): Promise<ApiResponse<{ invalidatedSessions: number }>> {
    return this.request(`/auth/logout-all-sessions/${userId}`, {
      method: 'POST',
    });
  }

  // Note: refreshToken method removed - not needed for session-based auth

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

  /**
   * Extract error information from caught error
   * Helps consumers handle errors consistently
   */
  public extractErrorInfo(error: any): {
    message: string;
    category: ErrorCategory;
    retryable: boolean;
    retryAfter?: number;
  } {
    if (error?.apiResponse) {
      return {
        message: error.apiResponse.message || 'An error occurred',
        category: error.apiResponse.errorCategory || 'unknown',
        retryable: error.apiResponse.retryable || false,
        retryAfter: error.apiResponse.retryAfter
      };
    }
    
    // Fallback to categorizing the error
    return categorizeError(error);
  }

  /**
   * Check if an error is retryable
   */
  public isRetryableError(error: any): boolean {
    const info = this.extractErrorInfo(error);
    return info.retryable;
  }

  /**
   * Get user-friendly error message
   */
  public getErrorMessage(error: any): string {
    const info = this.extractErrorInfo(error);
    return info.message;
  }
}

// Create and export a singleton instance
export const apiService = new ApiService();
export default apiService;

// Export helper functions for use in other services
export { categorizeError, retryWithBackoff, withTimeout, sleep };

// Export types for use in components
export type { User, UserListResponse, UserStats, PaginationInfo, ApiResponse };
