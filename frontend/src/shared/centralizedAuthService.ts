/**
 * Centralized Authentication Service
 * Single source of truth for all authentication state and operations
 */

import MultiAccountStorageService from './multiAccountStorage';
import { apiClient } from './axiosConfig';
import { loggingService } from './loggingService';

export interface AuthUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isEmailVerified: boolean;
  avatar?: string;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  lastChecked: number;
}

class CentralizedAuthService {
  private static instance: CentralizedAuthService;
  private authState: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    lastChecked: 0
  };
  private listeners: Set<(state: AuthState) => void> = new Set();
  private refreshPromise: Promise<boolean> | null = null;

  private constructor() {
    // Initialize from localStorage on service creation
    this.initializeFromStorage();
  }

  public static getInstance(): CentralizedAuthService {
    if (!CentralizedAuthService.instance) {
      CentralizedAuthService.instance = new CentralizedAuthService();
    }
    return CentralizedAuthService.instance;
  }

  /**
   * Initialize authentication state from localStorage
   */
  private initializeFromStorage(): void {
    // Get the current active account from multi-account storage
    const currentAccount = MultiAccountStorageService.getCurrentAccountData();
    
    // DO NOT auto-switch accounts on initialization
    // Let each context (admin/ecommerce) manage their own account type
    // This prevents the ecommerce section from being logged out when page refreshes
    
    if (currentAccount) {
      this.initializeFromAccount(currentAccount);
    } else {
      this.clearAuthState();
    }
  }

  private initializeFromAccount(account: any): void {
    const { user, session } = account;
    if (user && session && MultiAccountStorageService.isCurrentAccountAuthenticated()) {
      this.authState = {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          role: user.role,
          isEmailVerified: user.isEmailVerified || false,
          avatar: user.avatar
        },
        isAuthenticated: true,
        isLoading: false,
        lastChecked: Date.now()
      };
      console.log('🔐 Initialized auth state from multi-account storage:', this.authState.user);
      this.notifyListeners(); // Notify listeners of the state change
    } else {
      this.clearAuthState();
    }
  }

  /**
   * Subscribe to authentication state changes
   */
  public subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener);
    // Immediately call with current state
    listener(this.authState);
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.authState));
  }

  /**
   * Get current authentication state
   */
  public getAuthState(): AuthState {
    return { ...this.authState };
  }

  /**
   * Validate current session with backend
   * This is the single source of truth for authentication validity
   */
  public async validateSession(): Promise<boolean> {
    console.log('🔐 validateSession called, current state:', this.authState);
    
    // Prevent multiple simultaneous validations
    if (this.authState.isLoading) {
      console.log('🔐 validateSession: Already loading, returning current state');
      return this.authState.isAuthenticated;
    }

    // Rate limiting - don't validate more than once every 30 seconds
    const timeSinceLastCheck = Date.now() - (this.authState.lastChecked || 0);
    if (timeSinceLastCheck < 30000) {
      console.log('🔐 validateSession: Rate limited - checked recently, returning current state');
      return this.authState.isAuthenticated;
    }

    // Check multi-account storage first
    const currentAccount = MultiAccountStorageService.getCurrentAccountData();
    const isStoredAuthenticated = MultiAccountStorageService.isCurrentAccountAuthenticated();
    
    console.log('🔐 validateSession: multi-account storage check:', {
      hasCurrentAccount: !!currentAccount,
      isStoredAuthenticated,
      currentAuthState: this.authState
    });

    // If no stored data, not authenticated
    if (!currentAccount || !isStoredAuthenticated) {
      console.log('🔐 validateSession: No valid stored data, not authenticated');
      return false;
    }

    // DO NOT auto-switch accounts during validation
    // Let each context handle their own account type preferences
    
    // If we have stored data but no current auth state, initialize it
    if (!this.authState.user && currentAccount.user) {
      console.log('🔐 validateSession: Initializing auth state from multi-account storage');
      this.initializeFromAccount(currentAccount);
      // After initialization, check if we're now authenticated
      if (this.authState.isAuthenticated) {
        console.log('🔐 validateSession: Successfully initialized from multi-account storage');
        return true;
      }
    }

    // Simple validation - just check if we have valid data
    // Let axios interceptor handle token refresh automatically
    console.log('🔐 validateSession: Using stored data, letting axios handle refresh');
    this.updateAuthState(currentAccount.user);
    return true;
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshToken(): Promise<boolean> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();
    const result = await this.refreshPromise;
    this.refreshPromise = null;
    return result;
  }

  /**
   * Perform the actual token refresh
   */
  private async performTokenRefresh(): Promise<boolean> {
    try {
      console.log('🔄 Refreshing access token...');
      // The backend expects session-based authentication, not refresh token in body
      const response = await apiClient.post('/auth/refresh');

      if (response.data.success && response.data.data?.accessToken) {
        console.log('✅ Access token refreshed successfully');
        // Update access token in current account
        const currentAccount = MultiAccountStorageService.getCurrentAccountData();
        if (currentAccount) {
          MultiAccountStorageService.storeAccountAuthData(
            currentAccount.user.accountType,
            {
              user: currentAccount.user,
              session: {
                ...currentAccount.session,
                accessToken: response.data.data.accessToken,
                lastActivity: new Date().toISOString()
              }
            }
          );
        }
        return true;
      } else {
        console.log('❌ Token refresh failed:', response.data.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Token refresh error:', error);
      return false;
    }
  }

  /**
   * Update authentication state
   */
  private updateAuthState(userData: any): void {
    this.authState = {
      user: {
        id: userData.id,
        email: userData.email,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        role: userData.role?.name || userData.role || '',
        isEmailVerified: userData.isEmailVerified || false,
        avatar: userData.avatar
      },
      isAuthenticated: true,
      isLoading: false,
      lastChecked: Date.now()
    };
    
    this.notifyListeners();
  }

  /**
   * Set loading state
   */
  private setLoading(isLoading: boolean): void {
    this.authState.isLoading = isLoading;
    this.notifyListeners();
  }

  /**
   * Clear authentication state (without clearing all accounts in storage)
   * Only clears the in-memory auth state
   */
  private clearAuthState(): void {
    console.log('🧹 Clearing authentication state');
    this.authState = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      lastChecked: Date.now()
    };
    
    // DO NOT clear multi-account storage here
    // Let the specific context (admin/ecommerce) handle logout
    // This preserves other account types when one context clears its state
    
    this.notifyListeners();
  }

  /**
   * Login user
   */
  public async login(email: string, password: string): Promise<boolean> {
    try {
      this.setLoading(true);
      console.log('🔐 Attempting login...');
      
      const response = await apiClient.post('/auth/login', { email, password });

      if (response.data.success && response.data.data) {
        console.log('✅ Login successful');
        
        // Determine account type based on role
        const userRole = response.data.data.user.role?.name || response.data.data.user.role;
        const accountType = userRole === 'customer' ? 'customer' : 'employee';
        
        // Store auth data in multi-account storage
        MultiAccountStorageService.storeAccountAuthData(accountType, {
          user: {
            id: response.data.data.user.id,
            email: response.data.data.user.email,
            role: userRole,
            firstName: response.data.data.user.firstName,
            lastName: response.data.data.user.lastName,
            isEmailVerified: response.data.data.user.isEmailVerified,
            avatar: response.data.data.user.avatar,
            accountType: accountType
          },
          session: {
            sessionId: response.data.data.sessionId,
            accessToken: response.data.data.accessToken,
            refreshToken: response.data.data.refreshToken,
            lastActivity: new Date().toISOString()
          }
        });

        // Set as current account
        MultiAccountStorageService.setCurrentAccount(accountType);

        this.updateAuthState(response.data.data.user);
        
        // Log successful login
        loggingService.logLoginSuccess(
          response.data.data.user.id.toString(),
          response.data.data.user.email,
          response.data.data.user.role?.name || response.data.data.user.role
        );
        
        return true;
      } else {
        console.log('❌ Login failed:', response.data.message);
        this.clearAuthState();
        return false;
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      this.clearAuthState();
      return false;
    }
  }

  /**
   * Logout user from current account
   */
  public async logout(): Promise<void> {
    try {
      console.log('🔐 Logging out from current account...');
      
      // Log logout before clearing data
      if (this.authState.user) {
        loggingService.logLogout(
          this.authState.user.id.toString(),
          this.authState.user.email,
          this.authState.user.role
        );
      }
      
      // Call backend logout to revoke session
      try {
        await apiClient.post('/auth/logout');
      } catch (error) {
        console.warn('Backend logout failed, but continuing with local cleanup:', error);
      }
      
      // Logout from current account in multi-account storage
      await MultiAccountStorageService.logoutCurrentAccount();
      
      // Clear local auth state
      this.clearAuthState();
      
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Still clear local state even if backend call fails
      this.clearAuthState();
    }
  }

  /**
   * Check if user has specific role
   */
  public hasRole(role: string): boolean {
    return this.authState.user?.role === role;
  }

  /**
   * Check if user has any of the specified roles
   */
  public hasAnyRole(roles: string[]): boolean {
    return this.authState.user ? roles.includes(this.authState.user.role) : false;
  }

  /**
   * Force refresh of authentication state
   */
  public async forceRefresh(): Promise<boolean> {
    console.log('🔄 Force refreshing authentication state...');
    return await this.validateSession();
  }
}

// Export singleton instance
export const centralizedAuthService = CentralizedAuthService.getInstance();
export default centralizedAuthService;
