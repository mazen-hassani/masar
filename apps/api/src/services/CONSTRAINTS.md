# Manual Constraints & Date Edit Validation Service

## Overview

The Constraint Service manages manual date constraints and validates date edits to prevent schedule conflicts. It allows project managers to apply hard deadlines, flexible windows, and fixed dates while preventing changes that would violate dependencies or create impossible schedules.

## Architecture

### Constraint Types

The system supports eight types of constraints allowing flexible schedule control:

#### 1. **ASAP (As Soon As Possible)**
- Activity/task starts at the earliest possible date
- No explicit constraint date
- Allows dependencies to push start date forward
- Default behavior for unconstrained items

#### 2. **ALAP (As Late As Possible)**
- Activity/task completes at the latest possible date
- No explicit constraint date
- Uses available slack to shift work later
- Useful for resource leveling

#### 3. **MUST_START_ON**
- Fixed start date requirement
- Activity/task must start on specific date
- No flexibility
- Example: "Project must start Jan 15"

#### 4. **MUST_FINISH_ON**
- Fixed end date requirement
- Activity/task must complete on specific date
- May compress or extend activity duration
- Example: "Product must launch March 31"

#### 5. **START_NO_EARLIER**
- Earliest possible start date
- Cannot start before specified date
- Allows later start if dependencies require it
- Example: "Cannot start before dependencies ready"

#### 6. **START_NO_LATER**
- Latest allowable start date
- Must start by specified date
- Creates urgency to begin work
- Example: "Must start by Jan 20 or miss deadline"

#### 7. **FINISH_NO_EARLIER**
- Earliest completion date
- Cannot complete before specified date
- Useful when downstream depends on min completion time
- Example: "Testing can't start before code stabilizes"

#### 8. **FINISH_NO_LATER**
- Latest allowable completion date
- Must complete by specified date
- Hard deadline constraint
- Example: "Code must be done by Feb 28"

## Data Structures

### DateConstraint

```typescript
interface DateConstraint {
  id: string;
  itemId: string;                  // Activity or task ID
  itemType: "activity" | "task";   // Type of item
  constraintType: ConstraintType;  // One of 8 constraint types
  constraintDate: Date;            // The constraint date
  createdAt: Date;
  updatedAt: Date;
}
```

### DateEditValidation

Result of validating a date change:

```typescript
interface DateEditValidation {
  valid: boolean;                          // Can the edit be applied?
  newStartDate: Date;                      // Proposed start
  newEndDate: Date;                        // Proposed end
  violations: DateConstraintViolation[];   // List of conflicts
  warnings: string[];                      // Additional alerts
  affectedItems: Array<{
    id: string;                            // Item ID that would be affected
    reason: string;                        // Why it's affected
  }>;
}
```

### DateConstraintViolation

Details of a specific constraint violation:

```typescript
interface DateConstraintViolation {
  violationType:
    | "PREDECESSOR_CONFLICT"     // Would violate predecessor constraint
    | "SUCCESSOR_CONFLICT"       // Would violate successor constraint
    | "HARD_CONSTRAINT"          // Violates hard deadline
    | "CALENDAR_CONSTRAINT"      // Falls on non-working day
    | "DURATION_INVALID";        // Negative duration
  message: string;               // Human-readable error
  affectedItemId?: string;       // Related item (if applicable)
  affectedItemName?: string;     // Display name
  suggestedDate?: Date;          // Recommended alternative
}
```

### ValidDateRange

Calculates allowed date range given all constraints:

```typescript
interface ValidDateRange {
  itemId: string;
  minStartDate: Date;            // Earliest start possible
  maxStartDate: Date;            // Latest start possible
  minEndDate: Date;              // Earliest end possible
  maxEndDate: Date;              // Latest end possible
  constraints: DateConstraint[]; // Applied constraints
  violations: DateConstraintViolation[]; // Infeasibility issues
}
```

## Service Methods

### Constraint Management

#### `addConstraint(itemId, itemType, constraintType, constraintDate): Promise<DateConstraint>`

Creates a new constraint on an activity or task.

**Parameters:**
- `itemId` (string): Activity or task ID
- `itemType` ("activity" | "task"): Type of item
- `constraintType` (string): One of 8 constraint types
- `constraintDate` (Date): The constraint date

