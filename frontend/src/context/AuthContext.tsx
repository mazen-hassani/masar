import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthRequest } from '../types';
import { authService, setTokens, clearTokens, getAccessToken } from '../services';
import { sessionManager } from '../utils/sessionManager';
import { SessionWarningModal } from '../components/common/SessionWarningModal';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (credentials: AuthRequest) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSessionWarning, setShowSessionWarning] = useState(false);

  const isAuthenticated = !!user && !!getAccessToken();

  // Initialize auth state and session management on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const token = getAccessToken();
      
      if (token) {
        try {
          // Verify token and get user info
          const userData = await authService.getCurrentUser();
          setUser(userData);
          
          // Initialize session management
          sessionManager.setSessionCallbacks(
            () => {
              // Session expired
              handleSessionExpired();
            },
            () => {
              // Session warning
              setShowSessionWarning(true);
            }
          );
          
          sessionManager.startSession();
          const cleanupActivityTracking = sessionManager.setupActivityTracking();
          
          return cleanupActivityTracking;
        } catch (error) {
          console.error('Failed to initialize auth:', error);
          // Token is invalid, clear it
          clearTokens();
        }
      }
      
      setLoading(false);
    };

    const cleanup = initializeAuth();
    
    return () => {
      cleanup?.then(fn => fn?.());
      sessionManager.clearSession();
    };
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

  const handleSessionExpired = () => {
    setShowSessionWarning(false);
    setUser(null);
    clearTokens();
    sessionManager.clearSession();
    window.location.href = '/login?reason=session_expired';
  };

  const handleExtendSession = () => {
    setShowSessionWarning(false);
    sessionManager.extendSession();
  };

  const handleLogoutFromWarning = () => {
    setShowSessionWarning(false);
    logout();
  };

  const contextValue: AuthContextType = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    setUser,
    updateUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      <SessionWarningModal
        isOpen={showSessionWarning}
        onExtendSession={handleExtendSession}
        onLogout={handleLogoutFromWarning}
      />
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

export const useAuth = useAuthContext;