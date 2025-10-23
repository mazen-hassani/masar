# Database Schema Documentation

## Overview

The task management system uses PostgreSQL with Prisma ORM for type-safe database access. The schema supports:

- Multi-tenancy (organisations)
- Role-based access control (users with roles)
- Project/Activity/Task hierarchy
- Dependency management (activity and task-level)
- Project baselines with snapshots
- Audit logging
- Refresh token management

## Core Models

### Organisation
Represents a company or organizational unit.

**Fields:**
- `id` (String, PK) - Unique identifier
- `name` (String) - Organization name
- `timezone` (String) - Default timezone (e.g., "UTC", "America/New_York")
- `workingDaysOfWeek` (String) - Working days (e.g., "MTWTFSS" for Monday-Sunday)
- `workingHours` (JSON) - Array of working time ranges
  - Example: `[{start: "09:00", end: "13:00"}, {start: "14:00", end: "18:00"}]`
- `createdAt` (DateTime) - Creation timestamp
- `updatedAt` (DateTime) - Last update timestamp

**Relationships:**
- `users`: Many users belong to an organization
- `projects`: Many projects belong to an organization
- `holidays`: Organization-specific holidays

### User
Represents a system user with role-based permissions.

**Fields:**
- `id` (String, PK)
- `email` (String, UNIQUE) - Email address
- `name` (String) - Full name
- `passwordHash` (String) - Bcrypt hashed password
- `role` (Enum: PMO, PM, TEAM_MEMBER, CLIENT) - User role
- `organisationId` (String, FK) - Organization reference
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

**Relationships:**
- `organisation`: Parent organization
- `projectsOwned`: Projects owned by this user (PM)
- `projectsAssigned`: Projects this user is assigned to (team members)
- `assignedTasks`: Tasks assigned to this user
- `auditLogs`: Audit logs created by this user
- `refreshTokens`: Active refresh tokens

**Roles & Permissions:**
- **PMO** (Project Management Officer): Full system access, organization management
- **PM** (Project Manager): Can create/manage projects, assign team members
- **TEAM_MEMBER**: Can work on assigned tasks/activities
- **CLIENT**: View-only access to assigned projects

### Holiday
Organization-level holidays that affect working day calculations.

**Fields:**
- `id` (String, PK)
- `date` (DateTime) - Holiday date
- `description` (String) - Holiday name
- `organisationId` (String, FK)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

**Indexes:**
- `(organisationId)` - Fast lookup by organization
- `(date)` - Fast lookup by date

---

## Project Hierarchy

### Project
Top-level container for work.

**Fields:**
- `id` (String, PK)
- `name` (String) - Project name
- `description` (String, optional)
- `organisationId` (String, FK)
- `ownerUserId` (String, FK) - Project manager
- `startDate` (DateTime) - Project start date
- `timezone` (String) - Project-specific timezone (overrides org timezone)
- `status` (Enum: NOT_STARTED, IN_PROGRESS, ON_HOLD, COMPLETED, VERIFIED)
- `progressPercentage` (Float) - Auto-calculated from activities
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

**Relationships:**
- `organisation`: Parent organization
- `owner`: Project manager (User)
- `members`: Team members on project (Users - many-to-many)
- `activities`: Activities in project
- `baselines`: Project baselines

### Activity
Large work packages within a project. Example: "Design Phase", "Development Phase".

**Fields:**
- `id` (String, PK)
- `projectId` (String, FK)
- `name` (String) - Activity name
- `description` (String, optional)
- `startDate` (DateTime)
- `endDate` (DateTime)
- `status` (Enum) - Lifecycle status
- `trackingStatus` (Enum: ON_TRACK, AT_RISK, OFF_TRACK)
- `progressPercentage` (Float) - Average of child tasks' percentages
- `verificationChecklist` (JSON, optional) - Checklist items with completion status
  - Example: `[{item: "Code review", completed: true, completedBy: "user-id", completedAt: "2024-01-01"}]`
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

**Relationships:**
- `project`: Parent project
- `tasks`: Child tasks
- `predecessorDeps`: Incoming dependencies (other activities that must complete first)
- `successorDeps`: Outgoing dependencies (activities that depend on this one)

### Task
Individual work items within an activity.

**Fields:**
- `id` (String, PK)
- `activityId` (String, FK)
- `name` (String) - Task name
- `description` (String, optional)
- `startDate` (DateTime)
- `endDate` (DateTime)
- `duration` (Integer) - Working hours (not calendar hours)
- `assigneeUserId` (String, FK, optional)
- `status` (Enum)
- `trackingStatus` (Enum)
- `progressPercentage` (Float 0-100) - Editable only when IN_PROGRESS
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

**Relationships:**
- `activity`: Parent activity
- `assignee`: Assigned user (Team member or PM)
- `predecessorDeps`: Tasks that must complete first
- `successorDeps`: Tasks that depend on this task

---

## Dependencies & Scheduling

### Dependency
Represents relationships between activities or tasks.

