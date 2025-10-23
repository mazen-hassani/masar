# Project Templates & Instantiation Documentation

## Overview

The template system allows organisations to define reusable project structures and quickly create new projects from them. Templates include:

- **Activities**: Major phases or work packages
- **Tasks**: Specific work items within activities
- **Dependencies**: Relationships between activities/tasks with types (FS, SS, FF, SF)
- **Estimated Duration**: Automatic calculation of project timeline
- **Validation**: Cycle detection and structure validation

## Use Cases

### 1. Standardized Project Types
Create templates for common project types (e.g., Website Redesign, Mobile App Launch, Product Release) and reuse them across the organisation.

### 2. Process Improvement
Refine templates based on past projects to improve estimation accuracy and reduce planning time.

### 3. Onboarding
New project managers can use existing templates to ensure consistent project structure.

### 4. Cross-Project Consistency
Ensure all projects follow the same workflow and dependencies.

## Architecture

```
┌─────────────────────────────────────────────┐
│        Template Management System             │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │  TemplateService                      │  │
│  │  - Create/Read/Update/Delete         │  │
│  │  - Validate structure                │  │
│  │  - Clone projects to templates       │  │
│  │  - Search & filter                   │  │
│  └──────────────────────────────────────┘  │
│                  ↓                          │
│  ┌──────────────────────────────────────┐  │
│  │  InstantiationService                │  │
│  │  - Create project from template      │  │
│  │  - Auto-calculate dates              │  │
│  │  - Create activities & tasks         │  │
│  │  - Set up dependencies               │  │
│  │  - Preview instantiation             │  │
│  └──────────────────────────────────────┘  │
│                  ↓                          │
│  ┌──────────────────────────────────────┐  │
│  │  Calendar Service Integration         │  │
│  │  - Respect working calendar          │  │
│  │  - Handle timezones                  │  │
│  │  - Snap dates to working time        │  │
│  └──────────────────────────────────────┘  │
│                                             │
└─────────────────────────────────────────────┘
        ↓                       ↓
    Templates               Projects
    (JSON store)        (Real database)
```

## Data Types

### ProjectTemplate

```typescript
interface ProjectTemplate {
  id: string;                           // Unique template ID
  name: string;                         // e.g., "Website Redesign"
  description?: string;
  organisationId: string;               // Belongs to organisation
  activities: TemplateActivity[];       // Phases/work packages
  tasks: TemplateTask[];               // Specific work items
  dependencies: TemplateDependency[];  // Relationships
  estimatedDurationHours: number;      // Total project duration
  createdAt: Date;
  updatedAt: Date;
}
```

### TemplateActivity

```typescript
interface TemplateActivity {
  id: string;                     // Unique within template
  name: string;                   // e.g., "Design Phase"
  description?: string;
  durationHours: number;          // Working hours for activity
  order: number;                  // Execution order
  checklistItems?: string[];      // Verification items (JSON array)
}
```

### TemplateTask

```typescript
interface TemplateTask {
  id: string;                     // Unique within template
  activityId: string;             // Parent activity ID
  name: string;                   // e.g., "Create Wireframes"
  description?: string;
  durationHours: number;          // Working hours for task
  requiredRole?: string;          // e.g., "Designer", "Developer" (future)
}
```

### TemplateDependency

```typescript
interface TemplateDependency {
  id: string;
  fromId: string;                 // Activity or Task ID
  toId: string;                   // Activity or Task ID
  type: DependencyType;           // FS, SS, FF, SF
  lag?: number;                   // Optional delay in hours
  fromType: "activity" | "task";
  toType: "activity" | "task";
}
```

## Service Methods

### TemplateService

#### `createTemplate(data): Promise<ProjectTemplate>`

Creates a new project template with validation.

```typescript
const template = await templateService.createTemplate({
  name: "Website Redesign",
  description: "Complete website overhaul with design, dev, and QA",
  organisationId: "org-123",
  activities: [
    {
      id: "design",
      name: "Design Phase",
      durationHours: 40,
      order: 1,
      checklistItems: ["Wireframes approved", "Design system created"],
    },
    {
      id: "dev",
      name: "Development Phase",
      durationHours: 80,
      order: 2,
    },
    {
      id: "qa",
      name: "QA & Testing",
      durationHours: 20,
      order: 3,
    },
  ],
  tasks: [
    { id: "wire", activityId: "design", name: "Wireframes", durationHours: 16 },
    { id: "visual", activityId: "design", name: "Visual Design", durationHours: 24 },
    { id: "frontend", activityId: "dev", name: "Frontend Dev", durationHours: 40 },
    { id: "backend", activityId: "dev", name: "Backend Dev", durationHours: 40 },
    { id: "testing", activityId: "qa", name: "Test Suite", durationHours: 20 },
  ],
  dependencies: [
    {
      id: "d1",
      fromId: "design",
      toId: "dev",
      type: DependencyType.FS,
      fromType: "activity",
      toType: "activity",
    },
    {
      id: "d2",
      fromId: "dev",
      toId: "qa",
      type: DependencyType.FS,
      fromType: "activity",
      toType: "activity",
    },
  ],
});
```

