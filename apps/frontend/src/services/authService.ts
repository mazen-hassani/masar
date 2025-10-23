// ABOUTME: Authentication service - handles login, logout, and user management
// ABOUTME: Provides methods for auth API endpoints

import api, { setTokens, clearTokens } from "./api";
import { AuthCredentials, AuthResponse, User } from "../types";

/**
 * Login with email and password
 */
export const login = async (credentials: AuthCredentials): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>("/auth/login", {
    email: credentials.email,
    password: credentials.password,
  });

  // Store tokens
  setTokens({
    accessToken: response.data.accessToken,
    refreshToken: response.data.refreshToken,
  });

  return response.data;
};

/**
 * Logout user
 */
export const logout = async (): Promise<void> => {
  try {
    await api.post("/auth/logout");
  } finally {
    // Always clear tokens even if logout request fails
    clearTokens();
  }
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = async (): Promise<User> => {
  const response = await api.get<User>("/auth/me");
  return response.data;
};

/**
 * Refresh access token
 */
export const refreshToken = async (refreshToken: string): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>("/auth/refresh", {
    refreshToken,
  });

  setTokens({
    accessToken: response.data.accessToken,
    refreshToken: response.data.refreshToken,
  });

  return response.data;
};

/**
 * Change password
 */
export const changePassword = async (
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  await api.post("/auth/change-password", {
    currentPassword,
    newPassword,
  });
};

/**
 * Request password reset
 */
export const requestPasswordReset = async (email: string): Promise<void> => {
  await api.post("/auth/forgot-password", {
    email,
  });
};

/**
 * Reset password with token
 */
export const resetPassword = async (token: string, newPassword: string): Promise<void> => {
  await api.post("/auth/reset-password", {
    token,
    newPassword,
  });
};
