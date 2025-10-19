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
      console.log('🔐 Axios: Using session-based auth (cookies)');
      return config;
    },
    (error: AxiosError) => {
      console.error('❌ Axios Request Error:', error);
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
          console.log('🔐 Axios: Session was revoked - clearing auth and redirecting to home');
          // Clear auth data and redirect to home with message
          MultiAccountStorageService.clearAllAccounts();
          window.location.href = '/?message=session-revoked';
        } else {
          console.log('🔐 Axios: 401 error detected - session expired, redirecting to home');
          // Clear auth data and redirect to home (customer login is modal-based)
          MultiAccountStorageService.clearAllAccounts();
          window.location.href = '/';
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
    console.log('🔄 Updating activity for account:', {
      accountType: currentAccount.user.accountType,
      sessionId: currentAccount.session?.sessionId,
      hasSessionId: !!currentAccount.session?.sessionId
    });
    
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
