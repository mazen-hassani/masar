# Dependency Management Service

## Overview

The Dependency Management Service handles the creation, querying, and validation of dependencies between activities and tasks in projects. It implements sophisticated cycle detection using depth-first search (DFS) to prevent circular dependencies, which would create impossible project schedules.

## Architecture

### Dependency Types

The system supports four standard project management dependency types:

1. **Finish-to-Start (FS)**: Successor cannot start until predecessor finishes
   - Most common dependency type
   - Default behavior for sequential work
   - Example: Testing cannot start until Development finishes

2. **Start-to-Start (SS)**: Successor cannot start until predecessor starts
   - Used when tasks can overlap
   - Example: Training can start when Development starts

3. **Finish-to-Finish (FF)**: Successor cannot finish until predecessor finishes
   - Used when end timing is critical
   - Example: Documentation must finish when Product Release finishes

4. **Start-to-Finish (SF)**: Successor cannot finish until predecessor starts
   - Least common, used for specific scenarios
   - Example: Legacy system cannot be decommissioned until new system is operational

### Lag/Lead

Dependencies can include a lag value (in days or hours), representing the minimum time that must pass between connected activities/tasks.

- **Positive Lag**: Time that must elapse between dependency relationship
- **Default Lag**: 0 (immediate connection)

## Data Model

### Dependency Entity

```typescript
interface Dependency {
  id: string;
  // Activity relationships
  activityPredecessorId?: string;
  activitySuccessorId?: string;
  // Task relationships
  taskPredecessorId?: string;
  taskSuccessorId?: string;
  // Dependency characteristics
  dependencyType: DependencyType; // FS, SS, FF, SF
  lag: number; // Default 0
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}
```

## Service Methods

### Activity Dependencies

#### `createActivityDependency(data: ActivityDependencyInput): Promise<Dependency>`

Creates a new dependency between two activities.

**Parameters:**
- `predecessorId` (string): The activity that must occur first
- `successorId` (string): The activity that depends on the predecessor
- `type` (DependencyType): FS, SS, FF, or SF
- `lag` (number, optional): Time lag between activities (defaults to 0)

**Returns:** The created Dependency object

**Validation:**
- Prevents self-dependencies (activity cannot depend on itself)
- Detects and prevents circular dependencies using DFS
- Ensures both activities exist in the database

**Example:**
```typescript
const dependency = await dependencyService.createActivityDependency({
  predecessorId: "activity-design",
  successorId: "activity-development",
  type: DependencyType.FS,
  lag: 1 // 1 day lag before development starts
});
```

**Errors:**
- `"Cannot create dependency on itself"` - Self-dependency detected
- `"Creating this dependency would form a circular dependency"` - Cycle detected
- Database errors for missing activity references

#### `getActivityPredecessors(activityId: string): Promise<Dependency[]>`

Retrieves all activities that must complete before the specified activity can start.

**Parameters:**
- `activityId` (string): The activity to query

**Returns:** Array of Dependency objects where the activity is the successor

**Example:**
```typescript
const prerequisites = await dependencyService.getActivityPredecessors("activity-testing");
// Returns all activities that must finish before testing starts
```

#### `getActivitySuccessors(activityId: string): Promise<Dependency[]>`

Retrieves all activities that depend on the specified activity.

**Parameters:**
- `activityId` (string): The activity to query

**Returns:** Array of Dependency objects where the activity is the predecessor

**Example:**
```typescript
const dependents = await dependencyService.getActivitySuccessors("activity-design");
// Returns all activities that depend on design completion
```

#### `getActivityDependencies(activityId: string): Promise<{ incoming: Dependency[], outgoing: Dependency[] }>`

Retrieves all dependencies for an activity in both directions.

**Parameters:**
- `activityId` (string): The activity to query

**Returns:** Object with `incoming` (predecessors) and `outgoing` (successors) arrays

**Example:**
```typescript
const deps = await dependencyService.getActivityDependencies("activity-development");
// Returns both what must finish before development starts
// AND what cannot start until development finishes
```

### Task Dependencies

#### `createTaskDependency(data: TaskDependencyInput): Promise<Dependency>`

Creates a new dependency between two tasks.

**Parameters:**
- `predecessorId` (string): The task that must occur first
- `successorId` (string): The task that depends on the predecessor
- `type` (DependencyType): FS, SS, FF, or SF
- `lag` (number, optional): Time lag between tasks (defaults to 0)

**Returns:** The created Dependency object

**Validation:**
- Prevents self-dependencies
- Detects and prevents circular dependencies using DFS
- Ensures both tasks exist in the database

