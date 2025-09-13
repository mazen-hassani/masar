# Task Management Tool — Developer-Ready Specification

## 1) Product Overview
A team collaboration tool for planning and tracking projects with a two-level work breakdown:
- **Project → Activities → Tasks**
- **Dependencies** at both **Activity↔Activity** and **Task↔Task** levels (all dependency types).
- **Auto-scheduling** from durations/dependencies using a working calendar, with controlled manual edits.
- **Interactive Gantt**, **Kanban**, **Dashboard & charts**, and **full round-trip import/export with Microsoft Project (MPP & CSV)**.

Primary goals:
- Clear sequence and status of **activities** with strong progress tracking.
- Easy day-to-day execution via **Kanban**.
- Accurate scheduling and baseline comparison.
- Enterprise-grade roles/permissions.

---

## 2) Roles & Permissions

**Organisation**: single organisation, multiple projects.

**Roles**
- **PMO**: Org owner. Full access across all projects; configure calendars, templates, project settings.
- **PM**: Full control on assigned projects (CRUD, scheduling, verification).
- **Team Member**: View their tasks; update task status, % complete, dates within allowed pickers; add comments/attachments on their tasks.
- **Client**: Read-only access to their project(s): dashboards, Gantt (view-only), Kanban (read-only), reports.

**Permissions Matrix (summary)**
- Project CRUD: PMO (all), PM (assigned only).
- Activity/task CRUD: PMO/PM.
- Verification:
  - **Task “Completed → Verified”**: **PM only**.
  - **Activity “Completed → Verified”**: **PM only**, with required checklist completion.
- Calendar & templates: PMO only.
- Import/Export: PMO/PM.
- Comments/attachments: PMO/PM/Assignee; Client read-only.

---

## 3) Data Model (Core Entities)

### 3.1 Project
- `id`, `name`, `type` (from templates), `description`
- `timezone` (override; default = organisation)
- `supportsDependencyTypes`: set of {FS, SS, FF, SF} (configured at project creation)
- `lagLeadEnabled`: boolean
- `autoSchedulingEnabled`: boolean (default **true** at creation; manual edits allowed via constrained pickers)
- `calendarId` (inherits org calendar; time zone can differ)
- `baselineSet[]` (named snapshots)
- `statusSummary` (derived: % complete, counts per tracking bucket)
- `externalRefs` (for MPP/CSV round-trip mapping)
- `createdBy`, `createdAt`, `updatedAt`, `version`

### 3.2 Activity
- `id`, `projectId`, `name`, `description`
- `start`, `end` (manual or auto, but always validated)
- `duration` (derived from start/end using project/org working calendar)
- `status`: {Not Started, In Progress, On Hold, Completed & Verified}
- `percentComplete` (derived: **simple average of child tasks’ %**)
- `trackingStatus` (applies only when **In Progress**): {On Track, At Risk, Off Track} (auto; see §5)
- `verificationChecklist[]` (items with `label`, `isDone`, `checkedBy`, `checkedAt`, `comment?`)
- `ownerId?` (optional)
- `externalRefs` (MPP/CSV mapping)
- `createdBy`, `createdAt`, `updatedAt`, `version`

### 3.3 Task
- `id`, `activityId`, `name`, `description`
- `assigneeUserId` (single assignee)
- `start`, `end` (validated by dependencies & calendar)
- `duration` (derived)
- `status`: {Not Started, In Progress, On Hold, Completed, Verified}
  - **Verified**: PM only, after “Completed”.
- `%Complete` (0–100; editable **only** when status = In Progress)
- `trackingStatus` (only when In Progress; auto; see §5)
- `attachments[]`, `comments[]`
- `externalRefs`
- Audit fields as above.

### 3.4 Dependencies
**Scopes supported**:
- **Activity↔Activity** (within same project)
- **Task↔Task** (across activities within same project)
> *No Task↔Activity links; use summary effects via activities.*

Fields:
- `id`, `projectId`
- `predecessorRef` (type + id)
- `successorRef` (type + id)
- `type`: {FS, SS, FF, SF} (validated by project’s `supportsDependencyTypes`)
- `lag`: integer; unit = minutes/hours/days (enabled only if `lagLeadEnabled`)
- Cycle prevention index & validation metadata.

