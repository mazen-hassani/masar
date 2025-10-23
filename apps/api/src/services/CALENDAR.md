# Calendar & Working Time Engine Documentation

## Overview

The calendar service provides comprehensive working time calculations for the task management tool. It handles:

- Working day identification (excludes weekends and holidays)
- Working hour tracking with multiple time blocks per day (e.g., morning + afternoon with lunch break)
- Duration calculations between dates respecting working calendar
- Adding working time to dates
- Timezone support with automatic conversion
- Caching for performance optimization
- Holiday management

## Architecture

```
┌───────────────────────────────────────────────────┐
│          Calendar Service                          │
├───────────────────────────────────────────────────┤
│                                                   │
│  ┌─────────────────┐  ┌──────────────────────┐   │
│  │ Configuration   │  │ Holiday Management   │   │
│  │ - Timezone      │  │ - Add/Remove         │   │
│  │ - Working Days  │  │ - Check if Holiday   │   │
│  │ - Working Hours │  │ - Cache invalidation │   │
│  └─────────────────┘  └──────────────────────┘   │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │    Working Time Calculations                 │ │
│  │ - Calculate duration (exclude non-work)      │ │
│  │ - Add working time (snap to working hours)   │ │
│  │ - Get next/previous working time             │ │
│  │ - Get working days in range                  │ │
│  │ - Snap to working time boundaries            │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │    Timezone & Formatting                     │ │
│  │ - Convert between timezones                  │ │
│  │ - Format dates in timezone                   │ │
│  │ - DST handling                               │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
└───────────────────────────────────────────────────┘
        │                       │
        ↓                       ↓
   ┌─────────┐         ┌─────────────┐
   │ Prisma  │         │ Cache Layer │
   │ Client  │         │ (In-Memory) │
   └─────────┘         └─────────────┘
        │                       │
        └───────────┬───────────┘
                    ↓
            ┌──────────────┐
            │  PostgreSQL  │
            │  (Holiday    │
            │   data)      │
            └──────────────┘
```

## Core Types

### CalendarConfig

Configuration for an organisation's working calendar:

```typescript
interface CalendarConfig {
  timezone: string;                // e.g., "UTC", "America/New_York"
  workingDaysOfWeek: string;       // "MTWTF" (Mon-Fri), "MTWTFSS" (7 days)
  workingHours: WorkingHours[];    // Array of time blocks
}

interface WorkingHours {
  start: string;  // "09:00"
  end: string;    // "17:00"
}
```

### WorkingTimeRange

Result of working time calculations:

```typescript
interface WorkingTimeRange {
  start: Date;
  end: Date;
  workingHours: number;  // Total working hours
}
```

## Service Methods

### Configuration Management

#### `getOrganisationCalendar(organisationId: string): Promise<CalendarConfig>`

Gets the calendar configuration for an organisation (cached).

```typescript
const calendar = await calendarService.getOrganisationCalendar("org-123");
// Returns: { timezone: "UTC", workingDaysOfWeek: "MTWTF", workingHours: [...] }
```

**Caching**: Configuration is cached in memory. Clear cache after updates with `invalidateCache()`.

### Holiday Management

#### `getOrganisationHolidays(organisationId: string): Promise<Date[]>`

Gets all holidays for an organisation.

```typescript
const holidays = await calendarService.getOrganisationHolidays("org-123");
// Returns: [Date(2024-12-25), Date(2025-01-01), ...]
```

#### `isHoliday(date: Date, organisationId: string): Promise<boolean>`

Checks if a specific date is a holiday (cached).

```typescript
const isHoliday = await calendarService.isHoliday(
  new Date("2024-12-25"),
  "org-123"
);
// Returns: true
```

### Working Day Detection

#### `isWorkingDay(date: Date, calendar: CalendarConfig, organisationId: string): Promise<boolean>`

Checks if a date is a working day (not weekend, not holiday).

```typescript
const isWorking = await calendarService.isWorkingDay(
  new Date("2024-01-15"), // Monday
  calendar,
  "org-123"
);
// Returns: true (if not a holiday)
```

#### `isWorkingTime(dateTime: Date, calendar: CalendarConfig): boolean`

Checks if a specific time is within working hours.

```typescript
const isWorking = calendarService.isWorkingTime(
  new Date("2024-01-15T10:00:00"), // 10 AM
  calendar
);
// Returns: true (if within 9-13 or 14-18 hours)
```

### Duration Calculations

#### `calculateWorkingDuration(start: Date, end: Date, calendar: CalendarConfig, organisationId: string): Promise<number>`

Calculates working hours between two dates, excluding weekends, holidays, and non-working hours.

```typescript
const hours = await calendarService.calculateWorkingDuration(
  new Date("2024-01-15T09:00:00"), // Monday 9 AM
  new Date("2024-01-17T18:00:00"), // Wednesday 6 PM
  calendar,
  "org-123"
);
// Returns: 16 (8 hours/day × 2 days)
```

