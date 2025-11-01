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
      
      this.notifyListeners(); // Notify listeners of the state change
    } else {
      this.clearAuthState();
    }
  }

  /**
   * Public method to refresh auth state from storage
   * Useful after OAuth login or manual storage updates
   */
  public refreshFromStorage(): void {
    this.initializeFromStorage();
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
    
    // Prevent multiple simultaneous validations
    if (this.authState.isLoading) {
      return this.authState.isAuthenticated;
    }

    // Rate limiting - don't validate more than once every 30 seconds
    const timeSinceLastCheck = Date.now() - (this.authState.lastChecked || 0);
    if (timeSinceLastCheck < 30000) {
      return this.authState.isAuthenticated;
    }

    // Check multi-account storage first
    const currentAccount = MultiAccountStorageService.getCurrentAccountData();
    const isStoredAuthenticated = MultiAccountStorageService.isCurrentAccountAuthenticated();
    
    

    // If no stored data, not authenticated
    if (!currentAccount || !isStoredAuthenticated) {
      
      return false;
    }

    // DO NOT auto-switch accounts during validation
    // Let each context handle their own account type preferences
    
    // If we have stored data but no current auth state, initialize it
    if (!this.authState.user && currentAccount.user) {
      
      this.initializeFromAccount(currentAccount);
      // After initialization, check if we're now authenticated
      if (this.authState.isAuthenticated) {
        
        return true;
      }
    }

    // Simple validation - just check if we have valid data
    // Let axios interceptor handle token refresh automatically
    
    this.updateAuthState(currentAccount.user);
    return true;
  }

  /**
   * Refresh authentication (session-based - no token refresh needed)
   */
  private async refreshToken(): Promise<boolean> {
    
    // For session-based auth, the session is automatically maintained by cookies
    // No token refresh is needed
    return true;
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
      
      const response = await apiClient.post('/auth/login', { email, password });

      if (response.data.success && response.data.data) {
        
        
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
    return await this.validateSession();
  }
}

// Export singleton instance
export const centralizedAuthService = CentralizedAuthService.getInstance();
export default centralizedAuthService;
