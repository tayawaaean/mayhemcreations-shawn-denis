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

  // Request interceptor - Handle authentication
  instance.interceptors.request.use(
    async (config) => {
      // For session-based auth, we rely on cookies (withCredentials: true)
      return config;
    },
    (error: AxiosError) => {
      // Silent error handling - let response interceptor handle user notifications
      return Promise.reject(error);
    }
  );

  // Response interceptor - Handle session-based authentication
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      // Update activity timestamp on ALL successful requests
      // This keeps the session alive as long as user is active
      // For session-based auth, this is the primary refresh mechanism
      updateActivity();
      
      return response;
    },
    async (error: AxiosError) => {
      // For session-based auth, 401 errors mean session expired
      if (error.response?.status === 401) {
        const errorData = error.response.data as any;
        
        // Check if session was revoked
        if (errorData?.code === 'SESSION_REVOKED') {
          try { (window as any).__toast?.({ type: 'warning', title: 'Session expired', message: 'Please sign in again' }); } catch {}
          // Clear auth data and redirect to home
          MultiAccountStorageService.clearAllAccounts();
          window.location.href = '/';
        } else {
          try { (window as any).__toast?.({ type: 'warning', title: 'Session expired', message: 'Please sign in again' }); } catch {}
          // Clear auth data and redirect to home
          MultiAccountStorageService.clearAllAccounts();
          window.location.href = '/';
        }
      }
      
      // Handle other errors with generic messages
      if (error.response?.status === 403) {
        try { (window as any).__toast?.({ type: 'error', title: 'Access denied', message: 'You do not have permission to perform this action' }); } catch {}
      } else if (error.response?.status && error.response.status >= 500) {
        try { (window as any).__toast?.({ type: 'error', title: 'Something went wrong', message: 'Please try again later' }); } catch {}
      } else if (error.response?.status >= 400) {
        try { (window as any).__toast?.({ type: 'error', title: 'Request failed', message: 'Please check your input and try again' }); } catch {}
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
