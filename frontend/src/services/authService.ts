import { apiService } from './api';
import {
  User,
  AuthRequest,
  AuthResponse,
  RegisterRequest,
  PasswordResetRequest,
  PasswordResetConfirm
} from '../types';

export const authService = {
  // Authentication methods
  async login(credentials: AuthRequest): Promise<AuthResponse> {
    return apiService.post<AuthResponse, AuthRequest>('/auth/login', credentials);
  },

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    return apiService.post<AuthResponse, RegisterRequest>('/auth/register', userData);
  },

  async logout(): Promise<void> {
    return apiService.post<void>('/auth/logout');
  },

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    return apiService.post<AuthResponse, { refreshToken: string }>('/auth/refresh', {
      refreshToken,
    });
  },

  // Password reset methods
  async forgotPassword(request: PasswordResetRequest): Promise<{ message: string }> {
    return apiService.post<{ message: string }, PasswordResetRequest>(
      '/auth/forgot-password',
      request
    );
  },

  async resetPassword(request: PasswordResetConfirm): Promise<{ message: string }> {
    return apiService.post<{ message: string }, PasswordResetConfirm>(
      '/auth/reset-password',
      request
    );
  },

  // User profile methods
  async getCurrentUser(): Promise<User> {
    return apiService.get<User>('/auth/me');
  },

  async updateProfile(userData: Partial<User>): Promise<User> {
    return apiService.put<User, Partial<User>>('/auth/profile', userData);
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    return apiService.post<{ message: string }, { currentPassword: string; newPassword: string }>(
      '/auth/change-password',
      { currentPassword, newPassword }
    );
  },

  // Email verification
  async sendEmailVerification(): Promise<{ message: string }> {
    return apiService.post<{ message: string }>('/auth/send-verification');
  },

  async verifyEmail(token: string): Promise<{ message: string }> {
    return apiService.post<{ message: string }, { token: string }>('/auth/verify-email', {
      token,
    });
  },
};