// ABOUTME: Axios configuration and API client with interceptors
// ABOUTME: Handles authentication, error handling, and request/response transformation

import axios, {
  AxiosInstance,
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { ApiError, TokenPair } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

// Token storage keys
const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Get stored access token
 */
export const getAccessToken = (): string | null => {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

/**
 * Get stored refresh token
 */
export const getRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

/**
 * Store tokens
 */
export const setTokens = (tokens: TokenPair): void => {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
};

/**
 * Clear stored tokens
 */
export const clearTokens = (): void => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

// Request interceptor: add auth header
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor: handle errors and token refresh
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          return Promise.reject(error);
        }

        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken } = response.data;
        setTokens({
          accessToken,
          refreshToken,
        });

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        clearTokens();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Transform API error response
 */
export const handleApiError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    const response = error.response?.data as Record<string, unknown>;
    return {
      message: (response?.message as string) || error.message,
      code: `HTTP_${error.response?.status || 500}`,
      details: response?.details as Record<string, unknown>,
    };
  }

  return {
    message: "An unexpected error occurred",
    code: "UNKNOWN_ERROR",
  };
};

export default api;
