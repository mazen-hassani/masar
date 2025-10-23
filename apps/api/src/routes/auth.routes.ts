// ABOUTME: Express routes for authentication endpoints
// ABOUTME: Handles login, logout, refresh, and user profile operations

import { Router } from "express";
import { authService } from "@/services/auth.service";
import {
  authMiddleware,
  AuthRequest,
  requireRole,
} from "@/middleware/auth.middleware";

const router = Router();

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Email and password are required",
      });
    }

    const result = await authService.login({ email, password });

    // Set refresh token in httpOnly cookie (secure for serverless)
    res.cookie("refreshToken", result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      user: result.user,
      accessToken: result.tokens.accessToken,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Login failed";
    return res.status(401).json({
      error: "Unauthorized",
      message,
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user and invalidate refresh token
 */
router.post("/logout", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const refreshToken =
      req.cookies.refreshToken || req.body.refreshToken;

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    // Clear refresh token cookie
    res.clearCookie("refreshToken");

    res.json({
      message: "Logged out successfully",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Logout failed";
    return res.status(500).json({
      error: "Internal Server Error",
      message,
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post("/refresh", async (req, res) => {
  try {
    const refreshToken =
      req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Refresh token is required",
      });
    }

    const result = await authService.refresh(refreshToken);

    res.json({
      accessToken: result.accessToken,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Token refresh failed";
    return res.status(401).json({
      error: "Unauthorized",
      message,
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user information
 */
router.get("/me", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User not found",
      });
    }

    const user = await authService.getCurrentUser(
      req.headers.authorization?.substring(7) || ""
    );

    if (!user) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found",
      });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organisationId: user.organisationId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get user";
    return res.status(500).json({
      error: "Internal Server Error",
      message,
    });
  }
});

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post(
  "/change-password",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "User not authenticated",
        });
      }

      const { oldPassword, newPassword } = req.body;

      if (!oldPassword || !newPassword) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Old password and new password are required",
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          error: "Bad Request",
          message: "New password must be at least 8 characters long",
        });
      }

      await authService.changePassword(
        req.user.id,
        oldPassword,
        newPassword
      );

      res.json({
        message: "Password changed successfully",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Password change failed";
      return res.status(400).json({
        error: "Bad Request",
        message,
      });
    }
  }
);

/**
 * POST /api/auth/logout-all-devices
 * Logout from all devices
 */
router.post(
  "/logout-all-devices",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "User not authenticated",
        });
      }

      await authService.logoutAllDevices(req.user.id);

      // Clear refresh token cookie
      res.clearCookie("refreshToken");

      res.json({
        message: "Logged out from all devices",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Logout failed";
      return res.status(500).json({
        error: "Internal Server Error",
        message,
      });
    }
  }
);

/**
 * POST /api/auth/users
 * Create a new user (PMO only)
 */
router.post(
  "/users",
  authMiddleware,
  requireRole("PMO"),
  async (req: AuthRequest, res) => {
    try {
      const { email, name, password, role, organisationId } = req.body;

      if (!email || !name || !password || !role) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Email, name, password, and role are required",
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Password must be at least 8 characters long",
        });
      }

      const user = await authService.createUser({
        email,
        name,
        password,
        role,
        organisationId: organisationId || req.user!.organisationId,
      });

      res.status(201).json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organisationId: user.organisationId,
        createdAt: user.createdAt,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create user";
      const status = message.includes("Unique constraint") ? 400 : 500;
      return res.status(status).json({
        error: status === 400 ? "Bad Request" : "Internal Server Error",
        message,
      });
    }
  }
);

export default router;
