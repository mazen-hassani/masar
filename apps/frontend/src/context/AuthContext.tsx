// ABOUTME: Authentication context - manages user auth state and operations
// ABOUTME: Provides auth methods and user data to entire app via context

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { AuthContextType, AuthCredentials, User } from "../types";
import * as authService from "../services/authService";
import { getAccessToken, clearTokens } from "../services/api";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = getAccessToken();
        if (token) {
          // Try to get current user
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
        }
      } catch (error) {
        console.error("Failed to initialize auth:", error);
        clearTokens();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials: AuthCredentials): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await authService.login(credentials);
      setUser(response.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refresh = async (): Promise<void> => {
    try {
      // This is called when token refresh happens via interceptor
      // We fetch current user to ensure state is in sync
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error("Failed to refresh auth:", error);
      clearTokens();
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Hook to use auth context
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
