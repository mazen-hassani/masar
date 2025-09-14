import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthRequest } from '../types';
import { authService, setTokens, clearTokens, getAccessToken } from '../services';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (credentials: AuthRequest) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!user && !!getAccessToken();

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const token = getAccessToken();
      
      if (token) {
        try {
          // Verify token and get user info
          const userData = await authService.getCurrentUser();
          setUser(userData);
        } catch (error) {
          console.error('Failed to initialize auth:', error);
          // Token is invalid, clear it
          clearTokens();
        }
      }
      
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (credentials: AuthRequest) => {
    setLoading(true);
    
    try {
      const response = await authService.login(credentials);
      
      // Store tokens
      setTokens(response.accessToken, response.refreshToken);
      
      // Set user
      setUser(response.user);
    } catch (error) {
      clearTokens();
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    
    try {
      // Call logout endpoint to invalidate tokens on server
      await authService.logout();
    } catch (error) {
      // Even if server logout fails, we still clear local state
      console.error('Server logout failed:', error);
    }
    
    // Clear local state and tokens
    clearTokens();
    setUser(null);
    setLoading(false);
    
    // Redirect to login
    window.location.href = '/login';
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  const contextValue: AuthContextType = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};