/**
 * Axios Configuration with Authentication Interceptors
 * Provides automatic token refresh and centralized API management
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { envConfig } from './envConfig';

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
      const token = localStorage.getItem('mayhem_auth');
      if (token) {
        try {
          const authData = JSON.parse(token);
          if (authData.session?.accessToken) {
            config.headers.Authorization = `Bearer ${authData.session.accessToken}`;
            console.log('🔐 Axios: Added auth token to request');
          }
        } catch (error) {
          console.error('❌ Axios: Error parsing auth token:', error);
        }
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
      // Update activity timestamp on successful requests (except auth endpoints)
      if (!response.config.url?.includes('/auth/')) {
        updateActivity();
      }
      
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
          console.log('🔐 Axios: Too many refresh attempts, clearing auth state');
          localStorage.removeItem('mayhem_auth');
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
          // Attempt to refresh token using Bearer token authentication
          const refreshResponse = await instance.post('/auth/refresh');
          
          if (refreshResponse.data.success && refreshResponse.data.data?.accessToken) {
            console.log('✅ Axios: Token refreshed successfully, retrying request');
            
            // Reset retry count on successful refresh
            globalRetryCount = 0;
            
            // Update token in localStorage
            const token = localStorage.getItem('mayhem_auth');
            if (token) {
              const authData = JSON.parse(token);
              authData.session.accessToken = refreshResponse.data.data.accessToken;
              authData.session.lastActivity = new Date().toISOString();
              localStorage.setItem('mayhem_auth', JSON.stringify(authData));
            }
            
            // Update authorization header with new token
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.data.accessToken}`;
            }
            
            // Retry the original request
            return instance(originalRequest);
          }
          
          console.log('❌ Axios: Token refresh failed, clearing auth state');
          // Clear auth state
          localStorage.removeItem('mayhem_auth');
          return Promise.reject(error);
        } catch (refreshError) {
          console.error('❌ Axios: Token refresh error:', refreshError);
          // Clear auth state
          localStorage.removeItem('mayhem_auth');
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
  const token = localStorage.getItem('mayhem_auth');
  if (token) {
    try {
      const authData = JSON.parse(token);
      authData.session.lastActivity = new Date().toISOString();
      localStorage.setItem('mayhem_auth', JSON.stringify(authData));
    } catch (error) {
      console.error('❌ Axios: Error updating activity:', error);
    }
  }
};

// Create and export the configured axios instance
export const apiClient = createAxiosInstance();

// Export axios for direct use if needed
export { axios };
export default apiClient;
