// ABOUTME: Zod validation schemas for API requests and responses
// ABOUTME: Used for type-safe validation in both backend and frontend

import { z } from "zod";

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

// Project schemas
export const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  startDate: z.coerce.date(),
  timezone: z.string().default("UTC"),
  memberUserIds: z.array(z.string()).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

// Activity schemas
export const createActivitySchema = z.object({
  projectId: z.string(),
  name: z.string().min(1, "Activity name is required"),
  description: z.string().optional(),
  startDate: z.coerce.date(),
  duration: z.number().positive("Duration must be positive"),
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;

// Task schemas
export const createTaskSchema = z.object({
  activityId: z.string(),
  name: z.string().min(1, "Task name is required"),
  description: z.string().optional(),
  duration: z.number().positive("Duration must be positive"),
  assigneeUserId: z.string().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

// Status update schemas
export const updateStatusSchema = z.object({
  status: z.enum([
    "NOT_STARTED",
    "IN_PROGRESS",
    "ON_HOLD",
    "COMPLETED",
    "VERIFIED",
  ]),
});

export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

// Pagination schemas
export const paginationSchema = z.object({
  skip: z.number().int().nonnegative().default(0),
  take: z.number().int().positive().default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
