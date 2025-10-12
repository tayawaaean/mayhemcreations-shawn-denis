/**
 * Axios Configuration with Authentication Interceptors
 * Provides automatic token refresh and centralized API management
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { envConfig } from './envConfig';
import MultiAccountStorageService from './multiAccountStorage';

// Global retry tracking to prevent infinite loops
let globalRetryCount = 0;
let lastRetryTime = 0;
const MAX_RETRIES = 3;
const RETRY_WINDOW = 30000; // 30 seconds

// Create axios instance
const createAxiosInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: envConfig.getApiBaseUrl(),
    timeout: 30000,
    withCredentials: true, // Include cookies for session management
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor - Add auth token to requests
  instance.interceptors.request.use(
    async (config) => {
      // Add authorization header if available
      const currentAccount = MultiAccountStorageService.getCurrentAccountData();
      if (currentAccount?.session?.accessToken) {
        config.headers.Authorization = `Bearer ${currentAccount.session.accessToken}`;
        console.log('🔐 Axios: Added auth token to request');
      }
      
      return config;
    },
    (error: AxiosError) => {
      console.error('❌ Axios Request Error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor - Handle token refresh and auth errors
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      // Update activity timestamp on ALL successful requests
      // This keeps the session alive as long as user is active
      updateActivity();
      
      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
      
      // Handle 401 Unauthorized - Token expired or invalid
      if (error.response?.status === 401 && !originalRequest._retry) {
        const now = Date.now();
        
        // Reset retry count if outside the retry window
        if (now - lastRetryTime > RETRY_WINDOW) {
          globalRetryCount = 0;
        }
        
        // Check if we've exceeded max retries
        if (globalRetryCount >= MAX_RETRIES) {
          console.log('🔐 Axios: Too many refresh attempts, but keeping user logged in');
          console.log('🔐 Axios: User may need to manually refresh page or re-login if issue persists');
          // Don't automatically log out - let user try again or manually logout
          // This prevents accidental logouts due to temporary network issues
          globalRetryCount = 0; // Reset for next time
          return Promise.reject(error);
        }
        
        console.log(`🔐 Axios: 401 Unauthorized, attempting token refresh... (attempt ${globalRetryCount + 1}/${MAX_RETRIES})`);
        
        // Increment global retry count and update last retry time
        globalRetryCount++;
        lastRetryTime = now;
        
        // Mark request as retried to prevent infinite loops
        originalRequest._retry = true;
        
        try {
          // Get current account data before refresh attempt
          const currentAccount = MultiAccountStorageService.getCurrentAccountData();
          if (!currentAccount) {
            console.log('❌ Axios: No current account found, cannot refresh token');
            return Promise.reject(error);
          }
          
          // Attempt to refresh token using Bearer token authentication
          const refreshResponse = await instance.post('/auth/refresh');
          
          if (refreshResponse.data.success && refreshResponse.data.data?.accessToken) {
            console.log('✅ Axios: Token refreshed successfully, retrying request');
            
            // Reset retry count on successful refresh
            globalRetryCount = 0;
            
            // Update token in multi-account storage
            MultiAccountStorageService.storeAccountAuthData(
              currentAccount.user.accountType,
              {
                user: currentAccount.user,
                session: {
                  ...currentAccount.session,
                  accessToken: refreshResponse.data.data.accessToken,
                  lastActivity: new Date().toISOString()
                }
              }
            );
            
            // Update authorization header with new token
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.data.accessToken}`;
            }
            
            // Retry the original request
            return instance(originalRequest);
          }
          
          console.log('❌ Axios: Token refresh failed, but keeping user logged in for now');
          console.log('🔐 Axios: User can try again or manually logout if needed');
          // Don't automatically log out - token refresh may have failed due to network issues
          // Let user retry or manually logout if truly unauthorized
          return Promise.reject(error);
        } catch (refreshError: any) {
          console.error('❌ Axios: Token refresh error:', refreshError);
          
          // Check if this is a network error or server error
          // Don't log out user for temporary network issues
          if (refreshError.code === 'ECONNABORTED' || refreshError.code === 'ERR_NETWORK' || !refreshError.response) {
            console.log('🔐 Axios: Network error during token refresh, keeping user logged in');
            // Don't clear auth on network errors - user might still be authenticated
            return Promise.reject(error);
          }
          
          // Keep user logged in even for auth failures
          // Let them try again - automatic logout is frustrating for users
          console.log('❌ Axios: Auth error during token refresh, but keeping user logged in');
          console.log('🔐 Axios: User can manually logout if needed');
          return Promise.reject(error);
        }
      }
      
      // Handle other errors
      if (error.response?.status === 403) {
        console.log('🔐 Axios: 403 Forbidden - insufficient permissions');
      } else if (error.response?.status && error.response.status >= 500) {
        console.error('❌ Axios: Server error:', error.response.status);
      }
      
      return Promise.reject(error);
    }
  );

  return instance;
};

/**
 * Update last activity timestamp
 */
const updateActivity = (): void => {
  const currentAccount = MultiAccountStorageService.getCurrentAccountData();
  if (currentAccount) {
    MultiAccountStorageService.storeAccountAuthData(
      currentAccount.user.accountType,
      {
        user: currentAccount.user,
        session: {
          ...currentAccount.session,
          lastActivity: new Date().toISOString()
        }
      }
    );
  }
};

// Create and export the configured axios instance
export const apiClient = createAxiosInstance();

// Export axios for direct use if needed
export { axios };
export default apiClient;
