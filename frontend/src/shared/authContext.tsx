import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AuthStorageService, { StoredUser, StoredSession } from './authStorage';
import { apiService } from '../admin/services/apiService';

interface AuthContextType {
  user: StoredUser | null;
  session: StoredSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  updateActivity: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [session, setSession] = useState<StoredSession | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const authData = AuthStorageService.getAuthData();
        
        if (authData && AuthStorageService.isAuthenticated()) {
          setUser(authData.user);
          setSession(authData.session);
          setIsAuthenticated(true);
          
          // Check if token needs refresh
          if (AuthStorageService.needsRefresh()) {
            await refreshToken();
          }
        } else {
          // Clear invalid data
          AuthStorageService.clearAuthData();
          setUser(null);
          setSession(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        AuthStorageService.clearAuthData();
        setUser(null);
        setSession(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Auto-refresh token when needed
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkTokenRefresh = async () => {
      if (AuthStorageService.needsRefresh()) {
        await refreshToken();
      }
    };

    // Check every 5 minutes
    const interval = setInterval(checkTokenRefresh, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await apiService.login(email, password);
      
      if (response.success && response.data) {
        const { user, sessionId, accessToken, refreshToken } = response.data;
        
        const authData = {
          user,
          session: {
            sessionId,
            accessToken,
            refreshToken,
            loginTime: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
          },
        };

        AuthStorageService.storeAuthData(authData);
        setUser(user);
        setSession(authData.session);
        setIsAuthenticated(true);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      AuthStorageService.clearAuthData();
      setUser(null);
      setSession(null);
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const response = await apiService.refreshToken();
      
      if (response?.success && response.data?.accessToken) {
        AuthStorageService.updateAccessToken(response.data.accessToken);
        
        // Update session state
        const currentSession = AuthStorageService.getSession();
        if (currentSession) {
          setSession(currentSession);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  };

  const updateActivity = (): void => {
    AuthStorageService.updateActivity();
  };

  const value: AuthContextType = {
    user,
    session,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshToken,
    updateActivity,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
