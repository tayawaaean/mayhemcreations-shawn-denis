/**
 * Multi-Account Authentication Context
 * Manages both customer and employee accounts with coexistence support
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import MultiAccountStorageService, { AccountAuthData, StoredUser } from './multiAccountStorage';

// User interface for the context
export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
  lastLoginAt: string;
  createdAt: string;
  avatar?: string;
  accountType: 'customer' | 'employee';
}

// Context type
interface MultiAccountContextType {
  // Current account
  currentUser: User | null;
  currentAccountType: 'customer' | 'employee' | null;
  isAuthenticated: boolean;
  
  // Account management
  availableAccounts: Array<{ type: 'customer' | 'employee'; user: StoredUser; isActive: boolean }>;
  switchAccount: (accountType: 'customer' | 'employee') => boolean;
  
  // Authentication actions
  login: (userData: User, accountType: 'customer' | 'employee') => void;
  logout: (accountType?: 'customer' | 'employee') => Promise<void>;
  logoutAll: () => Promise<void>;
  
  // Account info
  getAccountInfo: (accountType: 'customer' | 'employee') => { user: StoredUser; isActive: boolean } | null;
  isAccountAuthenticated: (accountType: 'customer' | 'employee') => boolean;
  
  // Loading state
  isLoading: boolean;
}

const MultiAccountContext = createContext<MultiAccountContextType | undefined>(undefined);

interface MultiAccountProviderProps {
  children: ReactNode;
}

export const MultiAccountProvider: React.FC<MultiAccountProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentAccountType, setCurrentAccountType] = useState<'customer' | 'employee' | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [availableAccounts, setAvailableAccounts] = useState<Array<{ type: 'customer' | 'employee'; user: StoredUser; isActive: boolean }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load current account on mount
  useEffect(() => {
    loadCurrentAccount();
  }, []);

  // Update available accounts when current account changes
  useEffect(() => {
    updateAvailableAccounts();
  }, [currentAccountType]);

  const loadCurrentAccount = () => {
    try {
      const currentData = MultiAccountStorageService.getCurrentAccountData();
      if (currentData && MultiAccountStorageService.isCurrentAccountAuthenticated()) {
        const user: User = {
          id: currentData.user.id,
          email: currentData.user.email,
          firstName: currentData.user.firstName || '',
          lastName: currentData.user.lastName || '',
          role: currentData.user.role,
          isEmailVerified: currentData.user.isEmailVerified || false,
          lastLoginAt: currentData.user.lastLoginAt || new Date().toISOString(),
          createdAt: currentData.user.createdAt || new Date().toISOString(),
          avatar: currentData.user.avatar,
          accountType: currentData.user.accountType
        };
        
        setCurrentUser(user);
        setCurrentAccountType(currentData.user.accountType);
        setIsAuthenticated(true);
      } else {
        setCurrentUser(null);
        setCurrentAccountType(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error loading current account:', error);
      setCurrentUser(null);
      setCurrentAccountType(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const updateAvailableAccounts = () => {
    try {
      const accounts = MultiAccountStorageService.getAllAccountInfo();
      setAvailableAccounts(accounts);
    } catch (error) {
      console.error('Error updating available accounts:', error);
      setAvailableAccounts([]);
    }
  };

  const login = (userData: User, accountType: 'customer' | 'employee') => {
    try {
      // Store the account data
      const authData: AccountAuthData = {
        user: {
          id: userData.id,
          email: userData.email,
          role: userData.role,
          firstName: userData.firstName,
          lastName: userData.lastName,
          isEmailVerified: userData.isEmailVerified,
          lastLoginAt: userData.lastLoginAt,
          createdAt: userData.createdAt,
          avatar: userData.avatar,
          accountType
        },
        session: {
          sessionId: '', // Will be set by the login components
          accessToken: '', // Will be set by the login components
          refreshToken: '', // Will be set by the login components
          lastActivity: new Date().toISOString()
        }
      };

      MultiAccountStorageService.storeAccountAuthData(accountType, authData);
      
      // Update current user
      setCurrentUser(userData);
      setCurrentAccountType(accountType);
      setIsAuthenticated(true);
      
      // Update available accounts
      updateAvailableAccounts();
      
      console.log(`✅ Logged in as ${accountType}: ${userData.email}`);
    } catch (error) {
      console.error('Error during login:', error);
    }
  };

  const switchAccount = (accountType: 'customer' | 'employee'): boolean => {
    try {
      const success = MultiAccountStorageService.switchAccount(accountType);
      if (success) {
        loadCurrentAccount();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error switching account:', error);
      return false;
    }
  };

  const logout = async (accountType?: 'customer' | 'employee'): Promise<void> => {
    try {
      if (accountType) {
        // Logout specific account
        await MultiAccountStorageService.logoutAccount(accountType);
        
        // If this was the current account, switch to another available account
        if (currentAccountType === accountType) {
          const remainingAccounts = MultiAccountStorageService.getAvailableAccounts();
          if (remainingAccounts.length > 0) {
            switchAccount(remainingAccounts[0]);
          } else {
            setCurrentUser(null);
            setCurrentAccountType(null);
            setIsAuthenticated(false);
          }
        }
      } else {
        // Logout current account
        await MultiAccountStorageService.logoutCurrentAccount();
        loadCurrentAccount();
      }
      
      updateAvailableAccounts();
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const logoutAll = async (): Promise<void> => {
    try {
      MultiAccountStorageService.clearAllAccounts();
      setCurrentUser(null);
      setCurrentAccountType(null);
      setIsAuthenticated(false);
      setAvailableAccounts([]);
      console.log('✅ Logged out from all accounts');
    } catch (error) {
      console.error('Error during logout all:', error);
    }
  };

  const getAccountInfo = (accountType: 'customer' | 'employee') => {
    return MultiAccountStorageService.getAccountInfo(accountType);
  };

  const isAccountAuthenticated = (accountType: 'customer' | 'employee'): boolean => {
    return MultiAccountStorageService.isAccountAuthenticated(accountType);
  };

  const value: MultiAccountContextType = {
    currentUser,
    currentAccountType,
    isAuthenticated,
    availableAccounts,
    switchAccount,
    login,
    logout,
    logoutAll,
    getAccountInfo,
    isAccountAuthenticated,
    isLoading
  };

  return (
    <MultiAccountContext.Provider value={value}>
      {children}
    </MultiAccountContext.Provider>
  );
};

export const useMultiAccount = (): MultiAccountContextType => {
  const context = useContext(MultiAccountContext);
  if (context === undefined) {
    throw new Error('useMultiAccount must be used within a MultiAccountProvider');
  }
  return context;
};

export default MultiAccountContext;
