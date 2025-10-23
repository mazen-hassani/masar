# Task Management Tool - Development Blueprint and Implementation Plan

## Executive Summary

This document provides a detailed step-by-step blueprint for building the Task Management Tool, broken down into small, iterative chunks that build on each other. Each step includes specific prompts for code-generation LLMs to implement the functionality in a test-driven manner.

## High-Level Architecture Overview

**Backend**: Node.js + Express.js/Fastify + Prisma + PostgreSQL (Vercel Postgres/Supabase)
**Frontend**: React + TypeScript + React Query (Deployed on Vercel)
**Deployment**: Full Vercel stack (serverless APIs, Edge Functions, automated deployments)
**Key Features**: Project/Activity/Task hierarchy, Dependencies, Auto-scheduling, Gantt/Kanban UI, MPP/CSV import/export

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│                    VERCEL PLATFORM                        │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  ┌────────────────────────────────────────────────────┐  │
│  │ FRONTEND (React + TypeScript)                      │  │
│  │ - Automatic deployments from git                   │  │
│  │ - Global CDN for static assets                     │  │
│  │ - ISR for fast revalidation                        │  │
│  └────────────────────────────────────────────────────┘  │
│                         ↓ (REST/JSON)                     │
│  ┌────────────────────────────────────────────────────┐  │
│  │ EDGE MIDDLEWARE (Vercel Edge Functions)            │  │
│  │ - JWT Authentication at edge                       │  │
│  │ - CORS handling                                    │  │
│  │ - Request logging                                  │  │
│  └────────────────────────────────────────────────────┘  │
│                         ↓                                  │
│  ┌────────────────────────────────────────────────────┐  │
│  │ API ROUTES (Node.js Serverless Functions)          │  │
│  │ - Express.js/Fastify handlers                      │  │
│  │ - Auto-scaling, no cold-boot overhead              │  │
│  │ - Built-in Vercel KV middleware                    │  │
│  └────────────────────────────────────────────────────┘  │
│                         ↓                                  │
│  ┌────────────────────────────────────────────────────┐  │
│  │ CRON JOBS (Scheduled Tasks)                        │  │
│  │ - Daily digest notifications                       │  │
│  │ - Baseline snapshots                               │  │
│  │ - Cleanup tasks                                    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                            │
└─────────────────────┬──────────────────────────────────────┘
                      │
        ┌─────────────┼──────────────┐
        ↓             ↓              ↓
   ┌─────────┐  ┌──────────┐  ┌──────────┐
   │Vercel   │  │Vercel KV │  │Vercel    │
   │Postgres │  │(Redis)   │  │Blob      │
   │         │  │          │  │(Storage) │
   └─────────┘  └──────────┘  └──────────┘
```

## Technology Stack Rationale

| Layer | Technology | Why Vercel-Optimized |
|-------|-----------|----------------------|
| **Frontend** | React 18 + TypeScript | Instant deployments, global CDN |
| **Backend Runtime** | Node.js 18+ | Serverless-native, cold start <300ms |
| **Web Framework** | Express.js/Fastify | Lightweight, Vercel-compatible |
| **Database ORM** | Prisma | Type-safe, serverless migrations, connection pooling |
| **Database** | Vercel Postgres or Supabase | Serverless-native, auto-scaling |
| **Auth** | NextAuth.js or express-jwt | Edge-native, session-less design |
| **Caching** | Vercel KV (Redis) | Built-in, serverless redis |
| **File Storage** | Vercel Blob | CDN-integrated, managed storage |
| **Scheduling** | Vercel Crons | Serverless scheduled tasks |
| **Testing** | Jest + Vitest | Full TypeScript support |

## Development Phases

### Phase 1: Foundation & Core Infrastructure
### Phase 2: Domain Models & Business Logic
### Phase 3: Scheduling Engine & Dependencies
### Phase 4: Basic UI & Authentication
### Phase 5: Advanced UI Components
### Phase 6: Import/Export & Polish

---

## Phase 1: Foundation & Core Infrastructure

### Step 1.1: Project Structure & Basic Setup ✅ COMPLETED

**Context**: Set up the foundational project structure as a Node.js monorepo with proper separation of concerns, testing framework, and Vercel configuration.

**Prompt**:
```
Create a Node.js monorepo project structure for a task management tool deployed on Vercel with the following requirements:

1. **Project Structure** (Monorepo with pnpm/npm workspaces):
   - Root directory with workspace configuration
   - `/apps/frontend` - React + TypeScript frontend
   - `/apps/api` - Express.js/Fastify backend API
   - `/packages/types` - Shared TypeScript types
   - `/packages/utils` - Shared utility functions
   - `/packages/schemas` - Zod validation schemas

2. **Backend Setup** (`/apps/api`):
   - Node.js 18+ with TypeScript
   - Express.js for HTTP server (lightweight, Vercel-compatible)
   - Prisma ORM for database access with PostgreSQL
   - Jest for unit/integration testing
   - Vitest as alternative test runner option
   - ESLint + Prettier for code quality
   - Environment configuration with .env.local/.env.production

3. **Frontend Setup** (`/apps/frontend`):
   - React 18+ with TypeScript
   - React Router v6, React Query (TanStack Query)
   - Tailwind CSS for styling
   - Jest + React Testing Library for tests
   - Vite for fast development and build

4. **Database Setup**:
   - Prisma schema file in `/apps/api/prisma/schema.prisma`
   - Database connection pooling for serverless
   - Migration scripts in `/prisma/migrations/`
   - Seed script for test data

5. **Vercel Configuration**:
   - `vercel.json` at root with monorepo settings
   - Separate `vercel.json` for `/apps/api` and `/apps/frontend` if needed
   - Environment variables configured via Vercel dashboard
   - Edge middleware configuration for authentication

6. **Testing Infrastructure**:
   - Jest configuration for both apps
   - Database test setup with test containers or in-memory DB
   - Shared test utilities and mock factories
   - CI/CD setup for GitHub/GitLab

7. **Package Management**:
   - pnpm workspaces (preferred for monorepos)
   - Root `package.json` with workspace definitions
   - Shared dependencies in root, app-specific in sub-packages
   - Turborepo for task orchestration (optional but recommended)

8. **Development Workflow**:
   - `vercel dev` for local development (simulates Vercel environment)
   - Database connection with local PostgreSQL or Vercel dev DB
   - Hot reload for both frontend and backend
   - Shared type checking across monorepo

Create the complete monorepo structure with:
- Root `package.json` with workspaces and scripts
- `vercel.json` for Vercel configuration
- `/apps/api/src/index.ts` - Express server entry point
- `/apps/api/prisma/schema.prisma` - Database schema
- `/apps/frontend/` - React app structure
- `/packages/types/index.ts` - Shared type definitions
- README.md with monorepo setup and development instructions
- GitHub Actions workflow for testing and deployment

Ensure:
- Monorepo builds and all packages install correctly
- `vercel dev` runs locally
- Type checking passes across all packages
- Basic tests pass
- Git is initialized and ready for Vercel deployment
```

### Step 1.2: Database Schema & Entity Foundation ✅ COMPLETED

**Context**: Create the core database schema and Prisma models based on the specification's data model.

**Prompt**:
```
Based on the task management specification, create the database schema and Prisma models for the core domain model:

1. **Prisma Schema** (`/apps/api/prisma/schema.prisma`):
   - PostgreSQL database provider with connection pooling for serverless
   - `Organisation` model with timezone, working calendar config
   - `User` model with role and organisation relationships
   - `Project` model with all specified fields including external refs
   - `Activity` model with status, tracking, verification checklist (JSON)
   - `Task` model with assignment and completion tracking
   - `Dependency` model supporting Activity↔Activity and Task↔Task relationships
   - `ProjectBaseline` and `BaselineSnapshot` models
   - `Holiday` model for working calendar
   - `WorkingTimeRange` for organization working hours (JSON or separate model)
   - Proper relationships and indexes for queries