**Returns:** Created DateConstraint object

**Example:**
```typescript
// Set hard deadline for project
const constraint = await constraintService.addConstraint(
  "activity-release",
  "activity",
  "FINISH_NO_LATER",
  new Date("2024-03-31")
);

// Set earliest start
const constraint2 = await constraintService.addConstraint(
  "activity-development",
  "activity",
  "START_NO_EARLIER",
  new Date("2024-02-01")
);
```

#### `removeConstraint(constraintId): Promise<DateConstraint>`

Deletes a constraint.

**Parameters:**
- `constraintId` (string): Constraint ID to remove

**Returns:** Deleted DateConstraint object

#### `getItemConstraints(itemId): Promise<DateConstraint[]>`

Gets all constraints for a specific item.

**Parameters:**
- `itemId` (string): Activity or task ID

**Returns:** Array of DateConstraint objects for that item

**Example:**
```typescript
const constraints = await constraintService.getItemConstraints("activity-123");
// Returns all constraints on this activity
```

#### `getProjectConstraints(projectId): Promise<DateConstraint[]>`

Gets all constraints in a project.

**Parameters:**
- `projectId` (string): Project ID

**Returns:** Array of all DateConstraint objects in project

### Date Edit Validation

#### `validateDateEdit(itemId, itemType, newStartDate, newEndDate, calendar?, organisationId?): Promise<DateEditValidation>`

Validates whether proposed date changes are allowed.

**Parameters:**
- `itemId` (string): Activity or task ID
- `itemType` ("activity" | "task"): Type of item
- `newStartDate` (Date): Proposed new start date
- `newEndDate` (Date): Proposed new end date
- `calendar` (CalendarConfig, optional): Working calendar
- `organisationId` (string, optional): Required if calendar not provided

**Returns:** DateEditValidation with detailed results

**Checks Performed:**
1. Valid duration (end ≥ start)
2. All hard constraints on this item
3. Predecessor constraints (items this depends on)
4. Successor constraints (items that depend on this)
5. Working calendar (no non-working days)

**Example:**
```typescript
const validation = await constraintService.validateDateEdit(
  "activity-123",
  "activity",
  new Date("2024-02-01"), // Proposed start
  new Date("2024-02-15")  // Proposed end
);

if (!validation.valid) {
  console.log("Cannot apply edit:");
  for (const violation of validation.violations) {
    console.log(`  - ${violation.message}`);
    if (violation.suggestedDate) {
      console.log(`    Suggested: ${violation.suggestedDate.toISOString()}`);
    }
  }
}
```

#### `applyDateEdit(itemId, itemType, newStartDate, newEndDate, forceOverride?, calendar?, organisationId?): Promise<{success, validation}>`

Applies date changes to an item.

**Parameters:**
- `itemId` (string): Activity or task ID
- `itemType` ("activity" | "task"): Type of item
- `newStartDate` (Date): New start date
- `newEndDate` (Date): New end date
- `forceOverride` (boolean, optional): Force apply even with violations (default: false)
- `calendar` (CalendarConfig, optional): Working calendar
- `organisationId` (string, optional): Required if calendar not provided

**Returns:** Object with success flag and validation details

**Behavior:**
- If valid and forceOverride=false: Apply changes
- If invalid and forceOverride=false: Reject with validation errors
- If forceOverride=true: Apply regardless of violations

**Example:**
```typescript
// Try to apply edit without forcing
const result = await constraintService.applyDateEdit(
  "activity-123",
  "activity",
  new Date("2024-02-01"),
  new Date("2024-02-15"),
  false
);

if (!result.success) {
  // Inform user of violations
  console.log("Cannot apply edit:", result.validation.violations[0].message);
} else {
  console.log("Date change applied successfully");
}

// Force override (PM override)
const override = await constraintService.applyDateEdit(
  "activity-123",
  "activity",
  new Date("2024-03-01"),
  new Date("2024-03-15"),
  true // Force override
);
```

### Date Range Analysis

#### `getValidDateRange(itemId, itemType, calendar?, organisationId?): Promise<ValidDateRange>`

Calculates the valid date range for manual editing.

**Parameters:**
- `itemId` (string): Activity or task ID
- `itemType` ("activity" | "task"): Type of item
- `calendar` (CalendarConfig, optional): Working calendar
- `organisationId` (string, optional): Required if calendar not provided