**Example:**
```typescript
const dependency = await dependencyService.createTaskDependency({
  predecessorId: "task-backend",
  successorId: "task-testing",
  type: DependencyType.FS,
  lag: 2 // 2 days of integration time before testing starts
});
```

#### `getTaskPredecessors(taskId: string): Promise<Dependency[]>`

Retrieves all tasks that must complete before the specified task can start.

**Parameters:**
- `taskId` (string): The task to query

**Returns:** Array of Dependency objects where the task is the successor

#### `getTaskSuccessors(taskId: string): Promise<Dependency[]>`

Retrieves all tasks that depend on the specified task.

**Parameters:**
- `taskId` (string): The task to query

**Returns:** Array of Dependency objects where the task is the predecessor

#### `getTaskDependencies(taskId: string): Promise<{ incoming: Dependency[], outgoing: Dependency[] }>`

Retrieves all dependencies for a task in both directions.

**Parameters:**
- `taskId` (string): The task to query

**Returns:** Object with `incoming` (predecessors) and `outgoing` (successors) arrays

### General Methods

#### `delete(dependencyId: string): Promise<Dependency>`

Deletes a dependency relationship.

**Parameters:**
- `dependencyId` (string): The ID of the dependency to delete

**Returns:** The deleted Dependency object

**Example:**
```typescript
await dependencyService.delete("dependency-123");
// Relationship is removed - activities/tasks are now independent
```

**Effects:** Removing a dependency may change critical path calculations and project timeline estimates.

## Cycle Detection Algorithm

The service uses Depth-First Search (DFS) with a recursion stack to detect cycles:

```typescript
private async hasActivityCycleDFS(
  current: string,
  target: string,
  visited: Set<string>,
  recursionStack: Set<string>
): Promise<boolean>
```

**Algorithm:**
1. Mark current node as visited and add to recursion stack
2. Get all successors of current node
3. For each successor:
   - If successor is the target, a cycle is detected (return true)
   - If successor not visited, recursively check from successor
   - If successor is in recursion stack, a cycle exists (return true)
4. Remove current from recursion stack
5. Return false if no cycle found

**Time Complexity:** O(V + E) where V = vertices (activities/tasks), E = edges (dependencies)

**Example Cycle Detection:**
```
Create A -> B
Create B -> C
Create C -> A  // CYCLE DETECTED!
             // This would create an impossible schedule
```

## Common Patterns

### Linear Dependency Chain

Creating a sequence of dependent activities:

```typescript
// Design -> Development -> Testing -> Release
const dep1 = await dependencyService.createActivityDependency({
  predecessorId: designActivityId,
  successorId: devActivityId,
  type: DependencyType.FS
});

const dep2 = await dependencyService.createActivityDependency({
  predecessorId: devActivityId,
  successorId: testActivityId,
  type: DependencyType.FS
});

const dep3 = await dependencyService.createActivityDependency({
  predecessorId: testActivityId,
  successorId: releaseActivityId,
  type: DependencyType.FS
});
```

### Parallel Activities with Convergence

Multiple independent activities that converge:

```typescript
// Frontend, Backend, QA can run in parallel
const dep1 = await dependencyService.createActivityDependency({
  predecessorId: designActivityId,
  successorId: frontendActivityId,
  type: DependencyType.FS
});

const dep2 = await dependencyService.createActivityDependency({
  predecessorId: designActivityId,
  successorId: backendActivityId,
  type: DependencyType.FS
});

const dep3 = await dependencyService.createActivityDependency({
  predecessorId: designActivityId,
  successorId: qaActivityId,
  type: DependencyType.FS
});

// Integration requires all three to complete
const dep4 = await dependencyService.createActivityDependency({
  predecessorId: frontendActivityId,
  successorId: integrationActivityId,
  type: DependencyType.FS
});

const dep5 = await dependencyService.createActivityDependency({
  predecessorId: backendActivityId,
  successorId: integrationActivityId,
  type: DependencyType.FS
});

const dep6 = await dependencyService.createActivityDependency({
  predecessorId: qaActivityId,
  successorId: integrationActivityId,
  type: DependencyType.FS
});
```

### Start-to-Start with Lag

Activities that can overlap but with minimum gap:

```typescript
// Development can start when Design starts
const dep1 = await dependencyService.createActivityDependency({
  predecessorId: designActivityId,
  successorId: devActivityId,
  type: DependencyType.SS,
  lag: 5 // But with 5-day lag for design to complete initial work
});
```

## Integration with Other Services

### CalendarService Integration

Dependencies influence scheduling calculations:
- Use dependency lag values with CalendarService to calculate start/end dates
- Critical path analysis depends on dependency structure
- Slack time calculation requires understanding of all dependencies

### StatusService Integration

