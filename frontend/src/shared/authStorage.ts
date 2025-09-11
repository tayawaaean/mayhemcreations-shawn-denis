/**
 * Authentication Storage Service
 * Handles localStorage operations for user authentication data
 */

import { envConfig } from './envConfig';

// User data for localStorage - includes essential fields for persistence
export interface StoredUser {
  id: number;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  isEmailVerified?: boolean;
  lastLoginAt?: string;
  createdAt?: string;
  avatar?: string;
  // SECURITY: Password is NEVER stored in localStorage for security reasons
}

// Essential session data only
export interface StoredSession {
  sessionId: string;
  accessToken: string;
  refreshToken: string;
  lastActivity: string;
}

// Single consolidated auth data structure
export interface AuthData {
  user: StoredUser;
  session: StoredSession;
}

class AuthStorageService {
  private static readonly AUTH_KEY = 'mayhem_auth'; // Single key for all auth data

  /**
   * Get API base URL from environment configuration
   */
  private static getApiBaseUrl(): string {
    return envConfig.getApiBaseUrl();
  }

  /**
   * Store authentication data - includes user details for persistence
   */
  static storeAuthData(authData: AuthData): void {
    try {
      // Create auth data with all user fields for persistence
      const persistentAuthData: AuthData = {
        user: {
          id: authData.user.id,
          email: authData.user.email,
          role: authData.user.role,
          firstName: authData.user.firstName,
          lastName: authData.user.lastName,
          isEmailVerified: authData.user.isEmailVerified,
          lastLoginAt: authData.user.lastLoginAt,
          createdAt: authData.user.createdAt,
          avatar: authData.user.avatar
        },
        session: {
          sessionId: authData.session.sessionId,
          accessToken: authData.session.accessToken,
          refreshToken: authData.session.refreshToken,
          lastActivity: authData.session.lastActivity
        }
      };
      
      // Store only in single key
      localStorage.setItem(this.AUTH_KEY, JSON.stringify(persistentAuthData));
      
      // Clean up any old redundant keys
      this.cleanupOldKeys();
    } catch (error) {
      console.error('Error storing auth data:', error);
    }
  }

  /**
   * Get stored authentication data
   */
  static getAuthData(): AuthData | null {
    try {
      const authData = localStorage.getItem(this.AUTH_KEY);
      return authData ? JSON.parse(authData) : null;
    } catch (error) {
      console.error('Error getting auth data:', error);
      return null;
    }
  }

  /**
   * Get stored user data
   */
  static getUser(): StoredUser | null {
    const authData = this.getAuthData();
    return authData?.user || null;
  }

  /**
   * Get stored session data
   */
  static getSession(): StoredSession | null {
    const authData = this.getAuthData();
    return authData?.session || null;
  }

  /**
   * Check if user is authenticated (has valid data in localStorage)
   */
  static isAuthenticated(): boolean {
    // First, clear any password entries for security
    this.clearPasswordEntries();
    
    const authData = this.getAuthData();
    if (!authData) return false;

    // Check if session is expired (7 days)
    const session = authData.session;
    const lastActivity = new Date(session.lastActivity);
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

    return lastActivity > sevenDaysAgo;
  }

  /**
   * Update session activity
   */
  static updateActivity(): void {
    const authData = this.getAuthData();
    if (authData) {
      authData.session.lastActivity = new Date().toISOString();
      this.storeAuthData(authData);
    }
  }

  /**
   * Update access token
   */
  static updateAccessToken(accessToken: string): void {
    const authData = this.getAuthData();
    if (authData) {
      authData.session.accessToken = accessToken;
      authData.session.lastActivity = new Date().toISOString();
      this.storeAuthData(authData);
    }
  }

  /**
   * Clear all authentication data
   */
  static clearAuthData(): void {
    try {
      // Remove all auth-related keys
      localStorage.removeItem(this.AUTH_KEY);
      localStorage.removeItem('mayhem_user'); // Clean up old keys
      localStorage.removeItem('mayhem_session'); // Clean up old keys
      localStorage.removeItem('adminUser'); // Clean up old admin key
      
      // Remove any password entries that might exist
      this.clearPasswordEntries();
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }

  /**
   * Clean up old redundant keys
   */
  private static cleanupOldKeys(): void {
    try {
      // Remove old redundant keys
      localStorage.removeItem('mayhem_user');
      localStorage.removeItem('mayhem_session');
      localStorage.removeItem('adminUser');
    } catch (error) {
      console.error('Error cleaning up old keys:', error);
    }
  }

  /**
   * Clear any password entries from localStorage
   */
  static clearPasswordEntries(): void {
    try {
      // Get all localStorage keys and remove any that contain 'password'
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('password') || key.startsWith('password:'))) {
          keysToRemove.push(key);
        }
      }
      
      // Remove all password-related keys
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      
      if (keysToRemove.length > 0) {
        console.log(`Cleared ${keysToRemove.length} password entries from localStorage`);
      }
    } catch (error) {
      console.error('Error clearing password entries:', error);
    }
  }

  /**
   * Secure logout - calls backend to revoke session and clears local storage
   */
  static async secureLogout(): Promise<boolean> {
    try {
      const session = this.getSession();
      if (!session) {
        // No session to revoke, just clear local data
        this.clearAuthData();
        return true;
      }

      // Call backend logout endpoint to revoke session
      const apiBaseUrl = this.getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`,
        },
      });

      // Clear local storage regardless of backend response
      this.clearAuthData();

      return response.ok;
    } catch (error) {
      console.error('Error during secure logout:', error);
      // Still clear local storage even if backend call fails
      this.clearAuthData();
      return false;
    }
  }

  /**
   * Get authorization header for API requests
   */
  static getAuthHeader(): string | null {
    const session = this.getSession();
    return session ? `Bearer ${session.accessToken}` : null;
  }

  /**
   * Check if session needs refresh (access token expires in 5 minutes)
   */
  static needsRefresh(): boolean {
    const session = this.getSession();
    if (!session) return false;

    try {
      // Decode JWT to check expiration
      const payload = JSON.parse(atob(session.accessToken.split('.')[1]));
      const exp = payload.exp * 1000; // Convert to milliseconds
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      return (exp - now) < fiveMinutes;
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true; // Assume needs refresh if we can't decode
    }
  }

  /**
   * Get user role
   */
  static getUserRole(): string | null {
    const user = this.getUser();
    return user?.role || null;
  }

  /**
   * Check if user has specific role
   */
  static hasRole(roleName: string): boolean {
    const user = this.getUser();
    return user?.role === roleName;
  }

  /**
   * Check if user has any of the specified roles
   */
  static hasAnyRole(roleNames: string[]): boolean {
    const user = this.getUser();
    return user ? roleNames.includes(user.role) : false;
  }

  /**
   * Get user permissions - now fetched from API when needed
   * Note: Permissions are no longer stored in localStorage for security and efficiency
   */
  static getPermissions(): string[] {
    console.warn('getPermissions() called - permissions should be fetched from API');
    return [];
  }

  /**
   * Check if user has specific permission - now checked via API
   * Note: Permission checks should be done via API calls
   */
  static hasPermission(permission: string): boolean {
    console.warn('hasPermission() called - permission checks should be done via API');
    return false;
  }

  /**
   * Get session info for debugging
   */
  static getSessionInfo(): { userId?: number; email?: string; role?: string; sessionId?: string } {
    const user = this.getUser();
    const session = this.getSession();
    
    return {
      userId: user?.id,
      email: user?.email,
      role: user?.role,
      sessionId: session?.sessionId,
    };
  }
}

export default AuthStorageService;
