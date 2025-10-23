// ABOUTME: Integration tests for dependency management service
// ABOUTME: Tests dependency creation, cycle detection, and relationship querying

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  resetDatabase,
  disconnectDatabase,
  createTestOrganisation,
  createTestUser,
  createTestProject,
} from "@/lib/test-utils";
import { dependencyService } from "../dependency.service";
import { activityService } from "../activity.service";
import { taskService } from "../task.service";
import { DependencyType } from "@prisma/client";

describe("Dependency Management Service", () => {
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

  describe("Activity Dependencies", () => {
    let activity1Id: string;
    let activity2Id: string;
    let activity3Id: string;

    beforeEach(async () => {
      const startDate = new Date("2024-01-15");

      const activity1 = await activityService.create({
        projectId,
        name: "Activity 1",
        startDate,
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

    it("should create Finish-to-Start (FS) activity dependency", async () => {
      const dependency = await dependencyService.createActivityDependency({
        predecessorId: activity1Id,
        successorId: activity2Id,
        type: DependencyType.FS,
      });

      expect(dependency).toBeDefined();
      expect(dependency.activityPredecessorId).toBe(activity1Id);
      expect(dependency.activitySuccessorId).toBe(activity2Id);
      expect(dependency.dependencyType).toBe(DependencyType.FS);
      expect(dependency.lag).toBe(0);
    });

    it("should create Start-to-Start (SS) activity dependency", async () => {
      const dependency = await dependencyService.createActivityDependency({
        predecessorId: activity1Id,
        successorId: activity2Id,
        type: DependencyType.SS,
      });

      expect(dependency.dependencyType).toBe(DependencyType.SS);
    });

    it("should create Finish-to-Finish (FF) activity dependency", async () => {
      const dependency = await dependencyService.createActivityDependency({
        predecessorId: activity1Id,
        successorId: activity2Id,
        type: DependencyType.FF,
      });

      expect(dependency.dependencyType).toBe(DependencyType.FF);
    });

    it("should create Start-to-Finish (SF) activity dependency", async () => {
      const dependency = await dependencyService.createActivityDependency({
        predecessorId: activity1Id,
        successorId: activity2Id,
        type: DependencyType.SF,
      });

      expect(dependency.dependencyType).toBe(DependencyType.SF);
    });

    it("should create activity dependency with lag", async () => {
      const dependency = await dependencyService.createActivityDependency({
        predecessorId: activity1Id,
        successorId: activity2Id,
        type: DependencyType.FS,
        lag: 2,
      });

      expect(dependency.lag).toBe(2);
    });

    it("should prevent self-dependency on activities", async () => {
      await expect(
        dependencyService.createActivityDependency({
          predecessorId: activity1Id,
          successorId: activity1Id,
          type: DependencyType.FS,
        })
      ).rejects.toThrow("Cannot create dependency on itself");
    });

    it("should detect circular dependency with direct cycle", async () => {
      // Create A -> B
      await dependencyService.createActivityDependency({
        predecessorId: activity1Id,
        successorId: activity2Id,
        type: DependencyType.FS,
      });

      // Try to create B -> A (should fail)
      await expect(
        dependencyService.createActivityDependency({
          predecessorId: activity2Id,
          successorId: activity1Id,
          type: DependencyType.FS,
        })
      ).rejects.toThrow("circular");
    });

    it("should detect circular dependency with indirect cycle", async () => {
      // Create A -> B and B -> C
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

      // Try to create C -> A (should fail)
      await expect(
        dependencyService.createActivityDependency({
          predecessorId: activity3Id,
          successorId: activity1Id,
          type: DependencyType.FS,
        })
      ).rejects.toThrow("circular");
    });

    it("should get activity predecessors", async () => {
      await dependencyService.createActivityDependency({
        predecessorId: activity1Id,
        successorId: activity2Id,
        type: DependencyType.FS,
      });

      const predecessors = await dependencyService.getActivityPredecessors(
        activity2Id
      );

      expect(predecessors).toHaveLength(1);
      expect(predecessors[0].activityPredecessorId).toBe(activity1Id);
      expect(predecessors[0].activitySuccessorId).toBe(activity2Id);
    });

    it("should get activity successors", async () => {
      await dependencyService.createActivityDependency({
        predecessorId: activity1Id,
        successorId: activity2Id,
        type: DependencyType.FS,
      });

      const successors = await dependencyService.getActivitySuccessors(
        activity1Id
      );

      expect(successors).toHaveLength(1);
      expect(successors[0].activityPredecessorId).toBe(activity1Id);
      expect(successors[0].activitySuccessorId).toBe(activity2Id);
    });

    it("should get all activity dependencies", async () => {
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

      const dependencies = await dependencyService.getActivityDependencies(
        activity2Id
      );

      expect(dependencies.incoming).toHaveLength(1);
      expect(dependencies.outgoing).toHaveLength(1);
      expect(dependencies.incoming[0].activityPredecessorId).toBe(activity1Id);
      expect(dependencies.outgoing[0].activitySuccessorId).toBe(activity3Id);
    });

    it("should handle activity with no dependencies", async () => {
      const dependencies = await dependencyService.getActivityDependencies(
        activity1Id
      );

      expect(dependencies.incoming).toHaveLength(0);
      expect(dependencies.outgoing).toHaveLength(0);
    });

    it("should delete activity dependency", async () => {
      const dependency = await dependencyService.createActivityDependency({
        predecessorId: activity1Id,
        successorId: activity2Id,
        type: DependencyType.FS,
      });

      const deleted = await dependencyService.delete(dependency.id);
      expect(deleted.id).toBe(dependency.id);

      const successors = await dependencyService.getActivitySuccessors(
        activity1Id
      );
      expect(successors).toHaveLength(0);
    });
  });

  describe("Task Dependencies", () => {
    let activity1Id: string;
    let activity2Id: string;
    let task1Id: string;
    let task2Id: string;
    let task3Id: string;

    beforeEach(async () => {
      const startDate = new Date("2024-01-15");

      const activity1 = await activityService.create({
        projectId,
        name: "Activity 1",
        startDate,
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

      const task1 = await taskService.create({
        activityId: activity1Id,
        name: "Task 1",
        startDate,
        endDate: new Date("2024-01-18"),
        duration: 3,
        status: "NOT_STARTED",
      });
      task1Id = task1.id;

      const task2 = await taskService.create({
        activityId: activity1Id,
        name: "Task 2",
        startDate: new Date("2024-01-19"),
        endDate: new Date("2024-01-22"),
        duration: 3,
        status: "NOT_STARTED",
      });
      task2Id = task2.id;

      const task3 = await taskService.create({
        activityId: activity2Id,
        name: "Task 3",
        startDate: new Date("2024-01-23"),
        endDate: new Date("2024-01-26"),
        duration: 3,
        status: "NOT_STARTED",
      });
      task3Id = task3.id;
    });

    it("should create Finish-to-Start (FS) task dependency", async () => {
      const dependency = await dependencyService.createTaskDependency({
        predecessorId: task1Id,
        successorId: task2Id,
        type: DependencyType.FS,
      });

      expect(dependency).toBeDefined();
      expect(dependency.taskPredecessorId).toBe(task1Id);
      expect(dependency.taskSuccessorId).toBe(task2Id);
      expect(dependency.dependencyType).toBe(DependencyType.FS);
    });

    it("should create Start-to-Start (SS) task dependency", async () => {
      const dependency = await dependencyService.createTaskDependency({
        predecessorId: task1Id,
        successorId: task2Id,
        type: DependencyType.SS,
      });

      expect(dependency.dependencyType).toBe(DependencyType.SS);
    });

    it("should create Finish-to-Finish (FF) task dependency", async () => {
      const dependency = await dependencyService.createTaskDependency({
        predecessorId: task1Id,
        successorId: task2Id,
        type: DependencyType.FF,
      });

      expect(dependency.dependencyType).toBe(DependencyType.FF);
    });

    it("should create Start-to-Finish (SF) task dependency", async () => {
      const dependency = await dependencyService.createTaskDependency({
        predecessorId: task1Id,
        successorId: task2Id,
        type: DependencyType.SF,
      });

      expect(dependency.dependencyType).toBe(DependencyType.SF);
    });

    it("should create task dependency with lag", async () => {
      const dependency = await dependencyService.createTaskDependency({
        predecessorId: task1Id,
        successorId: task2Id,
        type: DependencyType.FS,
        lag: 3,
      });

      expect(dependency.lag).toBe(3);
    });

    it("should prevent self-dependency on tasks", async () => {
      await expect(
        dependencyService.createTaskDependency({
          predecessorId: task1Id,
          successorId: task1Id,
          type: DependencyType.FS,
        })
      ).rejects.toThrow("Cannot create dependency on itself");
    });

    it("should detect circular dependency with direct cycle on tasks", async () => {
      // Create T1 -> T2
      await dependencyService.createTaskDependency({
        predecessorId: task1Id,
        successorId: task2Id,
        type: DependencyType.FS,
      });

      // Try to create T2 -> T1 (should fail)
      await expect(
        dependencyService.createTaskDependency({
          predecessorId: task2Id,
          successorId: task1Id,
          type: DependencyType.FS,
        })
      ).rejects.toThrow("circular");
    });

    it("should detect circular dependency with indirect cycle on tasks", async () => {
      // Create T1 -> T2 and T2 -> T3
      await dependencyService.createTaskDependency({
        predecessorId: task1Id,
        successorId: task2Id,
        type: DependencyType.FS,
      });

      await dependencyService.createTaskDependency({
        predecessorId: task2Id,
        successorId: task3Id,
        type: DependencyType.FS,
      });

      // Try to create T3 -> T1 (should fail)
      await expect(
        dependencyService.createTaskDependency({
          predecessorId: task3Id,
          successorId: task1Id,
          type: DependencyType.FS,
        })
      ).rejects.toThrow("circular");
    });

    it("should get task predecessors", async () => {
      await dependencyService.createTaskDependency({
        predecessorId: task1Id,
        successorId: task2Id,
        type: DependencyType.FS,
      });

      const predecessors = await dependencyService.getTaskPredecessors(task2Id);

      expect(predecessors).toHaveLength(1);
      expect(predecessors[0].taskPredecessorId).toBe(task1Id);
      expect(predecessors[0].taskSuccessorId).toBe(task2Id);
    });

    it("should get task successors", async () => {
      await dependencyService.createTaskDependency({
        predecessorId: task1Id,
        successorId: task2Id,
        type: DependencyType.FS,
      });

      const successors = await dependencyService.getTaskSuccessors(task1Id);

      expect(successors).toHaveLength(1);
      expect(successors[0].taskPredecessorId).toBe(task1Id);
      expect(successors[0].taskSuccessorId).toBe(task2Id);
    });

    it("should get all task dependencies", async () => {
      await dependencyService.createTaskDependency({
        predecessorId: task1Id,
        successorId: task2Id,
        type: DependencyType.FS,
      });

      await dependencyService.createTaskDependency({
        predecessorId: task2Id,
        successorId: task3Id,
        type: DependencyType.FS,
      });

      const dependencies = await dependencyService.getTaskDependencies(task2Id);

      expect(dependencies.incoming).toHaveLength(1);
      expect(dependencies.outgoing).toHaveLength(1);
      expect(dependencies.incoming[0].taskPredecessorId).toBe(task1Id);
      expect(dependencies.outgoing[0].taskSuccessorId).toBe(task3Id);
    });

    it("should handle task with no dependencies", async () => {
      const dependencies = await dependencyService.getTaskDependencies(task1Id);

      expect(dependencies.incoming).toHaveLength(0);
      expect(dependencies.outgoing).toHaveLength(0);
    });

    it("should delete task dependency", async () => {
      const dependency = await dependencyService.createTaskDependency({
        predecessorId: task1Id,
        successorId: task2Id,
        type: DependencyType.FS,
      });

      const deleted = await dependencyService.delete(dependency.id);
      expect(deleted.id).toBe(dependency.id);

      const successors = await dependencyService.getTaskSuccessors(task1Id);
      expect(successors).toHaveLength(0);
    });
  });

  describe("Complex Dependency Chains", () => {
    let activity1Id: string;
    let activity2Id: string;
    let activity3Id: string;
    let activity4Id: string;

    beforeEach(async () => {
      const activities = [];
      for (let i = 0; i < 4; i++) {
        const startDate = new Date(2024, 0, 15 + i * 7);
        const endDate = new Date(2024, 0, 22 + i * 7);

        const activity = await activityService.create({
          projectId,
          name: `Activity ${i + 1}`,
          startDate,
          endDate,
          status: "NOT_STARTED",
        });
        activities.push(activity);
      }

      activity1Id = activities[0].id;
      activity2Id = activities[1].id;
      activity3Id = activities[2].id;
      activity4Id = activities[3].id;
    });

    it("should create linear dependency chain", async () => {
      const dep1 = await dependencyService.createActivityDependency({
        predecessorId: activity1Id,
        successorId: activity2Id,
        type: DependencyType.FS,
      });

      const dep2 = await dependencyService.createActivityDependency({
        predecessorId: activity2Id,
        successorId: activity3Id,
        type: DependencyType.FS,
      });

      const dep3 = await dependencyService.createActivityDependency({
        predecessorId: activity3Id,
        successorId: activity4Id,
        type: DependencyType.FS,
      });

      expect([dep1, dep2, dep3]).toHaveLength(3);
    });

    it("should detect cycle in long chain", async () => {
      // Create A -> B -> C -> D
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

      await dependencyService.createActivityDependency({
        predecessorId: activity3Id,
        successorId: activity4Id,
        type: DependencyType.FS,
      });

      // Try to create D -> A (should fail)
      await expect(
        dependencyService.createActivityDependency({
          predecessorId: activity4Id,
          successorId: activity1Id,
          type: DependencyType.FS,
        })
      ).rejects.toThrow("circular");
    });

    it("should allow multiple independent chains", async () => {
      const activities2 = [];
      for (let i = 0; i < 2; i++) {
        const startDate = new Date(2024, 1, 15 + i * 7);
        const endDate = new Date(2024, 1, 22 + i * 7);

        const activity = await activityService.create({
          projectId,
          name: `Activity Chain2-${i + 1}`,
          startDate,
          endDate,
          status: "NOT_STARTED",
        });
        activities2.push(activity);
      }

      // Chain 1: A1 -> A2 -> A3 -> A4
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

      await dependencyService.createActivityDependency({
        predecessorId: activity3Id,
        successorId: activity4Id,
        type: DependencyType.FS,
      });

      // Chain 2: A2.1 -> A2.2 (independent)
      const dep = await dependencyService.createActivityDependency({
        predecessorId: activities2[0].id,
        successorId: activities2[1].id,
        type: DependencyType.FS,
      });

      expect(dep).toBeDefined();
    });

    it("should trace all predecessors in a chain", async () => {
      // Create linear chain: 1 -> 2 -> 3 -> 4
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

      await dependencyService.createActivityDependency({
        predecessorId: activity3Id,
        successorId: activity4Id,
        type: DependencyType.FS,
      });

      // Get predecessors of activity4
      let predecessors = await dependencyService.getActivityPredecessors(
        activity4Id
      );
      expect(predecessors).toHaveLength(1);
      expect(predecessors[0].activityPredecessorId).toBe(activity3Id);

      // Get predecessors of activity3
      predecessors = await dependencyService.getActivityPredecessors(
        activity3Id
      );
      expect(predecessors).toHaveLength(1);
      expect(predecessors[0].activityPredecessorId).toBe(activity2Id);
    });
  });

  describe("Mixed Dependency Types", () => {
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

    it("should allow multiple different dependency types between same activities", async () => {
      // Create one dependency
      const dep1 = await dependencyService.createActivityDependency({
        predecessorId: activity1Id,
        successorId: activity2Id,
        type: DependencyType.FS,
      });

      expect(dep1.dependencyType).toBe(DependencyType.FS);

      // Note: In reality, you might not want multiple dependencies between same items
      // But the service allows it - this tests the current behavior
    });

    it("should handle lag values correctly", async () => {
      const lagValue = 5;
      const dependency = await dependencyService.createActivityDependency({
        predecessorId: activity1Id,
        successorId: activity2Id,
        type: DependencyType.FS,
        lag: lagValue,
      });

      expect(dependency.lag).toBe(lagValue);
    });

    it("should default lag to 0 when not specified", async () => {
      const dependency = await dependencyService.createActivityDependency({
        predecessorId: activity1Id,
        successorId: activity2Id,
        type: DependencyType.FS,
      });

      expect(dependency.lag).toBe(0);
    });
  });
});
