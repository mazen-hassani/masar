// Scheduling and constraint-related types
export interface ScheduleResult {
  success: boolean;
  error?: string;
  scheduledActivities: number;
  scheduledTasks: number;
  affectedItemsCount: number;
  totalTime: number;
  graphBuildTime: number;
  topologicalSortTime: number;
  scheduleCalculationTime: number;
  applyTime: number;
}

export interface DateConstraints {
  taskId?: number;
  activityId?: number;
  projectId: number;
  earliestStartTime?: string;
  latestEndTime?: string;
  minimumDuration?: string; // ISO duration string
  feasible: boolean;
  constraintViolations: string[];
  constraintReasons: ConstraintReason[];
}

export interface ConstraintReason {
  constraintType: 'DEPENDENCY_CONSTRAINT' | 'PROJECT_BOUNDARY_CONSTRAINT' | 'WORKING_CALENDAR_CONSTRAINT' | 'DURATION_CONSTRAINT' | 'RESOURCE_CONSTRAINT';
  description: string;
  constraintDateTime?: string;
  dependencyId?: number;
  relatedItemId?: number;
  relatedItemName?: string;
  relatedItemType?: 'Task' | 'Activity';
  dependencyType?: 'FS' | 'SS' | 'FF' | 'SF';
  boundaryType?: string;
}

export interface EditValidationResult {
  status: 'VALID' | 'WARNING' | 'ERROR';
  canProceed: boolean;
  primaryMessage: string;
  validationMessages: string[];
  warnings: string[];
  errors: string[];
  downstreamImpact?: DownstreamImpact;
  suggestedStartDate?: string;
  suggestedEndDate?: string;
}

export interface DownstreamImpact {
  impactedTasks: ImpactedItem[];
  impactedActivities: ImpactedItem[];
  totalImpactedItems: number;
  affectsCriticalPath: boolean;
  affectsProjectEndDate: boolean;
  impactSummary: string;
}

export interface ImpactedItem {
  itemId: number;
  itemName: string;
  itemType: 'Task' | 'Activity';
  impactType: 'DATE_SHIFT' | 'SCHEDULE_CONFLICT' | 'CRITICAL_PATH_CHANGE';
  impactDescription: string;
  requiresRescheduling: boolean;
}

export interface TaskDateChange {
  taskId: number;
  changeType: 'START_DATE_ONLY' | 'END_DATE_ONLY' | 'BOTH_DATES' | 'DURATION_CHANGE' | 'MOVE_TASK';
  proposedStartDate?: string;
  proposedEndDate?: string;
  changeReason?: string;
}

export interface ActivityDateChange {
  activityId: number;
  changeType: 'START_DATE_ONLY' | 'END_DATE_ONLY' | 'BOTH_DATES' | 'DURATION_CHANGE' | 'MOVE_ACTIVITY';
  proposedStartDate?: string;
  proposedEndDate?: string;
  changeReason?: string;
  propagateToTasks: boolean;
}

export interface DateValidityResponse {
  valid: boolean;
  taskId?: number;
  activityId?: number;
  startDate: string;
  endDate: string;
  reason?: string;
  violations: string[];
}