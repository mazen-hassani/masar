// ABOUTME: Service layer exports for easy access
// ABOUTME: Provides centralized access to all service classes

export { BaseService } from "./base.service";
export type { PaginationParams, PaginatedResponse } from "./base.service";

export { OrganisationService, organisationService } from "./organisation.service";
export { UserService, userService } from "./user.service";
export { ProjectService, projectService } from "./project.service";
export type { ProjectFilters } from "./project.service";

export { ActivityService, activityService } from "./activity.service";
export type { ActivityFilters } from "./activity.service";

export { TaskService, taskService } from "./task.service";
export type { TaskFilters } from "./task.service";

export { DependencyService, dependencyService } from "./dependency.service";