Dependency status affects cascading updates:
- Cannot complete successor activity until predecessor is verified
- Progress tracking considers dependency constraints
- Tracking status calculation respects critical path defined by dependencies

### InstantiationService Integration

Template instantiation creates dependencies during project creation:
- Template dependencies are converted to real dependencies
- Lag values are preserved during instantiation
- Cycle detection ensures templates are valid before instantiation

## Error Handling

### Common Errors

**Self-Dependency Error**
```
Error: "Cannot create dependency on itself"
```
Occurs when trying to create a dependency where predecessor and successor are the same.

**Circular Dependency Error**
```
Error: "Creating this dependency would form a circular dependency"
```
Occurs when adding a dependency would create a cycle in the dependency graph. This is a validation error and the operation is rejected.

**Missing Entity Error**
```
PrismaClientKnownRequestError
```
Occurs if referenced activity/task doesn't exist in the database.

### Best Practices for Error Handling

```typescript
try {
  const dependency = await dependencyService.createActivityDependency({
    predecessorId: activityA,
    successorId: activityB,
    type: DependencyType.FS
  });
} catch (error) {
  if (error.message.includes("circular")) {
    // Handle cycle detection
    console.error("Cannot create dependency: would form a cycle");
  } else if (error.message.includes("Cannot create dependency on itself")) {
    // Handle self-dependency
    console.error("Cannot create self-dependency");
  } else {
    // Handle other database errors
    console.error("Failed to create dependency:", error);
  }
}
```

## Performance Considerations

### Cycle Detection Performance

- **First-time checks:** O(V + E) - Full graph traversal
- **Subsequent operations:** Cache dependency graph for faster checks
- **Large projects:** Consider limiting chain depth or batch operations

### Query Performance

- **Getting predecessors/successors:** Indexed queries on foreign key columns
- **Getting all dependencies:** Consider pagination for large projects
- **Transitive closure:** Direct queries are O(E) but transitive (all predecessors of predecessors) requires recursive traversal

### Optimization Strategies

1. **Eager Loading:** Use includes in queries to fetch related activities/tasks
2. **Batching:** Create multiple dependencies in batch where possible
3. **Caching:** Cache dependency relationships in session for repeated access
4. **Indexes:** Ensure database indexes on activityPredecessorId, activitySuccessorId, taskPredecessorId, taskSuccessorId

## Testing

### Unit Test Coverage

Integration tests cover:
- Creating dependencies of all types (FS, SS, FF, SF)
- Lag value handling
- Self-dependency prevention
- Direct cycle detection (A -> B -> A)
- Indirect cycle detection (A -> B -> C -> A)
- Querying predecessors and successors
- Getting all dependencies for an item
- Dependency deletion
- Empty dependency handling

### Test Database Setup

Tests require a PostgreSQL database configured in .env.test:
```
DATABASE_URL="postgresql://test:test@localhost:5432/masar_test"
```

Run tests:
```bash
npm test -- src/services/__tests__/dependency.integration.test.ts
```

## Type Definitions

```typescript
// From @prisma/client
enum DependencyType {
  FS = "FS",  // Finish-to-Start
  SS = "SS",  // Start-to-Start
  FF = "FF",  // Finish-to-Finish
  SF = "SF"   // Start-to-Finish
}

// Service input types
interface ActivityDependencyInput {
  predecessorId: string;
  successorId: string;
  type: DependencyType;
  lag?: number;
}

interface TaskDependencyInput {
  predecessorId: string;
  successorId: string;
  type: DependencyType;
  lag?: number;
}
```

## Future Enhancements

1. **Conditional Dependencies**: Support for dependencies that are conditional on project decisions
2. **Transitive Closure Caching**: Cache full dependency chains for faster lookups
3. **Dependency Analysis**: Provide API for critical path calculation
4. **Dependency Visualization**: Generate dependency graph data for UI visualization
5. **Bulk Operations**: Support creating multiple dependencies in a single transaction
6. **Dependency Soft Delete**: Archive instead of permanently deleting dependencies
7. **Lag Type Support**: Support different lag types (working days vs calendar days)
8. **Resource Leveling**: Consider resource availability in dependency calculations

## Summary

The Dependency Management Service provides robust handling of project dependencies with:
- **Flexibility**: Supports all standard project management dependency types
- **Safety**: Prevents circular dependencies that would create impossible schedules
- **Completeness**: Query dependencies in both directions
- **Integration**: Works seamlessly with Calendar, Status, and Instantiation services
- **Performance**: Efficient DFS-based cycle detection with database indexing

This foundation enables the Auto-Scheduling Engine (Step 3.2) to calculate accurate project timelines based on dependencies.
