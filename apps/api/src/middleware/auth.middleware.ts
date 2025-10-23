// ABOUTME: Express middleware for JWT authentication and authorization
// ABOUTME: Validates tokens, extracts user information, and enforces role-based access control

import { Request, Response, NextFunction } from "express";
import { jwtService, JwtPayload } from "@/services/jwt.service";
import { prisma } from "@/lib/prisma";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    organisationId: string;
    payload?: JwtPayload;
  };
}

/**
 * Middleware to verify JWT token and attach user to request
 */
export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Missing or invalid authorization header",
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Verify token
    const payload = jwtService.verifyToken(token);
    if (!payload) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid or expired token",
      });
    }

    // Attach user info to request
    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
      organisationId: payload.organisationId,
      payload,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Authentication failed",
    });
  }
};

/**
 * Middleware to require specific roles
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User not authenticated",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Forbidden",
        message: `This action requires one of the following roles: ${allowedRoles.join(", ")}`,
      });
    }

    next();
  };
};

/**
 * Middleware to require project access
 */
export const requireProjectAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User not authenticated",
      });
    }

    const projectId = req.params.projectId || req.body.projectId;
    if (!projectId) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Missing projectId parameter",
      });
    }

    // Get project to check organization
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        organisationId: true,
        ownerUserId: true,
        members: {
          where: { id: req.user.id },
          select: { id: true },
        },
      },
    });

    if (!project) {
      return res.status(404).json({
        error: "Not Found",
        message: "Project not found",
      });
    }

    // Check if user has access to the project's organization
    if (project.organisationId !== req.user.organisationId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You don't have access to this project",
      });
    }

    // Check if user is PM (project owner) or team member (except for PMO)
    if (req.user.role !== "PMO") {
      const isOwner = project.ownerUserId === req.user.id;
      const isMember = project.members.length > 0;

      if (!isOwner && !isMember) {
        return res.status(403).json({
          error: "Forbidden",
          message: "You don't have access to this project",
        });
      }
    }

    next();
  } catch (error) {
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to check project access",
    });
  }
};

/**
 * Middleware to require same organization access
 */
export const requireOrganisationAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User not authenticated",
      });
    }

    const organisationId =
      req.params.organisationId || req.body.organisationId;
    if (!organisationId) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Missing organisationId parameter",
      });
    }

    // Only PMO can access other organizations
    if (
      req.user.role !== "PMO" &&
      organisationId !== req.user.organisationId
    ) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You don't have access to this organization",
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to check organization access",
    });
  }
};

/**
 * Middleware for optional authentication (doesn't fail if no token)
 */
export const optionalAuthMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const payload = jwtService.verifyToken(token);

      if (payload) {
        req.user = {
          id: payload.userId,
          email: payload.email,
          role: payload.role,
          organisationId: payload.organisationId,
          payload,
        };
      }
    }

    next();
  } catch (error) {
    // Ignore errors in optional auth
    next();
  }
};
