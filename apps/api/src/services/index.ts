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

export { PasswordService, passwordService } from "./password.service";
export { JwtService, jwtService } from "./jwt.service";
export type { JwtPayload, TokenPair } from "./jwt.service";
export { AuthService, authService } from "./auth.service";
export type { LoginCredentials, LoginResponse, RefreshResponse } from "./auth.service";

export { CalendarService, calendarService } from "./calendar.service";
export type { CalendarConfig, WorkingHours, WorkingTimeRange } from "./calendar.service";

export { StatusService, statusService } from "./status.service";
export type { StatusTransition, TrackingStatusResult } from "./status.service";

export { TemplateService, templateService } from "./template.service";
export type {
  ProjectTemplate,
  TemplateActivity,
  TemplateTask,
  TemplateDependency,
} from "./template.service";

export { InstantiationService, instantiationService } from "./instantiation.service";
export type { InstantiationOptions, InstantiationResult } from "./instantiation.service";

export { SchedulerService, schedulerService } from "./scheduler.service";
export type {
  ScheduleItem,
  ProjectSchedule,
  SchedulingOptions,
} from "./scheduler.service";

export { ConstraintService, constraintService } from "./constraint.service";
export type {
  DateConstraint,
  DateEditValidation,
  DateConstraintViolation,
  ValidDateRange,
} from "./constraint.service";