**Validation**:
- Template name is required
- All activity IDs must be unique
- All task IDs must be unique
- Tasks must reference valid activities
- No circular dependencies allowed
- No self-references allowed

#### `getTemplate(templateId): Promise<ProjectTemplate | null>`

Retrieves a template by ID.

```typescript
const template = await templateService.getTemplate("template-123");
```

#### `getTemplatesByOrganisation(organisationId, params): Promise<PaginatedResponse>`

Gets all templates for an organisation with pagination.

```typescript
const result = await templateService.getTemplatesByOrganisation(
  "org-123",
  { skip: 0, take: 20, sortBy: "name", sortOrder: "asc" }
);
// Returns: { data: [...], total: 5, skip: 0, take: 20, hasMore: false }
```

#### `updateTemplate(templateId, data): Promise<ProjectTemplate>`

Updates a template's structure and metadata.

```typescript
const updated = await templateService.updateTemplate("template-123", {
  name: "Website Redesign v2",
  description: "Updated with new requirements",
  activities: [...],
  dependencies: [...],
});
```

#### `deleteTemplate(templateId): Promise<void>`

Deletes a template permanently.

```typescript
await templateService.deleteTemplate("template-123");
```

#### `searchTemplates(organisationId, search, params): Promise<PaginatedResponse>`

Searches templates by name or description.

```typescript
const results = await templateService.searchTemplates(
  "org-123",
  "website",
  { take: 10 }
);
// Returns templates containing "website" in name or description
```

#### `cloneProjectAsTemplate(projectId, templateName): Promise<ProjectTemplate>`

Converts an existing project to a reusable template.

```typescript
const template = await templateService.cloneProjectAsTemplate(
  "project-456",
  "Project ABC as Template"
);
// Creates a template based on the project's structure
```

#### `validateTemplateStructure(data): boolean`

Validates template structure without saving.

```typescript
const isValid = templateService.validateTemplateStructure({
  name: "Template",
  organisationId: "org-123",
  activities: [...],
  tasks: [...],
});
```

### InstantiationService

#### `instantiateProject(template, options): Promise<InstantiationResult>`

Creates a real project from a template.

```typescript
const result = await instantiationService.instantiateProject(template, {
  projectName: "Website Redesign - Client ABC",
  startDate: new Date("2024-02-15"),
  ownerUserId: "user-789",
  memberUserIds: ["dev-1", "dev-2", "designer-1"],
  timezone: "America/New_York",
});

// Returns:
// {
//   projectId: "proj-123",
//   activityCount: 3,
//   taskCount: 5,
//   dependencyCount: 2,
//   totalDurationHours: 140,
//   estimatedEndDate: Date("2024-04-12")
// }
```

**Behavior**:
- Creates activities in order with calculated dates
- Creates tasks within activities
- Sets up dependencies between items
- Respects working calendar for date calculations
- Assigns team members if provided

**Date Calculation**:
- Activities scheduled sequentially (end of one = start of next)
- Tasks distributed within their activity date ranges
- Respects working hours (skips weekends/holidays)
- Uses organisation timezone

#### `previewInstantiation(template, options): Promise<PreviewResult>`

Shows what instantiation would create without actually creating it.

```typescript
const preview = await instantiationService.previewInstantiation(template, {
  projectName: "Website Redesign - Client ABC",
  startDate: new Date("2024-02-15"),
  ownerUserId: "user-789",
});

// Returns:
// {
//   summary: {
//     projectId: "PREVIEW",
//     activityCount: 3,
//     taskCount: 5,
//     dependencyCount: 2,
//     totalDurationHours: 140,
//     estimatedEndDate: Date("2024-04-12")
//   },
//   activities: [
//     {
//       name: "Design Phase",
//       startDate: Date("2024-02-15"),
//       endDate: Date("2024-03-15"),
//       taskCount: 2
//     },
//     ...
//   ]
// }
```

