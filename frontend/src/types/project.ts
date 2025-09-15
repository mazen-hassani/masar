import { BaseEntity } from './common';
import { Status, TrackingStatus, Priority, ProjectStatus, DependencyType } from './enums';
import { User, WorkingCalendar } from './user';

export interface Project extends BaseEntity {
  name: string;
  description?: string;
  status: ProjectStatus;
  priority: Priority;
  trackingStatus: TrackingStatus;
  organisation: { id: number; name: string };
  projectManager?: User;
  clientId?: number;
  client?: User;
  teamMembers?: User[];
  startDate?: string;
  endDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  budget?: number;
  workingCalendar?: WorkingCalendar;
  activities?: Activity[];
  percentageComplete: number;
  externalRefs?: ExternalRefs;
}

export interface Activity extends BaseEntity {
  name: string;
  description?: string;
  status: Status;
  trackingStatus?: TrackingStatus;
  priority?: Priority;
  project: { id: number; name: string };
  startDate?: string;
  endDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  percentageComplete: number;
  tasks?: Task[];
  externalRefs?: ExternalRefs;
}

export interface Task extends BaseEntity {
  name: string;
  description?: string;
  status: Status;
  trackingStatus?: TrackingStatus;
  percentageComplete: number;
  startDate?: string;
  endDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  activity: { id: number; name: string };
  assigneeUser?: User;
  externalRefs?: ExternalRefs;
  verifiedAt?: string;
  verifiedByUser?: User;
}

export interface Dependency extends BaseEntity {
  dependencyType: DependencyType;
  lagInMinutes: number;
  predecessorTask?: Task;
  successorTask?: Task;
  predecessorActivity?: Activity;
  successorActivity?: Activity;
}

export interface ExternalRefs {
  jiraKey?: string;
  asanaId?: string;
  trelloId?: string;
  githubId?: string;
  customFields?: Record<string, any>;
}

export interface ProjectTemplate extends BaseEntity {
  name: string;
  description?: string;
  category: string;
  defaultPriority?: Priority;
  estimatedDuration: number;
  activities: TemplateActivity[];
}

export interface TemplateActivity {
  id: number;
  name: string;
  description?: string;
  estimatedDuration: number;
  tasks: TemplateTask[];
}

export interface TemplateTask {
  id: number;
  name: string;
  description?: string;
  estimatedDuration: number;
}

// Request/Response DTOs
export interface CreateProjectRequest {
  name: string;
  description?: string;
  priority: Priority;
  startDate?: string;
  endDate?: string;
  budget?: number;
  workingCalendarId?: number;
}

export interface UpdateProjectRequest extends Partial<CreateProjectRequest> {
  status?: ProjectStatus;
  trackingStatus?: TrackingStatus;
  actualStartDate?: string;
  actualEndDate?: string;
}

export interface CreateActivityRequest {
  name: string;
  description?: string;
  priority?: Priority;
  projectId: number;
}

export interface UpdateActivityRequest extends Partial<CreateActivityRequest> {
  status?: Status;
  trackingStatus?: TrackingStatus;
  startDate?: string;
  endDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
}

export interface CreateTaskRequest {
  name: string;
  description?: string;
  activityId: number;
  assigneeUserId?: number;
}

export interface UpdateTaskRequest extends Partial<CreateTaskRequest> {
  status?: Status;
  trackingStatus?: TrackingStatus;
  startDate?: string;
  endDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  percentageComplete?: number;
}

export interface CreateDependencyRequest {
  dependencyType: DependencyType;
  lagInMinutes?: number;
  predecessorTaskId?: number;
  successorTaskId?: number;
  predecessorActivityId?: number;
  successorActivityId?: number;
}