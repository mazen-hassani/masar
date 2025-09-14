import { apiService } from './api';
import {
  ScheduleResult,
  DateConstraints,
  EditValidationResult,
  TaskDateChange,
  ActivityDateChange,
  DateValidityResponse,
  DownstreamImpact
} from '../types';

export const schedulingService = {
  // Auto-scheduling methods
  async scheduleProject(projectId: number): Promise<ScheduleResult> {
    return apiService.post<ScheduleResult>(`/projects/${projectId}/schedule`);
  },

  async optimizeSchedule(projectId: number): Promise<ScheduleResult> {
    return apiService.post<ScheduleResult>(`/projects/${projectId}/optimize-schedule`);
  },

  // Date constraint methods
  async getTaskConstraints(taskId: number): Promise<DateConstraints> {
    return apiService.get<DateConstraints>(`/date-constraints/tasks/${taskId}`);
  },

  async getActivityConstraints(activityId: number): Promise<DateConstraints> {
    return apiService.get<DateConstraints>(`/date-constraints/activities/${activityId}`);
  },

  // Date change validation
  async validateTaskDateChange(taskId: number, change: Omit<TaskDateChange, 'taskId'>): Promise<EditValidationResult> {
    return apiService.post<EditValidationResult, Omit<TaskDateChange, 'taskId'>>(
      `/date-constraints/tasks/${taskId}/validate`,
      change
    );
  },

  async validateActivityDateChange(
    activityId: number,
    change: Omit<ActivityDateChange, 'activityId'>
  ): Promise<EditValidationResult> {
    return apiService.post<EditValidationResult, Omit<ActivityDateChange, 'activityId'>>(
      `/date-constraints/activities/${activityId}/validate`,
      change
    );
  },

  // Date validity checking
  async checkTaskDateValidity(
    taskId: number,
    startDate: string,
    endDate: string
  ): Promise<DateValidityResponse> {
    return apiService.post<DateValidityResponse, { startDate: string; endDate: string }>(
      `/date-constraints/tasks/${taskId}/check-validity`,
      { startDate, endDate }
    );
  },

  async checkActivityDateValidity(
    activityId: number,
    startDate: string,
    endDate: string
  ): Promise<DateValidityResponse> {
    return apiService.post<DateValidityResponse, { startDate: string; endDate: string }>(
      `/date-constraints/activities/${activityId}/check-validity`,
      { startDate, endDate }
    );
  },

  // Impact analysis
  async analyzeTaskDateChangeImpact(
    taskId: number,
    change: Omit<TaskDateChange, 'taskId'>
  ): Promise<DownstreamImpact> {
    return apiService.post<DownstreamImpact, Omit<TaskDateChange, 'taskId'>>(
      `/date-constraints/tasks/${taskId}/impact-analysis`,
      change
    );
  },

  async analyzeActivityDateChangeImpact(
    activityId: number,
    change: Omit<ActivityDateChange, 'activityId'>
  ): Promise<DownstreamImpact> {
    return apiService.post<DownstreamImpact, Omit<ActivityDateChange, 'activityId'>>(
      `/date-constraints/activities/${activityId}/impact-analysis`,
      change
    );
  },
};