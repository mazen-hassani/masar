# Service Layer Documentation

## Overview

The service layer provides repository-like CRUD operations and business logic for all entities in the application. Services use Prisma ORM for type-safe database access and include comprehensive error handling and validation.

## Architecture

```
Controllers
    ↓
Services (Business Logic)
    ↓
Prisma Client (Type-safe queries)
    ↓
PostgreSQL Database
```

## Base Service

All services extend `BaseService` which provides:

- **Pagination**: Build paginated responses with metadata
- **Sorting**: Build orderBy clauses for query results
- **Error Handling**: Convert Prisma errors to readable messages

### Pagination Response

```typescript
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  skip: number;
  take: number;
  hasMore: boolean;
}
```

### Pagination Parameters

```typescript
interface PaginationParams {
  skip?: number;        // Default: 0
  take?: number;        // Default: 20
  sortBy?: string;      // Field to sort by
  sortOrder?: "asc" | "desc";  // Default: "asc"
}
```

## Service Reference

### OrganisationService

Manages organizational entities for multi-tenancy support.

**Key Methods:**

- `create(data)` → `Promise<Organisation>` - Create new organisation
- `getById(id)` → `Promise<Organisation | null>` - Get by ID
- `getAll(params)` → `Promise<PaginatedResponse<Organisation>>` - List all
- `update(id, data)` → `Promise<Organisation>` - Update organisation
- `delete(id)` → `Promise<Organisation>` - Delete (cascades)
- `getWithRelations(id)` → Org with users, projects, holidays

**Example:**

```typescript
const org = await organisationService.create({
  name: "Acme Corp",
  timezone: "America/New_York",
  workingHours: [
    { start: "09:00", end: "17:00" }
  ]
});

const all = await organisationService.getAll({
  skip: 0,
  take: 10,
  sortBy: "name",
  sortOrder: "asc"
});
```

### UserService

Manages user accounts, roles, and authentication.

**Key Methods:**

- `create(data)` → `Promise<User>` - Create user
- `getById(id)` → `Promise<User | null>` - Get by ID
- `getByEmail(email)` → `Promise<User | null>` - Get by email (for login)
- `getByOrganisation(orgId, params)` → `PaginatedResponse<User>` - List org users
- `getByRole(orgId, role)` → `Promise<User[]>` - Get users by role
- `update(id, data)` → `Promise<User>` - Update user
- `delete(id)` → `Promise<User>` - Delete user
- `exists(id)` → `Promise<boolean>` - Check if user exists
- `getWithRelations(id)` → User with all projects and tasks

**Roles:**

- **PMO** - Full system access
- **PM** - Can manage projects
- **TEAM_MEMBER** - Can work on tasks
- **CLIENT** - View-only access

**Example:**

```typescript
// Get user by email for login
const user = await userService.getByEmail("john@example.com");

// Get all developers in organisation
const developers = await userService.getByRole(
  organisationId,
  Role.TEAM_MEMBER
);

// List users with pagination
const users = await userService.getByOrganisation(
  organisationId,
  { skip: 0, take: 20 }
);
```

### ProjectService

Manages projects with filtering, searching, and member management.

**Key Methods:**

- `create(data)` → `Promise<Project>` - Create project
- `getById(id)` → `Promise<Project | null>`
- `getByOrganisation(orgId, filters, params)` → Filtered/paginated projects
- `getByMember(userId, params)` → Projects assigned to user
- `update(id, data)` → Update project
- `delete(id)` → Delete project (cascades)
- `addMember(projectId, userId)` → Add team member
- `removeMember(projectId, userId)` → Remove team member
- `getWithRelations(id)` → Project with activities, tasks, baselines
- `getSummary(id)` → Dashboard metrics and summary

**Filtering:**

```typescript
interface ProjectFilters {
  status?: Status;      // NOT_STARTED, IN_PROGRESS, etc.
  ownerUserId?: string; // Filter by PM
  search?: string;      // Search name/description
}

// Usage
const projects = await projectService.getByOrganisation(
  orgId,
  { status: Status.IN_PROGRESS, search: "Website" },
  { take: 20 }
);
```

**Example:**

```typescript
// Create project with members
const project = await projectService.create({
  name: "Website Redesign",
  organisationId: "org-123",
  ownerUserId: "pm-456",
  startDate: new Date(),
  memberUserIds: ["dev-1", "dev-2"]
});

// Get project dashboard summary
const summary = await projectService.getSummary(projectId);
// Returns: { ...project, metrics: { totalTasks, completedTasks, ... } }

// Add new team member
await projectService.addMember(projectId, newUserId);
```

### ActivityService

Manages activities (work packages) within projects.

**Key Methods:**

- `create(data)` → `Promise<Activity>`
- `getById(id)` → `Promise<Activity | null>`
- `getByProject(projectId, filters, params)` → Filtered/paginated activities
- `update(id, data)` → Update activity
- `delete(id)` → Delete (cascades to tasks)
- `getWithRelations(id)` → Activity with tasks and dependencies
- `getOrdered(projectId)` → Activities ordered by start date
- `updateProgressFromTasks(activityId)` → Recalculate progress from children

**Filtering:**

```typescript
interface ActivityFilters {
  status?: Status;
  trackingStatus?: TrackingStatus;  // ON_TRACK, AT_RISK, OFF_TRACK
  search?: string;
}
```

