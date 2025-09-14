import { BaseEntity } from './common';
import { Role } from './enums';

export interface Organisation extends BaseEntity {
  name: string;
  contactEmail: string;
  address?: string;
  phoneNumber?: string;
  website?: string;
  industry?: string;
  companySize?: string;
  timezone?: string;
  workingCalendar?: WorkingCalendar;
}

export interface User extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  organisation: Organisation;
  profilePictureUrl?: string;
  phoneNumber?: string;
  title?: string;
  department?: string;
  isActive: boolean;
  lastLoginAt?: string;
  emailVerifiedAt?: string;
}

export interface WorkingCalendar {
  startTime: string;
  endTime: string;
  hoursPerDay: number;
  workingDays: string;
  timezone: string;
  holidays?: Holiday[];
}

export interface Holiday {
  date: string;
  name: string;
  recurring: boolean;
}

// Auth related types
export interface AuthRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organisationId: number;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}