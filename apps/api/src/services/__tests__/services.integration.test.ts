// ABOUTME: Integration tests for all service layer CRUD operations
// ABOUTME: Tests real database interactions and validates business logic

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  resetDatabase,
  disconnectDatabase,
  createTestOrganisation,
  createTestUser,
  createTestProject,
  createTestActivity,
  createTestTask,
} from "@/lib/test-utils";
import { organisationService } from "../organisation.service";
import { userService } from "../user.service";
import { projectService } from "../project.service";
import { activityService } from "../activity.service";
import { taskService } from "../task.service";
import { dependencyService } from "../dependency.service";
import { Role, Status } from "@prisma/client";

describe("Service Layer Integration Tests", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe("OrganisationService", () => {
    it("should create and retrieve an organisation", async () => {
      const org = await organisationService.create(createTestOrganisation());

      const retrieved = await organisationService.getById(org.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe(org.name);
    });

    it("should update an organisation", async () => {
      const org = await organisationService.create(createTestOrganisation());

      const updated = await organisationService.update(org.id, {
        name: "Updated Name",
      });

      expect(updated.name).toBe("Updated Name");
    });

    it("should paginate organisations", async () => {
      await organisationService.create(createTestOrganisation({ name: "Org 1" }));
      await organisationService.create(createTestOrganisation({ name: "Org 2" }));

      const result = await organisationService.getAll({ skip: 0, take: 10 });

      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(result.hasMore).toBe(false);
    });

    it("should delete organisation (cascade)", async () => {
      const org = await organisationService.create(createTestOrganisation());
      const user = await userService.create(
        createTestUser(org.id)
      );

      await organisationService.delete(org.id);

      const deletedUser = await userService.getById(user.id);
      expect(deletedUser).toBeNull();
    });
  });

  describe("UserService", () => {
    it("should create and retrieve a user", async () => {
      const org = await organisationService.create(createTestOrganisation());
      const user = await userService.create(createTestUser(org.id));

      const retrieved = await userService.getById(user.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.email).toBe(user.email);
    });

    it("should get user by email", async () => {
      const org = await organisationService.create(createTestOrganisation());
      const userData = createTestUser(org.id);
      const user = await userService.create(userData);

      const retrieved = await userService.getByEmail(userData.email);
      expect(retrieved?.id).toBe(user.id);
    });

    it("should get users by role", async () => {
      const org = await organisationService.create(createTestOrganisation());

      await userService.create(
        createTestUser(org.id, { role: Role.PMO })
      );
      await userService.create(
        createTestUser(org.id, { role: Role.PM })
      );

      const pmos = await userService.getByRole(org.id, Role.PMO);
      expect(pmos).toHaveLength(1);
    });

    it("should update user", async () => {
      const org = await organisationService.create(createTestOrganisation());
      const user = await userService.create(createTestUser(org.id));

      const updated = await userService.update(user.id, {
        role: Role.PM,
      });

      expect(updated.role).toBe(Role.PM);
    });
  });

  describe("ProjectService", () => {
    it("should create and retrieve project", async () => {
      const org = await organisationService.create(createTestOrganisation());
      const owner = await userService.create(createTestUser(org.id));

      const project = await projectService.create(
        createTestProject(org.id, owner.id)
      );

      const retrieved = await projectService.getById(project.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.ownerUserId).toBe(owner.id);
    });

    it("should get projects by organisation", async () => {
      const org = await organisationService.create(createTestOrganisation());
      const owner = await userService.create(createTestUser(org.id));

      await projectService.create(
        createTestProject(org.id, owner.id, { name: "Project 1" })
      );
      await projectService.create(
        createTestProject(org.id, owner.id, { name: "Project 2" })
      );

      const result = await projectService.getByOrganisation(org.id);
      expect(result.total).toBe(2);
    });

    it("should search projects by name", async () => {
      const org = await organisationService.create(createTestOrganisation());
      const owner = await userService.create(createTestUser(org.id));

      await projectService.create(
        createTestProject(org.id, owner.id, { name: "Website Redesign" })
      );
      await projectService.create(
        createTestProject(org.id, owner.id, { name: "Mobile App" })
      );

      const result = await projectService.getByOrganisation(org.id, {
        search: "Website",
      });

      expect(result.total).toBe(1);
      expect(result.data[0].name).toContain("Website");
    });

    it("should add and remove project members", async () => {
      const org = await organisationService.create(createTestOrganisation());
      const owner = await userService.create(createTestUser(org.id));
      const member = await userService.create(createTestUser(org.id));

      const project = await projectService.create(
        createTestProject(org.id, owner.id)
      );

      await projectService.addMember(project.id, member.id);

      const withMembers = await projectService.getWithRelations(project.id);
      expect(withMembers?.members).toContainEqual(expect.objectContaining({ id: member.id }));

      await projectService.removeMember(project.id, member.id);
    });
  });

  describe("ActivityService", () => {
    it("should create and retrieve activity", async () => {
      const org = await organisationService.create(createTestOrganisation());
      const owner = await userService.create(createTestUser(org.id));
      const project = await projectService.create(
        createTestProject(org.id, owner.id)
      );

      const activity = await activityService.create(
        createTestActivity(project.id)
      );

      const retrieved = await activityService.getById(activity.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.projectId).toBe(project.id);
    });

    it("should get activities by project ordered by date", async () => {
      const org = await organisationService.create(createTestOrganisation());
      const owner = await userService.create(createTestUser(org.id));
      const project = await projectService.create(
        createTestProject(org.id, owner.id)
      );

      const now = new Date();
      const later = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      await activityService.create({
        ...createTestActivity(project.id),
        startDate: later,
      });
      await activityService.create({
        ...createTestActivity(project.id),
        startDate: now,
      });

      const activities = await activityService.getOrdered(project.id);
      expect(activities[0].startDate.getTime()).toBeLessThanOrEqual(
        activities[1].startDate.getTime()
      );
    });

    it("should update activity status", async () => {
      const org = await organisationService.create(createTestOrganisation());
      const owner = await userService.create(createTestUser(org.id));
      const project = await projectService.create(
        createTestProject(org.id, owner.id)
      );

      const activity = await activityService.create(
        createTestActivity(project.id)
      );

      const updated = await activityService.update(activity.id, {
        status: Status.IN_PROGRESS,
      });

      expect(updated.status).toBe(Status.IN_PROGRESS);
    });
  });

  describe("TaskService", () => {
    it("should create and retrieve task", async () => {
      const org = await organisationService.create(createTestOrganisation());
      const owner = await userService.create(createTestUser(org.id));
      const assignee = await userService.create(createTestUser(org.id));
      const project = await projectService.create(
        createTestProject(org.id, owner.id)
      );
      const activity = await activityService.create(
        createTestActivity(project.id)
      );

      const task = await taskService.create({
        ...createTestTask(activity.id),
        assigneeUserId: assignee.id,
      });

      const retrieved = await taskService.getById(task.id);
      expect(retrieved?.assigneeUserId).toBe(assignee.id);
    });

    it("should get tasks by assignee", async () => {
      const org = await organisationService.create(createTestOrganisation());
      const owner = await userService.create(createTestUser(org.id));
      const assignee = await userService.create(createTestUser(org.id));
      const project = await projectService.create(
        createTestProject(org.id, owner.id)
      );
      const activity = await activityService.create(
        createTestActivity(project.id)
      );

      await taskService.create({
        ...createTestTask(activity.id),
        assigneeUserId: assignee.id,
      });
      await taskService.create({
        ...createTestTask(activity.id),
        assigneeUserId: assignee.id,
      });

      const result = await taskService.getByAssignee(assignee.id);
      expect(result.total).toBe(2);
    });

    it("should assign and unassign task", async () => {
      const org = await organisationService.create(createTestOrganisation());
      const owner = await userService.create(createTestUser(org.id));
      const assignee = await userService.create(createTestUser(org.id));
      const project = await projectService.create(
        createTestProject(org.id, owner.id)
      );
      const activity = await activityService.create(
        createTestActivity(project.id)
      );
      const task = await taskService.create(createTestTask(activity.id));

      const assigned = await taskService.assign(task.id, assignee.id);
      expect(assigned.assigneeUserId).toBe(assignee.id);

      const unassigned = await taskService.unassign(task.id);
      expect(unassigned.assigneeUserId).toBeNull();
    });

    it("should get overdue tasks", async () => {
      const org = await organisationService.create(createTestOrganisation());
      const owner = await userService.create(createTestUser(org.id));
      const project = await projectService.create(
        createTestProject(org.id, owner.id)
      );
      const activity = await activityService.create(
        createTestActivity(project.id)
      );

      const past = new Date();
      past.setDate(past.getDate() - 5);

      await taskService.create({
        ...createTestTask(activity.id),
        endDate: past,
      });

      const overdue = await taskService.getOverdue();
      expect(overdue.length).toBeGreaterThan(0);
    });
  });

  describe("DependencyService", () => {
    it("should create activity dependency", async () => {
      const org = await organisationService.create(createTestOrganisation());
      const owner = await userService.create(createTestUser(org.id));
      const project = await projectService.create(
        createTestProject(org.id, owner.id)
      );

      const act1 = await activityService.create(
        createTestActivity(project.id, { name: "Activity 1" })
      );
      const act2 = await activityService.create(
        createTestActivity(project.id, { name: "Activity 2" })
      );

      const dep = await dependencyService.createActivityDependency({
        predecessorId: act1.id,
        successorId: act2.id,
        type: "FS",
      });

      expect(dep.activityPredecessorId).toBe(act1.id);
      expect(dep.dependencyType).toBe("FS");
    });

    it("should prevent self-dependency", async () => {
      const org = await organisationService.create(createTestOrganisation());
      const owner = await userService.create(createTestUser(org.id));
      const project = await projectService.create(
        createTestProject(org.id, owner.id)
      );

      const activity = await activityService.create(
        createTestActivity(project.id)
      );

      expect(
        dependencyService.createActivityDependency({
          predecessorId: activity.id,
          successorId: activity.id,
          type: "FS",
        })
      ).rejects.toThrow("Cannot create dependency on itself");
    });

    it("should detect circular dependencies", async () => {
      const org = await organisationService.create(createTestOrganisation());
      const owner = await userService.create(createTestUser(org.id));
      const project = await projectService.create(
        createTestProject(org.id, owner.id)
      );

      const act1 = await activityService.create(
        createTestActivity(project.id, { name: "Activity 1" })
      );
      const act2 = await activityService.create(
        createTestActivity(project.id, { name: "Activity 2" })
      );
      const act3 = await activityService.create(
        createTestActivity(project.id, { name: "Activity 3" })
      );

      // Create chain: act1 -> act2 -> act3
      await dependencyService.createActivityDependency({
        predecessorId: act1.id,
        successorId: act2.id,
        type: "FS",
      });

      await dependencyService.createActivityDependency({
        predecessorId: act2.id,
        successorId: act3.id,
        type: "FS",
      });

      // Try to create cycle: act3 -> act1
      expect(
        dependencyService.createActivityDependency({
          predecessorId: act3.id,
          successorId: act1.id,
          type: "FS",
        })
      ).rejects.toThrow("circular dependency");
    });

    it("should get activity predecessors and successors", async () => {
      const org = await organisationService.create(createTestOrganisation());
      const owner = await userService.create(createTestUser(org.id));
      const project = await projectService.create(
        createTestProject(org.id, owner.id)
      );

      const act1 = await activityService.create(
        createTestActivity(project.id, { name: "Activity 1" })
      );
      const act2 = await activityService.create(
        createTestActivity(project.id, { name: "Activity 2" })
      );

      await dependencyService.createActivityDependency({
        predecessorId: act1.id,
        successorId: act2.id,
        type: "FS",
      });

      const predecessors = await dependencyService.getActivityPredecessors(act2.id);
      const successors = await dependencyService.getActivitySuccessors(act1.id);

      expect(predecessors).toHaveLength(1);
      expect(successors).toHaveLength(1);
    });
  });
});