**Returns:** ValidDateRange with min/max dates and constraint details

**Use Cases:**
- Date picker can disable dates outside valid range
- Show user flexibility available for editing
- Identify constraint conflicts

**Example:**
```typescript
const range = await constraintService.getValidDateRange(
  "activity-123",
  "activity"
);

console.log(`Valid dates: ${range.minStartDate} to ${range.maxStartDate}`);
console.log(`Constraints limiting flexibility:`);
for (const constraint of range.constraints) {
  console.log(`  - ${constraint.constraintType}: ${constraint.constraintDate}`);
}

if (range.violations.length > 0) {
  console.log("WARNING: No valid dates possible!");
  for (const violation of range.violations) {
    console.log(`  - ${violation.message}`);
  }
}
```

### Change Propagation

#### `propagateDateChanges(itemId, itemType, calendar?, organisationId?): Promise<Array<{id, type, newStart, newEnd}>>`

Applies date change to successors.

**Parameters:**
- `itemId` (string): Activity or task ID that changed
- `itemType` ("activity" | "task"): Type of item
- `calendar` (CalendarConfig, optional): Working calendar
- `organisationId` (string, optional): Required if calendar not provided

**Returns:** Array of successor items that were updated

**Behavior:**
- Finds all successors (direct and transitive)
- Updates their start/end dates based on predecessor change
- Respects working calendar
- Cascades changes through dependency chain

**Example:**
```typescript
// When design activity finishes early
const changes = await constraintService.propagateDateChanges(
  "activity-design",
  "activity"
);

console.log(`Updated ${changes.length} successor items:`);
for (const change of changes) {
  console.log(`  - ${change.id}: ${change.newStart} to ${change.newEnd}`);
}
```

## Constraint Validation Rules

### Conflict Detection

The service detects and prevents several types of conflicts:

#### 1. Self-Conflict
```
MUST_START_ON: Jan 15
MUST_START_ON: Jan 20
→ Error: Multiple fixed start dates
```

#### 2. Impossible Range
```
START_NO_EARLIER: Feb 1
START_NO_LATER: Jan 15
→ Error: No valid date possible
```

#### 3. Predecessor Violation
```
Activity A: Jan 1-10
Activity B: Jan 5-12 (depends on A)
→ Cannot edit A to end Jan 15 (B must start after Jan 10)
```

#### 4. Successor Violation
```
Activity B: Jan 5-12
Activity C: Jan 15-20 (B depends on it)
→ Cannot edit C to start Jan 20 (B would conflict)
```

#### 5. Duration Invalid
```
Start: Jan 20
End: Jan 15
→ Error: Negative duration
```

#### 6. Calendar Constraint
```
Constraint: Start on Jan 15 (Sunday)
→ Warning: Non-working day
```

## Integration with Other Services

### DependencyService
- Reads dependencies via `dependencyService.get*Predecessors/Successors()`
- Checks that edits don't violate dependency constraints
- Calculates lag requirements in date validation

### SchedulerService
- Uses scheduled dates as baseline
- Validates edits against critical path
- Checks if constraint would change critical path

### CalendarService
- Validates dates against working hours/days
- Respects holidays and non-working periods
- Ensures edited dates can be reached within calendar

### StatusService
- Can track constraint compliance
- Alerts when item at risk of missing constraint date
- Updates tracking status based on constraint deadlines

## Common Patterns

### Hard Deadline

Project has fixed end date:
```typescript
// Set hard deadline
await constraintService.addConstraint(
  "activity-release",
  "activity",
  "FINISH_NO_LATER",
  new Date("2024-03-31")
);

// Set no-slip milestones
await constraintService.addConstraint(
  "activity-design-complete",
  "activity",
  "MUST_FINISH_ON",
  new Date("2024-02-15")
);
```

### Flexible Windows

Activity can happen anytime in range:
```typescript
// Not before component available
await constraintService.addConstraint(
  "activity-testing",
  "activity",
  "START_NO_EARLIER",
  new Date("2024-02-01")
);

// Must finish before release candidate
await constraintService.addConstraint(
  "activity-testing",
  "activity",
  "FINISH_NO_LATER",
  new Date("2024-02-28")
);

// User can edit any date within this range
const range = await constraintService.getValidDateRange(
  "activity-testing",
  "activity"
);
// minStart: Feb 1, maxEnd: Feb 28
```

