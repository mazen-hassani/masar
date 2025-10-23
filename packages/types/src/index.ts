// ABOUTME: Shared TypeScript types for frontend and backend
// ABOUTME: Generated from Prisma schema and manually curated interfaces

// Enums matching Prisma schema
export enum Role {
  PMO = "PMO",
  PM = "PM",
  TEAM_MEMBER = "TEAM_MEMBER",
  CLIENT = "CLIENT",
}

export enum Status {
  NOT_STARTED = "NOT_STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  ON_HOLD = "ON_HOLD",
  COMPLETED = "COMPLETED",
  VERIFIED = "VERIFIED",
}

export enum TrackingStatus {
  ON_TRACK = "ON_TRACK",
  AT_RISK = "AT_RISK",
  OFF_TRACK = "OFF_TRACK",
}

export enum DependencyType {
  FS = "FS", // Finish-to-Start
  SS = "SS", // Start-to-Start
  FF = "FF", // Finish-to-Finish
  SF = "SF", // Start-to-Finish
}

// Domain Models (matching Prisma models)
export interface Organisation {
  id: string;
  name: string;
  timezone: string;
  workingDaysOfWeek: string;
  workingHours: unknown; // JSON type
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  organisationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  organisationId: string;
  ownerUserId: string;
  startDate: Date;
  timezone: string;
  status: Status;
  progressPercentage: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Activity {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  status: Status;
  trackingStatus: TrackingStatus;
  progressPercentage: number;
  verificationChecklist?: unknown; // JSON type
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  activityId: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  duration: number;
  assigneeUserId?: string;
  status: Status;
  trackingStatus: TrackingStatus;
  progressPercentage: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Dependency {
  id: string;
  activityPredecessorId?: string;
  activitySuccessorId?: string;
  taskPredecessorId?: string;
  taskSuccessorId?: string;
  dependencyType: DependencyType;
  lag: number;
  createdAt: Date;
  updatedAt: Date;
}

// API Request/Response Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  startDate: Date;
  timezone?: string;
  ownerUserId: string;
  memberUserIds?: string[];
}

export interface CreateActivityRequest {
  projectId: string;
  name: string;
  description?: string;
  startDate: Date;
  duration: number; // in working hours
}

export interface CreateTaskRequest {
  activityId: string;
  name: string;
  description?: string;
  duration: number; // in working hours
  assigneeUserId?: string;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

export interface PaginationParams {
  skip?: number;
  take?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