2. **Prisma Models Definition**:
   - Model relationships using Prisma relations (@relation)
   - Enums in schema:
     - `Role`: PMO, PM, TEAM_MEMBER, CLIENT
     - `Status`: NOT_STARTED, IN_PROGRESS, ON_HOL, VERIFIED
     - `TrackingStatus`: ON_TRACK, AT_RISK, OFF_TRACK
     - `DependencyType`: FS, SS, FF, SF
   - Proper type definitions for JSON fields (checklist, calendar config)
   - Unique constraints and validation
   - CreatedAt/UpdatedAt timestamps on all models
   - SoftDelete support where needed

3. **Database Configuration**:
   - Prisma datasource with Vercel Postgres or Supabase connection string
   - Connection pooling configuration for serverless
   - Environment variable for DATABASE_URL
   - Migration history tracking in `migrations/` folder

4. **Initial Migration**:
   - Run `prisma migrate dev --name init` to create migration
   - Verify schema is correct in PostgreSQL
   - Test connection pooling with Vercel settings

5. **Prisma Client Setup**:
   - Initialize Prisma Client singleton in `/apps/api/src/lib/prisma.ts`
   - Handle connection pooling for serverless functions
   - Error handling for connection failures

6. **Testing Setup**:
   - Test database configuration (separate test database URL)
   - Seed script to populate test data
   - Helper functions for repository-like queries
   - Model test factories for creating test data
   - Integration tests verifying relationships and constraints

7. **Type Generation**:
   - Generate TypeScript types from Prisma schema
   - Export generated types to shared `/packages/types`
   - Create DTO interfaces extending Prisma types

Ensure:
- Schema compiles without errors
- Migration creates correct PostgreSQL tables
- All relationships are properly defined
- Connection pooling configured for Vercel/serverless
- Test data seeding works correctly
```

### Step 1.3: Query Service Layer & Basic CRUD ✅ COMPLETED

**Context**: Build the query service layer using Prisma with basic CRUD operations and custom queries.

**Prompt**:
```
Implement the query service layer for the task management system using Prisma with comprehensive CRUD operations:

1. **Service Architecture**:
   - Create services for each major entity: ProjectService, ActivityService, TaskService, etc.
   - Use Prisma Client for all database queries
   - Implement repository-like pattern with query helpers
   - Separate business logic from database access

2. **Key Query Services**:
   - `ProjectService`:
     - findByOrganisationId, findByAssignedPmUserId
     - createProject, updateProject, deleteProject
     - getProjectWithActivitiesAndTasks

   - `ActivityService`:
     - findByProjectIdOrderByStartDate, findByStatusAndTrackingStatus
     - findActivitiesWithProgressCalculation
     - getActivityWithTasksAndDependencies

   - `TaskService`:
     - findByAssigneeUserId, findByActivityId, findOverdueTasks
     - findWithDependencies
     - getTaskWithAllRelations

   - `DependencyService`:
     - findPredecessors, findSuccessors (recursive queries)
     - detectCycles using Prisma aggregations
     - graphDependencies (returns full dependency tree)

3. **Query Implementation Details**:
   - Use Prisma `include` and `select` for efficient queries
   - Implement pagination with `skip` and `take`
   - Add sorting support (orderBy)
   - Create filter types for complex queries
   - Implement connection pooling for database

4. **Advanced Queries**:
   - Dashboard data aggregation: count by status, tracking status distribution
   - Gantt data queries: flat list with hierarchy info
   - Time-based queries: working duration calculations
   - Filtering with multiple criteria (date ranges, status, assignee)

5. **Error Handling**:
   - Handle Prisma query errors gracefully
   - Return meaningful error messages
   - Implement retry logic for transient failures
   - Log all database operations for debugging

6. **Testing**:
   - Unit tests for all service methods
   - Integration tests with real database (or test DB)
   - Test pagination, sorting, and filtering
   - Test error scenarios
   - Performance tests for complex queries
   - Mock Prisma Client for unit tests

7. **TypeScript Types**:
   - Generate types from Prisma schema
   - Create DTO interfaces for API responses
   - Use type-safe queries with Prisma

Ensure:
- All CRUD operations work correctly
- Complex queries return expected data
- Pagination and filtering work properly
- Connection pooling is properly configured for serverless
- All tests pass
```

### Step 1.4: Basic Security & Authentication Framework ✅ COMPLETED

**Context**: Set up Express.js authentication with JWT and role-based authorization for serverless deployment.

**Prompt**:
```
Implement authentication and authorization framework for the task management system on Node.js/Express:

1. **Authentication System**:
   - JWT-based authentication with RS256 (asymmetric) or HS256 (symmetric)
   - Access tokens (short-lived, 15min) + Refresh tokens (long-lived, 7days)
   - Cookie-based or Authorization header token management
   - Refresh token rotation for security
   - Optional: NextAuth.js integration for OAuth/SSO

2. **Core Authentication Components**:
   - `authService.ts`: Login, logout, token generation/validation
   - `jwtService.ts`: JWT creation, verification, and claims handling
   - `passwordService.ts`: Hashing (bcrypt), verification, salting
   - `authMiddleware.ts`: Express middleware for token validation
   - `authController.ts`: Login, logout, refresh endpoints

3. **Authorization Framework**:
   - Role-based access control (RBAC) middleware
   - Custom middleware: `requireRole`, `requireProjectAccess`
   - Permission matrix implementation (PMO vs PM vs Team Member vs Client)
   - Service-layer authorization checks
   - Decorators/helpers for route protection

4. **API Endpoints**:
   - `POST /api/auth/login` - Email + password → tokens
   - `POST /api/auth/logout` - Invalidate refresh token
   - `POST /api/auth/refresh` - Exchange refresh token for new access token
   - `GET /api/auth/me` - Current user info (protected)
   - `POST /api/auth/password-reset` - Initiate password reset
   - `POST /api/auth/password-reset-confirm` - Confirm with token

5. **Token Management**:
   - Secure token storage (httpOnly cookies recommended for serverless)
   - Token revocation list (blacklist) with Redis (Vercel KV)
   - Refresh token database storage (for logout tracking)
   - Token expiration handling on frontend

6. **User Management Service**:
   - Create user (PMO only)
   - Update user profile
   - Change password
   - Role assignment and modification (PMO only)
   - User soft-delete (preserve audit trail)

7. **Security Features**:
   - Password hashing with bcrypt (10+ rounds)
   - Rate limiting on login endpoint (prevent brute force)
   - Account lockout after failed attempts
   - Session timeout for long-lived requests
   - CORS configuration for frontend domain
   - CSRF token support (if using cookies)

8. **Edge Middleware** (Vercel Edge Functions):
   - Optional: JWT validation at edge (faster than serverless function)
   - Early rejection of unauthorized requests
   - Logging of auth events

9. **Error Handling**:
   - Custom exceptions: UnauthorizedException, ForbiddenException
   - Consistent error response format
   - Audit logging for failed auth attempts
   - No sensitive info in error messages

10. **Testing**:
    - Unit tests for JWT service (generation, validation, expiration)
    - Unit tests for password hashing
    - Integration tests for auth endpoints
    - Role-based authorization testing
    - Token refresh and rotation testing
    - Edge case: expired tokens, malformed JWT, invalid signatures
    - Mock authentication for other endpoint tests

11. **Environment Configuration**:
    - JWT_SECRET or JWT_PRIVATE_KEY (for RS256)
    - JWT_PUBLIC_KEY (for RS256 verification)
    - Token expiration times (configurable)
    - Allowed origins for CORS
    - Refresh token rotation settings