**Fields:**
- `id` (String, PK)
- `activityPredecessorId` (String, FK, optional) - For activity dependencies
- `activitySuccessorId` (String, FK, optional)
- `taskPredecessorId` (String, FK, optional) - For task dependencies
- `taskSuccessorId` (String, FK, optional)
- `dependencyType` (Enum: FS, SS, FF, SF)
  - **FS** (Finish-to-Start): Successor starts after predecessor ends
  - **SS** (Start-to-Start): Successor starts after predecessor starts
  - **FF** (Finish-to-Finish): Successor ends after predecessor ends
  - **SF** (Start-to-Finish): Successor ends after predecessor starts
- `lag` (Integer) - Time buffer in working hours (can be negative for leads)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

**Business Rules:**
- Cannot create cross-project dependencies
- Cannot create self-dependencies
- Cannot create circular dependencies
- Activity dependencies must reference Activity models
- Task dependencies must reference Task models

---

## Baselines & Snapshots

### ProjectBaseline
Snapshot of project schedule at a point in time for baseline comparison.

**Fields:**
- `id` (String, PK)
- `projectId` (String, FK)
- `name` (String) - e.g., "Planned v1", "Revised v2"
- `baselineDate` (DateTime) - When baseline was created
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

**Relationships:**
- `project`: Parent project
- `snapshots`: Baseline snapshots (multiple for detailed tracking)

### BaselineSnapshot
Detailed data snapshot at baseline creation.

**Fields:**
- `id` (String, PK)
- `baselineId` (String, FK)
- `data` (JSON) - Snapshot data structure
  - Example:
    ```json
    {
      "activity-123": {
        "startDate": "2024-01-01",
        "endDate": "2024-01-15",
        "status": "NOT_STARTED"
      }
    }
    ```
- `createdAt` (DateTime)

---

## Audit & Logging

### AuditLog
Tracks all significant actions in the system.

**Fields:**
- `id` (String, PK)
- `userId` (String, FK, optional) - User who performed action
- `action` (String) - Action type (CREATE, UPDATE, DELETE, LOGIN_FAILED, etc.)
- `entityType` (String) - Entity affected (Project, Activity, Task, etc.)
- `entityId` (String, optional) - ID of affected entity
- `changes` (JSON, optional) - {before: {...}, after: {...}}
- `ipAddress` (String, optional) - IP address of requester
- `userAgent` (String, optional) - User agent string
- `createdAt` (DateTime)

**Indexes:**
- `(userId)` - Find logs by user
- `(entityType)` - Find logs by entity type
- `(createdAt)` - Find logs by time

### RefreshToken
Manages authentication refresh tokens.

**Fields:**
- `id` (String, PK)
- `userId` (String, FK) - Token owner
- `token` (String, UNIQUE) - JWT token
- `expiresAt` (DateTime) - Token expiration
- `createdAt` (DateTime)

**Indexes:**
- `(userId)` - Find tokens by user
- `(expiresAt)` - Find expired tokens for cleanup

---

## Enums

```typescript
enum Role {
  PMO          // Project Management Officer
  PM           // Project Manager
  TEAM_MEMBER  // Team member/Developer
  CLIENT       // Client/Stakeholder
}

enum Status {
  NOT_STARTED  // Work not started
  IN_PROGRESS  // Currently being worked on
  ON_HOLD      // Paused
  COMPLETED    // Work finished
  VERIFIED     // Verified by PM/QA
}

enum TrackingStatus {
  ON_TRACK     // Within timeline and scope
  AT_RISK      // May miss deadline (configurable threshold)
  OFF_TRACK    // Behind schedule
}

enum DependencyType {
  FS  // Finish-to-Start: Most common
  SS  // Start-to-Start: Parallel work
  FF  // Finish-to-Finish: Must end together
  SF  // Start-to-Finish: Rare, unusual dependency
}
```

---

## Relationships Overview

```
Organisation
├── User (role-based)
├── Project
│   ├── Activity
│   │   ├── Task
│   │   └── Dependency (Activity ↔ Activity)
│   ├── Dependency (Activity ↔ Activity)
│   └── ProjectBaseline
│       └── BaselineSnapshot
└── Holiday

User
├── AuditLog
└── RefreshToken
```

---

## Important Constraints

1. **Cascade Deletes:**
   - Deleting an Organization cascades to all its Users, Projects, etc.
   - Deleting a Project cascades to its Activities, Tasks, Dependencies
   - Deleting an Activity cascades to its Tasks and Dependencies

2. **Unique Constraints:**
   - User.email per organization
   - RefreshToken.token globally

3. **Foreign Key Constraints:**
   - Tasks cannot exist without an Activity
   - Activities cannot exist without a Project
   - Projects cannot exist without an Organization

---

## Migrations

Database schema changes use Prisma migrations:

```bash
# Create a new migration after schema changes
pnpm db:migrate

# Apply migrations in production
pnpm db:migrate:prod

# Seed database with sample data
pnpm db:seed

# Reset database (development only)
pnpm db:reset
```

---

## Performance Considerations

1. **Indexes:** All FK columns and commonly queried fields are indexed
2. **JSON Columns:** Used for flexible data (workingHours, checklist, snapshot data)
3. **Connection Pooling:** Prisma handles serverless connection pooling automatically
4. **Query Optimization:** Use `include` and `select` to avoid N+1 queries

---

## See Also

- [Prisma Documentation](https://www.prisma.io/docs/)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