**Behavior**:
- Skips weekends
- Skips holidays
- Respects working hour blocks
- Handles lunch breaks correctly

#### `addWorkingTime(start: Date, hours: number, calendar: CalendarConfig, organisationId: string): Promise<Date>`

Adds working hours to a start date, snapping to working time boundaries.

```typescript
const result = await calendarService.addWorkingTime(
  new Date("2024-01-15T09:00:00"), // Monday 9 AM
  10,
  calendar,
  "org-123"
);
// Returns: Date("2024-01-16T11:00:00") - Tuesday 11 AM
// Calculation: Monday 9-13 (4h) + 14-18 (4h) = 8h
//              Tuesday 9-11 (2h) = 2h
//              Total: 10h, ends at Tuesday 11 AM
```

**Features**:
- Automatically skips lunch breaks
- Skips non-working days
- Snaps to next working time if starting outside hours
- Throws error if can't add hours within 365 days

### Time Navigation

#### `getNextWorkingTime(dateTime: Date, calendar: CalendarConfig, organisationId: string): Promise<Date>`

Gets the next working time from a given datetime.

```typescript
const nextWorking = await calendarService.getNextWorkingTime(
  new Date("2024-01-15T18:30:00"), // After hours
  calendar,
  "org-123"
);
// Returns: Date("2024-01-16T09:00:00") - Next day 9 AM
```

#### `getPreviousWorkingTime(dateTime: Date, calendar: CalendarConfig, organisationId: string): Promise<Date>`

Gets the previous working time from a given datetime.

```typescript
const prevWorking = await calendarService.getPreviousWorkingTime(
  new Date("2024-01-15T08:30:00"), // Before hours
  calendar,
  "org-123"
);
// Returns: Date("2024-01-12T18:00:00") - Friday 6 PM
```

### Date Range Operations

#### `getWorkingDaysInRange(start: Date, end: Date, calendar: CalendarConfig, organisationId: string): Promise<Date[]>`

Gets all working days within a date range.

```typescript
const workingDays = await calendarService.getWorkingDaysInRange(
  new Date("2024-01-01"),
  new Date("2024-01-31"),
  calendar,
  "org-123"
);
// Returns: [Date, Date, ...] - All weekdays except holidays
```

#### `getTotalWorkingHoursInDay(calendar: CalendarConfig): number`

Gets the total working hours in a day (sum of all time blocks).

```typescript
const totalHours = calendarService.getTotalWorkingHoursInDay(calendar);
// Calendar: [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "18:00" }]
// Returns: 8
```

### Timezone Operations

#### `convertToTimezone(date: Date, timezone: string): Date`

Converts a date to a specific timezone.

```typescript
const nyTime = calendarService.convertToTimezone(
  new Date("2024-01-15T12:00:00Z"), // UTC noon
  "America/New_York"
);
// Returns: Date representing 7 AM in New York timezone
```

#### `formatInTimezone(date: Date, timezone: string, formatStr?: string): string`

Formats a date in a specific timezone.

```typescript
const formatted = calendarService.formatInTimezone(
  new Date("2024-01-15T12:00:00Z"),
  "America/New_York",
  "yyyy-MM-dd HH:mm:ss"
);
// Returns: "2024-01-15 07:00:00" (New York time)
```

### Snapping

#### `snapToWorkingTime(dateTime: Date, calendar: CalendarConfig, organisationId: string, direction?: "forward" | "backward"): Promise<Date>`

Snaps a datetime to the nearest working time boundary.

```typescript
// Snap forward (to next working time)
const snappedForward = await calendarService.snapToWorkingTime(
  new Date("2024-01-15T08:00:00"), // Before hours
  calendar,
  "org-123",
  "forward"
);
// Returns: Date("2024-01-15T09:00:00")

// Snap backward (to previous working time)
const snappedBackward = await calendarService.snapToWorkingTime(
  new Date("2024-01-15T08:00:00"),
  calendar,
  "org-123",
  "backward"
);
// Returns: Date("2024-01-12T18:00:00")
```

### Cache Management

#### `clearCache(): void`

Clears all cached calendar and holiday data.

```typescript
calendarService.clearCache();
```

#### `invalidateCache(organisationId?: string): void`

Invalidates cache for specific organisation or all if not specified.

```typescript
// Invalidate specific organisation
calendarService.invalidateCache("org-123");

// Invalidate all
calendarService.invalidateCache();
```

## Usage Examples

### Example 1: Calculate Project Duration

```typescript
const calendarService = new CalendarService();
const calendar = await calendarService.getOrganisationCalendar(projectOrgId);

// Calculate working duration
const workingHours = await calendarService.calculateWorkingDuration(
  projectStartDate,
  projectEndDate,
  calendar,
  projectOrgId
);

console.log(`Project will take ${workingHours} working hours`);
```

