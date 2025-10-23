# Status Management & Lifecycle Documentation

## Overview

The status service provides comprehensive status lifecycle management for tasks and activities. It includes:

- Status transition validation with state machine logic
- Role-based permission checks for sensitive transitions
- Tracking status calculation (ON_TRACK, AT_RISK, OFF_TRACK)
- Progress percentage management
- Automatic progress calculation from child tasks
- Verification system with prerequisite validation

## Status Lifecycle

### Task Status Flow

```
┌─────────────────┐
│  NOT_STARTED    │ (initial)
└────────┬────────┘
         │ user action
         ↓
┌─────────────────┐
│  IN_PROGRESS    │ (actively working)
└────┬─────────┬──┘
     │         │
     │         └──→ ON_HOLD ──→ IN_PROGRESS (resume)
     │
     ↓
┌─────────────────┐
│   COMPLETED     │ (work done, awaiting review)
└────────┬────────┘
         │ PM/PMO review
         ↓
┌─────────────────┐
│   VERIFIED      │ (approved by PM)
└─────────────────┘
```

### Status Definitions

| Status | Description | Allowed Transitions |
|--------|-------------|-------------------|
| **NOT_STARTED** | Task created but not yet started | → IN_PROGRESS, COMPLETED |
| **IN_PROGRESS** | Currently being worked on | → ON_HOLD, COMPLETED |
| **ON_HOLD** | Paused, waiting for something | → IN_PROGRESS |
| **COMPLETED** | Work finished, awaiting PM review | → VERIFIED (PM/PMO only) |
| **VERIFIED** | Approved by PM, work confirmed | → IN_PROGRESS (rework) |

### Status Transition Rules

Valid transitions (any user unless otherwise noted):

- `NOT_STARTED` → `IN_PROGRESS` ✅
- `NOT_STARTED` → `COMPLETED` ✅ (shortcut)
- `IN_PROGRESS` → `ON_HOLD` ✅
- `ON_HOLD` → `IN_PROGRESS` ✅ (resume)
- `IN_PROGRESS` → `COMPLETED` ✅
- `COMPLETED` → `VERIFIED` ✅ (PM/PMO only)
- `VERIFIED` → `IN_PROGRESS` ✅ (PM/PMO only, for rework)

All other transitions are invalid and will throw an error.

## Tracking Status

Separate from the main status, items also have a "tracking status" that indicates schedule adherence:

| Tracking Status | Meaning | Trigger |
|-----------------|---------|---------|
| **ON_TRACK** | On schedule, progressing well | All new items, completed items |
| **AT_RISK** | Schedule at risk, behind on progress | Progress is 5%+ behind expected, minimal progress made |
| **OFF_TRACK** | Past due date | Current date > end date |

### Tracking Status Calculation

Tracking status is calculated automatically for IN_PROGRESS items based on:

1. **Expected Progress**: Percentage of time elapsed vs. total duration
2. **Actual Progress**: Percentage complete field
3. **Comparison**: If actual is 5%+ behind expected, mark AT_RISK
4. **Overdue Check**: If past end date, mark OFF_TRACK

**Example**:
- Task duration: 8 working hours (1 day)
- 4 hours elapsed (50% of time)
- Actual progress: 20% complete
- Comparison: Expected 50%, Actual 20%, Difference 30%
- **Result**: AT_RISK (significant gap)

## Service Methods

### Status Transition Management

#### `isValidTransition(from: Status, to: Status, userRole?: string): boolean`

Checks if a status transition is allowed.

```typescript
const isValid = statusService.isValidTransition(
  Status.IN_PROGRESS,
  Status.COMPLETED
);
// Returns: true

const isValidVerify = statusService.isValidTransition(
  Status.COMPLETED,
  Status.VERIFIED,
  "TEAM_MEMBER" // Non-PM user
);
// Returns: false (only PM/PMO can verify)
```

