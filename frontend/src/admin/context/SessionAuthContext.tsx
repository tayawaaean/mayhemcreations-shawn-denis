import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiService } from '../services/apiService';
import { centralizedAuthService } from '../../shared/centralizedAuthService';

interface SessionAuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const SessionAuthContext = createContext<SessionAuthContextType | undefined>(undefined);

interface SessionAuthProviderProps {
  children: ReactNode;
}

export const SessionAuthProvider: React.FC<SessionAuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any | null>(null);

  // Check authentication status on mount and periodically
  const checkAuth = async () => {
    try {
      console.log('🔐 Checking session authentication...');
      const response = await apiService.getProfile();
      
      if (response.success && response.data) {
        console.log('✅ Session authenticated:', response.data);
        setUser(response.data.user);
        setIsAuthenticated(true);
      } else {
        console.log('❌ Session not authenticated');
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('❌ Auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // Initialize authentication on mount
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      await checkAuth();
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  // Periodic auth check every 5 minutes
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(async () => {
      console.log('🔄 Periodic auth check...');
      await checkAuth();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('🔐 Attempting login...');
      setIsLoading(true);
      
      // Use centralized auth service for login
      const success = await centralizedAuthService.login(email, password);
      
      if (success) {
        console.log('✅ Login successful');
        // The centralized auth service will handle state updates
        return true;
      } else {
        console.log('❌ Login failed');
        setUser(null);
        setIsAuthenticated(false);
        return false;
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      setUser(null);
      setIsAuthenticated(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      console.log('🔐 Logging out...');
      await centralizedAuthService.logout();
    } catch (error) {
      console.error('❌ Logout error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const value: SessionAuthContextType = {
    isAuthenticated,
    isLoading,
    user,
    login,
    logout,
    checkAuth
  };

  return (
    <SessionAuthContext.Provider value={value}>
      {children}
    </SessionAuthContext.Provider>
  );
};

export const useSessionAuth = (): SessionAuthContextType => {
  const context = useContext(SessionAuthContext);
  if (context === undefined) {
    throw new Error('useSessionAuth must be used within a SessionAuthProvider');
  }
  return context;
};
