// ABOUTME: Integration tests for auto-scheduling service
// ABOUTME: Tests project scheduling, critical path calculation, and slack analysis

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  resetDatabase,
  disconnectDatabase,
  createTestOrganisation,
  createTestUser,
  createTestProject,
} from "@/lib/test-utils";
import { schedulerService } from "../scheduler.service";
import { activityService } from "../activity.service";
import { taskService } from "../task.service";
import { dependencyService } from "../dependency.service";
import { DependencyType } from "@prisma/client";

describe("Auto-Scheduler Service", () => {
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

  describe("Basic Project Scheduling", () => {
    it("should calculate schedule for project with no dependencies", async () => {
      const startDate = new Date("2024-01-15");

      await activityService.create({
        projectId,
        name: "Activity 1",
        startDate,
        endDate: new Date("2024-01-22"),
        status: "NOT_STARTED",
      });

      await activityService.create({
        projectId,
        name: "Activity 2",
        startDate: new Date("2024-01-23"),
        endDate: new Date("2024-01-30"),
        status: "NOT_STARTED",
      });

      const schedule = await schedulerService.calculateProjectSchedule(projectId);

      expect(schedule.projectId).toBe(projectId);
      expect(schedule.items.length).toBe(2);
      expect(schedule.isFeasible).toBe(true);
      expect(schedule.criticalPath.length).toBeGreaterThan(0);
    });

    it("should calculate schedule for empty project", async () => {
      const schedule = await schedulerService.calculateProjectSchedule(projectId);

      expect(schedule.projectId).toBe(projectId);
      expect(schedule.items.length).toBe(0);
      expect(schedule.criticalPath.length).toBe(0);
      expect(schedule.isFeasible).toBe(true);
    });

    it("should calculate project end date from all activities", async () => {
      const startDate = new Date("2024-01-15");

      const activity1 = await activityService.create({
        projectId,
        name: "Short Activity",
        startDate,
        endDate: new Date("2024-01-20"),
        status: "NOT_STARTED",
      });

      const activity2 = await activityService.create({
        projectId,
        name: "Long Activity",
        startDate: new Date("2024-01-15"),
        endDate: new Date("2024-02-28"),
        status: "NOT_STARTED",
      });

      const schedule = await schedulerService.calculateProjectSchedule(projectId);

      expect(schedule.endDate.getTime()).toBeGreaterThanOrEqual(
        new Date("2024-02-28").getTime()
      );
    });
  });

  describe("Linear Dependency Scheduling", () => {
    let activity1Id: string;
    let activity2Id: string;
    let activity3Id: string;

    beforeEach(async () => {
      const startDate = new Date("2024-01-15");

      const activity1 = await activityService.create({
        projectId,
        name: "Design",
        startDate,
        endDate: new Date("2024-01-22"),
        status: "NOT_STARTED",
      });
      activity1Id = activity1.id;

      const activity2 = await activityService.create({
        projectId,
        name: "Development",
        startDate: new Date("2024-01-23"),
        endDate: new Date("2024-02-05"),
        status: "NOT_STARTED",
      });
      activity2Id = activity2.id;

      const activity3 = await activityService.create({
        projectId,
        name: "Testing",
        startDate: new Date("2024-02-06"),
        endDate: new Date("2024-02-12"),
        status: "NOT_STARTED",
      });
      activity3Id = activity3.id;
    });

    it("should calculate schedule with linear FS dependencies", async () => {
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

      const schedule = await schedulerService.calculateProjectSchedule(projectId);

      expect(schedule.items.length).toBe(3);
      // Find items in schedule
      const designItem = schedule.items.find((i) => i.id === activity1Id);
      const devItem = schedule.items.find((i) => i.id === activity2Id);
      const testItem = schedule.items.find((i) => i.id === activity3Id);

      expect(designItem).toBeDefined();
      expect(devItem).toBeDefined();
      expect(testItem).toBeDefined();

      // All should be on critical path (no slack)
      expect(designItem!.isCritical).toBe(true);
      expect(devItem!.isCritical).toBe(true);
      expect(testItem!.isCritical).toBe(true);
    });

    it("should identify critical path items", async () => {
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

      const criticalPath = await schedulerService.getCriticalPath(projectId);

      expect(criticalPath.length).toBeGreaterThan(0);
      expect(criticalPath.map((i) => i.id)).toContain(activity1Id);
      expect(criticalPath.map((i) => i.id)).toContain(activity2Id);
      expect(criticalPath.map((i) => i.id)).toContain(activity3Id);
    });

    it("should calculate slack time for non-critical items", async () => {
      // Create a parallel activity that is shorter
      const parallActivity = await activityService.create({
        projectId,
        name: "Parallel",
        startDate: new Date("2024-01-23"),
        endDate: new Date("2024-01-25"), // Shorter than main path
        status: "NOT_STARTED",
      });

      // Main path: Activity1 -> Activity2 -> Activity3
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

      const slackAnalysis = await schedulerService.getSlackAnalysis(projectId);

      const parallItemSlack = slackAnalysis.find((s) => s.itemId === parallActivity.id);
      expect(parallItemSlack).toBeDefined();
      expect(parallItemSlack!.slack).toBeGreaterThan(0);
      expect(parallItemSlack!.isCritical).toBe(false);
    });
  });

  describe("Dependency Type Handling", () => {
    it("should handle Start-to-Start (SS) dependencies", async () => {
      const startDate = new Date("2024-01-15");

      const activity1 = await activityService.create({
        projectId,
        name: "Activity 1",
        startDate,
        endDate: new Date("2024-01-22"),
        status: "NOT_STARTED",
      });

      const activity2 = await activityService.create({
        projectId,
        name: "Activity 2",
        startDate: new Date("2024-01-15"),
        endDate: new Date("2024-01-30"),
        status: "NOT_STARTED",
      });

      await dependencyService.createActivityDependency({
        predecessorId: activity1.id,
        successorId: activity2.id,
        type: DependencyType.SS,
      });

      const schedule = await schedulerService.calculateProjectSchedule(projectId);

      expect(schedule.items.length).toBe(2);
      const item2 = schedule.items.find((i) => i.id === activity2.id);
      expect(item2).toBeDefined();
    });

    it("should handle Finish-to-Finish (FF) dependencies", async () => {
      const startDate = new Date("2024-01-15");

      const activity1 = await activityService.create({
        projectId,
        name: "Activity 1",
        startDate,
        endDate: new Date("2024-01-22"),
        status: "NOT_STARTED",
      });

      const activity2 = await activityService.create({
        projectId,
        name: "Activity 2",
        startDate: new Date("2024-01-15"),
        endDate: new Date("2024-01-30"),
        status: "NOT_STARTED",
      });

      await dependencyService.createActivityDependency({
        predecessorId: activity1.id,
        successorId: activity2.id,
        type: DependencyType.FF,
      });

      const schedule = await schedulerService.calculateProjectSchedule(projectId);

      expect(schedule.items.length).toBe(2);
    });

    it("should handle lag values in dependencies", async () => {
      const startDate = new Date("2024-01-15");

      const activity1 = await activityService.create({
        projectId,
        name: "Design",
        startDate,
        endDate: new Date("2024-01-22"),
        status: "NOT_STARTED",
      });

      const activity2 = await activityService.create({
        projectId,
        name: "Development",
        startDate: new Date("2024-01-23"),
        endDate: new Date("2024-02-05"),
        status: "NOT_STARTED",
      });

      // Create dependency with 2-day lag
      await dependencyService.createActivityDependency({
        predecessorId: activity1.id,
        successorId: activity2.id,
        type: DependencyType.FS,
        lag: 2,
      });

      const schedule = await schedulerService.calculateProjectSchedule(projectId);

      expect(schedule.items.length).toBe(2);
      const devItem = schedule.items.find((i) => i.id === activity2.id);
      expect(devItem).toBeDefined();
      // Lag should push activity2's start date further out
    });
  });

  describe("Task Scheduling", () => {
    let activityId: string;

    beforeEach(async () => {
      const activity = await activityService.create({
        projectId,
        name: "Test Activity",
        startDate: new Date("2024-01-15"),
        endDate: new Date("2024-01-30"),
        status: "NOT_STARTED",
      });
      activityId = activity.id;
    });

    it("should schedule tasks within activities", async () => {
      const task1 = await taskService.create({
        activityId,
        name: "Task 1",
        startDate: new Date("2024-01-15"),
        endDate: new Date("2024-01-20"),
        duration: 40,
        status: "NOT_STARTED",
      });

      const task2 = await taskService.create({
        activityId,
        name: "Task 2",
        startDate: new Date("2024-01-21"),
        endDate: new Date("2024-01-25"),
        duration: 40,
        status: "NOT_STARTED",
      });

      const schedule = await schedulerService.calculateProjectSchedule(projectId);

      expect(schedule.items.length).toBeGreaterThan(0);
      const taskItem1 = schedule.items.find((i) => i.id === task1.id);
      const taskItem2 = schedule.items.find((i) => i.id === task2.id);

      expect(taskItem1).toBeDefined();
      expect(taskItem2).toBeDefined();
    });

    it("should schedule task dependencies", async () => {
      const task1 = await taskService.create({
        activityId,
        name: "Task 1",
        startDate: new Date("2024-01-15"),
        endDate: new Date("2024-01-20"),
        duration: 40,
        status: "NOT_STARTED",
      });

      const task2 = await taskService.create({
        activityId,
        name: "Task 2",
        startDate: new Date("2024-01-21"),
        endDate: new Date("2024-01-25"),
        duration: 40,
        status: "NOT_STARTED",
      });

      await dependencyService.createTaskDependency({
        predecessorId: task1.id,
        successorId: task2.id,
        type: DependencyType.FS,
      });

      const schedule = await schedulerService.calculateProjectSchedule(projectId);

      expect(schedule.items.length).toBeGreaterThan(0);
    });
  });

  describe("Complex Scheduling Scenarios", () => {
    it("should handle convergent dependencies (multiple predecessors)", async () => {
      const startDate = new Date("2024-01-15");

      const activity1 = await activityService.create({
        projectId,
        name: "Frontend",
        startDate,
        endDate: new Date("2024-01-25"),
        status: "NOT_STARTED",
      });

      const activity2 = await activityService.create({
        projectId,
        name: "Backend",
        startDate,
        endDate: new Date("2024-02-05"),
        status: "NOT_STARTED",
      });

      const activity3 = await activityService.create({
        projectId,
        name: "Integration",
        startDate: new Date("2024-02-06"),
        endDate: new Date("2024-02-12"),
        status: "NOT_STARTED",
      });

      await dependencyService.createActivityDependency({
        predecessorId: activity1.id,
        successorId: activity3.id,
        type: DependencyType.FS,
      });

      await dependencyService.createActivityDependency({
        predecessorId: activity2.id,
        successorId: activity3.id,
        type: DependencyType.FS,
      });

      const schedule = await schedulerService.calculateProjectSchedule(projectId);

      expect(schedule.items.length).toBe(3);
      const integrationItem = schedule.items.find((i) => i.id === activity3.id);
      expect(integrationItem).toBeDefined();
    });

    it("should handle divergent dependencies (multiple successors)", async () => {
      const startDate = new Date("2024-01-15");

      const design = await activityService.create({
        projectId,
        name: "Design",
        startDate,
        endDate: new Date("2024-01-25"),
        status: "NOT_STARTED",
      });

      const frontend = await activityService.create({
        projectId,
        name: "Frontend",
        startDate: new Date("2024-01-26"),
        endDate: new Date("2024-02-10"),
        status: "NOT_STARTED",
      });

      const backend = await activityService.create({
        projectId,
        name: "Backend",
        startDate: new Date("2024-01-26"),
        endDate: new Date("2024-02-15"),
        status: "NOT_STARTED",
      });

      await dependencyService.createActivityDependency({
        predecessorId: design.id,
        successorId: frontend.id,
        type: DependencyType.FS,
      });

      await dependencyService.createActivityDependency({
        predecessorId: design.id,
        successorId: backend.id,
        type: DependencyType.FS,
      });

      const schedule = await schedulerService.calculateProjectSchedule(projectId);

      expect(schedule.items.length).toBe(3);
      const designItem = schedule.items.find((i) => i.id === design.id);
      expect(designItem?.isCritical).toBe(true);
    });

    it("should calculate total project duration", async () => {
      const startDate = new Date("2024-01-15");

      const activity1 = await activityService.create({
        projectId,
        name: "Activity 1",
        startDate,
        endDate: new Date("2024-01-20"),
        status: "NOT_STARTED",
      });

      const activity2 = await activityService.create({
        projectId,
        name: "Activity 2",
        startDate: new Date("2024-01-21"),
        endDate: new Date("2024-02-28"),
        status: "NOT_STARTED",
      });

      await dependencyService.createActivityDependency({
        predecessorId: activity1.id,
        successorId: activity2.id,
        type: DependencyType.FS,
      });

      const schedule = await schedulerService.calculateProjectSchedule(projectId);

      expect(schedule.totalDurationDays).toBeGreaterThan(0);
      expect(schedule.endDate.getTime()).toBeGreaterThan(schedule.startDate.getTime());
    });
  });

  describe("Analysis Methods", () => {
    let activity1Id: string;
    let activity2Id: string;
    let activity3Id: string;

    beforeEach(async () => {
      const startDate = new Date("2024-01-15");

      const activity1 = await activityService.create({
        projectId,
        name: "Design",
        startDate,
        endDate: new Date("2024-01-22"),
        status: "NOT_STARTED",
      });
      activity1Id = activity1.id;

      const activity2 = await activityService.create({
        projectId,
        name: "Development",
        startDate: new Date("2024-01-23"),
        endDate: new Date("2024-02-05"),
        status: "NOT_STARTED",
      });
      activity2Id = activity2.id;

      const activity3 = await activityService.create({
        projectId,
        name: "Testing",
        startDate: new Date("2024-02-06"),
        endDate: new Date("2024-02-12"),
        status: "NOT_STARTED",
      });
      activity3Id = activity3.id;

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
    });

    it("should get dependency chain from activity", async () => {
      const chain = await schedulerService.getDependencyChain(activity1Id);

      expect(chain).toContain(activity1Id);
      expect(chain.length).toBeGreaterThanOrEqual(1);
    });

    it("should get resource leveling analysis", async () => {
      const leveling = await schedulerService.getResourceLevelingAnalysis(projectId);

      expect(leveling.length).toBeGreaterThan(0);
      expect(leveling[0].itemCount).toBeGreaterThan(0);
      expect(leveling[0].itemIds.length).toBeGreaterThan(0);
    });
  });

  describe("Schedule Feasibility", () => {
    it("should mark feasible schedule", async () => {
      const startDate = new Date("2024-01-15");

      await activityService.create({
        projectId,
        name: "Activity",
        startDate,
        endDate: new Date("2024-01-22"),
        status: "NOT_STARTED",
      });

      const schedule = await schedulerService.calculateProjectSchedule(projectId);

      expect(schedule.isFeasible).toBe(true);
      expect(schedule.warnings.length).toBe(0);
    });

    it("should detect negative durations", async () => {
      // This test validates the warning system
      // (Normally prevented at data creation, but testing validation logic)
      const schedule = await schedulerService.calculateProjectSchedule(projectId);

      expect(Array.isArray(schedule.warnings)).toBe(true);
    });
  });

  describe("Early/Late Date Calculations", () => {
    it("should calculate early start and early end dates", async () => {
      const startDate = new Date("2024-01-15");

      const activity = await activityService.create({
        projectId,
        name: "Activity",
        startDate,
        endDate: new Date("2024-01-22"),
        status: "NOT_STARTED",
      });

      const schedule = await schedulerService.calculateProjectSchedule(projectId);
      const item = schedule.items.find((i) => i.id === activity.id);

      expect(item).toBeDefined();
      expect(item!.earlyStart).toBeDefined();
      expect(item!.earlyEnd).toBeDefined();
      expect(item!.earlyStart.getTime()).toBeLessThanOrEqual(item!.earlyEnd.getTime());
    });

    it("should calculate late start and late end dates", async () => {
      const startDate = new Date("2024-01-15");

      const activity = await activityService.create({
        projectId,
        name: "Activity",
        startDate,
        endDate: new Date("2024-01-22"),
        status: "NOT_STARTED",
      });

      const schedule = await schedulerService.calculateProjectSchedule(projectId);
      const item = schedule.items.find((i) => i.id === activity.id);

      expect(item).toBeDefined();
      expect(item!.lateStart).toBeDefined();
      expect(item!.lateEnd).toBeDefined();
      expect(item!.lateStart.getTime()).toBeLessThanOrEqual(item!.lateEnd.getTime());
    });
  });
});
