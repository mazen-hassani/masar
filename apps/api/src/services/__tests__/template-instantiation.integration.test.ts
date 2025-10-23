// ABOUTME: Integration tests for template and instantiation services
// ABOUTME: Tests template CRUD, validation, and project instantiation

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  resetDatabase,
  disconnectDatabase,
  createTestOrganisation,
  createTestUser,
  createTestProject,
} from "@/lib/test-utils";
import { templateService } from "../template.service";
import { instantiationService } from "../instantiation.service";
import { calendarService } from "../calendar.service";
import { DependencyType, Status } from "@prisma/client";
import { addDays } from "date-fns";

describe("Template & Instantiation Integration Tests", () => {
  let organisationId: string;
  let userId: string;

  beforeEach(async () => {
    await resetDatabase();

    const org = await createTestOrganisation();
    organisationId = org.id;

    const user = await createTestUser(organisationId);
    userId = user.id;
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe("Template Creation", () => {
    it("should create a simple template", async () => {
      const template = await templateService.createTemplate({
        name: "Basic Website Project",
        description: "Simple 3-phase website project",
        organisationId,
        activities: [
          { id: "design", name: "Design", durationHours: 40, order: 1 },
          { id: "dev", name: "Development", durationHours: 80, order: 2 },
          { id: "test", name: "Testing", durationHours: 20, order: 3 },
        ],
        tasks: [
          { id: "design-1", activityId: "design", name: "Wireframes", durationHours: 16 },
          { id: "design-2", activityId: "design", name: "Visual Design", durationHours: 24 },
          { id: "dev-1", activityId: "dev", name: "Frontend", durationHours: 40 },
          { id: "dev-2", activityId: "dev", name: "Backend", durationHours: 40 },
          { id: "test-1", activityId: "test", name: "QA Testing", durationHours: 20 },
        ],
      });

      expect(template).toBeDefined();
      expect(template.name).toBe("Basic Website Project");
      expect(template.activities).toHaveLength(3);
      expect(template.tasks).toHaveLength(5);
      expect(template.estimatedDurationHours).toBeGreaterThan(0);
    });

    it("should reject template with duplicate activity IDs", async () => {
      await expect(
        templateService.createTemplate({
          name: "Invalid Template",
          organisationId,
          activities: [
            { id: "same", name: "Activity 1", durationHours: 10, order: 1 },
            { id: "same", name: "Activity 2", durationHours: 10, order: 2 },
          ],
          tasks: [],
        })
      ).rejects.toThrow("unique");
    });

    it("should reject task with invalid activity reference", async () => {
      await expect(
        templateService.createTemplate({
          name: "Invalid Template",
          organisationId,
          activities: [{ id: "design", name: "Design", durationHours: 10, order: 1 }],
          tasks: [
            { id: "task-1", activityId: "nonexistent", name: "Task", durationHours: 5 },
          ],
        })
      ).rejects.toThrow("invalid activity");
    });

    it("should detect circular dependencies", async () => {
      await expect(
        templateService.createTemplate({
          name: "Circular Template",
          organisationId,
          activities: [
            { id: "a", name: "Activity A", durationHours: 10, order: 1 },
            { id: "b", name: "Activity B", durationHours: 10, order: 2 },
            { id: "c", name: "Activity C", durationHours: 10, order: 3 },
          ],
          tasks: [],
          dependencies: [
            { id: "d1", fromId: "a", toId: "b", type: DependencyType.FS, fromType: "activity", toType: "activity" },
            { id: "d2", fromId: "b", toId: "c", type: DependencyType.FS, fromType: "activity", toType: "activity" },
            { id: "d3", fromId: "c", toId: "a", type: DependencyType.FS, fromType: "activity", toType: "activity" },
          ],
        })
      ).rejects.toThrow("circular");
    });

    it("should allow valid linear dependencies", async () => {
      const template = await templateService.createTemplate({
        name: "Dependent Template",
        organisationId,
        activities: [
          { id: "a", name: "Design", durationHours: 10, order: 1 },
          { id: "b", name: "Development", durationHours: 20, order: 2 },
          { id: "c", name: "Testing", durationHours: 10, order: 3 },
        ],
        tasks: [],
        dependencies: [
          { id: "d1", fromId: "a", toId: "b", type: DependencyType.FS, fromType: "activity", toType: "activity" },
          { id: "d2", fromId: "b", toId: "c", type: DependencyType.FS, fromType: "activity", toType: "activity" },
        ],
      });

      expect(template.dependencies).toHaveLength(2);
    });
  });

  describe("Template Retrieval & Management", () => {
    beforeEach(async () => {
      // Create test templates
      await templateService.createTemplate({
        name: "Template 1",
        organisationId,
        activities: [{ id: "a", name: "Activity", durationHours: 10, order: 1 }],
        tasks: [],
      });

      await templateService.createTemplate({
        name: "Template 2",
        organisationId,
        activities: [{ id: "a", name: "Activity", durationHours: 10, order: 1 }],
        tasks: [],
      });
    });

    it("should retrieve templates by organisation", async () => {
      const result = await templateService.getTemplatesByOrganisation(organisationId);

      expect(result.total).toBeGreaterThanOrEqual(2);
      expect(result.data).toHaveLength(result.data.length);
    });

    it("should search templates by name", async () => {
      const result = await templateService.searchTemplates(organisationId, "Template 1");

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0].name).toContain("Template 1");
    });

    it("should update template", async () => {
      const templates = await templateService.getTemplatesByOrganisation(organisationId);
      const template = templates.data[0];

      const updated = await templateService.updateTemplate(template.id, {
        name: "Updated Template Name",
        description: "New description",
      });

      expect(updated.name).toBe("Updated Template Name");
      expect(updated.description).toBe("New description");
    });

    it("should delete template", async () => {
      const templates = await templateService.getTemplatesByOrganisation(organisationId);
      const template = templates.data[0];

      await templateService.deleteTemplate(template.id);

      const deleted = await templateService.getTemplate(template.id);
      expect(deleted).toBeNull();
    });
  });

  describe("Project Instantiation", () => {
    let template: any;

    beforeEach(async () => {
      template = await templateService.createTemplate({
        name: "Test Template",
        description: "Template for testing instantiation",
        organisationId,
        activities: [
          { id: "design", name: "Design Phase", durationHours: 16, order: 1 },
          { id: "dev", name: "Development Phase", durationHours: 32, order: 2 },
          { id: "test", name: "Testing Phase", durationHours: 8, order: 3 },
        ],
        tasks: [
          { id: "t1", activityId: "design", name: "UI Design", durationHours: 8 },
          { id: "t2", activityId: "design", name: "UX Research", durationHours: 8 },
          { id: "t3", activityId: "dev", name: "Backend Dev", durationHours: 16 },
          { id: "t4", activityId: "dev", name: "Frontend Dev", durationHours: 16 },
          { id: "t5", activityId: "test", name: "QA", durationHours: 8 },
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
            toId: "test",
            type: DependencyType.FS,
            fromType: "activity",
            toType: "activity",
          },
        ],
      });
    });

    it("should instantiate project from template", async () => {
      const startDate = new Date("2024-01-15");
      const result = await instantiationService.instantiateProject(template, {
        projectName: "New Website",
        startDate,
        ownerUserId: userId,
      });

      expect(result.projectId).toBeDefined();
      expect(result.activityCount).toBe(3);
      expect(result.taskCount).toBe(5);
      expect(result.dependencyCount).toBeGreaterThanOrEqual(0);
      expect(result.estimatedEndDate).toBeGreaterThan(startDate);
    });

    it("should create activities in correct order", async () => {
      const startDate = new Date("2024-01-15");
      const result = await instantiationService.instantiateProject(template, {
        projectName: "Ordered Project",
        startDate,
        ownerUserId: userId,
      });

      expect(result.activityCount).toBe(3);
    });

    it("should validate instantiation options", async () => {
      // Missing project name
      await expect(
        instantiationService.instantiateProject(template, {
          projectName: "",
          startDate: new Date(),
          ownerUserId: userId,
        })
      ).rejects.toThrow();

      // Past start date
      await expect(
        instantiationService.instantiateProject(template, {
          projectName: "Project",
          startDate: new Date("2000-01-01"),
          ownerUserId: userId,
        })
      ).rejects.toThrow();
    });

    it("should preview instantiation without creating", async () => {
      const startDate = new Date("2024-01-15");
      const preview = await instantiationService.previewInstantiation(template, {
        projectName: "Preview Project",
        startDate,
        ownerUserId: userId,
      });

      expect(preview.summary.projectId).toBe("PREVIEW");
      expect(preview.summary.activityCount).toBe(3);
      expect(preview.summary.taskCount).toBe(5);
      expect(preview.activities).toHaveLength(3);
      expect(preview.activities[0].name).toBe("Design Phase");
      expect(preview.activities[1].name).toBe("Development Phase");
      expect(preview.activities[2].name).toBe("Testing Phase");
    });

    it("should add team members to instantiated project", async () => {
      const member1 = await createTestUser(organisationId);
      const member2 = await createTestUser(organisationId);

      const startDate = new Date("2024-01-15");
      const result = await instantiationService.instantiateProject(template, {
        projectName: "Team Project",
        startDate,
        ownerUserId: userId,
        memberUserIds: [member1.id, member2.id],
      });

      expect(result.projectId).toBeDefined();
    });
  });

  describe("Template Recommendations", () => {
    beforeEach(async () => {
      // Create templates with different sizes
      await templateService.createTemplate({
        name: "Small Template",
        organisationId,
        activities: [{ id: "a", name: "Activity", durationHours: 10, order: 1 }],
        tasks: [],
      });

      await templateService.createTemplate({
        name: "Large Template",
        organisationId,
        activities: [{ id: "a", name: "Activity", durationHours: 100, order: 1 }],
        tasks: [],
      });
    });

    it("should get recommended templates", async () => {
      const recommendations = await instantiationService.getRecommendedTemplates(
        organisationId,
        { estimatedDurationHours: 50 }
      );

      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("Template Validation", () => {
    it("should validate template can be instantiated", async () => {
      const template = await templateService.createTemplate({
        name: "Valid Template",
        organisationId,
        activities: [{ id: "a", name: "Activity", durationHours: 10, order: 1 }],
        tasks: [],
      });

      const validation = await instantiationService.validateTemplateForOrganisation(
        template,
        organisationId
      );

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("should reject template from different organisation", async () => {
      const otherOrg = await createTestOrganisation();

      const template = await templateService.createTemplate({
        name: "Other Org Template",
        organisationId: otherOrg.id,
        activities: [{ id: "a", name: "Activity", durationHours: 10, order: 1 }],
        tasks: [],
      });

      const validation = await instantiationService.validateTemplateForOrganisation(
        template,
        organisationId
      );

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Clone Project as Template", () => {
    it("should clone existing project as template", async () => {
      // Create a project first
      const project = await createTestProject(organisationId, userId);

      // Clone it
      const template = await templateService.cloneProjectAsTemplate(
        project.id,
        "Cloned Template"
      );

      expect(template).toBeDefined();
      expect(template.name).toBe("Cloned Template");
      expect(template.description).toContain(project.name);
    });
  });
});