### 3.5 Calendar & Holidays
- **Organisation Calendar**: `timezone`, `workingDays`, `workingHoursPerDay` (e.g., 09:00–13:00, 14:00–18:00), `holidays[]`.
- **Project** uses org calendar **but may set a different time zone** (hours/days follow org defaults).
- **User vacations**: stored separately for impact analysis (see §10), **do not affect auto-schedule**.

### 3.6 Baselines
- `baselineId`, `name`, `createdAt`, `createdBy`
- For each activity/task at snapshot: `start`, `end`, `duration`, `%Complete`, `status`
- Used in reports, charts, exports.

---

## 4) Scheduling & Editing Rules

### 4.1 Initial Schedule
- On project creation from a **Project Type Template** (see §7), the engine:
  - Instantiates activities & tasks with planned **durations** and **dependencies**.
  - Computes **start/end** based on:
    - Project start date,
    - Dependency graph (topological order),
    - Project/org working calendar,
    - Lags/leads (if enabled).
- A **Baseline “Planned v1”** is auto-captured.

### 4.2 Manual Edits (Constrained)
- Users can edit `start`/`end` on activities/tasks via pickers that:
  - Disable non-working time (per calendar).
  - Disable dates that violate **all** predecessors (type+lag aware).
  - Snap to valid working time boundaries.
- Because invalid dates are unselectable, conflicts cannot be created.
- Changing dates triggers downstream recalculation **only as needed** to maintain validity (local propagation).

### 4.3 Duration Calculation
- `duration` is **derived** from `end - start` in **working time**, not wall-clock (skip non-working hours/holidays).

### 4.4 Dependency Semantics
- **FS**: successor.start ≥ predecessor.end + lag
- **SS**: successor.start ≥ predecessor.start + lag
- **FF**: successor.end ≥ predecessor.end + lag
- **SF**: successor.end ≥ predecessor.start + lag
- Lags may be negative (lead). Units configurable (min/hr/day).

### 4.5 Roll-ups
- **Activity %Complete** = **simple average** of child tasks’ `%Complete`.
- **Project %Complete**: weighted by **activity durations** (derived) *or* simple average — **default: duration-weighted** (for project-level only).

---

## 5) Tracking Status (Auto)

Applies **only when status = In Progress**.

Per item (task or activity):
- Let `D = working duration`.
- Let `thresholdPct` ∈ [0, 5%] (configurable per project).
- Let `grace = ceil(D × thresholdPct)`.
- **On Track**: `today ≤ end`
- **At Risk**: `end < today ≤ end + grace`
- **Off Track**: `today > end + grace`

Notes:
- Items not **In Progress** show `trackingStatus = N/A`.
- Future extension: optional baseline variance rules; not required now.

---

## 6) Status Lifecycle

**Tasks**
- Not Started → In Progress → (On Hold ↔ In Progress) → Completed → **Verified (PM only)**

**Activities**
- Not Started → In Progress → (On Hold ↔ In Progress) → Completed → **Verified (PM only, requires checklist complete)**

Validation:
- Activity can’t be set **Verified** if any child task not **Verified**.
- When a task flips to **Verified**, PM may be prompted to tick relevant activity checklist items.

---

## 7) Templates (Project Types)

Each **Project Type Template** includes:
- **Activities** with default names, descriptions, planned **durations**, and **inter-activity dependencies** (with type & lag).
- **Tasks** under each activity with default names, durations, and **task-level dependencies**.
- **Activity verification checklist** (array of items).

Runtime:
- On project creation: choose a template + project start date → instantiate then auto-schedule → capture Baseline v1.

---

## 8) UI & UX

### 8.1 Dashboard
- **Activity sequence** (ordered by start date): name, status, `%Complete`, trackingStatus, dates.
- **KPI tiles**: Project %Complete, On Track / At Risk / Off Track counts.
- **Charts** (first wave):
  - Progress by activity (bar).
  - On-track/At-risk/Off-track distribution (donut).
  - % complete vs baseline (line/area) — optional if baseline exists.

