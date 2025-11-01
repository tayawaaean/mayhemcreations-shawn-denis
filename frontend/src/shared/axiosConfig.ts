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
      // For session-based auth, 401 errors mean session expired (e.g., backend restarted)
      if (error.response?.status === 401) {
        // Check if there was a session before clearing (for user notification)
        const hadSession = !!MultiAccountStorageService.getCurrentAccountData()
        const manualLogoutAt = typeof window !== 'undefined' ? localStorage.getItem('auth_manual_logout_at') : null
        const shouldNotify = hadSession && !manualLogoutAt
        
        // Only handle once per tab session to avoid multiple redirects/modals
        if (!(window as any).__sessionExpiredHandled) {
          (window as any).__sessionExpiredHandled = true
          
          // Comprehensive cleanup: Clear all cached auth and user data
          // This happens when backend restarts and session is lost, or session was invalidated
          try {
            // Clear all account data including cart and cached data
            MultiAccountStorageService.clearAllAccounts();
            
            // Force clear any remaining cached data and flags
            if (typeof window !== 'undefined') {
              // Clear any auth flags
              delete (window as any).__sessionExpiredHandled;
              delete (window as any).__sessionToastShown;
              
              // Reload contexts by dispatching storage event
              window.dispatchEvent(new Event('storage'));
            }
          } catch (cleanupError) {
            // Silently fail - don't throw errors during cleanup
          }
          
          // Helper function to open auth modal and redirect to home
          const handleReLogin = () => {
            if (typeof window !== 'undefined') {
              // Store current path for redirect after login (if on a valid route)
              const currentPath = window.location.pathname;
              if (currentPath && !currentPath.match(/^\/(|home|products|product|cart|checkout|customize|about|faq|contact|employee-login)$/)) {
                // Only store redirect if not already on home or public pages
                if (!currentPath.startsWith('/admin') && !currentPath.startsWith('/seller')) {
                  sessionStorage.setItem('auth_redirect_after_login', currentPath + window.location.search);
                }
              }
              
              // Redirect to home page
              if (!currentPath.match(/^\/(|home)$/)) {
                window.location.href = '/';
              }
              
              // Trigger login modal
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('openAuthModal', { detail: { mode: 'login' } }));
              }, 100);
            }
          };
          
          // Show user-friendly toast with re-login action
          if (shouldNotify && !(window as any).__sessionToastShown) {
            try {
              (window as any).__toast?.({
                type: 'warning',
                title: 'Session Expired',
                message: 'Your session has expired. Please sign in again to continue.',
                durationMs: 8000, // Longer duration for actionable toast
                action: {
                  label: 'Sign In',
                  onClick: handleReLogin
                }
              });
              (window as any).__sessionToastShown = true;
            } catch {}
          }
          
          // Automatically handle re-login (redirect and open modal)
          // Delay slightly to ensure cleanup is complete
          setTimeout(() => {
            handleReLogin();
          }, 200);
        }
        
        // Continue to reject the error so components know the request failed
        // but we've handled the auth cleanup centrally
      }
      
      // Handle other errors with generic messages
      if (error.response?.status === 403) {
        // Suppress 403 errors for cart API when user is admin/seller (expected behavior)
        const requestUrl = error.config?.url || '';
        const isCartRequest = requestUrl.includes('/cart');
        const isAdminOrdersRequest = requestUrl.includes('/admin/orders');
        
        // Skip toast for expected 403s (cart for admin/seller) and 404s (missing endpoints)
        if (!isCartRequest && !isAdminOrdersRequest) {
          // Single toast throttle via window flag
          if (!(window as any).__forbiddenToastShown) {
            try { (window as any).__toast?.({ type: 'error', title: 'Access denied', message: 'You do not have permission to perform this action' }); } catch {}
            ;(window as any).__forbiddenToastShown = true
          }
        }
      } else if (error.response?.status === 404) {
        // Suppress 404 errors for missing endpoints (e.g., /admin/orders may not exist yet)
        const requestUrl = error.config?.url || '';
        const isExpected404 = requestUrl.includes('/admin/orders');
        
        if (isExpected404) {
          // Silently handle expected 404s - don't show toast or console error
          // Return early to prevent further error handling
        }
      } else if (error.response?.status && error.response.status >= 500) {
        try { (window as any).__toast?.({ type: 'error', title: 'Something went wrong', message: 'Please try again later' }); } catch {}
      } else if (error.response?.status && error.response.status >= 400) {
        // Do not spam global toasts for generic 4xx; surfaces should show inline hints instead
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
