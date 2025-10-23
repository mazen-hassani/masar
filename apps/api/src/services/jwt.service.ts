// ABOUTME: Service for JWT token generation and verification
// ABOUTME: Handles access tokens and refresh tokens with proper expiration

import jwt from "jsonwebtoken";
import { User } from "@prisma/client";

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  organisationId: string;
  type: "access" | "refresh";
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const ACCESS_TOKEN_EXPIRY = "15m"; // Short-lived
const REFRESH_TOKEN_EXPIRY = "7d"; // Long-lived

export class JwtService {
  /**
   * Generate an access token
   */
  generateAccessToken(user: User): string {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      organisationId: user.organisationId,
      type: "access",
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });
  }

  /**
   * Generate a refresh token
   */
  generateRefreshToken(user: User): string {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      organisationId: user.organisationId,
      type: "refresh",
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    });
  }

  /**
   * Generate both access and refresh tokens
   */
  generateTokenPair(user: User): TokenPair {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
    };
  }

  /**
   * Verify and decode a JWT token
   */
  verifyToken(token: string): JwtPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get token expiration time
   */
  getTokenExpiry(token: string): Date | null {
    const payload = this.verifyToken(token);
    if (!payload || !payload.exp) {
      return null;
    }
    return new Date(payload.exp * 1000);
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    const expiry = this.getTokenExpiry(token);
    if (!expiry) {
      return true;
    }
    return new Date() > expiry;
  }

  /**
   * Extract user ID from token
   */
  extractUserId(token: string): string | null {
    const payload = this.verifyToken(token);
    return payload?.userId || null;
  }
}

export const jwtService = new JwtService();
