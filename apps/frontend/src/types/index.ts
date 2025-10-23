// ABOUTME: Type definitions for frontend - matches backend DTOs
// ABOUTME: Provides TypeScript interfaces for all API responses and component props

// === Enums ===

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

export enum ConstraintType {
  ASAP = "ASAP",
  ALAP = "ALAP",
  MUST_START_ON = "MUST_START_ON",
  MUST_FINISH_ON = "MUST_FINISH_ON",
  START_NO_EARLIER = "START_NO_EARLIER",
  START_NO_LATER = "START_NO_LATER",
  FINISH_NO_EARLIER = "FINISH_NO_EARLIER",
  FINISH_NO_LATER = "FINISH_NO_LATER",
}

// === Auth Types ===

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  organisationId: string;
  createdAt: Date;
  updatedAt: Date;
}

// === Organisation Types ===

export interface Organisation {
  id: string;
  name: string;
  timezone: string;
  workingDaysOfWeek: string; // e.g., "MTWTF"
  workingHours: WorkingHours[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkingHours {
  start: string; // "09:00"
  end: string; // "17:00"
}

// === Project Types ===

export interface Project {
  id: string;
  name: string;
  description?: string;
  organisationId: string;
  ownerUserId: string;
  owner?: User;
  status: Status;
  startDate: Date;
  endDate: Date;
  timezone: string;
  members: ProjectMember[];
  activities: Activity[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  user: User;
  role: Role;
  createdAt: Date;
}

// === Activity Types ===

export interface Activity {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  status: Status;
  trackingStatus: TrackingStatus;
  progressPercentage: number;
  startDate: Date;
  endDate: Date;
  tasks: Task[];
  verificationChecklist?: {
    items: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

// === Task Types ===

export interface Task {
  id: string;
  activityId: string;
  activity?: Activity;
  name: string;
  description?: string;
  status: Status;
  trackingStatus: TrackingStatus;
  progressPercentage: number;
  startDate: Date;
  endDate: Date;
  duration: number; // hours
  assigneeUserId?: string;
  assignee?: User;
  createdAt: Date;
  updatedAt: Date;
}

// === Dependency Types ===

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

// === Constraint Types ===

export interface DateConstraint {
  id: string;
  itemId: string;
  itemType: "activity" | "task";
  constraintType: ConstraintType;
  constraintDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

// === Scheduler Types ===

export interface ScheduleItem {
  id: string;
  name: string;
  type: "activity" | "task";
  durationHours: number;
  startDate: Date;
  endDate: Date;
  earlyStart: Date;
  earlyEnd: Date;
  lateStart: Date;
  lateEnd: Date;
  slack: number;
  isCritical: boolean;
  predecessorIds: string[];
  successorIds: string[];
}

export interface ProjectSchedule {
  projectId: string;
  startDate: Date;
  endDate: Date;
  totalDurationDays: number;
  items: ScheduleItem[];
  criticalPath: string[];
  isFeasible: boolean;
  warnings: string[];
}

// === Template Types ===

export interface ProjectTemplate {
  id: string;
  name: string;
  description?: string;
  organisationId: string;
  activities: TemplateActivity[];
  tasks: TemplateTask[];
  dependencies: TemplateDependency[];
  estimatedDurationHours: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateActivity {
  id: string;
  name: string;
  description?: string;
  durationHours: number;
  order: number;
  checklistItems?: string[];
}

export interface TemplateTask {
  id: string;
  activityId: string;
  name: string;
  description?: string;
  durationHours: number;
  requiredRole?: string;
}

export interface TemplateDependency {
  id: string;
  fromId: string;
  toId: string;
  type: DependencyType;
  lag?: number;
  fromType: "activity" | "task";
  toType: "activity" | "task";
}

// === API Response Types ===

export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, unknown>;
}

// === Form Types ===

export interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface ProjectFormData {
  name: string;
  description?: string;
  startDate: Date;
  timezone: string;
  memberUserIds?: string[];
}

export interface ActivityFormData {
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  checklistItems?: string[];
}

export interface TaskFormData {
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  duration: number;
  assigneeUserId?: string;
}

// === Context Types ===

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: AuthCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

// === Utility Types ===

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