**Use Case**: Show project timeline to stakeholders before creating.

#### `validateTemplateForOrganisation(template, organisationId): Promise<ValidationResult>`

Checks if template can be instantiated in organisation.

```typescript
const validation = await instantiationService.validateTemplateForOrganisation(
  template,
  "org-123"
);

if (validation.valid) {
  // Template is good to use
} else {
  console.log("Issues:", validation.errors);
  // ["Organisation not found", "Template belongs to different organisation"]
}
```

#### `getRecommendedTemplates(organisationId, characteristics): Promise<ProjectTemplate[]>`

Gets templates ranked by project characteristics.

```typescript
const recommendations = await instantiationService.getRecommendedTemplates(
  "org-123",
  {
    estimatedDurationHours: 120,
    complexity: "complex",
  }
);
// Returns templates sorted by similarity to characteristics
```

## Usage Examples

### Example 1: Create and Use a Template

```typescript
// Step 1: Define template
const template = await templateService.createTemplate({
  name: "Mobile App Launch",
  organisationId: "org-123",
  activities: [
    { id: "design", name: "Design", durationHours: 40, order: 1 },
    { id: "dev", name: "Development", durationHours: 80, order: 2 },
    { id: "test", name: "Testing", durationHours: 20, order: 3 },
  ],
  tasks: [
    { id: "wire", activityId: "design", name: "Wireframes", durationHours: 20 },
    { id: "visual", activityId: "design", name: "UI", durationHours: 20 },
    { id: "ios", activityId: "dev", name: "iOS Dev", durationHours: 40 },
    { id: "android", activityId: "dev", name: "Android Dev", durationHours: 40 },
    { id: "qa", activityId: "test", name: "QA", durationHours: 20 },
  ],
});

// Step 2: Preview before creating
const preview = await instantiationService.previewInstantiation(template, {
  projectName: "App Launch - Company XYZ",
  startDate: new Date("2024-03-01"),
  ownerUserId: "pm-123",
});

console.log(`Project will take ${preview.summary.totalDurationHours} hours`);
console.log(`Estimated end date: ${preview.summary.estimatedEndDate}`);

// Step 3: Create project from template
const result = await instantiationService.instantiateProject(template, {
  projectName: "App Launch - Company XYZ",
  startDate: new Date("2024-03-01"),
  ownerUserId: "pm-123",
  memberUserIds: ["designer-1", "ios-dev-1", "android-dev-1", "qa-1"],
});

console.log(`Created project ${result.projectId}`);
```

### Example 2: Clone Existing Project

```typescript
// Successful project becomes template for future similar projects
const template = await templateService.cloneProjectAsTemplate(
  "project-successful",
  "Successful Project as Template"
);

// Later, create similar project from template
const newProject = await instantiationService.instantiateProject(template, {
  projectName: "New Similar Project",
  startDate: new Date("2024-04-01"),
  ownerUserId: "pm-456",
});
```

### Example 3: Template with Dependencies

```typescript
const template = await templateService.createTemplate({
  name: "Complex Project",
  organisationId: "org-123",
  activities: [
    { id: "research", name: "Research", durationHours: 20, order: 1 },
    { id: "design", name: "Design", durationHours: 40, order: 2 },
    { id: "dev", name: "Development", durationHours: 60, order: 3 },
    { id: "qa", name: "QA", durationHours: 20, order: 4 },
  ],
  tasks: [
    { id: "t1", activityId: "research", name: "Research", durationHours: 20 },
    { id: "t2", activityId: "design", name: "Design", durationHours: 40 },
    { id: "t3", activityId: "dev", name: "Development", durationHours: 60 },
    { id: "t4", activityId: "qa", name: "Testing", durationHours: 20 },
  ],
  dependencies: [
    // Research must complete before design
    {
      id: "d1",
      fromId: "research",
      toId: "design",
      type: DependencyType.FS,
      fromType: "activity",
      toType: "activity",
    },
    // Design must complete before dev
    {
      id: "d2",
      fromId: "design",
      toId: "dev",
      type: DependencyType.FS,
      fromType: "activity",
      toType: "activity",
    },
    // Dev must complete before QA
    {
      id: "d3",
      fromId: "dev",
      toId: "qa",
      type: DependencyType.FS,
      fromType: "activity",
      toType: "activity",
    },
  ],
});

// When instantiated, dates are calculated respecting dependencies
```

## Validation & Error Handling