**Example:**

```typescript
// Create activity
const activity = await activityService.create({
  projectId: "proj-123",
  name: "Design Phase",
  startDate: new Date(),
  endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
});

// Get activities by project
const activities = await activityService.getByProject(
  projectId,
  { trackingStatus: TrackingStatus.AT_RISK },
  { sortBy: "startDate" }
);
```

### TaskService

Manages individual tasks with advanced filtering and assignment.

**Key Methods:**

- `create(data)` → `Promise<Task>`
- `getById(id)` → `Promise<Task | null>`
- `getByActivity(activityId, params)` → Tasks in activity
- `getByAssignee(userId, filters, params)` → Tasks assigned to user
- `getOverdue(assigneeId?)` → Overdue tasks
- `update(id, data)` → Update task
- `delete(id)` → Delete task
- `assign(id, userId)` → Assign to user
- `unassign(id)` → Remove assignment
- `getWithRelations(id)` → Task with activity and dependencies
- `filter(filters, params)` → Advanced filtering

**Filtering:**

```typescript
interface TaskFilters {
  activityId?: string;
  assigneeUserId?: string;
  status?: Status;
  trackingStatus?: TrackingStatus;
  search?: string;
}
```

**Example:**

```typescript
// Create task
const task = await taskService.create({
  activityId: "act-123",
  name: "Setup React",
  startDate: new Date(),
  endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
  duration: 16  // working hours
});

// Assign task
await taskService.assign(taskId, assigneeUserId);

// Get user's tasks
const myTasks = await taskService.getByAssignee(userId, {
  status: Status.IN_PROGRESS
});

// Get overdue tasks for user
const overdue = await taskService.getOverdue(userId);
```

### DependencyService

Manages activity and task dependencies with cycle detection.

**Key Methods:**

- `createActivityDependency(data)` → Create activity dependency
- `createTaskDependency(data)` → Create task dependency
- `getActivityPredecessors(id)` → Incoming activities
- `getActivitySuccessors(id)` → Outgoing activities
- `getTaskPredecessors(id)` → Incoming tasks
- `getTaskSuccessors(id)` → Outgoing tasks
- `getActivityDependencies(id)` → Both incoming and outgoing
- `getTaskDependencies(id)` → Both incoming and outgoing
- `delete(id)` → Delete dependency

**Dependency Types:**

- **FS** (Finish-to-Start): Successor starts after predecessor ends
- **SS** (Start-to-Start): Successor starts after predecessor starts
- **FF** (Finish-to-Finish): Successor ends after predecessor ends
- **SF** (Start-to-Finish): Successor ends after predecessor starts

**Cycle Detection:**

Uses depth-first search (DFS) to detect circular dependencies before creation.

**Example:**

```typescript
// Create dependency
const dep = await dependencyService.createActivityDependency({
  predecessorId: designActivityId,
  successorId: developmentActivityId,
  type: DependencyType.FS,
  lag: 0  // Optional: delay in hours
});

// Get activity dependencies
const { incoming, outgoing } =
  await dependencyService.getActivityDependencies(activityId);

// Attempting circular dependency throws error
try {
  await dependencyService.createActivityDependency({
    predecessorId: actC,
    successorId: actA,  // Would create A→B→C→A cycle
    type: DependencyType.FS
  });
} catch (error) {
  console.log("Circular dependency detected!");
}
```

## Error Handling

Services convert Prisma errors to readable messages:

| Prisma Code | Error Message |
|---|---|
| P2002 | Unique constraint violation |
| P2025 | Record not found |
| P2003 | Foreign key constraint violation |
| P2014 | Required relation violation |
| Other | Database error: {message} |

**Example:**

```typescript
try {
  await userService.create({
    email: "existing@example.com",
    // ...
  });
} catch (error) {
  // Error: "Unique constraint violation on email"
}
```

## Testing Services

Services are tested with integration tests that use actual database operations:

```bash
pnpm test  # Run all tests including service tests
```

Tests cover:
- ✅ CRUD operations
- ✅ Filtering and searching
- ✅ Pagination
- ✅ Relationships
- ✅ Cycle detection
- ✅ Error handling
- ✅ Cascading deletes

## Service Singleton Pattern

Services are exported as singletons for easy access:

```typescript
import { projectService, taskService } from "@/services";

// Services are automatically instantiated once
const project = await projectService.getById("project-123");
const tasks = await taskService.getByAssignee(userId);
```

## Performance Optimization Tips

1. **Use `select` for specific fields:**
   ```typescript
   const user = await userService.getById(id);
   // Include only needed relations
   ```

2. **Pagination for large result sets:**
   ```typescript
   const users = await userService.getByOrganisation(
     orgId,
     {},
     { skip: 100, take: 50 }  // Load page 3
   );
   ```

3. **Search instead of filter large lists:**
   ```typescript
   // Good - uses text search
   const projects = await projectService.getByOrganisation(
     orgId,
     { search: "Website" }
   );
   ```

4. **Use appropriate sort fields (indexed columns):**
   ```typescript
   // Good - sorts by indexed field
   { sortBy: "createdAt", sortOrder: "desc" }
   ```

## See Also

- [Prisma Documentation](https://www.prisma.io/docs/)
- [SCHEMA.md](../SCHEMA.md) - Database schema reference
- [Service Tests](./src/services/__tests__) - Test examples
