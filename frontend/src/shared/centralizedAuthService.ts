/**
 * Centralized Authentication Service
 * Single source of truth for all authentication state and operations
 */

import AuthStorageService from './authStorage';
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
    const storedUser = AuthStorageService.getUser();
    const storedSession = AuthStorageService.getSession();
    
    if (storedUser && storedSession && AuthStorageService.isAuthenticated()) {
      this.authState = {
        user: {
          id: storedUser.id,
          email: storedUser.email,
          firstName: storedUser.firstName || '',
          lastName: storedUser.lastName || '',
          role: storedUser.role,
          isEmailVerified: storedUser.isEmailVerified || false,
          avatar: storedUser.avatar
        },
        isAuthenticated: true,
        isLoading: false,
        lastChecked: Date.now()
      };
      console.log('🔐 Initialized auth state from localStorage:', this.authState.user);
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

    // Check localStorage first
    const storedUser = AuthStorageService.getUser();
    const storedSession = AuthStorageService.getSession();
    const isStoredAuthenticated = AuthStorageService.isAuthenticated();
    
    console.log('🔐 validateSession: localStorage check:', {
      hasStoredUser: !!storedUser,
      hasStoredSession: !!storedSession,
      isStoredAuthenticated,
      currentAuthState: this.authState
    });

    // If no stored data, not authenticated
    if (!storedUser || !storedSession || !isStoredAuthenticated) {
      console.log('🔐 validateSession: No valid stored data, not authenticated');
      return false;
    }

    // If we have stored data but no current auth state, initialize it
    if (!this.authState.user && storedUser) {
      console.log('🔐 validateSession: Initializing auth state from localStorage');
      this.initializeFromStorage();
      // After initialization, check if we're now authenticated
      if (this.authState.isAuthenticated) {
        console.log('🔐 validateSession: Successfully initialized from localStorage');
        return true;
      }
    }

    // Simple validation - just check if we have valid data
    // Let axios interceptor handle token refresh automatically
    console.log('🔐 validateSession: Using stored data, letting axios handle refresh');
    this.updateAuthState(storedUser);
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
        AuthStorageService.updateAccessToken(response.data.data.accessToken);
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
   * Clear authentication state and localStorage
   */
  private clearAuthState(): void {
    console.log('🧹 Clearing authentication state');
    this.authState = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      lastChecked: Date.now()
    };
    
    // Clear localStorage
    AuthStorageService.clearAuthData();
    
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
        
        // Store auth data
        AuthStorageService.storeAuthData({
          user: {
            id: response.data.data.user.id,
            email: response.data.data.user.email,
            role: response.data.data.user.role?.name || response.data.data.user.role,
            firstName: response.data.data.user.firstName,
            lastName: response.data.data.user.lastName,
            isEmailVerified: response.data.data.user.isEmailVerified,
            avatar: response.data.data.user.avatar
          },
          session: {
            sessionId: response.data.data.sessionId,
            accessToken: response.data.data.accessToken,
            refreshToken: response.data.data.refreshToken,
            lastActivity: new Date().toISOString()
          }
        });

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
   * Logout user
   */
  public async logout(): Promise<void> {
    try {
      console.log('🔐 Logging out...');
      
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
      
      // Clear local state and storage
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