#### `getValidNextStatuses(currentStatus: Status, userRole?: string): Status[]`

Gets all valid next statuses for the current status.

```typescript
const validNext = statusService.getValidNextStatuses(
  Status.IN_PROGRESS,
  "TEAM_MEMBER"
);
// Returns: [Status.ON_HOLD, Status.COMPLETED]
```

#### `getTransitionErrorMessage(from: Status, to: Status, userRole?: string): string`

Gets a user-friendly error message for invalid transitions.

```typescript
const message = statusService.getTransitionErrorMessage(
  Status.NOT_STARTED,
  Status.ON_HOLD,
  "TEAM_MEMBER"
);
// Returns: "Cannot transition from NOT_STARTED to ON_HOLD. Valid transitions: IN_PROGRESS, COMPLETED"
```

### Task Status Updates

#### `updateTaskStatus(taskId: string, newStatus: Status, userRole?: string): Promise<Task>`

Updates task status with validation.

```typescript
// Move task to IN_PROGRESS
const task = await statusService.updateTaskStatus(
  "task-123",
  Status.IN_PROGRESS,
  "TEAM_MEMBER"
);

// Mark complete
const completed = await statusService.updateTaskStatus(
  "task-123",
  Status.COMPLETED,
  "TEAM_MEMBER"
);
// Note: progressPercentage automatically set to 100

// Verify (PM only)
const verified = await statusService.updateTaskStatus(
  "task-123",
  Status.VERIFIED,
  "PM"
);
```

**Behavior**:
- Validates transition before updating
- Throws error if transition invalid
- Automatically sets `progressPercentage` to 100 for COMPLETED/VERIFIED
- Throws error if role doesn't have permission

### Activity Status Updates

#### `updateActivityStatus(activityId: string, newStatus: Status, userRole?: string): Promise<Activity>`

Updates activity status with additional validation.

```typescript
const activity = await statusService.updateActivityStatus(
  "activity-456",
  Status.IN_PROGRESS
);

// Verify (checks all child tasks are verified)
const verified = await statusService.updateActivityStatus(
  "activity-456",
  Status.VERIFIED,
  "PM"
);
// Throws error if any task not VERIFIED
```

**Additional Validation**:
- Prevents VERIFIED status if any child task is not VERIFIED
- All other validations same as task status

### Progress Management

#### `updateTaskProgress(taskId: string, percentage: number): Promise<Task>`

Updates task progress percentage (only for IN_PROGRESS tasks).

```typescript
// Update progress to 75%
const updated = await statusService.updateTaskProgress("task-123", 75);

// Auto-validation:
// - Must be 0-100
// - Task must be IN_PROGRESS status
// - Throws error otherwise
```

**Validation**:
- Percentage must be 0-100
- Only allowed for IN_PROGRESS tasks
- COMPLETED/VERIFIED tasks cannot be edited (stuck at 100%)

#### `calculateActivityProgress(activityId: string): Promise<number>`

Calculates activity progress as average of child task progress.

```typescript
// If activity has 4 tasks with progress: 25%, 50%, 75%, 100%
const progress = await statusService.calculateActivityProgress("activity-456");
// Returns: 63 (average of all tasks)
```

#### `updateActivityProgressFromTasks(activityId: string): Promise<Activity>`

Updates activity progress based on current child task progress.

```typescript
const activity = await statusService.updateActivityProgressFromTasks(
  "activity-456"
);
// activity.progressPercentage now reflects average of tasks
```

### Tracking Status

#### `calculateTrackingStatus(itemId: string, itemType: "task" | "activity", calendar: CalendarConfig, organisationId: string): Promise<TrackingStatusResult>`

Calculates tracking status based on schedule adherence.

```typescript
const tracking = await statusService.calculateTrackingStatus(
  "task-123",
  "task",
  calendar,
  organisationId
);

// Returns:
// {
//   status: TrackingStatus.ON_TRACK,
//   percentageComplete: 50,
//   daysRemaining: 2,
//   riskReason: undefined
// }
```