### Validation Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Template name is required" | Name is empty or missing | Provide non-empty name |
| "Activity IDs must be unique" | Duplicate activity ID | Use unique IDs for each activity |
| "Task references invalid activity" | Task.activityId doesn't exist | Use valid activity ID |
| "Template has circular dependencies" | Circular dependency detected | Remove cycle or restructure |
| "Dependency cannot be self-referential" | Task depends on itself | Remove self-dependency |
| "Cannot create dependency on itself" | Instantiation fails | Check template dependencies |

### Validation Examples

```typescript
try {
  await templateService.createTemplate({
    name: "Template",
    organisationId: "org-123",
    activities: [
      { id: "same", name: "Activity 1", durationHours: 10, order: 1 },
      { id: "same", name: "Activity 2", durationHours: 10, order: 2 }, // ERROR: duplicate ID
    ],
    tasks: [],
  });
} catch (error) {
  console.log(error.message); // "Activity IDs must be unique"
}
```

## Best Practices

### 1. Organize by Project Type
Create templates for each major project type (Website, App, Backend Service, etc.)

```typescript
await templateService.createTemplate({
  name: "Website Project Template",
  description: "Standard template for website projects",
  // ...
});

await templateService.createTemplate({
  name: "Mobile App Template",
  description: "Standard template for mobile apps",
  // ...
});
```

### 2. Realistic Duration Estimates
Base template durations on historical project data.

```typescript
// Good: Based on past similar projects
const activities = [
  { id: "design", name: "Design", durationHours: 40 }, // 5 working days
  { id: "dev", name: "Development", durationHours: 80 }, // 10 working days
];

// Avoid: Generic or inflated estimates
const bad = [
  { id: "design", name: "Design", durationHours: 100 }, // Too high
];
```

### 3. Use Logical Dependencies
Dependencies should reflect actual workflow constraints.

```typescript
// Good: Design must finish before development
{
  fromId: "design",
  toId: "dev",
  type: DependencyType.FS, // Finish-to-Start
}

// Good: Testing can start once development starts
{
  fromId: "dev",
  toId: "qa",
  type: DependencyType.SS, // Start-to-Start
}
```

### 4. Include Verification Items
Add checklist items for quality assurance.

```typescript
{
  id: "design",
  name: "Design Phase",
  durationHours: 40,
  order: 1,
  checklistItems: [
    "Client approved wireframes",
    "Design system documented",
    "Design handed off to dev team",
  ],
}
```

### 5. Clone Successful Projects
After completing successful projects, clone them as templates.

```typescript
// After project completes successfully
const template = await templateService.cloneProjectAsTemplate(
  "project-success-123",
  "Successful Delivery Template"
);

// Use for future similar projects
```

## API Integration

### Endpoints (to be implemented)

```
POST /api/templates
  Request: { name, description, activities, tasks, dependencies, organisationId }
  Response: ProjectTemplate

GET /api/templates/:id
  Response: ProjectTemplate

GET /api/organisations/:orgId/templates
  Query: { skip?, take?, sortBy?, sortOrder? }
  Response: PaginatedResponse<ProjectTemplate>

PATCH /api/templates/:id
  Request: Partial<ProjectTemplate>
  Response: ProjectTemplate

DELETE /api/templates/:id
  Response: 200 OK

GET /api/templates/:id/preview-instantiation
  Query: { projectName, startDate, ownerUserId, timezone? }
  Response: InstantiationResult preview

POST /api/templates/:id/instantiate
  Request: { projectName, startDate, ownerUserId, memberUserIds?, timezone? }
  Response: InstantiationResult
```

## Testing

Run template and instantiation tests:

```bash
npm test -- template-instantiation.integration.test.ts
```

Tests cover:
- ✅ Template creation and validation
- ✅ Cycle detection in dependencies
- ✅ Project instantiation from template
- ✅ Date calculation with calendar
- ✅ Preview instantiation
- ✅ Clone project as template
- ✅ Search and retrieval
- ✅ Update and delete operations

## Future Enhancements

1. **Template Versions**: Track template changes over time
2. **Template Sharing**: Share templates across organisations
3. **Template Library**: Public repository of templates
4. **AI-Assisted Templates**: Auto-generate templates from past projects
5. **Template Parameters**: Customizable inputs during instantiation
6. **Role-Based Tasks**: Assign tasks to specific roles during instantiation
7. **Budget Templates**: Include estimated costs and resources
8. **Timeline Optimization**: Auto-adjust dates based on resource availability
9. **Template Analytics**: Track which templates are used most
10. **Integration Templates**: Pre-configured integrations with external tools
