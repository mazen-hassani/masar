// ABOUTME: Analytics service - fetches dashboard metrics and project statistics
// ABOUTME: Provides methods for accessing project performance data and KPIs

import api from "./api";

export interface ProjectMetrics {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  onTrackProjects: number;
  atRiskProjects: number;
  offTrackProjects: number;
}

export interface TaskMetrics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  completionRate: number;
  averageTaskDuration: number;
}

export interface TimelineData {
  date: string;
  completedCount: number;
  plannedCount: number;
  actualCount: number;
}

export interface ProjectPerformance {
  projectId: string;
  projectName: string;
  completionPercentage: number;
  status: string;
  startDate: Date;
  endDate: Date;
  tasksCompleted: number;
  totalTasks: number;
  daysRemaining: number;
}

export interface DashboardAnalytics {
  projectMetrics: ProjectMetrics;
  taskMetrics: TaskMetrics;
  timelineData: TimelineData[];
  topProjects: ProjectPerformance[];
  activitySummary: {
    label: string;
    value: number;
  }[];
}

/**
 * Get overall dashboard analytics
 */
export const getDashboardAnalytics = async (): Promise<DashboardAnalytics> => {
  const response = await api.get<DashboardAnalytics>("/analytics/dashboard");
  return response.data;
};

/**
 * Get project-specific analytics
 */
export const getProjectAnalytics = async (projectId: string): Promise<{
  completionPercentage: number;
  taskBreakdown: {
    label: string;
    value: number;
  }[];
  timelineChart: TimelineData[];
  criticalPath: {
    taskName: string;
    duration: number;
    slack: number;
  }[];
  resourceUtilization: {
    resourceName: string;
    utilizationRate: number;
  }[];
}> => {
  const response = await api.get(
    `/analytics/projects/${projectId}`
  );
  return response.data;
};

/**
 * Get team performance metrics
 */
export const getTeamMetrics = async (): Promise<{
  teamMembers: {
    name: string;
    tasksCompleted: number;
    tasksInProgress: number;
    averageCompletionTime: number;
  }[];
  teamProductivity: TimelineData[];
}> => {
  const response = await api.get("/analytics/team");
  return response.data;
};