**For AT_RISK items:**
```typescript
// {
//   status: TrackingStatus.AT_RISK,
//   percentageComplete: 20,
//   daysRemaining: 1,
//   riskReason: "Expected 75% complete, actual 20%"
// }
```

#### `updateTrackingStatus(itemId: string, itemType: "task" | "activity", calendar: CalendarConfig, organisationId: string): Promise<void>`

Calculates and updates the tracking status field in database.

```typescript
await statusService.updateTrackingStatus(
  "task-123",
  "task",
  calendar,
  organisationId
);
// Task.trackingStatus now updated in database
```

#### `updateProjectTrackingStatus(projectId: string, calendar: CalendarConfig, organisationId: string): Promise<number>`

Bulk updates tracking status for all activities in a project.

```typescript
const updatedCount = await statusService.updateProjectTrackingStatus(
  "project-789",
  calendar,
  organisationId
);
// Returns: number of activities updated
// Useful for daily/scheduled updates
```

## Usage Examples

### Example 1: Complete Status Flow

```typescript
// Task starts as NOT_STARTED
let task = await taskService.getById("task-123");
console.log(task.status); // NOT_STARTED

// Team member starts work
task = await statusService.updateTaskStatus(
  "task-123",
  Status.IN_PROGRESS,
  "TEAM_MEMBER"
);

// Update progress periodically
await statusService.updateTaskProgress("task-123", 25);
await statusService.updateTaskProgress("task-123", 50);
await statusService.updateTaskProgress("task-123", 75);

// Mark complete when done
task = await statusService.updateTaskStatus(
  "task-123",
  Status.COMPLETED,
  "TEAM_MEMBER"
);
// progressPercentage automatically set to 100

// PM reviews and verifies
task = await statusService.updateTaskStatus(
  "task-123",
  Status.VERIFIED,
  "PM"
);
```

### Example 2: Handle Activity with Multiple Tasks

```typescript
// Team works on activity with 3 tasks
const activity = await activityService.getById("activity-456");

// All 3 tasks moved through their lifecycle
// After each task status change, update activity progress
for (const taskId of activity.taskIds) {
  await statusService.updateActivityProgressFromTasks("activity-456");
}

// When all tasks COMPLETED
const allComplete = await prisma.task.count({
  where: {
    activityId: "activity-456",
    status: { not: Status.COMPLETED },
  },
});

if (allComplete === 0) {
  // Move activity to COMPLETED
  await statusService.updateActivityStatus(
    "activity-456",
    Status.COMPLETED,
    "TEAM_MEMBER"
  );

  // All tasks must be VERIFIED before activity can be VERIFIED
  // This is validated by the service
  try {
    await statusService.updateActivityStatus(
      "activity-456",
      Status.VERIFIED,
      "PM"
    );
  } catch (error) {
    // Error: "Cannot verify activity with X unverified task(s)"
    // PM reviews and verifies each task first
  }
}
```

### Example 3: Monitor Tracking Status

```typescript
// Get tracking status for task
const tracking = await statusService.calculateTrackingStatus(
  "task-123",
  "task",
  calendar,
  organisationId
);

if (tracking.status === TrackingStatus.AT_RISK) {
  console.warn(`⚠️  Task at risk: ${tracking.riskReason}`);
  console.warn(`Days remaining: ${tracking.daysRemaining}`);

  // Notify PM
  await notificationService.notifyAtRisk(taskId, tracking.riskReason);
}

// Update all project tracking daily
const updatedCount = await statusService.updateProjectTrackingStatus(
  projectId,
  calendar,
  organisationId
);
console.log(`Updated tracking for ${updatedCount} activities`);
```

### Example 4: Hold/Resume Workflow