Ensure:
- All auth flows work end-to-end
- Tokens are properly validated
- Roles and permissions are correctly enforced
- Security is maintained across serverless function boundaries
- Token refresh works without user re-login
```

---

## Phase 2: Domain Models & Business Logic

### Step 2.1: Calendar & Working Time Engine ✅ COMPLETED

**Context**: Implement the working calendar system that forms the foundation of the scheduling engine.

**Prompt**:
```
Implement the working calendar and time calculation engine based on the specification using Node.js:

1. **Calendar Domain Model** (Prisma models + services):
   - `Organisation` with timezone, working days config (M-F), working hours per day
   - `Holiday` entity with date and description (store in DB)
   - Working hours stored as JSON: { start: "09:00", end: "13:00" }, { start: "14:00", end: "18:00" }
   - Support for project-specific timezone overrides
   - Model relationships: Organisation → Holidays, Organisation → Projects

2. **Working Time Calculator Service** (`calendarService.ts`):
   - Calculate working duration between two dates (exclude weekends/holidays/non-working hours)
   - Find next/previous working day/hour
   - Convert wall-clock duration to working duration
   - Handle timezone conversions properly with date-fns or Day.js

3. **Key Functions**:
   - `calculateWorkingDuration(start: Date, end: Date, calendar: Calendar)` → Duration in ms/hours
   - `addWorkingTime(start: Date, duration: Duration, calendar: Calendar)` → Date
   - `isWorkingTime(dateTime: Date, calendar: Calendar)` → boolean
   - `getNextWorkingTime(dateTime: Date, calendar: Calendar)` → Date
   - `getPreviousWorkingTime(dateTime: Date, calendar: Calendar)` → Date
   - `getWorkingDaysInRange(start: Date, end: Date, calendar: Calendar)` → Date[]
   - `getWorkingHoursInDay(calendar: Calendar)` → number

4. **Calendar Management Service**:
   - Get organisation default calendar
   - Get project-specific calendar (with timezone override)
   - Add/remove holidays
   - Update working hours configuration
   - Cache calendar data for performance

5. **Implementation Details**:
   - Use date-fns or Day.js for timezone handling
   - Create calendar data structures (working days bitmap, hours ranges)
   - Implement efficient algorithms for date range calculations
   - Cache working calendar after loading from DB
   - Handle daylight saving time (DST) transitions

6. **Edge Cases & Testing**:
   - Spanning weekends and holidays
   - Different timezones (project TZ vs org TZ)
   - DST transitions (spring forward/fall back)
   - Zero-duration edge cases
   - Working time calculations across year boundaries
   - Leap years and month boundaries
   - Single-day duration calculations

7. **Performance Optimization**:
   - In-memory cache for calendar configs (update on change)
   - Pre-compute working days for common ranges
   - Avoid repeated DB queries for calendar data
   - Benchmark with realistic date ranges (projects spanning months)

8. **Testing**:
   - Unit tests for all calendar functions
   - Test with various timezones (UTC, US, Europe, Asia)
   - DST transition testing
   - Holiday edge cases
   - Performance tests with large date ranges
   - Integration tests with Prisma models

Ensure:
- All date calculations respect working calendar
- Timezone handling is correct across regions
- Performance is acceptable for real-time Gantt updates
- Cache invalidation works properly
```

### Step 2.2: Status Management & Lifecycle ✅ COMPLETED

**Context**: Implement the status lifecycle for tasks and activities with proper validation rules.

**Prompt**:
```
Implement the status management system for tasks and activities with proper lifecycle validation using Node.js services:

1. **Status Service Layer** (`statusService.ts`):
   - `TaskStatusService` for task status transitions
   - `ActivityStatusService` for activity status transitions
   - Validation rules for status changes
   - Automatic status updates based on child status changes

2. **Status Transition Logic**:
   - Task lifecycle: NOT_STARTED → IN_PROGRESS → (ON_HOLD ↔ IN_PROGRESS) → COMPLETED → VERIFIED (PM only)
   - Activity lifecycle: Same as tasks + verification checklist requirements
   - Prevent invalid transitions with descriptive error messages
   - Cascade rules (activity can't be VERIFIED if tasks aren't VERIFIED)

3. **Tracking Status Calculator** (`trackingService.ts`):
   - Auto-calculate tracking status (ON_TRACK, AT_RISK, OFF_TRACK) when status = IN_PROGRESS
   - Use configurable threshold percentage for "At Risk" grace period (default 80%)
   - Working calendar integration for accurate date calculations
   - Only calculate for items with status = IN_PROGRESS
   - Update on schedule change and percentage change

4. **Percentage Complete Management**:
   - Task: editable only when IN_PROGRESS (0-100%)
   - Activity: auto-calculated as simple average of child tasks' percentages (read-only)
   - Project: duration-weighted average of activities (read-only)
   - Update timestamps when percentages change

5. **Verification System**:
   - Task verification: PM only, simple status change to VERIFIED
   - Activity verification: PM only + all child tasks must be VERIFIED
   - Checklist item tracking: who, when, comments (stored as JSON in Activity model)
   - Prevent activity verification if any child task not VERIFIED