### 8.2 Interactive Gantt
- Zoom: day/week/month.
- Drag to move/resize tasks & activities (constrained to valid dates).
- Draw/edit dependencies (only allowed types for the project).
- Snap to working calendar.
- Baseline overlay (ghost bars).
- **Click on bar → popup**: core fields (name, dates, duration, status, tracking, % complete, assignee), quick actions (change status, % complete), link to detail panel.
- Critical path highlighting (optional later).

### 8.3 Kanban
- Columns exactly match statuses: **Not Started | In Progress | On Hold | Completed & Verified**.
- Cards represent **Activities** (primary). Toggle to show **Tasks** within each activity column if needed.
- Cards show: name, assignee (task), `%Complete`, due/end date, tracking badge.

### 8.4 Project Settings
- Choose supported dependency types; enable/disable lag/lead.
- Set `thresholdPct` for At Risk (0–5%).
- Time zone override (read-only display of org working days/hours/holidays).
- Import/Export area (MPP/CSV).

### 8.5 Vacation Impact View (read-only)
- Calendar overlay of user vacations against current schedule (heatmap/list of potential overlaps). Generates alerts but does **not** change dates.

---

## 9) Import / Export (Full Round-Trip)

### 9.1 MPP
- **Round-trip** via MPP (library required).
- **Mapping**
  - **Activity ↔ Summary Task**
  - **Task ↔ Task**
  - Dependencies: all types + lag/lead.
  - Dates, durations (working), % complete, statuses (mapped to text field or flags), baselines (Baseline0).
  - Assignee ↔ Resource (single assignment, 100% units).
  - Calendar: project calendar; time zone best-effort (MPP stores working time; capture on import).
- **IDs**
  - Maintain `externalRefs.mppUid` on import; on export, preserve mapping to avoid duplication.
- **Unsupported**: custom fields (N/A).

> **Implementation note**: choose a robust MPP lib (e.g., MPXJ in JVM). If MPP write is constrained, support **MSP XML** as an internal pivot while still delivering MPP I/O through the library.

### 9.2 CSV
Provide two CSV types with headers:

**Activities.csv**
- `ExternalID, Name, Description, Start, End, Status, PercentComplete, ParentExternalID(empty), IsSummary(true), Checklist|PipeDelimited`
- Dependencies in separate file (see below).

**Tasks.csv**
- `ExternalID, ActivityExternalID, Name, Description, AssigneeEmail, Start, End, Status, PercentComplete`

**Dependencies.csv**
- `FromExternalID, ToExternalID, Type(FS/SS/FF/SF), Lag(unit)`

**Calendars.csv** (optional export)
- `Timezone, WorkingDays, WorkingHours, Holidays`

Round-trip:
- On import, match by `ExternalID` if present; otherwise create and assign new IDs, emitting a reconciliation report.
- Validate dependency graph (no cycles); invalid rows rejected with line numbers.

---

## 10) Notifications & Impact
- Daily digest to PM: items turning **At Risk** or **Off Track** in the next 24–48h.
- Vacation overlaps: list tasks whose working window intersects assignee vacation (informational).

---

## 11) Validation & Error Handling

**Front-end**
- Date pickers hard-block invalid selections (non-working time, dependency violations).
- Inline badges for unmet verification rules (e.g., “All tasks must be Verified before verifying activity”).
- CSV import wizard: pre-validate; show row errors, allow partial import with review.

**Back-end**
- **Dependency cycle detection** on write (Kahn’s algorithm).
- **Optimistic locking** (`version` per row; reject concurrent edits with 409 + merge hint).
- **Consistency guards**:
  - Don’t allow activity Verified if any child task not Verified.
  - `%Complete` editable only when status = In Progress (else 422).
- **Error schema**
  ```json
  { "error": { "code": "DEPENDENCY_CYCLE", "message": "...", "details": {...} } }
  ```
  Common codes: `VALIDATION_FAILED`, `DEPENDENCY_CYCLE`, `CONFLICT`, `FORBIDDEN`, `NOT_FOUND`, `IMPORT_SCHEMA_ERROR`.

---

## 12) Architecture (Recommended)

