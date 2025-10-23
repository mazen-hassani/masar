# Auto-Scheduler Service

## Overview

The Auto-Scheduler Service is the core scheduling engine that automatically calculates project timelines based on dependencies and working calendar constraints. It performs sophisticated date calculations including forward and backward passes, critical path analysis, and slack time computation—the same algorithms used in professional project management tools like Microsoft Project.

## Architecture

### Scheduling Algorithms

The service implements industry-standard project scheduling algorithms:

#### 1. Forward Pass (Early Date Calculation)
- Starts from project start date
- Calculates earliest possible start and end dates for each activity/task
- Respects all predecessor dependencies and their lag values
- Accounts for working calendar (skips weekends and holidays)

**Formula for Finish-to-Start (FS):**
```
Early Start = MAX(Early End of all predecessors) + lag
Early End = Early Start + duration (respecting working hours)
```

#### 2. Backward Pass (Late Date Calculation)
- Starts from project end date (latest Early End of all items)
- Calculates latest allowable start and end dates
- Ensures no successors are delayed
- Preserves schedule feasibility

**Formula for Finish-to-Start (FS):**
```
Late End = MIN(Late Start of all successors) - lag
Late Start = Late End - duration (respecting working hours)
```

#### 3. Slack/Float Calculation
- Total slack = Late Start - Early Start
- Items with zero slack are on the critical path
- Items with positive slack have flexibility in scheduling

**Critical Path Items:**
```
Slack < 1 day = Critical (on the critical path)
Slack ≥ 1 day = Non-critical (has flexibility)
```

#### 4. Topological Sorting
- Uses Kahn's algorithm for deterministic ordering
- Ensures dependencies are processed in correct order
- Detects cycles (should not occur due to validation)

### Data Structures

#### ScheduleItem
The result of scheduling a single activity or task:

```typescript
interface ScheduleItem {
  id: string;                    // Activity or task ID
  name: string;                  // Display name
  type: "activity" | "task";     // Item type
  durationHours: number;         // Duration in hours
  startDate: Date;               // Actual start (typically Early Start)
  endDate: Date;                 // Actual end (typically Early End)
  earlyStart: Date;              // Earliest possible start
  earlyEnd: Date;                // Earliest possible end
  lateStart: Date;               // Latest allowable start
  lateEnd: Date;                 // Latest allowable end
  slack: number;                 // Days of flexibility (Total Slack)
  isCritical: boolean;           // True if on critical path
  predecessorIds: string[];      // Direct predecessors
  successorIds: string[];        // Direct successors
}
```

#### ProjectSchedule
Complete schedule for a project:

```typescript
interface ProjectSchedule {
  projectId: string;             // Project ID
  startDate: Date;               // Project start date
  endDate: Date;                 // Project end date (from last item)
  totalDurationDays: number;     // Duration in calendar days
  items: ScheduleItem[];         // All scheduled items
  criticalPath: string[];        // IDs of critical path items
  isFeasible: boolean;           // Schedule validity
  warnings: string[];            // Any scheduling issues
}
```

## Service Methods

### Main Scheduling

#### `calculateProjectSchedule(projectId: string, options?: SchedulingOptions): Promise<ProjectSchedule>`

Calculates complete schedule for a project including all dates, slack, and critical path.