6. **Business Rule Validation** (`validators.ts`):
   - Status change permissions by role (PMO, PM, TEAM_MEMBER, CLIENT)
   - Prerequisite status validations (can't go from NOT_STARTED to VERIFIED)
   - Cascade update logic (children status affects parent)
   - Audit trail for all status changes (store in AuditLog table)

7. **API Endpoints**:
   - `PATCH /api/tasks/:id/status` - Change task status
   - `PATCH /api/activities/:id/status` - Change activity status
   - `POST /api/activities/:id/verify` - Verify activity (with checklist)
   - `PATCH /api/tasks/:id/percentage` - Update task percentage
   - `GET /api/projects/:id/tracking-status-summary` - Get tracking summary

8. **Testing**:
   - Unit tests for all status transitions
   - Edge cases for tracking status calculations
   - Permission-based status change testing
   - Integration tests for cascade updates
   - Performance tests for bulk status updates
   - Test verification checklist logic

Include proper error handling and informative validation messages.
```

### Step 2.3: Project Templates & Instantiation ✅ COMPLETED

**Context**: Implement the project template system for creating projects from predefined templates.

**Prompt**:
```
Implement the project template system that allows creating projects from predefined activity/task structures:

1. **Template Domain Model**:
   - `ProjectTemplate` entity with name, description, and configuration
   - `TemplateActivity` with default duration, order, and checklist items
   - `TemplateTask` with default duration and assignee role requirements
   - `TemplateDependency` for both activity and task level dependencies with types and lags

2. **Template Service Layer**:
   - CRUD operations for project templates (PMO only)
   - Template validation (cycle detection in dependencies)
   - Template versioning support
   - Template import/export functionality

3. **Project Instantiation Engine**:
   - Create project from template with start date
   - Instantiate all activities and tasks from template
   - Apply dependency relationships with proper type validation
   - Run initial auto-scheduling based on dependencies and working calendar
   - Create automatic "Planned v1" baseline after instantiation

4. **Dependency Template Processing**:
   - Validate dependency types against project configuration
   - Handle lag/lead values during instantiation
   - Ensure no circular dependencies in templates
   - Map template relationships to actual entity relationships

5. **Initial Scheduling**:
   - Topological sort of activities/tasks based on dependencies
   - Apply working calendar constraints
   - Calculate start/end dates for all items
   - Respect dependency types (FS, SS, FF, SF) and lags

6. **Template Management Features**:
   - Clone existing projects as templates
   - Template validation and testing tools
   - Preview template instantiation without creating project
   - Template usage analytics and optimization suggestions

7. **Testing**:
   - Template CRUD operations with role-based access
   - Complex dependency scenarios in templates
   - Project instantiation with various start dates and calendars
   - Validation of generated schedules
   - Performance tests with large templates (200+ activities)
   - Edge cases: holidays, weekends, timezone changes

Include comprehensive validation and error handling for template operations.
```

---

## Phase 3: Scheduling Engine & Dependencies

### Step 3.1: Dependency Management System ✅ COMPLETED

**Context**: Implement the core dependency management system supporting Activity↔Activity and Task↔Task relationships.

**Prompt**:
```
Implement the dependency management system with support for all dependency types and cycle detection:

1. **Dependency Service Layer**:
   - Create, update, delete dependencies with validation
   - Support Activity↔Activity and Task↔Task relationships within same project
   - Validate dependency types against project configuration
   - Lag/lead support with configurable units (minutes/hours/days)

2. **Dependency Types Implementation**:
   - FS (Finish-to-Start): successor.start ≥ predecessor.end + lag
   - SS (Start-to-Start): successor.start ≥ predecessor.start + lag  
   - FF (Finish-to-Finish): successor.end ≥ predecessor.end + lag
   - SF (Start-to-Finish): successor.end ≥ predecessor.start + lag
   - Support negative lag values (leads)

3. **Cycle Detection Algorithm**:
   - Implement Kahn's algorithm for topological sorting
   - Detect cycles before adding new dependencies
   - Provide detailed cycle information for user feedback
   - Performance optimization for large dependency graphs

4. **Dependency Graph Queries**:
   - Find all predecessors for an item (recursive)
   - Find all successors for an item (recursive)
   - Calculate critical path (longest path through dependencies)
   - Identify items with no dependencies (potential starting points)

5. **Constraint Calculation**:
   - Calculate earliest possible start/end dates based on all predecessors
   - Calculate latest possible start/end dates based on successors
   - Handle multiple dependencies with different types
   - Working calendar integration for date calculations

6. **Validation & Error Handling**:
   - Prevent cross-project dependencies
   - Validate predecessor/successor item types match dependency scope
   - Check project supports the dependency type being created
   - Proper error messages for constraint violations

7. **Testing**:
   - Unit tests for each dependency type calculation
   - Cycle detection with various complex scenarios
   - Performance tests with large dependency graphs (2000+ items)
   - Edge cases: self-dependencies, duplicate dependencies
   - Integration tests with working calendar constraints

Include comprehensive logging and debugging information for complex dependency scenarios.
```

### Step 3.2: Auto-Scheduling Engine ✅ COMPLETED

**Context**: Build the core scheduling engine that automatically calculates dates based on dependencies and working calendar.

**Prompt**:
```
Implement the auto-scheduling engine that calculates optimal dates based on dependencies and working calendar:

1. **Scheduling Engine Core**:
   - `AutoScheduler` service with deterministic scheduling algorithms
   - Forward scheduling from project start date
   - Topological ordering of activities and tasks
   - Integration with working calendar for date calculations

2. **Schedule Calculation Algorithm**:
   - Build dependency graph for project items
   - Perform topological sort to establish execution order
   - Calculate earliest start/end dates for each item
   - Apply working calendar constraints (skip weekends/holidays)
   - Handle lag/lead values in dependency calculations

3. **Constraint Resolution**:
   - Resolve conflicts between multiple dependencies
   - Handle resource constraints (single assignee per task)
   - Respect manually set date constraints
   - Propagate date changes through dependency chain

4. **Partial Recalculation**:
   - Identify affected items when dates change
   - Recalculate only downstream dependencies
   - Preserve manual overrides where possible
   - Minimize computation for large projects

5. **Date Validation & Snapping**:
   - Snap calculated dates to working time boundaries
   - Validate dates don't violate dependency constraints
   - Handle timezone conversions for cross-timezone projects
   - Ensure duration calculations use working time only

6. **Schedule Optimization**:
   - Minimize project duration while respecting constraints
   - Identify critical path through dependency graph
   - Calculate float/slack time for non-critical activities
   - Suggest schedule improvements

7. **Error Handling & Recovery**:
   - Handle impossible constraints gracefully
   - Provide detailed conflict resolution suggestions
   - Rollback partial calculations on error
   - Comprehensive logging for debugging complex schedules

8. **Performance Optimization**:
   - Cache dependency graph calculations
   - Incremental scheduling for small changes
   - Parallel processing for independent branches
   - Memory-efficient algorithms for large projects

9. **Testing**:
   - Unit tests for scheduling algorithms
   - Complex dependency scenarios with all types
   - Large project performance tests (200 activities, 2000 tasks)
   - Edge cases: circular dependencies, impossible constraints
   - Integration tests with working calendar variations
   - Timezone handling across DST changes

Include comprehensive benchmarking and optimization for real-world project sizes.
```

### Step 3.3: Manual Edit Constraints & Date Pickers ✅ COMPLETED

**Context**: Implement the constrained date editing system that prevents users from creating invalid schedules.

**Prompt**:
```
Implement the constrained manual editing system that allows users to modify dates while maintaining schedule validity:

1. **Date Constraint Calculator**:
   - Calculate valid date ranges for any task/activity based on dependencies
   - Identify earliest possible start/end dates from predecessors
   - Identify latest possible start/end dates from successors
   - Working calendar integration to exclude non-working time

2. **Constraint API Endpoints**:
   - `GET /api/tasks/{id}/date-constraints` - Returns valid date ranges
   - `GET /api/activities/{id}/date-constraints` - Activity date constraints
   - `POST /api/schedule/validate-edit` - Preview edit impact before saving
   - Include constraint reasons (which dependencies create limits)

3. **Edit Validation Service**:
   - Validate proposed date changes against all constraints
   - Check working calendar compliance
   - Verify dependency constraint satisfaction
   - Calculate downstream impact of proposed changes

4. **Propagation Engine**:
   - Determine which items need recalculation after manual edit
   - Apply minimal changes to maintain validity
   - Preserve other manual overrides where possible
   - Show users what will be automatically adjusted

5. **Constraint Types**:
   - Dependency constraints (predecessor/successor relationships)
   - Working calendar constraints (no work on weekends/holidays)
   - Project boundary constraints (can't start before project start)
   - Duration constraints (minimum task duration requirements)

6. **User Experience Features**:
   - Real-time constraint validation
   - Preview mode showing impact of changes
   - Undo/redo functionality for manual edits
   - Batch edit operations with constraint validation

7. **Optimization for UI**:
   - Fast constraint calculation for responsive UI
   - Caching of constraint calculations
   - Incremental updates as dependencies change
   - Efficient serialization for frontend date pickers

8. **Testing**:
   - Unit tests for constraint calculation algorithms
   - Complex dependency scenario testing
   - Performance tests for constraint calculation speed
   - Edge cases: conflicting constraints, impossible situations
   - Integration tests with auto-scheduler
   - User workflow testing (edit → validate → save cycle)

9. **Error Handling**:
   - Clear error messages for constraint violations
   - Suggested alternative dates when constraints are violated
   - Graceful handling of impossible constraint situations
   - Detailed logging for troubleshooting complex constraint scenarios

Ensure the system prevents invalid schedules while providing maximum flexibility to users.
```

---

## Phase 4: Basic UI & Authentication

### Step 4.1: React Frontend Foundation

**Context**: Set up the React frontend with proper project structure, routing, and state management.

**Prompt**:
```
Create the React frontend foundation for the task management application:

1. **Project Setup**:
   - Create React app with TypeScript
   - Set up ESLint, Prettier, and testing configuration
   - Configure Vite or Create React App with proper build optimization
   - Set up folder structure: components, pages, services, hooks, types, utils

2. **Core Dependencies**:
   - React Router v6 for navigation
   - React Query (TanStack Query) for server state management
   - Axios for API communication
   - React Hook Form for form handling
   - Tailwind CSS for styling (responsive, accessible design)
   - React Testing Library and Jest for testing

3. **Type Definitions**:
   - Create TypeScript interfaces matching backend DTOs
   - Project, Activity, Task, Dependency types
   - User, Role, Permission types
   - API response and request types
   - Form validation schemas

4. **Routing Structure**:
   - Public routes: login, forgot password
   - Protected routes with role-based access
   - Project-specific routes: /projects/:id/dashboard, /projects/:id/gantt, /projects/:id/kanban
   - Admin routes for PMO users
   - Nested routing for project sections

5. **API Service Layer**:
   - Axios configuration with interceptors
   - Base API service with error handling
   - Typed API methods for all backend endpoints
   - Request/response transformation utilities
   - API error handling and retry logic

6. **Authentication Integration**:
   - JWT token management (storage, refresh)
   - Auth context and hooks
   - Protected route components
   - Login/logout functionality
   - Role-based component rendering

7. **Base Components**:
   - Layout components (header, sidebar, main content)
   - Loading states and skeletons
   - Error boundaries and error display
   - Form components with validation
   - Modal and dialog components

8. **Testing Infrastructure**:
   - Test utilities for API mocking
   - Custom render function with providers
   - Mock data factories for testing
   - Setup for component, integration, and E2E tests

9. **Development Tools**:
   - Environment configuration (dev/staging/prod)
   - Development proxy for backend API
   - Hot reload and fast refresh setup
   - Bundle analysis and optimization

Include proper error handling, loading states, and responsive design foundations.
```

### Step 4.2: Authentication UI & User Management

**Context**: Build the authentication UI and user management functionality for the React frontend.

**Prompt**:
```
Implement the authentication UI and user management system for the React frontend:

1. **Authentication Pages**:
   - Login page with email/password form and validation
   - Forgot password and password reset flow
   - User registration (if enabled for organisation)
   - Professional, responsive design with proper accessibility

2. **Authentication State Management**:
   - AuthContext with login, logout, and user state
   - useAuth hook for component authentication state
   - Token refresh logic with automatic retry
   - Persistent authentication across browser sessions

3. **Protected Routes & Authorization**:
   - ProtectedRoute component with role checking
   - RequireRole wrapper component for role-based rendering
   - Project-specific access control (PM can only access assigned projects)
   - Fallback pages for insufficient permissions

4. **User Profile Management**:
   - User profile page with editable information
   - Password change functionality
   - User preferences (timezone, notification settings)
   - Profile picture upload and management

5. **Role-Based UI Components**:
   - Navigation menus that adapt based on user role
   - Action buttons/menus with proper permission checking
   - Conditional rendering utilities for different roles
   - PMO-only administrative sections

6. **Form Handling & Validation**:
   - React Hook Form integration for all auth forms
   - Client-side validation with real-time feedback
   - Server error handling and display
   - Loading states for async operations

7. **Security Features**:
   - Automatic logout on token expiration
   - Session timeout warnings
   - Secure token storage (httpOnly cookies or secure localStorage)
   - CSRF protection for sensitive operations

8. **User Experience Enhancements**:
   - Remember me functionality
   - Auto-focus on form fields
   - Keyboard navigation support
   - Loading indicators and feedback messages
   - Smooth transitions between auth states

9. **Testing**:
   - Unit tests for auth components
   - Integration tests for auth flows
   - Mock authentication for testing other features
   - E2E tests for complete auth workflows
   - Security testing for token handling

10. **Error Handling**:
    - Network error handling with retry options
    - Clear error messages for auth failures
    - Graceful degradation when API is unavailable
    - Audit logging integration for security events

Ensure the authentication system is secure, user-friendly, and properly integrated with the backend.
```

### Step 4.3: Project Management UI Foundation

**Context**: Build the basic project management interface with project listing, creation, and basic CRUD operations.

**Prompt**:
```
Implement the foundational project management UI with listing, creation, and basic operations:

1. **Project List Page**:
   - Filterable and sortable project table/grid
   - Role-based project visibility (PMO sees all, PM sees assigned, etc.)
   - Project status indicators and progress bars
   - Quick actions: view, edit, delete (permission-based)
   - Search and advanced filtering capabilities

2. **Project Creation Wizard**:
   - Multi-step wizard for creating projects from templates
   - Template selection with preview
   - Project configuration (name, description, start date, timezone)
   - Dependency type selection and settings
   - Calendar and working time configuration
   - Role and team member assignment

3. **Project Overview Page**:
   - Project header with key information and status
   - Quick stats: total activities/tasks, completion percentage, timeline
   - Recent activity feed and updates
   - Project team members with roles
   - Action buttons for different views (Dashboard, Gantt, Kanban)

4. **Project Settings Page**:
   - Basic project information editing
   - Dependency types and lag/lead configuration
   - Tracking threshold settings (At Risk percentage)
   - Team member management with role assignment
   - Project permissions and access control

5. **Activity/Task Basic CRUD**:
   - Activity list with expandable task details
   - Inline editing for names, descriptions, basic properties
   - Status change dropdowns with validation
   - Assignment management for tasks
   - Basic date editing with constraint validation

6. **Data Management**:
   - React Query integration for efficient data fetching
   - Optimistic updates for better user experience
   - Error handling with retry mechanisms
   - Loading states and skeleton screens
   - Real-time updates when multiple users edit

7. **Navigation & Layout**:
   - Project-specific navigation menu
   - Breadcrumb navigation for deep pages
   - Responsive sidebar with project context
   - Quick project switcher for users with multiple projects
   - Mobile-friendly responsive design

8. **Form Handling**:
   - Reusable form components for project/activity/task editing
   - Client-side validation with server-side sync
   - Auto-save functionality for long forms
   - Unsaved changes warnings
   - Bulk edit capabilities where appropriate

9. **Testing**:
   - Component tests for all major UI elements
   - Integration tests for CRUD operations
   - User interaction testing (forms, navigation)
   - Role-based access testing
   - Responsive design testing

10. **Performance Optimization**:
    - Lazy loading for large project lists
    - Virtual scrolling for long activity/task lists
    - Debounced search and filtering
    - Image and asset optimization
    - Bundle splitting for better load times

Include proper error boundaries, loading states, and accessibility features throughout.
```

---

## Phase 5: Advanced UI Components

### Step 5.1: Dashboard & Analytics

**Context**: Build the project dashboard with KPI tiles, charts, and activity sequence display.

**Prompt**:
```
Implement the project dashboard with comprehensive analytics and visualization:

1. **Dashboard Layout**:
   - Responsive grid layout for KPI tiles and charts
   - Activity sequence section (ordered by start date)
   - Configurable dashboard sections based on user role
   - Mobile-optimized layout with collapsible sections

2. **KPI Tiles**:
   - Project completion percentage with visual progress bar
   - On Track / At Risk / Off Track counts with color coding
   - Total activities and tasks with completion statistics  
   - Timeline information (start date, end date, duration)
   - Overdue items count with drill-down capability

3. **Activity Sequence Display**:
   - Table/list showing activities ordered by start date
   - Columns: name, status, percentage complete, tracking status, start/end dates
   - Visual indicators for status and tracking status
   - Expandable rows showing child tasks
   - Inline actions for quick status updates

4. **Chart Components (using Recharts)**:
   - **Progress by Activity**: Horizontal bar chart showing completion percentage
   - **Tracking Status Distribution**: Donut/pie chart for On Track/At Risk/Off Track
   - **Timeline vs Baseline**: Line chart comparing current progress to baseline (if available)
   - **Task Distribution by Status**: Stacked bar chart or donut chart
   - **Completion Trend**: Line chart showing progress over time

5. **Interactive Features**:
   - Click on chart elements to filter/navigate to detail views
   - Hover tooltips with additional information
   - Date range selector for time-based charts
   - Export chart data to CSV/PDF
   - Refresh button with auto-refresh options

6. **Data Integration**:
   - React Query hooks for dashboard data fetching
   - Real-time updates using polling or WebSocket integration
   - Error handling for data loading failures
   - Loading skeletons for all dashboard sections
   - Caching strategy for performance

7. **Filtering & Customization**:
   - Date range filters for dashboard data
   - Activity/task status filters
   - Assignee filters for task-level data
   - Save custom dashboard configurations
   - Role-based dashboard customization

8. **Performance Optimization**:
   - Lazy loading for chart components
   - Data aggregation on backend to reduce payload
   - Virtualization for large activity lists
   - Efficient re-rendering with proper memoization
   - Progressive loading of dashboard sections

9. **Accessibility & UX**:
   - Proper ARIA labels for all interactive elements
   - Keyboard navigation support
   - Screen reader compatible charts
   - Color-blind friendly color schemes
   - High contrast mode support

10. **Testing**:
    - Unit tests for all chart components
    - Integration tests for data fetching and display
    - Visual regression testing for charts
    - Accessibility testing with screen readers
    - Performance testing with large datasets
    - Mobile responsiveness testing

Include proper error boundaries and graceful fallbacks for chart rendering failures.
```

### Step 5.2: Interactive Gantt Chart Integration

**Context**: Integrate a professional Gantt chart component with drag-and-drop editing, dependency visualization, and baseline overlay.

**Prompt**:
```
Implement the interactive Gantt chart with full editing capabilities and constraint enforcement:

1. **Gantt Chart Selection & Setup**:
   - Research and integrate a professional Gantt component (DHTMLX Gantt, Bryntum Gantt, or similar)
   - Configure for React/TypeScript integration
   - Set up proper licensing and build configuration
   - Create wrapper components for consistent API

2. **Data Integration**:
   - Transform backend data to Gantt chart format
   - Map activities and tasks to Gantt items with proper hierarchy
   - Convert dependencies to Gantt link format
   - Handle timezone conversions for display
   - Sync data changes back to backend format

3. **Interactive Features**:
   - **Drag to move**: Activities and tasks with constraint validation
   - **Resize to change duration**: With working calendar snapping
   - **Create dependencies**: Visual link creation with type selection
   - **Edit in-place**: Task names, dates, and basic properties
   - **Context menus**: Right-click actions for items and links

4. **Constraint Integration**:
   - Real-time validation during drag operations
   - Visual indicators for constraint violations
   - Snap to valid working time boundaries
   - Prevent invalid moves with user feedback
   - Integration with backend constraint API

5. **Calendar Integration**:
   - Display working/non-working time with different background colors
   - Show holidays and organization calendar
   - Zoom levels: day, week, month views
   - Working time scale (8-hour vs 24-hour display)
   - Timeline marker for current date

6. **Baseline Display**:
   - Ghost bars showing baseline vs actual dates
   - Color coding for ahead/behind schedule
   - Baseline selection dropdown (multiple baselines support)
   - Variance tooltips and indicators
   - Toggle baseline overlay on/off

7. **Visual Enhancements**:
   - Color coding by status (Not Started, In Progress, etc.)
   - Progress bars within Gantt bars showing percentage complete
   - Tracking status indicators (On Track, At Risk, Off Track)
   - Critical path highlighting (future enhancement)
   - Custom styling to match application theme

8. **Popup Details**:
   - Click on Gantt bar → popup with item details
   - Editable fields: name, dates, status, percentage, assignee
   - Quick actions: change status, mark complete, add comments
   - Link to full detail view
   - Save/cancel functionality

9. **Performance Optimization**:
   - Virtual scrolling for large projects (1000+ items)
   - Lazy loading of detailed data
   - Efficient re-rendering on data changes
   - Memory management for long-running sessions
   - Debounced API calls during editing

10. **Data Synchronization**:
    - Optimistic updates for immediate feedback
    - Conflict resolution for concurrent edits
    - Real-time updates from other users
    - Auto-save with manual save override
    - Undo/redo functionality for edits

11. **Export & Print**:
    - Export Gantt to PDF with proper formatting
    - Print preview with page breaks
    - Export visible date range or full project
    - Include/exclude baseline in exports

12. **Testing**:
    - Integration tests for Gantt component
    - Drag and drop interaction testing
    - Constraint validation testing
    - Performance tests with large datasets
    - Cross-browser compatibility testing
    - Mobile/tablet responsiveness (view-only)

Ensure the Gantt integration provides a professional, intuitive user experience while maintaining data integrity.
```

### Step 5.3: Kanban Board Implementation

**Context**: Build the Kanban board interface with status-based columns and proper drag-and-drop functionality.

**Prompt**:
```
Implement the Kanban board interface with drag-and-drop status management and role-based permissions:

1. **Kanban Board Layout**:
   - Column-based layout matching exact statuses: Not Started | In Progress | On Hold | Verified
   - Responsive design that works on desktop, tablet, and mobile
   - Horizontal scrolling for many columns if needed
   - Column headers with item counts and quick filters

2. **Card Design & Information**:
   - **Activity Cards** (primary view): name, owner, percentage complete, end date, tracking status badge
   - **Task Cards** (toggle view): name, assignee, percentage complete, due date, tracking status
   - Color coding based on tracking status (On Track=green, At Risk=yellow, Off Track=red)
   - Visual indicators for overdue items, dependencies, and verification requirements

3. **Drag & Drop Functionality**:
   - React DnD or similar library for smooth drag and drop
   - Status validation during drag (prevent invalid status transitions)
   - Role-based drag restrictions (Team Members can only update their assigned tasks)
   - Visual feedback during drag operations
   - Snap back animation for invalid drops

4. **Status Transition Logic**:
   - Enforce status lifecycle rules during drag operations
   - Prevent activity completion if child tasks aren't verified
   - Show verification checklist modal when moving activity to Verified
   - Automatic percentage updates on status changes
   - Optimistic updates with rollback on error

5. **Filtering & Views**:
   - Toggle between Activity view and Task view
   - Filter by assignee, due date, tracking status
   - Search functionality across card titles
   - Show/hi items toggle
   - My tasks filter for Team Members

6. **Card Interactions**:
   - Click to expand card details inline or in modal
   - Quick edit for percentage complete, due dates
   - Add comments and attachments directly from card
   - Mark items complete with single click action
   - Bulk selection and actions

7. **Real-time Updates**:
   - Live updates when other users make changes
   - Conflict resolution for simultaneous edits
   - Visual indicators for items updated by others
   - Automatic refresh of stale data

8. **Mobile Optimization**:
   - Touch-friendly drag and drop
   - Swipe actions for quick status changes
   - Collapsed card view for small screens
   - Bottom sheet modals for card details

9. **Performance Features**:
   - Virtual scrolling for columns with many items
   - Lazy loading of card details
   - Efficient re-rendering with proper memoization
   - Debounced API calls for frequent updates

10. **Accessibility**:
    - Keyboard navigation between cards and columns
    - Screen reader support with proper ARIA labels
    - Focus management during drag operations
    - High contrast mode compatibility

11. **Integration Features**:
    - Jump to Gantt view for selected item
    - Quick add new task/activity from Kanban
    - Export Kanban board state to CSV
    - Print-friendly view option

12. **Testing**:
    - Drag and drop interaction testing
    - Status transition validation testing
    - Role-based permission testing
    - Real-time update testing
    - Performance testing with large boards
    - Mobile/touch interaction testing
    - Accessibility testing

Include proper error handling, loading states, and user feedback throughout the Kanban interface.
```

---

## Phase 6: Import/Export & Polish

### Step 6.1: CSV Import/Export System

**Context**: Implement comprehensive CSV import and export functionality with proper validation and error handling.

**Prompt**:
```
Implement the CSV import/export system with full round-trip capability and robust error handling:

1. **Export Functionality**:
   - Generate three CSV files: Activities.csv, Tasks.csv, Dependencies.csv
   - **Activities.csv**: ExternalID, Name, Description, Start, End, Status, PercentComplete, ParentExternalID(empty), IsSummary(true), Checklist|PipeDelimited
   - **Tasks.csv**: ExternalID, ActivityExternalID, Name, Description, AssigneeEmail, Start, End, Status, PercentComplete
   - **Dependencies.csv**: FromExternalID, ToExternalID, Type(FS/SS/FF/SF), Lag(unit)
   - Optional Calendars.csv with timezone, working days/hours, holidays

2. **Backend Export Services**:
   - CSV generation with proper escaping and formatting
   - External ID management for round-trip capability
   - Batch processing for large projects (1000+ items)
   - Memory-efficient streaming for very large exports
   - Export filtering by date range, status, or other criteria

3. **Import Functionality**:
   - Multi-file upload with drag-and-drop interface
   - CSV parsing with robust error detection
   - Preview mode showing what will be imported
   - Validation of all relationships and dependencies
   - Mapping assistant for non-standard CSV formats

4. **Import Validation Engine**:
   - **Schema validation**: Check required columns, data types
   - **Referential integrity**: Verify all ExternalIDs link correctly
   - **Business rules**: Status transitions, date logic, role assignments
   - **Dependency validation**: Check for cycles, invalid types
   - **Calendar compliance**: Verify dates align with working calendar

5. **Error Handling & User Feedback**:
   - Line-by-line error reporting with specific issues
   - Warning vs error classification (warnings allow import with user confirmation)
   - Excel-like error display showing problematic rows/columns
   - Detailed reconciliation report after import
   - Rollback capability if import fails partway

6. **Import Wizard UI**:
   - Step 1: File upload with validation
   - Step 2: Column mapping interface
   - Step 3: Preview changes with error/warning display
   - Step 4: Import execution with progress tracking
   - Step 5: Results summary with reconciliation report

7. **Data Reconciliation**:
   - Match existing items by ExternalID when updating
   - Handle missing ExternalIDs by creating new items
   - Detect and resolve conflicts (different data for same ExternalID)
   - Archive old data before importing updates
   - Generate mapping report for new vs updated items

8. **Performance Optimization**:
   - Streaming CSV parsing for large files
   - Batch database operations
   - Progress tracking for long-running imports
   - Memory management for large datasets
   - Background processing for very large imports

9. **Advanced Features**:
   - Template-based import with predefined mappings
   - Partial import (skip invalid rows, import valid ones)
   - Incremental import (only import changes since last export)
   - Multi-project import from single CSV set
   - Custom field mapping for extended CSV formats

10. **Testing**:
    - Unit tests for CSV parsing and validation logic
    - Integration tests for complete import/export cycles
    - Performance tests with large CSV files (10k+ rows)
    - Error handling tests with malformed CSV data
    - Round-trip tests ensuring data integrity
    - Concurrent import/export testing

11. **Security & Audit**:
    - Validate user permissions for import/export operations
    - Audit logging for all import/export activities
    - Secure file handling (scan for malicious content)
    - Rate limiting for import operations
    - Data sanitization for CSV content

Include comprehensive documentation and user guides for the import/export functionality.
```

### Step 6.2: Microsoft Project (MPP) Integration

**Context**: Implement full round-trip integration with Microsoft Project files using MPXJ library.

**Prompt**:
```
Implement comprehensive Microsoft Project (MPP) file integration with full round-trip capability:

1. **MPXJ Library Integration**:
   - Integrate MPXJ library for MPP file reading/writing
   - Handle multiple MPP file formats (MPP, MPX, XML)
   - Set up proper Maven dependencies and configuration
   - Create abstraction layer for MPXJ operations

2. **MPP to Internal Model Mapping**:
   - **Activity ↔ Summary Task**: Map activities to MPP summary tasks
   - **Task ↔ Task**: Direct mapping with proper parent relationships
   - **Dependencies**: Convert all types (FS, SS, FF, SF) with lag/lead support
   - **Calendar mapping**: Project calendar with working time configuration
   - **Baselines**: Map to MPP Baseline0 with variance calculations

3. **Data Import Engine**:
   - Parse MPP file structure and extract project hierarchy
   - Convert MPP dates/durations to working calendar format
   - Map MPP resources to system assignees
   - Handle MPP custom fields and extended attributes
   - Import project-level settings and calendar information

4. **External ID Management**:
   - Maintain `externalRefs.mppUid` for round-trip capability
   - Handle MPP Unique ID mapping and preservation
   - Resolve conflicts when re-importing updated MPP files
   - Generate new UIDs for new items created in system

5. **Export Functionality**:
   - Generate MPP file from internal project data
   - Preserve original MPP structure and formatting where possible
   - Map internal statuses to MPP status fields
   - Convert working calendar back to MPP format
   - Include baseline information in MPP Baseline0

6. **Calendar Integration**:
   - Convert organization working calendar to MPP project calendar
   - Handle timezone differences between system and MPP
   - Map holidays and non-working days
   - Preserve working hours configuration

7. **Resource Management**:
   - Map task assignees to MPP resources (100% allocation)
   - Handle resource calendars and availability
   - Convert user information to MPP resource format
   - Manage resource assignment conflicts

8. **Advanced Features**:
   - Support for MPP custom fields (limited scope)
   - Progress tracking integration (% complete, actual vs planned)
   - Cost information import/export (if available)
   - MPP view definitions and formatting preservation

9. **Error Handling**:
   - Graceful handling of corrupted MPP files
   - Validation of MPP file structure before import
   - Detailed error reporting for unsupported features
   - Fallback to MPP XML format if binary MPP fails

10. **Import/Export UI**:
    - File upload with MPP format validation
    - Import preview showing project structure
    - Mapping interface for resource conflicts
    - Export options (full project vs filtered data)
    - Progress tracking for large MPP files

11. **Performance Optimization**:
    - Streaming processing for large MPP files
    - Memory management for complex project structures
    - Parallel processing where possible
    - Caching for repeated operations

12. **Testing**:
    - Round-trip testing with various MPP file formats
    - Complex project structure testing
    - Resource and calendar mapping validation
    - Performance testing with large MPP files
    - Compatibility testing with different MPP versions

13. **Documentation & Limitations**:
    - Clear documentation of supported MPP features
    - Known limitations and workarounds
    - Migration guide for MPP users
    - Troubleshooting guide for common issues

Include proper error handling and user guidance for complex MPP integration scenarios.
```

### Step 6.3: Notifications & Performance Polish

**Context**: Implement the notification system and final performance optimizations for production readiness.

**Prompt**:
```
Implement the notification system and apply final performance optimizations for production deployment:

1. **Notification Engine**:
   - Daily digest system for PMs showing items turning At Risk or Off Track
   - Real-time notifications for status changes and assignments
   - Email notification service with template management
   - In-app notification system with read/unread tracking
   - Configurable notification preferences per user

2. **Vacation Impact Analysis**:
   - Read-only vacation calendar integration
   - Detect task assignments during employee vacation periods
   - Generate impact reports showing potential delays
   - Visual calendar overlay showing vacation conflicts
   - Automated alerts for PMs about vacation impacts

3. **Notification Types & Triggers**:
   - **Status Changes**: Task/activity status updates
   - **Assignment Changes**: New tasks assigned to users
   - **Deadline Alerts**: Items becoming At Risk or Off Track
   - **Verification Required**: Tasks/activities ready for PM verification
   - **Import/Export**: Completion notifications for long-running operations

4. **Email System Integration**:
   - SMTP configuration for email sending
   - HTML email templates with project branding
   - Email scheduling and batching for efficiency
   - Unsubscribe management and preferences
   - Email delivery tracking and failure handling

5. **Performance Optimizations**:
   - **Database optimization**: Index analysis and query optimization
   - **API performance**: Response caching and pagination
   - **Frontend optimization**: Bundle splitting and lazy loading
   - **Memory management**: Efficient data structures and garbage collection
   - **Connection pooling**: Database and external service connections

6. **Caching Strategy**:
   - Redis integration for session and application caching
   - Cache invalidation strategies for real-time updates
   - CDN integration for static assets
   - API response caching with proper TTL
   - Browser caching optimization

7. **Monitoring & Observability**:
   - Application performance monitoring (APM) integration
   - Database query performance monitoring
   - Error tracking and alerting system
   - User analytics and usage tracking
   - System health checks and uptime monitoring

8. **Security Hardening**:
   - Security headers configuration
   - Input validation and sanitization
   - Rate limiting for API endpoints
   - Audit logging for sensitive operations
   - Vulnerability scanning integration

9. **Production Readiness**:
   - Environment configuration management
   - Docker containerization with proper resource limits
   - CI/CD pipeline optimization
   - Database migration strategy
   - Backup and recovery procedures

10. **Load Testing & Scalability**:
    - Load testing with realistic user scenarios
    - Database performance under concurrent load
    - Memory usage profiling and optimization
    - Horizontal scaling preparation
    - Bottleneck identification and resolution

11. **User Experience Polish**:
    - Loading state optimization and skeleton screens
    - Error message improvements and user guidance
    - Accessibility improvements and WCAG compliance
    - Mobile responsiveness final testing
    - Browser compatibility testing

12. **Documentation & Training**:
    - API documentation with examples
    - User manual and training materials
    - Administrator guide for system configuration
    - Troubleshooting guide and FAQ
    - Video tutorials for key features

13. **Testing & Quality Assurance**:
    - End-to-end test suite completion
    - Performance regression testing
    - Security testing and penetration testing
    - User acceptance testing coordination
    - Bug triage and critical issue resolution

14. **Migration & Deployment**:
    - Data migration utilities and scripts
    - Production deployment checklist
    - Rollback procedures and contingency plans
    - Post-deployment monitoring and validation
    - User communication and training schedule

Ensure all systems are production-ready with proper monitoring, documentation, and support procedures in place.
```

---

---

## Vercel Deployment Strategy

### Monorepo Structure for Vercel
```
masar/
├── apps/
│   ├── frontend/              # React app → Vercel Auto-Deploy
│   ├── api/                   # Node.js API → Vercel Serverless Functions
│   └── .vercelignore
├── packages/
│   ├── types/                 # Shared types
│   ├── utils/                 # Shared utilities
│   └── schemas/               # Zod schemas
├── vercel.json                # Root Vercel config (monorepo)
├── turbo.json                 # Build orchestration
└── pnpm-workspace.yaml        # Workspace config
```

### Deployment Process
1. **Connect GitHub Repository** to Vercel
2. **Configure Monorepo Root** in Vercel settings
3. **Environment Variables**:
   - `DATABASE_URL` (Vercel Postgres or Supabase connection string)
   - `REDIS_URL` (for Vercel KV)
   - `JWT_SECRET` / `JWT_PRIVATE_KEY`
   - `NEXT_PUBLIC_API_URL` (frontend → backend API URL)
4. **Automatic Deployments**:
   - Push to main → Production deployment
   - Push to dev branch → Preview deployment
   - Pull requests → Preview URLs for testing

### Vercel-Specific Optimizations
- **API Routes**: All backend endpoints are Vercel serverless functions (automatic)
- **Edge Middleware**: JWT auth at edge for zero-latency validation
- **Edge Caching**: CDN caching for static assets and API responses
- **Automatic HTTPS**: Built-in SSL/TLS
- **Global CDN**: Assets served from nearest edge location
- **Auto-scaling**: Handle traffic spikes automatically

### Database Considerations
- **Vercel Postgres**: Managed PostgreSQL, perfect for serverless
  - Connection pooling included
  - Automatic backups
  - Point-in-time recovery
- Alternative: **Supabase**: Open-source Firebase alternative with PostgreSQL
  - Same benefits as Vercel Postgres
  - More features for real-time (if needed)

### Caching with Vercel KV (Redis)
- Refresh token blacklist
- Calendar cache
- Session storage (optional)
- Rate limiting counters

### File Storage with Vercel Blob
- CSV/MPP file uploads for import/export
- CDN-integrated for fast downloads
- Managed storage without worrying about S3

### Scheduled Tasks with Vercel Crons
- `/api/crons/daily-digest` - Run every day at specific time
- `/api/crons/snapshot-baselines` - Run weekly
- `/api/crons/cleanup-old-tokens` - Run daily

### Development Workflow
```bash
# Local development simulates Vercel environment
vercel dev

# Environment variables from .env.local
# Database connects to local PostgreSQL or Vercel dev DB
# Frontend hot-reloads on file changes
# Backend API reloads on file changes
```

### Monitoring & Observability
- Vercel built-in analytics and error tracking
- Integration with Sentry for error tracking
- Database query monitoring with Prisma
- Serverless function execution logs in Vercel dashboard

### Cost Estimation
| Item | Cost |
|------|------|
| Vercel Frontend | Free-$150/mo (depends on deployments) |
| Vercel Serverless API | Free-$200/mo (pay-per-use) |
| Vercel Postgres (Hobby) | $12/mo (includes 25GB storage) |
| Vercel KV (Hobby) | $10/mo (includes 256MB) |
| Vercel Blob | $5 + $0.50/GB stored |
| **Total Estimated** | **$27-365/mo** (or free tier to start) |

---

## Summary & Next Steps

This comprehensive blueprint provides a structured approach to building the task management tool in iterative, testable increments using **Node.js + Vercel** for full serverless deployment. Each prompt builds on the previous work and ensures:

- **Incremental Progress**: Small, manageable steps that add value
- **Test-Driven Development**: Comprehensive testing at each stage
- **Integration Focus**: No orphaned code, everything connects
- **Production Readiness**: Security, performance, and scalability considerations
- **User-Centered Design**: Proper UX and accessibility throughout
- **Serverless Optimization**: Full Vercel deployment with auto-scaling
- **Cost Efficiency**: Managed services reduce operational overhead

### Key Differences from Original Java/Spring Plan
| Aspect | Java/Spring | Node.js/Vercel |
|--------|-------------|-----------------|
| Backend Framework | Spring Boot | Express.js/Fastify |
| Database ORM | Spring JPA + Liquibase | Prisma |
| Auth | Spring Security | JWT + Express middleware |
| Deployment | Self-hosted VPS/Kubernetes | Vercel serverless functions |
| Scaling | Manual / Kubernetes | Automatic with Vercel |
| Database | PostgreSQL (self-managed) | Vercel Postgres (managed) |
| Caching | Redis (self-hosted) | Vercel KV (managed) |
| File Storage | S3 or local | Vercel Blob |
| Scheduled Tasks | Spring Scheduler | Vercel Crons |
| Development | Local Spring Boot server | `vercel dev` |
| TypeScript | Frontend only | End-to-end |

The prompts are designed to be used with code-generation LLMs, providing enough context and specific requirements to generate working, tested code at each stage. The progression ensures that core functionality is established early, with advanced features built on a solid foundation.

## Implementation Timeline Estimate

- **Phase 1-2**: 3-5 weeks (Foundation & Core Logic - simpler with Node.js)
- **Phase 3**: 2-3 weeks (Scheduling Engine - simpler algorithms)
- **Phase 4**: 2-3 weeks (Basic UI - same as before)
- **Phase 5**: 3-4 weeks (Advanced UI - same as before)
- **Phase 6**: 2-3 weeks (Import/Export & Polish - simpler with Node.js)

**Total**: 12-18 weeks for full implementation (30% faster than Java/Spring due to simpler stack)

## Next Step: Begin Phase 1, Step 1.1

Start with the monorepo setup prompt. This establishes the foundation for all subsequent development.
