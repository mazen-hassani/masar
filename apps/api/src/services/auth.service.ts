// ABOUTME: Service for authentication operations (login, logout, refresh)
// ABOUTME: Manages JWT tokens, refresh tokens, and session lifecycle

import { prisma } from "@/lib/prisma";
import { BaseService } from "./base.service";
import { jwtService, TokenPair } from "./jwt.service";
import { passwordService } from "./password.service";
import { User } from "@prisma/client";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    organisationId: string;
  };
  tokens: TokenPair;
}

export interface RefreshResponse {
  accessToken: string;
}

export class AuthService extends BaseService {
  /**
   * Login user with email and password
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: credentials.email },
      });

      if (!user) {
        throw new Error("Invalid email or password");
      }

      // Verify password
      const isPasswordValid = await passwordService.verify(
        credentials.password,
        user.passwordHash
      );

      if (!isPasswordValid) {
        throw new Error("Invalid email or password");
      }

      // Generate tokens
      const tokens = jwtService.generateTokenPair(user);

      // Store refresh token in database
      const refreshTokenExpiresAt = new Date();
      refreshTokenExpiresAt.setDate(refreshTokenExpiresAt.getDate() + 7); // 7 days

      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: tokens.refreshToken,
          expiresAt: refreshTokenExpiresAt,
        },
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organisationId: user.organisationId,
        },
        tokens,
      };
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Logout user by invalidating refresh token
   */
  async logout(refreshToken: string): Promise<void> {
    try {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refresh(refreshToken: string): Promise<RefreshResponse> {
    try {
      // Verify refresh token
      const payload = jwtService.verifyToken(refreshToken);
      if (!payload || payload.type !== "refresh") {
        throw new Error("Invalid refresh token");
      }

      // Check if refresh token exists in database
      const storedToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
      });

      if (!storedToken) {
        throw new Error("Refresh token has been revoked");
      }

      // Check if expired
      if (new Date() > storedToken.expiresAt) {
        await prisma.refreshToken.delete({
          where: { token: refreshToken },
        });
        throw new Error("Refresh token has expired");
      }

      // Get user and generate new access token
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const newAccessToken = jwtService.generateAccessToken(user);

      return {
        accessToken: newAccessToken,
      };
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Get current user by access token
   */
  async getCurrentUser(accessToken: string): Promise<User | null> {
    try {
      const payload = jwtService.verifyToken(accessToken);
      if (!payload) {
        return null;
      }

      return await prisma.user.findUnique({
        where: { id: payload.userId },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Create a new user (PMO only)
   */
  async createUser(data: {
    email: string;
    name: string;
    password: string;
    role: string;
    organisationId: string;
  }): Promise<User> {
    try {
      const passwordHash = await passwordService.hash(data.password);

      return await prisma.user.create({
        data: {
          email: data.email,
          name: data.name,
          passwordHash,
          role: data.role,
          organisationId: data.organisationId,
        },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Verify old password
      const isPasswordValid = await passwordService.verify(
        oldPassword,
        user.passwordHash
      );

      if (!isPasswordValid) {
        throw new Error("Invalid password");
      }

      // Hash new password and update
      const newPasswordHash = await passwordService.hash(newPassword);

      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Invalidate all refresh tokens for a user (logout from all devices)
   */
  async logoutAllDevices(userId: string): Promise<void> {
    try {
      await prisma.refreshToken.deleteMany({
        where: { userId },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Clean up expired refresh tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const result = await prisma.refreshToken.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      return result.count;
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }
}

export const authService = new AuthService();
