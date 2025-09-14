import { apiService } from './api';
import {
  Project,
  Activity,
  Task,
  Dependency,
  CreateProjectRequest,
  UpdateProjectRequest,
  CreateActivityRequest,
  UpdateActivityRequest,
  CreateTaskRequest,
  UpdateTaskRequest,
  CreateDependencyRequest,
  PaginatedResponse,
  PaginationParams
} from '../types';

export const projectService = {
  // Project methods
  async getProjects(params?: PaginationParams): Promise<PaginatedResponse<Project>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.size) queryParams.append('size', params.size.toString());
    if (params?.sort) queryParams.append('sort', params.sort);
    if (params?.direction) queryParams.append('direction', params.direction);
    
    const url = `/projects${queryParams.toString() ? `?${queryParams}` : ''}`;
    return apiService.get<PaginatedResponse<Project>>(url);
  },

  async getProject(id: number): Promise<Project> {
    return apiService.get<Project>(`/projects/${id}`);
  },

  async createProject(projectData: CreateProjectRequest): Promise<Project> {
    return apiService.post<Project, CreateProjectRequest>('/projects', projectData);
  },

  async updateProject(id: number, projectData: UpdateProjectRequest): Promise<Project> {
    return apiService.put<Project, UpdateProjectRequest>(`/projects/${id}`, projectData);
  },

  async deleteProject(id: number): Promise<void> {
    return apiService.delete<void>(`/projects/${id}`);
  },

  // Activity methods
  async getActivities(projectId: number): Promise<Activity[]> {
    return apiService.get<Activity[]>(`/projects/${projectId}/activities`);
  },

  async getActivity(projectId: number, activityId: number): Promise<Activity> {
    return apiService.get<Activity>(`/projects/${projectId}/activities/${activityId}`);
  },

  async createActivity(projectId: number, activityData: CreateActivityRequest): Promise<Activity> {
    return apiService.post<Activity, CreateActivityRequest>(
      `/projects/${projectId}/activities`,
      activityData
    );
  },

  async updateActivity(
    projectId: number,
    activityId: number,
    activityData: UpdateActivityRequest
  ): Promise<Activity> {
    return apiService.put<Activity, UpdateActivityRequest>(
      `/projects/${projectId}/activities/${activityId}`,
      activityData
    );
  },

  async deleteActivity(projectId: number, activityId: number): Promise<void> {
    return apiService.delete<void>(`/projects/${projectId}/activities/${activityId}`);
  },

  // Task methods
  async getTasks(activityId: number): Promise<Task[]> {
    return apiService.get<Task[]>(`/activities/${activityId}/tasks`);
  },

  async getTask(activityId: number, taskId: number): Promise<Task> {
    return apiService.get<Task>(`/activities/${activityId}/tasks/${taskId}`);
  },

  async createTask(activityId: number, taskData: CreateTaskRequest): Promise<Task> {
    return apiService.post<Task, CreateTaskRequest>(`/activities/${activityId}/tasks`, taskData);
  },

  async updateTask(activityId: number, taskId: number, taskData: UpdateTaskRequest): Promise<Task> {
    return apiService.put<Task, UpdateTaskRequest>(
      `/activities/${activityId}/tasks/${taskId}`,
      taskData
    );
  },

  async deleteTask(activityId: number, taskId: number): Promise<void> {
    return apiService.delete<void>(`/activities/${activityId}/tasks/${taskId}`);
  },

  // Dependency methods
  async getDependencies(projectId: number): Promise<Dependency[]> {
    return apiService.get<Dependency[]>(`/projects/${projectId}/dependencies`);
  },

  async createDependency(projectId: number, dependencyData: CreateDependencyRequest): Promise<Dependency> {
    return apiService.post<Dependency, CreateDependencyRequest>(
      `/projects/${projectId}/dependencies`,
      dependencyData
    );
  },

  async deleteDependency(projectId: number, dependencyId: number): Promise<void> {
    return apiService.delete<void>(`/projects/${projectId}/dependencies/${dependencyId}`);
  },

  // Project statistics
  async getProjectStats(projectId: number): Promise<{
    totalActivities: number;
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    activeUsers: number;
  }> {
    return apiService.get<{
      totalActivities: number;
      totalTasks: number;
      completedTasks: number;
      overdueTasks: number;
      activeUsers: number;
    }>(`/projects/${projectId}/stats`);
  },
};