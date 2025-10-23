// ABOUTME: Project service - handles project API endpoints and operations
// ABOUTME: Provides methods for CRUD operations on projects, activities, and tasks

import api from "./api";
import {
  Project,
  Activity,
  Task,
  Dependency,
  DateConstraint,
  PaginatedResponse,
  ProjectSchedule,
} from "../types";

/**
 * Get all projects for the current user's organisation
 */
export const getProjects = async (
  page: number = 1,
  limit: number = 10
): Promise<PaginatedResponse<Project>> => {
  const response = await api.get<PaginatedResponse<Project>>("/projects", {
    params: { page, limit },
  });
  return response.data;
};

/**
 * Get a specific project by ID
 */
export const getProject = async (projectId: string): Promise<Project> => {
  const response = await api.get<Project>(`/projects/${projectId}`);
  return response.data;
};

/**
 * Create a new project
 */
export const createProject = async (data: {
  name: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<Project> => {
  const response = await api.post<Project>("/projects", data);
  return response.data;
};

/**
 * Update a project
 */
export const updateProject = async (
  projectId: string,
  data: Partial<Project>
): Promise<Project> => {
  const response = await api.put<Project>(`/projects/${projectId}`, data);
  return response.data;
};

/**
 * Delete a project
 */
export const deleteProject = async (projectId: string): Promise<void> => {
  await api.delete(`/projects/${projectId}`);
};

/**
 * Get all activities in a project
 */
export const getProjectActivities = async (
  projectId: string
): Promise<Activity[]> => {
  const response = await api.get<Activity[]>(`/projects/${projectId}/activities`);
  return response.data;
};

/**
 * Create an activity in a project
 */
export const createActivity = async (
  projectId: string,
  data: {
    name: string;
    description?: string;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<Activity> => {
  const response = await api.post<Activity>(
    `/projects/${projectId}/activities`,
    data
  );
  return response.data;
};

/**
 * Update an activity
 */
export const updateActivity = async (
  projectId: string,
  activityId: string,
  data: Partial<Activity>
): Promise<Activity> => {
  const response = await api.put<Activity>(
    `/projects/${projectId}/activities/${activityId}`,
    data
  );
  return response.data;
};

/**
 * Delete an activity
 */
export const deleteActivity = async (
  projectId: string,
  activityId: string
): Promise<void> => {
  await api.delete(`/projects/${projectId}/activities/${activityId}`);
};

/**
 * Get all tasks in an activity
 */
export const getActivityTasks = async (
  projectId: string,
  activityId: string
): Promise<Task[]> => {
  const response = await api.get<Task[]>(
    `/projects/${projectId}/activities/${activityId}/tasks`
  );
  return response.data;
};

/**
 * Create a task in an activity
 */
export const createTask = async (
  projectId: string,
  activityId: string,
  data: {
    name: string;
    description?: string;
    duration?: number;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<Task> => {
  const response = await api.post<Task>(
    `/projects/${projectId}/activities/${activityId}/tasks`,
    data
  );
  return response.data;
};

/**
 * Update a task
 */
export const updateTask = async (
  projectId: string,
  activityId: string,
  taskId: string,
  data: Partial<Task>
): Promise<Task> => {
  const response = await api.put<Task>(
    `/projects/${projectId}/activities/${activityId}/tasks/${taskId}`,
    data
  );
  return response.data;
};

/**
 * Delete a task
 */
export const deleteTask = async (
  projectId: string,
  activityId: string,
  taskId: string
): Promise<void> => {
  await api.delete(
    `/projects/${projectId}/activities/${activityId}/tasks/${taskId}`
  );
};

/**
 * Get dependencies for a project
 */
export const getProjectDependencies = async (
  projectId: string
): Promise<Dependency[]> => {
  const response = await api.get<Dependency[]>(
    `/projects/${projectId}/dependencies`
  );
  return response.data;
};

/**
 * Create a dependency
 */
export const createDependency = async (
  projectId: string,
  data: {
    predecessorId: string;
    predecessorType: "ACTIVITY" | "TASK";
    successorId: string;
    successorType: "ACTIVITY" | "TASK";
    type: "FS" | "SS" | "FF" | "SF";
    lag?: number;
  }
): Promise<Dependency> => {
  const response = await api.post<Dependency>(
    `/projects/${projectId}/dependencies`,
    data
  );
  return response.data;
};

/**
 * Delete a dependency
 */
export const deleteDependency = async (
  projectId: string,
  dependencyId: string
): Promise<void> => {
  await api.delete(`/projects/${projectId}/dependencies/${dependencyId}`);
};

/**
 * Get project schedule
 */
export const getProjectSchedule = async (
  projectId: string
): Promise<ProjectSchedule> => {
  const response = await api.get<ProjectSchedule>(
    `/projects/${projectId}/schedule`
  );
  return response.data;
};

/**
 * Get constraints for a project item
 */
export const getItemConstraints = async (
  projectId: string,
  itemId: string
): Promise<DateConstraint[]> => {
  const response = await api.get<DateConstraint[]>(
    `/projects/${projectId}/items/${itemId}/constraints`
  );
  return response.data;
};

/**
 * Add a date constraint to a project item
 */
export const addConstraint = async (
  projectId: string,
  itemId: string,
  data: {
    constraintType: string;
    constraintDate?: Date;
  }
): Promise<DateConstraint> => {
  const response = await api.post<DateConstraint>(
    `/projects/${projectId}/items/${itemId}/constraints`,
    data
  );
  return response.data;
};

/**
 * Remove a date constraint
 */
export const removeConstraint = async (
  projectId: string,
  constraintId: string
): Promise<void> => {
  await api.delete(`/projects/${projectId}/constraints/${constraintId}`);
};