**Frontend**
- React + TypeScript.
- State: React Query + URL state for filters.
- Gantt: a proven interactive Gantt component (drag, deps, baselines, calendar snapping).
- Charts: Recharts or ECharts.
- AuthZ in UI based on role claims.

**Backend**
- **Java + Spring Boot** (fits team expertise).
- Modules:
  - `projects` (CRUD, baselines, templates),
  - `schedule` (dependency engine, calendar math),
  - `importexport` (MPP/CSV),
  - `security` (roles, permissions),
  - `notifications`.
- Scheduling engine: pure service with deterministic working-time calculations; topological ordering; partial recalculation.
- **PostgreSQL** as primary DB.
- **MPXJ** (or equivalent) for MPP I/O.
- Time handling: all stored in UTC; render per project timezone.

**API (sample)**
- `GET /projects/:id/dashboard`
- `POST /projects` (templateId, start, settings)
- `POST /projects/:id/baselines`
- `GET/PUT /activities/:id` | `GET/PUT /tasks/:id`
- `POST /dependencies` | `DELETE /dependencies/:id`
- `POST /import/mpp` | `GET /export/mpp`
- `POST /import/csv` | `GET /export/csv`
- `GET /impact/vacations?projectId=...`

**Security**
- JWT auth; role claims: PMO/PM/Member/Client; per-project ACLs.
- Row-level checks in service layer.

**Auditing**
- Append-only audit log for changes to dates, statuses, verifications, and dependencies (who, when, before/after).

---

## 13) Testing Strategy

**Unit Tests**
- Calendar math (working duration across weekends/holidays).
- Dependency constraint evaluation for FS/SS/FF/SF + lags/leads.
- Tracking status thresholds.
- Activity % roll-up (simple average) correctness.
- Cycle detection.

**Integration Tests**
- Scheduling propagation after edits.
- Import/Export round-trip (MPP & CSV) preserving IDs, dates, deps, baselines.
- Permissions (role-based access) across endpoints.
- Optimistic locking with concurrent updates.

**E2E (Cypress/Playwright)**
- Create project from template → auto-schedule → baseline.
- Drag in Gantt to move/resize; create dependencies.
- Kanban moves respecting statuses and verification rules.
- CSV import with row-level error display and retry.
- Vacation impact view.

**Performance**
- Projects with: 200 activities / 2,000 tasks → <1s dependency recompute on local edit; <3s initial schedule.
- Import of 5k rows CSV under 10s with streaming validation.

**Non-Functional**
- Time-zone correctness tests around DST changes.
- Accessibility (WCAG AA) for Gantt/Kanban interactions.

---

## 14) Implementation Details & Algorithms

**Working Duration**
- Compute via segmenting [start, end] into working intervals per calendar; sum minutes.

**Date Picker Constraints**
- For an item, compute **earliest feasible start/end** given predecessors.
- Disable all dates/times outside feasible ranges and non-working slots.

**Partial Recalc**
- On edit, recompute successors reachable in the dependency graph until constraints satisfied. Keep manual edits of unrelated chains unchanged.

**Baseline Overlay**
- Store baseline dates; render ghost bars on Gantt; compute variance = (current end − baseline end) in working time.

---

## 15) Out of Scope (v1)
- Resource leveling & capacity planning.
- Multi-org, cross-project dependencies.
- Custom fields.
- Automation rules/webhooks (beyond notifications described).

---

## 16) Delivery Checklist (v1)
- [ ] Org calendar + project TZ override.
- [ ] Roles & permissions enforced server-side.
- [ ] Templates CRUD + instantiate.
- [ ] Scheduling engine (FS/SS/FF/SF + lag/lead).
- [ ] Constrained date pickers.
- [ ] Task verification (PM) + Activity verification with checklist & gating.
- [ ] Activity % roll-up (simple average).
- [ ] Auto tracking status with configurable threshold.
- [ ] Interactive Gantt (drag, deps, baseline overlay, popups).
- [ ] Kanban = statuses.
- [ ] Dashboard + charts (3 initial).
- [ ] MPP & CSV full round-trip with stable external IDs.
- [ ] Vacations impact view (informational only).
- [ ] Auditing, optimistic locking, API error schema.
- [ ] Tests: unit/integration/E2E/perf.