### Example 2: Schedule Task with Dependencies

```typescript
// Task must start after predecessor + 1 day (lag)
const predecessorEnd = new Date("2024-01-15T18:00:00");

// Add 1 day of working time as lag
const taskStart = await calendarService.addWorkingTime(
  predecessorEnd,
  8, // 1 day = 8 hours
  calendar,
  organisationId
);

// Task should start at next working day 9 AM
```

### Example 3: Handle Multi-Timezone Projects

```typescript
// Organisation A: UTC (9-13, 14-18)
const orgA = await calendarService.getOrganisationCalendar("org-a");

// Team member in New York timezone
const teamMemberTz = "America/New_York";
const meetingTimeUTC = new Date("2024-01-15T14:00:00Z");

// Convert to team member's timezone
const meetingTimeLocal = calendarService.convertToTimezone(
  meetingTimeUTC,
  teamMemberTz
);

// Format for display
const formatted = calendarService.formatInTimezone(
  meetingTimeUTC,
  teamMemberTz,
  "HH:mm z"
);
// Displays: "09:00 EST"
```

### Example 4: Get Available Working Days

```typescript
// Find working days in January for milestone planning
const workingDays = await calendarService.getWorkingDaysInRange(
  new Date("2024-01-01"),
  new Date("2024-01-31"),
  calendar,
  organisationId
);

console.log(`${workingDays.length} working days in January`);
```

## Performance Considerations

### Caching Strategy

The calendar service implements a two-level caching strategy:

1. **Configuration Cache**: Calendar configs are cached in memory and persist until explicitly invalidated
2. **Holiday Cache**: Holidays are cached per organisation to avoid repeated database queries

**Cache Invalidation**:
```typescript
// After updating organisation working hours
calendarService.invalidateCache(organisationId);

// After adding/removing holidays
calendarService.invalidateCache(organisationId);

// Complete reset (for testing)
calendarService.clearCache();
```

### Query Optimization

- Duration calculations use day-level iterations, not minute-level
- Holiday checks are cached after first query
- Working time snapping uses 15-minute intervals

### Timezone Performance

- Timezone conversions are CPU-intensive; cache converted values when possible
- Avoid repeated conversions in loops; convert once and reuse

## Common Patterns

### Check if Task Can Be Completed by Deadline

```typescript
const workingHours = await calendarService.calculateWorkingDuration(
  taskStart,
  deadline,
  calendar,
  orgId
);

const canComplete = workingHours >= taskDuration;
```

### Find Next Available Slot

```typescript
const nextAvailable = await calendarService.getNextWorkingTime(
  requestTime,
  calendar,
  orgId
);
```

### Calculate Realistic Project End Date

```typescript
const estimatedEnd = await calendarService.addWorkingTime(
  projectStart,
  totalEstimatedHours,
  calendar,
  orgId
);
```

## Edge Cases

### Daylight Saving Time (DST)

The service uses `date-fns-tz` which correctly handles DST transitions:

```typescript
// Handles spring forward (2:00 AM → 3:00 AM)
// Handles fall back (2:00 AM occurs twice)
const converted = calendarService.convertToTimezone(date, "America/New_York");
```

### Year Boundary

Duration calculations correctly span year boundaries:

```typescript
const yearEndDuration = await calendarService.calculateWorkingDuration(
  new Date("2023-12-29T09:00:00"), // Friday
  new Date("2024-01-02T18:00:00"), // Tuesday
  calendar,
  orgId
);
// Correctly spans Dec 29, 30 + Jan 1, 2
```

### Leap Years

Date-fns handles leap years automatically:

```typescript
const duration = await calendarService.calculateWorkingDuration(
  new Date("2024-02-28T09:00:00"),
  new Date("2024-03-01T18:00:00"),
  calendar,
  orgId
);
// Correctly includes Feb 29 (2024 is leap year)
```

## Testing

Run calendar tests:

```bash
npm test -- calendar.integration.test.ts
```

Tests cover:
- ✅ Working day detection (weekends, holidays)
- ✅ Working time validation
- ✅ Duration calculations (single/multiple days)
- ✅ Adding working time
- ✅ Working days in range
- ✅ Timezone conversions
- ✅ Cache invalidation
- ✅ Edge cases (DST, year boundaries)

## Future Enhancements

1. **Resource Calendars**: Individual user availability calendars
2. **Recurring Holidays**: Support for annual holidays
3. **Working Time Variations**: Different hours for different days
4. **Capacity Planning**: Respect resource allocation
5. **Public Holidays API**: Integrate external holiday data
6. **Calendar Synchronization**: Sync with Google Calendar, Outlook
7. **Shift Support**: Handle shift-based work schedules
8. **Project-Specific Calendars**: Override organisation calendar per project