### Milestone Dates

Fixed dates for key events:
```typescript
// Design review on specific date
await constraintService.addConstraint(
  "activity-design-review",
  "activity",
  "MUST_START_ON",
  new Date("2024-02-10")
);

// Stakeholder meeting
await constraintService.addConstraint(
  "activity-demo",
  "activity",
  "MUST_START_ON",
  new Date("2024-02-20")
);
```

### Constraint Relaxation

Remove constraints when no longer needed:
```typescript
// Project end date changed, remove old constraint
const constraints = await constraintService.getItemConstraints(
  "activity-release"
);
for (const constraint of constraints) {
  if (constraint.constraintType === "FINISH_NO_LATER") {
    await constraintService.removeConstraint(constraint.id);
  }
}

// Add new constraint
await constraintService.addConstraint(
  "activity-release",
  "activity",
  "FINISH_NO_LATER",
  new Date("2024-04-30") // Extended deadline
);
```

## Error Handling

### Common Errors

**Constraint Violation - Predecessor**
```
Cannot start before predecessor finishes (2024-01-25)
```
Fix: Change start to after dependency completes

**Constraint Violation - Hard Deadline**
```
Must finish on 2024-03-31
```
Fix: Choose different date or remove constraint

**Infeasible Date Range**
```
No valid dates possible with current constraints
```
Fix: Remove conflicting constraints

### Best Practices

```typescript
try {
  // Validate first
  const validation = await constraintService.validateDateEdit(
    itemId,
    itemType,
    newStart,
    newEnd
  );

  if (!validation.valid) {
    // Show violations to user
    console.log("Cannot apply changes:");
    for (const violation of validation.violations) {
      console.log(`- ${violation.message}`);

      // Suggest alternative if available
      if (violation.suggestedDate) {
        console.log(`  Try: ${violation.suggestedDate.toISOString()}`);
      }
    }
    return; // Don't apply
  }

  // Apply validated changes
  const result = await constraintService.applyDateEdit(
    itemId,
    itemType,
    newStart,
    newEnd,
    false // Don't force override
  );

  console.log("Date change applied successfully");

} catch (error) {
  console.error("Failed to edit dates:", error);
  // Handle database errors
}
```

## Performance Considerations

### Complexity Analysis

- **Validation:** O(P + S) where P = predecessors, S = successors
- **Propagation:** O(N) where N = affected items
- **Range Calculation:** O(C + P + S) where C = constraints

### Optimization Strategies

1. **Caching:** Cache valid date ranges for items
2. **Lazy Loading:** Load constraints only when needed
3. **Batch Operations:** Update multiple constraints together
4. **Indexes:** Database indexes on itemId, itemType

## Testing

### Integration Test Coverage

Tests validate:
- All 8 constraint types
- Constraint creation and deletion
- Date edit validation
- Conflict detection
- Predecessor/successor constraints
- Propagation of changes
- Valid date range calculation
- Task and activity constraints
- Calendar integration
- Infeasible ranges

**Run Tests:**
```bash
npm test -- src/services/__tests__/constraint.integration.test.ts
```

## Future Enhancements

1. **Constraint Templates:** Pre-built constraint sets (e.g., "Agile Sprint")
2. **Soft Constraints:** Preferences vs hard requirements
3. **Constraint Optimization:** Auto-suggestion of new constraints
4. **Risk Analysis:** Identify constraints at risk of being missed
5. **What-If Analysis:** Simulate constraint changes
6. **Constraint Visualization:** Show constraint impact on timeline
7. **Resource-Based Constraints:** Availability-based constraints

## Summary

The Constraint Service provides:
- **Flexibility:** 8 constraint types for various scenarios
- **Safety:** Prevents invalid date edits
- **Clarity:** Clear error messages and suggestions
- **Integration:** Works with scheduler, dependencies, calendar
- **Performance:** Efficient validation algorithms
- **Usability:** Calculates valid ranges for UI pickers

This foundation enables project managers to enforce deadlines and milestones while preventing schedule conflicts, essential for timeline control and risk management.
