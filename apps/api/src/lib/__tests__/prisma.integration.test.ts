// ABOUTME: Integration tests for Prisma database schema
// ABOUTME: Verifies all models, relationships, and constraints work correctly

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { getPrismaForTests, resetDatabase, disconnectDatabase, createTestOrganisation, createTestUser, createTestProject, createTestActivity, createTestTask } from "../test-utils";

describe("Prisma Database Schema", () => {
  const prisma = getPrismaForTests();

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe("Organisation", () => {
    it("should create an organisation", async () => {
      const data = createTestOrganisation();
      const org = await prisma.organisation.create({ data });

      expect(org).toBeDefined();
      expect(org.name).toBe(data.name);
      expect(org.timezone).toBe(data.timezone);
      expect(Array.isArray(org.workingHours)).toBe(true);
    });

    it("should have createdAt and updatedAt timestamps", async () => {
      const org = await prisma.organisation.create({
        data: createTestOrganisation(),
      });

      expect(org.createdAt).toBeInstanceOf(Date);
      expect(org.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe("User", () => {
    it("should create a user in an organisation", async () => {
      const org = await prisma.organisation.create({
        data: createTestOrganisation(),
      });

      const userData = createTestUser(org.id);
      const user = await prisma.user.create({ data: userData });

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.organisationId).toBe(org.id);
      expect(user.role).toBe("TEAM_MEMBER");
    });

    it("should enforce unique email constraint", async () => {
      const org = await prisma.organisation.create({
        data: createTestOrganisation(),
      });

      const email = "test@example.com";
      await prisma.user.create({
        data: createTestUser(org.id, { email }),
      });

      // Should fail with unique constraint violation
      expect(
        prisma.user.create({
          data: createTestUser(org.id, { email }),
        })
      ).rejects.toThrow();
    });

    it("should have user relationships", async () => {
      const org = await prisma.organisation.create({
        data: createTestOrganisation(),
      });

      const user = await prisma.user.create({
        data: createTestUser(org.id),
      });

      const userWithRelations = await prisma.user.findUnique({
        where: { id: user.id },
        include: { organisation: true },
      });

      expect(userWithRelations?.organisation).toBeDefined();
      expect(userWithRelations?.organisation.id).toBe(org.id);
    });
  });

  describe("Project", () => {
    it("should create a project", async () => {
      const org = await prisma.organisation.create({
        data: createTestOrganisation(),
      });

      const owner = await prisma.user.create({
        data: createTestUser(org.id),
      });

      const projectData = createTestProject(org.id, owner.id);
      const project = await prisma.project.create({ data: projectData });

      expect(project).toBeDefined();
      expect(project.name).toBe(projectData.name);
      expect(project.ownerUserId).toBe(owner.id);
    });

    it("should support project members", async () => {
      const org = await prisma.organisation.create({
        data: createTestOrganisation(),
      });

      const owner = await prisma.user.create({
        data: createTestUser(org.id, { role: "PM" }),
      });

      const member1 = await prisma.user.create({
        data: createTestUser(org.id),
      });

      const member2 = await prisma.user.create({
        data: createTestUser(org.id),
      });

      const project = await prisma.project.create({
        data: {
          ...createTestProject(org.id, owner.id),
          members: {
            connect: [{ id: member1.id }, { id: member2.id }],
          },
        },
      });

      const projectWithMembers = await prisma.project.findUnique({
        where: { id: project.id },
        include: { members: true },
      });

      expect(projectWithMembers?.members).toHaveLength(2);
    });
  });

  describe("Activity & Task Hierarchy", () => {
    it("should create activities and tasks with proper hierarchy", async () => {
      const org = await prisma.organisation.create({
        data: createTestOrganisation(),
      });

      const owner = await prisma.user.create({
        data: createTestUser(org.id),
      });

      const project = await prisma.project.create({
        data: createTestProject(org.id, owner.id),
      });

      const activity = await prisma.activity.create({
        data: createTestActivity(project.id),
      });

      const task = await prisma.task.create({
        data: createTestTask(activity.id, {
          assigneeUserId: owner.id,
        }),
      });

      expect(task.activityId).toBe(activity.id);
      expect(task.assigneeUserId).toBe(owner.id);

      // Verify relationships
      const activityWithTasks = await prisma.activity.findUnique({
        where: { id: activity.id },
        include: { tasks: true },
      });

      expect(activityWithTasks?.tasks).toHaveLength(1);
      expect(activityWithTasks?.tasks[0].id).toBe(task.id);
    });
  });

  describe("Dependencies", () => {
    it("should create activity dependencies", async () => {
      const org = await prisma.organisation.create({
        data: createTestOrganisation(),
      });

      const owner = await prisma.user.create({
        data: createTestUser(org.id),
      });

      const project = await prisma.project.create({
        data: createTestProject(org.id, owner.id),
      });

      const activity1 = await prisma.activity.create({
        data: createTestActivity(project.id, { name: "Activity 1" }),
      });

      const activity2 = await prisma.activity.create({
        data: createTestActivity(project.id, { name: "Activity 2" }),
      });

      const dependency = await prisma.dependency.create({
        data: {
          activityPredecessorId: activity1.id,
          activitySuccessorId: activity2.id,
          dependencyType: "FS",
          lag: 0,
        },
      });

      expect(dependency.dependencyType).toBe("FS");
      expect(dependency.activityPredecessorId).toBe(activity1.id);
    });

    it("should create task dependencies", async () => {
      const org = await prisma.organisation.create({
        data: createTestOrganisation(),
      });

      const owner = await prisma.user.create({
        data: createTestUser(org.id),
      });

      const project = await prisma.project.create({
        data: createTestProject(org.id, owner.id),
      });

      const activity = await prisma.activity.create({
        data: createTestActivity(project.id),
      });

      const task1 = await prisma.task.create({
        data: createTestTask(activity.id, { name: "Task 1" }),
      });

      const task2 = await prisma.task.create({
        data: createTestTask(activity.id, { name: "Task 2" }),
      });

      const dependency = await prisma.dependency.create({
        data: {
          taskPredecessorId: task1.id,
          taskSuccessorId: task2.id,
          dependencyType: "FS",
          lag: 8, // 8 hours lag
        },
      });

      expect(dependency.taskPredecessorId).toBe(task1.id);
      expect(dependency.lag).toBe(8);
    });
  });

  describe("Baselines", () => {
    it("should create project baselines with snapshots", async () => {
      const org = await prisma.organisation.create({
        data: createTestOrganisation(),
      });

      const owner = await prisma.user.create({
        data: createTestUser(org.id),
      });

      const project = await prisma.project.create({
        data: createTestProject(org.id, owner.id),
      });

      const baseline = await prisma.projectBaseline.create({
        data: {
          projectId: project.id,
          name: "Baseline 1",
        },
      });

      const snapshot = await prisma.baselineSnapshot.create({
        data: {
          baselineId: baseline.id,
          data: {
            summary: "Initial baseline snapshot",
          },
        },
      });

      expect(snapshot.baselineId).toBe(baseline.id);

      const baselineWithSnapshots = await prisma.projectBaseline.findUnique({
        where: { id: baseline.id },
        include: { snapshots: true },
      });

      expect(baselineWithSnapshots?.snapshots).toHaveLength(1);
    });
  });

  describe("Audit Logs", () => {
    it("should create audit logs", async () => {
      const org = await prisma.organisation.create({
        data: createTestOrganisation(),
      });

      const user = await prisma.user.create({
        data: createTestUser(org.id),
      });

      const auditLog = await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "CREATE",
          entityType: "Project",
          entityId: "project-123",
          changes: {
            before: {},
            after: { name: "New Project" },
          },
        },
      });

      expect(auditLog.action).toBe("CREATE");
      expect(auditLog.entityType).toBe("Project");
    });
  });

  describe("Refresh Tokens", () => {
    it("should create refresh tokens", async () => {
      const org = await prisma.organisation.create({
        data: createTestOrganisation(),
      });

      const user = await prisma.user.create({
        data: createTestUser(org.id),
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const token = await prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: "refresh-token-123",
          expiresAt,
        },
      });

      expect(token.userId).toBe(user.id);

      // Verify uniqueness
      expect(
        prisma.refreshToken.create({
          data: {
            userId: user.id,
            token: "refresh-token-123",
            expiresAt,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe("Cascade Deletes", () => {
    it("should cascade delete when organisation is deleted", async () => {
      const org = await prisma.organisation.create({
        data: createTestOrganisation(),
      });

      const user = await prisma.user.create({
        data: createTestUser(org.id),
      });

      // Delete organisation
      await prisma.organisation.delete({ where: { id: org.id } });

      // User should be deleted
      const deletedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(deletedUser).toBeNull();
    });

    it("should cascade delete project data", async () => {
      const org = await prisma.organisation.create({
        data: createTestOrganisation(),
      });

      const owner = await prisma.user.create({
        data: createTestUser(org.id),
      });

      const project = await prisma.project.create({
        data: createTestProject(org.id, owner.id),
      });

      const activity = await prisma.activity.create({
        data: createTestActivity(project.id),
      });

      // Delete project
      await prisma.project.delete({ where: { id: project.id } });

      // Activity should be deleted
      const deletedActivity = await prisma.activity.findUnique({
        where: { id: activity.id },
      });

      expect(deletedActivity).toBeNull();
    });
  });
});