```typescript
// Team member needs to pause work
let task = await statusService.updateTaskStatus(
  "task-123",
  Status.ON_HOLD,
  "TEAM_MEMBER"
);

// PM is notified of the hold
// ... delay while waiting for dependency ...

// Work can resume
task = await statusService.updateTaskStatus(
  "task-123",
  Status.IN_PROGRESS,
  "TEAM_MEMBER"
);

// Progress continues from previous level
// If was at 50%, stays at 50% (can continue editing)
```

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Cannot transition from X to Y" | Invalid status transition | Check `getValidNextStatuses()` |
| "Only users with PM, PMO role can perform this action" | Insufficient permission | Use correct user role |
| "Cannot verify activity with 3 unverified task(s)" | Prerequisite not met | Verify all child tasks first |
| "Can only update progress for IN_PROGRESS tasks" | Wrong status | Task must be IN_PROGRESS |
| "Percentage must be between 0 and 100" | Invalid value | Use 0-100 range |

## Best Practices

### 1. Always Validate Before Transitioning

```typescript
// ❌ Bad: Assume transition is valid
await statusService.updateTaskStatus(taskId, Status.ON_HOLD);

// ✅ Good: Check first
if (statusService.isValidTransition(task.status, Status.ON_HOLD)) {
  await statusService.updateTaskStatus(taskId, Status.ON_HOLD);
} else {
  showError(statusService.getTransitionErrorMessage(
    task.status,
    Status.ON_HOLD,
    userRole
  ));
}
```

### 2. Update Tracking Status Regularly

```typescript
// Daily job (via cron)
const projects = await projectService.getAll();
for (const project of projects.data) {
  await statusService.updateProjectTrackingStatus(
    project.id,
    calendar,
    project.organisationId
  );
}
```

### 3. Cascade Progress Updates

```typescript
// When task progress updates
await statusService.updateTaskProgress(taskId, percentage);

// Update parent activity
const task = await taskService.getById(taskId);
await statusService.updateActivityProgressFromTasks(task.activityId);
```

### 4. Check At-Risk Items

```typescript
// Get all at-risk items for PM dashboard
const activities = await activityService.getByProject(projectId);
const atRiskItems = activities.data.filter(
  a => a.trackingStatus === TrackingStatus.AT_RISK
);

// Show alerts or send notifications
```

### 5. Enforce Verification Prerequisites

```typescript
// Before marking activity VERIFIED
const unverifiedTasks = await prisma.task.count({
  where: {
    activityId,
    status: { not: Status.VERIFIED },
  },
});

if (unverifiedTasks > 0) {
  throw new Error(
    `Activity cannot be verified with ${unverifiedTasks} unverified task(s)`
  );
}
```

## API Integration

### Endpoints (to be implemented)

```
PATCH /api/tasks/:id/status
  Request: { status: Status }
  Response: Task

PATCH /api/tasks/:id/progress
  Request: { percentage: number }
  Response: Task

PATCH /api/activities/:id/status
  Request: { status: Status }
  Response: Activity

GET /api/activities/:id/tracking-status
  Response: TrackingStatusResult

POST /api/projects/:id/update-tracking
  Response: { updatedCount: number }
```

## Testing

Run status tests:

```bash
npm test -- status.integration.test.ts
```

Tests cover:
- ✅ Valid and invalid transitions
- ✅ Role-based permission checks
- ✅ Progress management
- ✅ Activity progress calculation
- ✅ Tracking status calculation
- ✅ Verification prerequisites
- ✅ Complete status flows
- ✅ Hold/resume workflows

## Future Enhancements

1. **Custom Transition Rules**: Per-project status workflows
2. **Transition Approvals**: Require approval for certain transitions
3. **Status Notifications**: Auto-notify team on status changes
4. **Historical Tracking**: Audit trail of all status changes
5. **SLA Tracking**: Track time in each status vs. SLA
6. **Auto-Escalation**: Escalate AT_RISK items to PM
7. **Status Workflows**: Support custom workflows per project type
8. **Bulk Status Updates**: Update multiple items at once
