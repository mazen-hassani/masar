// ABOUTME: Integration tests for constraint management and date edit validation
// ABOUTME: Tests manual constraints, date editing, and conflict detection

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  resetDatabase,
  disconnectDatabase,
  createTestOrganisation,
  createTestUser,
  createTestProject,
} from "@/lib/test-utils";
import { constraintService } from "../constraint.service";
import { activityService } from "../activity.service";
import { taskService } from "../task.service";
import { dependencyService } from "../dependency.service";
import { DependencyType } from "@prisma/client";

describe("Constraint Management Service", () => {
  let organisationId: string;
  let userId: string;
  let projectId: string;

  beforeEach(async () => {
    await resetDatabase();

    const org = await createTestOrganisation();
    organisationId = org.id;

    const user = await createTestUser(organisationId);
    userId = user.id;

    const project = await createTestProject(organisationId, userId);
    projectId = project.id;
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe("Constraint Creation & Management", () => {
    let activityId: string;

    beforeEach(async () => {
      const activity = await activityService.create({
        projectId,
        name: "Test Activity",
        startDate: new Date("2024-01-15"),
        endDate: new Date("2024-01-22"),
        status: "NOT_STARTED",
      });
      activityId = activity.id;
    });

    it("should create MUST_START_ON constraint", async () => {
      const constraintDate = new Date("2024-01-20");
      const constraint = await constraintService.addConstraint(
        activityId,
        "activity",
        "MUST_START_ON",
        constraintDate
      );

      expect(constraint).toBeDefined();
      expect(constraint.itemId).toBe(activityId);
      expect(constraint.constraintType).toBe("MUST_START_ON");
      expect(constraint.constraintDate.getTime()).toBe(constraintDate.getTime());
    });

    it("should create MUST_FINISH_ON constraint", async () => {
      const constraintDate = new Date("2024-01-25");
      const constraint = await constraintService.addConstraint(
        activityId,
        "activity",
        "MUST_FINISH_ON",
        constraintDate
      );

      expect(constraint.constraintType).toBe("MUST_FINISH_ON");
    });

    it("should create START_NO_EARLIER constraint", async () => {
      const constraintDate = new Date("2024-01-18");
      const constraint = await constraintService.addConstraint(
        activityId,
        "activity",
        "START_NO_EARLIER",
        constraintDate
      );

      expect(constraint.constraintType).toBe("START_NO_EARLIER");
    });

    it("should create START_NO_LATER constraint", async () => {
      const constraintDate = new Date("2024-01-20");
      const constraint = await constraintService.addConstraint(
        activityId,
        "activity",
        "START_NO_LATER",
        constraintDate
      );

      expect(constraint.constraintType).toBe("START_NO_LATER");
    });

    it("should create FINISH_NO_EARLIER constraint", async () => {
      const constraintDate = new Date("2024-01-23");
      const constraint = await constraintService.addConstraint(
        activityId,
        "activity",
        "FINISH_NO_EARLIER",
        constraintDate
      );

      expect(constraint.constraintType).toBe("FINISH_NO_EARLIER");
    });

    it("should create FINISH_NO_LATER constraint", async () => {
      const constraintDate = new Date("2024-01-25");
      const constraint = await constraintService.addConstraint(
        activityId,
        "activity",
        "FINISH_NO_LATER",
        constraintDate
      );

      expect(constraint.constraintType).toBe("FINISH_NO_LATER");
    });

    it("should get constraints for an item", async () => {
      await constraintService.addConstraint(
        activityId,
        "activity",
        "START_NO_EARLIER",
        new Date("2024-01-18")
      );

      await constraintService.addConstraint(
        activityId,
        "activity",
        "FINISH_NO_LATER",
        new Date("2024-01-25")
      );

      const constraints = await constraintService.getItemConstraints(activityId);

      expect(constraints.length).toBe(2);
    });

    it("should remove constraint", async () => {
      const constraint = await constraintService.addConstraint(
        activityId,
        "activity",
        "START_NO_EARLIER",
        new Date("2024-01-18")
      );

      const removed = await constraintService.removeConstraint(constraint.id);
      expect(removed.id).toBe(constraint.id);

      const constraints = await constraintService.getItemConstraints(activityId);
      expect(constraints.length).toBe(0);
    });

    it("should get constraints for project", async () => {
      const activity2 = await activityService.create({
        projectId,
        name: "Activity 2",
        startDate: new Date("2024-01-23"),
        endDate: new Date("2024-01-30"),
        status: "NOT_STARTED",
      });

      await constraintService.addConstraint(
        activityId,
        "activity",
        "START_NO_EARLIER",
        new Date("2024-01-18")
      );

      await constraintService.addConstraint(
        activity2.id,
        "activity",
        "FINISH_NO_LATER",
        new Date("2024-02-05")
      );

      const projectConstraints = await constraintService.getProjectConstraints(projectId);

      expect(projectConstraints.length).toBe(2);
    });
  });

  describe("Date Edit Validation", () => {
    let activity1Id: string;
    let activity2Id: string;

    beforeEach(async () => {
      const activity1 = await activityService.create({
        projectId,
        name: "Activity 1",
        startDate: new Date("2024-01-15"),
        endDate: new Date("2024-01-22"),
        status: "NOT_STARTED",
      });
      activity1Id = activity1.id;

      const activity2 = await activityService.create({
        projectId,
        name: "Activity 2",
        startDate: new Date("2024-01-23"),
        endDate: new Date("2024-01-30"),
        status: "NOT_STARTED",
      });
      activity2Id = activity2.id;
    });

    it("should validate valid date edit", async () => {
      const validation = await constraintService.validateDateEdit(
        activity1Id,
        "activity",
        new Date("2024-01-15"),
        new Date("2024-01-22")
      );

      expect(validation.valid).toBe(true);
      expect(validation.violations.length).toBe(0);
    });

    it("should reject edit with negative duration", async () => {
      const validation = await constraintService.validateDateEdit(
        activity1Id,
        "activity",
        new Date("2024-01-22"),
        new Date("2024-01-15")
      );

      expect(validation.valid).toBe(false);
      expect(validation.violations).toContainEqual(
        expect.objectContaining({
          violationType: "DURATION_INVALID",
        })
      );
    });

    it("should validate MUST_START_ON constraint violation", async () => {
      const constraintDate = new Date("2024-01-20");
      await constraintService.addConstraint(
        activity1Id,
        "activity",
        "MUST_START_ON",
        constraintDate
      );

      const validation = await constraintService.validateDateEdit(
        activity1Id,
        "activity",
        new Date("2024-01-15"), // Different from constraint
        new Date("2024-01-22")
      );

      expect(validation.valid).toBe(false);
      expect(validation.violations.some((v) => v.violationType === "HARD_CONSTRAINT")).toBe(true);
    });

    it("should validate START_NO_EARLIER constraint violation", async () => {
      await constraintService.addConstraint(
        activity1Id,
        "activity",
        "START_NO_EARLIER",
        new Date("2024-01-20")
      );

      const validation = await constraintService.validateDateEdit(
        activity1Id,
        "activity",
        new Date("2024-01-15"), // Earlier than constraint
        new Date("2024-01-22")
      );

      expect(validation.valid).toBe(false);
    });

    it("should validate START_NO_LATER constraint violation", async () => {
      await constraintService.addConstraint(
        activity1Id,
        "activity",
        "START_NO_LATER",
        new Date("2024-01-18")
      );

      const validation = await constraintService.validateDateEdit(
        activity1Id,
        "activity",
        new Date("2024-01-20"), // Later than constraint
        new Date("2024-01-27")
      );

      expect(validation.valid).toBe(false);
    });

    it("should detect predecessor constraint violation", async () => {
      // Create dependency: Activity1 -> Activity2
      await dependencyService.createActivityDependency({
        predecessorId: activity1Id,
        successorId: activity2Id,
        type: DependencyType.FS,
      });

      // Try to extend Activity1 past Activity2 start
      const validation = await constraintService.validateDateEdit(
        activity1Id,
        "activity",
        new Date("2024-01-15"),
        new Date("2024-02-05") // Ends after Activity2 starts
      );

      expect(validation.valid).toBe(false);
      expect(
        validation.violations.some((v) => v.violationType === "SUCCESSOR_CONFLICT")
      ).toBe(true);
    });

    it("should detect successor constraint violation", async () => {
      // Create dependency: Activity1 -> Activity2
      await dependencyService.createActivityDependency({
        predecessorId: activity1Id,
        successorId: activity2Id,
        type: DependencyType.FS,
      });

      // Try to move Activity2 start before Activity1 ends
      const validation = await constraintService.validateDateEdit(
        activity2Id,
        "activity",
        new Date("2024-01-20"), // Starts before Activity1 ends
        new Date("2024-01-27")
      );

      expect(validation.valid).toBe(false);
      expect(
        validation.violations.some((v) => v.violationType === "PREDECESSOR_CONFLICT")
      ).toBe(true);
    });
  });

  describe("Date Edit Application", () => {
    let activityId: string;

    beforeEach(async () => {
      const activity = await activityService.create({
        projectId,
        name: "Test Activity",
        startDate: new Date("2024-01-15"),
        endDate: new Date("2024-01-22"),
        status: "NOT_STARTED",
      });
      activityId = activity.id;
    });

    it("should apply valid date edit without override", async () => {
      const result = await constraintService.applyDateEdit(
        activityId,
        "activity",
        new Date("2024-01-16"),
        new Date("2024-01-23"),
        false
      );

      expect(result.success).toBe(true);
      expect(result.validation.valid).toBe(true);
    });

    it("should reject invalid date edit without override", async () => {
      await constraintService.addConstraint(
        activityId,
        "activity",
        "MUST_START_ON",
        new Date("2024-01-15")
      );

      const result = await constraintService.applyDateEdit(
        activityId,
        "activity",
        new Date("2024-01-20"), // Violates MUST_START_ON
        new Date("2024-01-27"),
        false
      );

      expect(result.success).toBe(false);
      expect(result.validation.valid).toBe(false);
    });

    it("should apply invalid date edit with override", async () => {
      await constraintService.addConstraint(
        activityId,
        "activity",
        "MUST_START_ON",
        new Date("2024-01-15")
      );

      const result = await constraintService.applyDateEdit(
        activityId,
        "activity",
        new Date("2024-01-20"),
        new Date("2024-01-27"),
        true // Force override
      );

      expect(result.success).toBe(true);
    });
  });

  describe("Valid Date Range Calculation", () => {
    let activity1Id: string;
    let activity2Id: string;

    beforeEach(async () => {
      const activity1 = await activityService.create({
        projectId,
        name: "Activity 1",
        startDate: new Date("2024-01-15"),
        endDate: new Date("2024-01-22"),
        status: "NOT_STARTED",
      });
      activity1Id = activity1.id;

      const activity2 = await activityService.create({
        projectId,
        name: "Activity 2",
        startDate: new Date("2024-01-23"),
        endDate: new Date("2024-01-30"),
        status: "NOT_STARTED",
      });
      activity2Id = activity2.id;
    });

    it("should calculate valid date range without constraints", async () => {
      const range = await constraintService.getValidDateRange(
        activity1Id,
        "activity"
      );

      expect(range.itemId).toBe(activity1Id);
      expect(range.minStartDate).toBeDefined();
      expect(range.maxStartDate).toBeDefined();
      expect(range.minStartDate.getTime()).toBeLessThanOrEqual(
        range.maxStartDate.getTime()
      );
    });

    it("should apply START_NO_EARLIER constraint to date range", async () => {
      const constraintDate = new Date("2024-01-20");
      await constraintService.addConstraint(
        activity1Id,
        "activity",
        "START_NO_EARLIER",
        constraintDate
      );

      const range = await constraintService.getValidDateRange(
        activity1Id,
        "activity"
      );

      expect(range.minStartDate.getTime()).toBeGreaterThanOrEqual(
        constraintDate.getTime()
      );
    });

    it("should apply START_NO_LATER constraint to date range", async () => {
      const constraintDate = new Date("2024-01-20");
      await constraintService.addConstraint(
        activity1Id,
        "activity",
        "START_NO_LATER",
        constraintDate
      );

      const range = await constraintService.getValidDateRange(
        activity1Id,
        "activity"
      );

      expect(range.maxStartDate.getTime()).toBeLessThanOrEqual(
        constraintDate.getTime()
      );
    });

    it("should apply predecessor constraints to date range", async () => {
      await dependencyService.createActivityDependency({
        predecessorId: activity1Id,
        successorId: activity2Id,
        type: DependencyType.FS,
      });

      const range = await constraintService.getValidDateRange(
        activity2Id,
        "activity"
      );

      // Activity2 cannot start before Activity1 ends
      expect(range.minStartDate.getTime()).toBeGreaterThanOrEqual(
        new Date("2024-01-22").getTime()
      );
    });

    it("should detect infeasible date range", async () => {
      // Create conflicting constraints
      await constraintService.addConstraint(
        activity1Id,
        "activity",
        "START_NO_EARLIER",
        new Date("2024-01-25")
      );

      await constraintService.addConstraint(
        activity1Id,
        "activity",
        "START_NO_LATER",
        new Date("2024-01-20")
      );

      const range = await constraintService.getValidDateRange(
        activity1Id,
        "activity"
      );

      expect(range.violations.length).toBeGreaterThan(0);
    });
  });

  describe("Date Change Propagation", () => {
    let activity1Id: string;
    let activity2Id: string;
    let activity3Id: string;

    beforeEach(async () => {
      const activity1 = await activityService.create({
        projectId,
        name: "Activity 1",
        startDate: new Date("2024-01-15"),
        endDate: new Date("2024-01-22"),
        status: "NOT_STARTED",
      });
      activity1Id = activity1.id;

      const activity2 = await activityService.create({
        projectId,
        name: "Activity 2",
        startDate: new Date("2024-01-23"),
        endDate: new Date("2024-01-30"),
        status: "NOT_STARTED",
      });
      activity2Id = activity2.id;

      const activity3 = await activityService.create({
        projectId,
        name: "Activity 3",
        startDate: new Date("2024-01-31"),
        endDate: new Date("2024-02-07"),
        status: "NOT_STARTED",
      });
      activity3Id = activity3.id;
    });

    it("should propagate date changes to successors", async () => {
      // Chain: Activity1 -> Activity2 -> Activity3
      await dependencyService.createActivityDependency({
        predecessorId: activity1Id,
        successorId: activity2Id,
        type: DependencyType.FS,
      });

      await dependencyService.createActivityDependency({
        predecessorId: activity2Id,
        successorId: activity3Id,
        type: DependencyType.FS,
      });

      // Propagate changes from Activity1
      const changes = await constraintService.propagateDateChanges(
        activity1Id,
        "activity"
      );

      expect(changes.length).toBeGreaterThan(0);
      expect(changes.some((c) => c.id === activity2Id)).toBe(true);
    });
  });

  describe("Task Constraints", () => {
    let activityId: string;
    let taskId: string;

    beforeEach(async () => {
      const activity = await activityService.create({
        projectId,
        name: "Test Activity",
        startDate: new Date("2024-01-15"),
        endDate: new Date("2024-01-30"),
        status: "NOT_STARTED",
      });
      activityId = activity.id;

      const task = await taskService.create({
        activityId,
        name: "Test Task",
        startDate: new Date("2024-01-15"),
        endDate: new Date("2024-01-22"),
        duration: 56,
        status: "NOT_STARTED",
      });
      taskId = task.id;
    });

    it("should create constraint on task", async () => {
      const constraint = await constraintService.addConstraint(
        taskId,
        "task",
        "START_NO_EARLIER",
        new Date("2024-01-18")
      );

      expect(constraint.itemId).toBe(taskId);
      expect(constraint.itemType).toBe("task");
    });

    it("should validate date edit on task", async () => {
      const validation = await constraintService.validateDateEdit(
        taskId,
        "task",
        new Date("2024-01-16"),
        new Date("2024-01-23")
      );

      expect(validation).toBeDefined();
      expect(validation.newStartDate).toBeDefined();
    });
  });
});