**Parameters:**
- `projectId` (string): The project to schedule
- `options` (SchedulingOptions, optional):
  - `respectCurrentDates`: If true, don't reschedule items already started
  - `constraintMode`: "tight" (minimize slack) or "loose" (maximize flexibility)
  - `calendar`: Use specific calendar config (default: organisation's calendar)

**Returns:** Complete ProjectSchedule with all items and analysis

**Algorithm:**
1. Load all activities and tasks for project
2. Build dependency graph from database relationships
3. Topologically sort items using Kahn's algorithm
4. Execute forward pass for early date calculation
5. Execute backward pass for late date calculation
6. Calculate slack and identify critical items
7. Validate schedule feasibility
8. Return complete results

**Example:**
```typescript
const schedule = await schedulerService.calculateProjectSchedule("project-123", {
  respectCurrentDates: true,
  constraintMode: "tight"
});

// Schedule now contains:
// - schedule.items: All activities/tasks with dates
// - schedule.criticalPath: IDs of items on critical path
// - schedule.totalDurationDays: Total project duration
// - schedule.endDate: When project will complete
```

**Time Complexity:** O(V + E) where V = activities/tasks, E = dependencies

### Analysis Methods

#### `getCriticalPath(projectId: string): Promise<ScheduleItem[]>`

Returns only the items on the critical path (items with zero or near-zero slack).

**Parameters:**
- `projectId` (string): The project to analyze

**Returns:** Array of ScheduleItem objects on critical path, sorted by start date

**Use Case:** Identify which items must not slip to avoid delaying the project

**Example:**
```typescript
const criticalItems = await schedulerService.getCriticalPath("project-123");

// All items in this array have isCritical = true
// These activities/tasks directly impact project end date
// Any delay to these items will delay the entire project
for (const item of criticalItems) {
  console.log(`${item.name}: ${item.earlyStart} - ${item.earlyEnd}`);
}
```

#### `getSlackAnalysis(projectId: string): Promise<Array<{ itemId, slack, isCritical }>>`

Provides slack analysis for all items in project.

**Parameters:**
- `projectId` (string): The project to analyze

**Returns:** Array with itemId, slack (in days), and isCritical flag for each item

**Interpretation:**
- **Slack = 0:** Critical item, any delay affects project
- **Slack = 1-5:** Low flexibility, should be monitored
- **Slack > 5:** High flexibility, less risk

**Example:**
```typescript
const slackAnalysis = await schedulerService.getSlackAnalysis("project-123");

// Sort by slack (critical items first)
const byRisk = slackAnalysis.sort((a, b) => a.slack - b.slack);

for (const item of byRisk.slice(0, 10)) {
  console.log(`${item.itemId}: ${item.slack} days slack (Critical: ${item.isCritical})`);
}
```

#### `getDependencyChain(itemId: string): Promise<string[]>`

Returns all items that depend on the given item (successors and their transitive closure).

**Parameters:**
- `itemId` (string): Activity or task ID

**Returns:** Array of all items that must wait for this item to complete

**Use Case:** Understand impact of delaying a specific item

**Example:**
```typescript
const chain = await schedulerService.getDependencyChain("activity-design");
console.log(`Delaying design impacts ${chain.length} items`);
```

#### `getResourceLevelingAnalysis(projectId: string): Promise<Array<{ date, itemCount, itemIds }>>`

Analyzes resource demands by week to identify leveling opportunities.

**Parameters:**
- `projectId` (string): The project to analyze

**Returns:** Array of weekly snapshots with item counts and IDs

**Use Case:** Identify weeks with high activity that might benefit from resource reallocation

**Example:**
```typescript
const leveling = await schedulerService.getResourceLevelingAnalysis("project-123");

const maxLoad = Math.max(...leveling.map(w => w.itemCount));
const busyWeeks = leveling.filter(w => w.itemCount === maxLoad);

console.log(`Peak load: ${maxLoad} concurrent items in ${busyWeeks.length} weeks`);
```

## Dependency Type Handling

The scheduler correctly handles all four standard dependency types:

### Finish-to-Start (FS)
**Definition:** Successor cannot start until predecessor finishes

**Early Date Calculation:**
```
Early Start (successor) = MAX(Early End of predecessors) + lag
```

**When to Use:**
- Sequential work (typical case)
- Design → Development → Testing

### Start-to-Start (SS)
**Definition:** Successor cannot start until predecessor starts

**Early Date Calculation:**
```
Early Start (successor) = MAX(Early Start of predecessors) + lag
```

**When to Use:**
- Overlapping activities
- Frontend Development can start when Backend starts (with lag for architecture)

### Finish-to-Finish (FF)
**Definition:** Successor cannot finish until predecessor finishes

**Early Date Calculation:**
```
Early End (successor) = MAX(Early End of predecessors) + lag
```

**When to Use:**
- End timing is critical
- Documentation must complete when product releases

### Start-to-Finish (SF)
**Definition:** Successor cannot finish until predecessor starts

**Early Date Calculation:**
```
Early End (successor) = MAX(Early Start of predecessors) + lag
```

**When to Use:**
- Decommissioning old systems (cannot complete until new system operational)
- Rare in typical projects

## Integration with Other Services

### CalendarService Integration
- Uses organisation's working calendar for date calculations
- Respects weekends, holidays, and non-working hours
- Lag values are applied as calendar days
- All date calculations respect working time constraints

**Example:**
```typescript
// If adding 5 hours to a Friday 4pm with 1 hour working left
// Result will be Monday 8am (respecting weekend and working hours)
const endDate = await calendarService.addWorkingTime(
  new Date("2024-01-19 16:00"), // Friday 4pm
  5,                             // hours
  calendar,
  organisationId
);
// Result: 2024-01-22 09:00 (Monday 9am)
```

### DependencyService Integration
- Reads all dependencies created via DependencyService
- Builds dependency graph from relationships
- Uses dependency types and lag values in calculations
- Ensures no cycles (validated earlier)

### StatusService Integration
- Scheduled dates inform status tracking
- Can compare actual dates against scheduled dates
- Enables "On Track" vs "At Risk" determination
- Identifies items that are behind schedule

## Algorithm Examples

### Simple Linear Chain: A → B → C

```
A (Jan 1-5):   Early: Jan 1-5,   Late: Jan 1-5,   Slack: 0 [CRITICAL]
B (Jan 6-10):  Early: Jan 6-10,  Late: Jan 6-10,  Slack: 0 [CRITICAL]
C (Jan 11-15): Early: Jan 11-15, Late: Jan 11-15, Slack: 0 [CRITICAL]

Critical Path: A → B → C (entire chain)
```

### Parallel with Convergence

```
         ┌─→ Frontend (Jan 1-10) ─┐
Project ─┤                         ├─→ Integration (Jan 11-15)
         └─→ Backend (Jan 1-20) ──┘

Frontend: Early: Jan 1-10,  Slack: 10 days (non-critical)
Backend:  Early: Jan 1-20,  Slack: 0 days (CRITICAL)
Integration: Early: Jan 21-25, depends on Backend completion

Critical Path: Project → Backend → Integration
```

### With Lag: A →(2 days)→ B

```
A (Jan 1-5)
  ↓ (Finish-to-Start with 2-day lag)
B (Jan 8-12)  [2 days gap for setup/integration]
```

## Common Patterns

### Fast-Track Method (Overlap Dependencies)

Use Start-to-Start dependencies to compress schedule:

```typescript
// Instead of FS (sequential)
await dependencyService.createActivityDependency({
  predecessorId: design.id,
  successorId: development.id,
  type: DependencyType.FS  // Development starts after design ends
});

// Use SS (overlapping)
await dependencyService.createActivityDependency({
  predecessorId: design.id,
  successorId: development.id,
  type: DependencyType.SS,
  lag: 3  // Development starts 3 days after design starts
});
```

### Critical Chain Project Management (CCPM)

Use slack analysis to apply buffers:

```typescript
const slackAnalysis = await schedulerService.getSlackAnalysis(projectId);
const nonCritical = slackAnalysis.filter(s => s.slack > 0);

// Allocate buffers to highest-risk non-critical items
for (const item of nonCritical.sort((a, b) => a.slack - b.slack)) {
  console.log(`Add ${item.slack / 2} day buffer to ${item.itemId}`);
}
```

### What-If Analysis

Recalculate schedule with modified parameters:

```typescript
// Current schedule
const current = await schedulerService.calculateProjectSchedule(projectId);
console.log(`Baseline: ${current.totalDurationDays} days`);

// What if a critical item takes 5 days longer?
// Modify the activity duration and recalculate
// (Would require updating activity in database first)
const updated = await schedulerService.calculateProjectSchedule(projectId);
console.log(`With delay: ${updated.totalDurationDays} days`);
console.log(`Impact: +${updated.totalDurationDays - current.totalDurationDays} days`);
```

## Performance Considerations

### Complexity Analysis

- **Forward/Backward Pass:** O(V + E) where V = items, E = dependencies
- **Topological Sort:** O(V + E) using Kahn's algorithm
- **Slack Calculation:** O(V)
- **Overall:** O(V + E) = O(n²) worst case for dense graphs

### Optimization Strategies

1. **Caching:** Cache schedule for project until dependencies change
2. **Incremental Updates:** For small changes, update only affected items
3. **Batch Operations:** Schedule multiple projects in parallel
4. **Database Indexes:** Ensure indexes on dependency foreign keys

### Expected Performance

- **Small projects (< 100 items):** < 50ms
- **Medium projects (100-1000 items):** 50-500ms
- **Large projects (1000+ items):** 500ms-5s

## Error Handling

### Common Errors

**Cycle Detected in Dependencies**
```
Error: "Cycle detected in project dependencies"
```
- Should not occur (validated earlier by DependencyService)
- Indicates data corruption or missing validation
- Abort scheduling, investigate dependencies

**Missing Activity/Task**
```
Error: "Activity not found: activity-123"
```
- Reference integrity issue
- Restore missing item or remove dependency

**Invalid Calendar Configuration**
```
Error: "Calendar not found for organisation"
```
- Organisation calendar hasn't been configured
- Create calendar in CalendarService first

### Best Practices

```typescript
try {
  const schedule = await schedulerService.calculateProjectSchedule(projectId);

  if (!schedule.isFeasible) {
    console.warn("Schedule has warnings:", schedule.warnings);
  }

  if (schedule.criticalPath.length === schedule.items.length) {
    console.warn("All items are critical - no flexibility!");
  }
} catch (error) {
  if (error.message.includes("Cycle")) {
    // Handle impossible dependencies
    console.error("Check dependencies for loops");
  } else {
    // Handle other errors
    console.error("Scheduling failed:", error);
  }
}
```

## Type Definitions

```typescript
enum DependencyType {
  FS = "FS",  // Finish-to-Start
  SS = "SS",  // Start-to-Start
  FF = "FF",  // Finish-to-Finish
  SF = "SF"   // Start-to-Finish
}

interface SchedulingOptions {
  respectCurrentDates?: boolean;  // Don't change started items
  constraintMode?: "tight" | "loose";
  calendar?: CalendarConfig;
}
```

## Testing

### Integration Test Coverage

Tests validate:
- Simple linear dependency chains
- Complex convergent dependencies
- Divergent (fan-out) dependencies
- All dependency types (FS, SS, FF, SF)
- Lag value handling
- Task and activity scheduling
- Critical path identification
- Slack time calculation
- Resource leveling
- Schedule feasibility
- Empty projects

**Run Tests:**
```bash
npm test -- src/services/__tests__/scheduler.integration.test.ts
```

## Future Enhancements

1. **Resource Leveling:** Automatic leveling to balance workload
2. **Constraint Scheduling:** Support for hard constraints (must finish by date)
3. **Probabilistic Scheduling:** PERT analysis with optimistic/pessimistic durations
4. **Earned Value:** Track actual vs scheduled performance
5. **Schedule Optimization:** Automatic compression using parallel paths
6. **What-If Analysis API:** Dedicated endpoint for scenario comparison
7. **Multi-Project Scheduling:** Coordinate across dependent projects
8. **Resource Assignment:** Factor in resource availability

## Summary

The Auto-Scheduler Service provides:
- **Accuracy:** Industry-standard algorithms (forward/backward pass)
- **Flexibility:** Support for all dependency types and lags
- **Integration:** Works with Calendar and Dependency services
- **Analysis:** Critical path, slack, resource leveling
- **Performance:** Efficient O(V+E) algorithms
- **Reliability:** Handles complex project structures

This foundation enables automatic date calculation and critical path analysis, essential for timeline management and what-if analysis in project planning.
