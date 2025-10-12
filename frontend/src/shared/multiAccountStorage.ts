/**
 * Multi-Account Authentication Storage Service
 * Handles localStorage operations for multiple user accounts (customer and employee)
 * Supports coexistence of both account types without clearing each other
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
  accountType: 'customer' | 'employee'; // Track account type
}

// Essential session data only
export interface StoredSession {
  sessionId: string;
  accessToken: string;
  refreshToken: string;
  lastActivity: string;
}

// Single account auth data structure
export interface AccountAuthData {
  user: StoredUser;
  session: StoredSession;
}

// Multi-account storage structure
export interface MultiAccountAuthData {
  customer?: AccountAuthData;
  employee?: AccountAuthData;
  currentAccount: 'customer' | 'employee' | null;
}

class MultiAccountStorageService {
  private static readonly AUTH_KEY = 'mayhem_multi_auth'; // Key for multi-account data

  /**
   * Get API base URL from environment configuration
   */
  private static getApiBaseUrl(): string {
    return envConfig.getApiBaseUrl();
  }

  /**
   * Get all stored multi-account data
   */
  private static getMultiAccountData(): MultiAccountAuthData {
    try {
      const stored = localStorage.getItem(this.AUTH_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error reading multi-account auth data:', error);
    }
    return { currentAccount: null };
  }

  /**
   * Store multi-account data
   */
  private static setMultiAccountData(data: MultiAccountAuthData): void {
    try {
      localStorage.setItem(this.AUTH_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error storing multi-account auth data:', error);
    }
  }

  /**
   * Store authentication data for a specific account type
   * Preserves existing accounts of other types
   */
  static storeAccountAuthData(accountType: 'customer' | 'employee', authData: AccountAuthData): void {
    try {
      const multiData = this.getMultiAccountData();
      
      // Add account type to user data
      const userWithType: StoredUser = {
        ...authData.user,
        accountType
      };

      // Store the account data
      multiData[accountType] = {
        user: userWithType,
        session: authData.session
      };

      // Set as current account
      multiData.currentAccount = accountType;

      this.setMultiAccountData(multiData);
      console.log(`✅ Stored ${accountType} account data`);
    } catch (error) {
      console.error('Error storing account auth data:', error);
    }
  }

  /**
   * Get authentication data for a specific account type
   */
  static getAccountAuthData(accountType: 'customer' | 'employee'): AccountAuthData | null {
    try {
      const multiData = this.getMultiAccountData();
      return multiData[accountType] || null;
    } catch (error) {
      console.error('Error getting account auth data:', error);
      return null;
    }
  }

  /**
   * Get current active account data
   */
  static getCurrentAccountData(): AccountAuthData | null {
    try {
      const multiData = this.getMultiAccountData();
      if (multiData.currentAccount) {
        return multiData[multiData.currentAccount] || null;
      }
      return null;
    } catch (error) {
      console.error('Error getting current account data:', error);
      return null;
    }
  }

  /**
   * Set the current account type (used during login)
   */
  static setCurrentAccount(accountType: 'customer' | 'employee'): void {
    try {
      const multiData = this.getMultiAccountData();
      multiData.currentAccount = accountType;
      this.setMultiAccountData(multiData);
      console.log(`✅ Set current account to ${accountType}`);
    } catch (error) {
      console.error('Error setting current account:', error);
    }
  }

  /**
   * Switch to a different account type
   */
  static switchAccount(accountType: 'customer' | 'employee'): boolean {
    try {
      const multiData = this.getMultiAccountData();
      if (multiData[accountType]) {
        multiData.currentAccount = accountType;
        this.setMultiAccountData(multiData);
        console.log(`✅ Switched to ${accountType} account`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error switching account:', error);
      return false;
    }
  }

  /**
   * Check if user is authenticated for a specific account type
   */
  static isAccountAuthenticated(accountType: 'customer' | 'employee'): boolean {
    try {
      const accountData = this.getAccountAuthData(accountType);
      if (!accountData) return false;

      // Check if session is expired
      const lastActivity = new Date(accountData.session.lastActivity);
      const now = new Date();
      const sessionTimeout = 30 * 24 * 60 * 60 * 1000; // 30 days (increased from 24 hours for better persistence)

      return (now.getTime() - lastActivity.getTime()) < sessionTimeout;
    } catch (error) {
      console.error('Error checking account authentication:', error);
      return false;
    }
  }

  /**
   * Check if current account is authenticated
   */
  static isCurrentAccountAuthenticated(): boolean {
    try {
      const currentData = this.getCurrentAccountData();
      if (!currentData) return false;

      const accountType = currentData.user.accountType;
      return this.isAccountAuthenticated(accountType);
    } catch (error) {
      console.error('Error checking current account authentication:', error);
      return false;
    }
  }

  /**
   * Get all available account types
   */
  static getAvailableAccounts(): ('customer' | 'employee')[] {
    try {
      const multiData = this.getMultiAccountData();
      const accounts: ('customer' | 'employee')[] = [];
      
      if (multiData.customer && this.isAccountAuthenticated('customer')) {
        accounts.push('customer');
      }
      if (multiData.employee && this.isAccountAuthenticated('employee')) {
        accounts.push('employee');
      }
      
      return accounts;
    } catch (error) {
      console.error('Error getting available accounts:', error);
      return [];
    }
  }

  /**
   * Logout from a specific account type
   * Preserves other account types
   */
  static async logoutAccount(accountType: 'customer' | 'employee'): Promise<boolean> {
    try {
      const accountData = this.getAccountAuthData(accountType);
      if (!accountData) return true; // Already logged out

      // Call backend logout
      const apiBaseUrl = this.getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accountData.session.accessToken}`,
        },
      });

      // Remove the account from storage
      const multiData = this.getMultiAccountData();
      delete multiData[accountType];

      // If this was the current account, switch to another available account
      if (multiData.currentAccount === accountType) {
        const availableAccounts = this.getAvailableAccounts();
        multiData.currentAccount = availableAccounts.length > 0 ? availableAccounts[0] : null;
      }

      this.setMultiAccountData(multiData);
      console.log(`✅ Logged out from ${accountType} account`);
      return true;
    } catch (error) {
      console.error('Error logging out account:', error);
      return false;
    }
  }

  /**
   * Logout from current account
   */
  static async logoutCurrentAccount(): Promise<boolean> {
    try {
      const currentData = this.getCurrentAccountData();
      if (!currentData) return true; // Already logged out

      const accountType = currentData.user.accountType;
      return await this.logoutAccount(accountType);
    } catch (error) {
      console.error('Error logging out current account:', error);
      return false;
    }
  }

  /**
   * Clear all account data (complete logout)
   */
  static clearAllAccounts(): void {
    try {
      localStorage.removeItem(this.AUTH_KEY);
      console.log('✅ Cleared all account data');
    } catch (error) {
      console.error('Error clearing all accounts:', error);
    }
  }

  /**
   * Get account info for display
   */
  static getAccountInfo(accountType: 'customer' | 'employee'): { user: StoredUser; isActive: boolean } | null {
    try {
      const accountData = this.getAccountAuthData(accountType);
      if (!accountData) return null;

      return {
        user: accountData.user,
        isActive: this.isAccountAuthenticated(accountType)
      };
    } catch (error) {
      console.error('Error getting account info:', error);
      return null;
    }
  }

  /**
   * Get all account info for display
   */
  static getAllAccountInfo(): Array<{ type: 'customer' | 'employee'; user: StoredUser; isActive: boolean }> {
    try {
      const accounts: Array<{ type: 'customer' | 'employee'; user: StoredUser; isActive: boolean }> = [];
      
      const customerInfo = this.getAccountInfo('customer');
      if (customerInfo) {
        accounts.push({ type: 'customer', ...customerInfo });
      }

      const employeeInfo = this.getAccountInfo('employee');
      if (employeeInfo) {
        accounts.push({ type: 'employee', ...employeeInfo });
      }

      return accounts;
    } catch (error) {
      console.error('Error getting all account info:', error);
      return [];
    }
  }

  /**
   * Migrate from old single-account storage to multi-account storage
   */
  static migrateFromOldStorage(): void {
    try {
      const oldAuthKey = 'mayhem_auth';
      const oldData = localStorage.getItem(oldAuthKey);
      
      if (oldData) {
        const parsed = JSON.parse(oldData);
        if (parsed.user && parsed.session) {
          // Determine account type based on role
          const accountType = parsed.user.role === 'customer' ? 'customer' : 'employee';
          
          // Store in new multi-account format
          this.storeAccountAuthData(accountType, {
            user: { ...parsed.user, accountType },
            session: parsed.session
          });

          // Remove old data
          localStorage.removeItem(oldAuthKey);
          console.log(`✅ Migrated old ${accountType} account to multi-account storage`);
        }
      }
    } catch (error) {
      console.error('Error migrating from old storage:', error);
    }
  }
}

// Auto-migrate on import
MultiAccountStorageService.migrateFromOldStorage();

export default MultiAccountStorageService;
