// ABOUTME: Service for instantiating projects from templates
// ABOUTME: Creates real projects with activities and tasks from template definitions

import { prisma } from "@/lib/prisma";
import { BaseService } from "./base.service";
import { projectService } from "./project.service";
import { activityService } from "./activity.service";
import { taskService } from "./task.service";
import { dependencyService } from "./dependency.service";
import { calendarService, CalendarConfig } from "./calendar.service";
import { ProjectTemplate, TemplateActivity, TemplateTask } from "./template.service";
import { addDays } from "date-fns";

export interface InstantiationOptions {
  projectName: string;
  startDate: Date;
  ownerUserId: string;
  memberUserIds?: string[];
  timezone?: string;
}

export interface InstantiationResult {
  projectId: string;
  activityCount: number;
  taskCount: number;
  dependencyCount: number;
  totalDurationHours: number;
  estimatedEndDate: Date;
}

export class InstantiationService extends BaseService {
  /**
   * Instantiate a project from a template
   */
  async instantiateProject(
    template: ProjectTemplate,
    options: InstantiationOptions
  ): Promise<InstantiationResult> {
    try {
      // Validate options
      this.validateInstantiationOptions(options);

      // Get calendar for date calculations
      const calendar = await calendarService.getOrganisationCalendar(
        template.organisationId
      );

      // Create the project
      const project = await projectService.create({
        name: options.projectName,
        description: `Created from template: ${template.name}`,
        organisationId: template.organisationId,
        ownerUserId: options.ownerUserId,
        startDate: options.startDate,
        timezone: options.timezone || calendar.timezone,
        memberUserIds: options.memberUserIds,
      });

      // Map template items to real IDs
      const activityMap = new Map<string, string>();
      const taskMap = new Map<string, string>();

      // Create activities
      let currentDate = new Date(options.startDate);
      for (const templateActivity of template.activities) {
        const activity = await activityService.create({
          projectId: project.id,
          name: templateActivity.name,
          description: templateActivity.description,
          startDate: currentDate,
          endDate: await calendarService.addWorkingTime(
            currentDate,
            templateActivity.durationHours,
            calendar,
            template.organisationId
          ),
          status: "NOT_STARTED",
          verificationChecklist: {
            items: templateActivity.checklistItems || [],
          },
        });

        activityMap.set(templateActivity.id, activity.id);

        // Move to next activity
        currentDate = activity.endDate;
      }

      // Create tasks within activities
      for (const templateTask of template.tasks) {
        const realActivityId = activityMap.get(templateTask.activityId);
        if (!realActivityId) {
          throw new Error(`Invalid activity reference in template: ${templateTask.activityId}`);
        }

        const activity = await activityService.getById(realActivityId);
        if (!activity) {
          throw new Error(`Activity not found: ${realActivityId}`);
        }

        // Distribute task start date within activity window
        let taskStartDate = new Date(activity.startDate);

        const task = await taskService.create({
          activityId: realActivityId,
          name: templateTask.name,
          description: templateTask.description,
          startDate: taskStartDate,
          endDate: await calendarService.addWorkingTime(
            taskStartDate,
            templateTask.durationHours,
            calendar,
            template.organisationId
          ),
          duration: templateTask.durationHours,
          status: "NOT_STARTED",
        });

        taskMap.set(templateTask.id, task.id);
      }

      // Create dependencies
      let dependencyCount = 0;
      for (const templateDep of template.dependencies) {
        const fromId = templateDep.fromType === "activity"
          ? activityMap.get(templateDep.fromId)
          : taskMap.get(templateDep.fromId);

        const toId = templateDep.toType === "activity"
          ? activityMap.get(templateDep.toId)
          : taskMap.get(templateDep.toId);

        if (!fromId || !toId) {
          console.warn(`Skipping dependency due to missing reference: ${templateDep.fromId} -> ${templateDep.toId}`);
          continue;
        }

        try {
          if (templateDep.fromType === "activity" && templateDep.toType === "activity") {
            await dependencyService.createActivityDependency({
              predecessorId: fromId,
              successorId: toId,
              type: templateDep.type,
              lag: templateDep.lag,
            });
          } else if (templateDep.fromType === "task" && templateDep.toType === "task") {
            await dependencyService.createTaskDependency({
              predecessorId: fromId,
              successorId: toId,
              type: templateDep.type,
              lag: templateDep.lag,
            });
          }
          // Mixed dependencies (activity to task) are not supported
          dependencyCount++;
        } catch (error) {
          console.warn(`Failed to create dependency: ${error}`);
        }
      }

      // Calculate estimated end date
      const allActivities = await activityService.getByProject(project.id);
      const latestActivity = allActivities.data.reduce((latest, current) => {
        return current.endDate > latest.endDate ? current : latest;
      }, allActivities.data[0]);

      const estimatedEndDate = latestActivity?.endDate || new Date(options.startDate);

      return {
        projectId: project.id,
        activityCount: template.activities.length,
        taskCount: template.tasks.length,
        dependencyCount,
        totalDurationHours: template.estimatedDurationHours,
        estimatedEndDate,
      };
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Validate instantiation options
   */
  private validateInstantiationOptions(options: InstantiationOptions): void {
    if (!options.projectName || options.projectName.trim().length === 0) {
      throw new Error("Project name is required");
    }

    if (!options.startDate) {
      throw new Error("Start date is required");
    }

    if (options.startDate < new Date()) {
      throw new Error("Start date cannot be in the past");
    }

    if (!options.ownerUserId) {
      throw new Error("Owner user ID is required");
    }
  }

  /**
   * Preview instantiation without creating
   */
  async previewInstantiation(
    template: ProjectTemplate,
    options: InstantiationOptions
  ): Promise<{
    summary: InstantiationResult;
    activities: Array<{ name: string; startDate: Date; endDate: Date; taskCount: number }>;
  }> {
    try {
      this.validateInstantiationOptions(options);

      const calendar = await calendarService.getOrganisationCalendar(
        template.organisationId
      );

      // Calculate dates without creating
      let currentDate = new Date(options.startDate);
      const activities = [];

      for (const templateActivity of template.activities) {
        const startDate = new Date(currentDate);
        const endDate = await calendarService.addWorkingTime(
          currentDate,
          templateActivity.durationHours,
          calendar,
          template.organisationId
        );

        const taskCount = template.tasks.filter(
          (t) => t.activityId === templateActivity.id
        ).length;

        activities.push({
          name: templateActivity.name,
          startDate,
          endDate,
          taskCount,
        });

        currentDate = new Date(endDate);
      }

      const estimatedEndDate = activities[activities.length - 1]?.endDate || new Date(options.startDate);

      return {
        summary: {
          projectId: "PREVIEW",
          activityCount: template.activities.length,
          taskCount: template.tasks.length,
          dependencyCount: template.dependencies.length,
          totalDurationHours: template.estimatedDurationHours,
          estimatedEndDate,
        },
        activities,
      };
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Get template recommendations based on project characteristics
   */
  async getRecommendedTemplates(
    organisationId: string,
    projectCharacteristics: {
      estimatedDurationHours?: number;
      complexity?: "simple" | "moderate" | "complex";
    }
  ): Promise<ProjectTemplate[]> {
    try {
      // This would query templates and rank by match
      // For MVP, return all templates for organisation
      const allTemplates = await (prisma as any).templateProject
        ?.findMany({
          where: { organisationId },
        })
        .catch(() => []);

      if (!allTemplates) {
        return [];
      }

      const templates = allTemplates.map((t: any) => JSON.parse(t.templateData));

      // Simple ranking: prefer templates with similar duration
      if (projectCharacteristics.estimatedDurationHours) {
        return templates.sort((a: ProjectTemplate, b: ProjectTemplate) => {
          const aDiff = Math.abs(
            a.estimatedDurationHours - (projectCharacteristics.estimatedDurationHours || 0)
          );
          const bDiff = Math.abs(
            b.estimatedDurationHours - (projectCharacteristics.estimatedDurationHours || 0)
          );
          return aDiff - bDiff;
        });
      }

      return templates;
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Validate template can be instantiated in given organisation
   */
  async validateTemplateForOrganisation(
    template: ProjectTemplate,
    organisationId: string
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check organisation exists
    const org = await prisma.organisation.findUnique({
      where: { id: organisationId },
    });

    if (!org) {
      errors.push("Organisation not found");
      return { valid: false, errors };
    }

    // Check template is for same organisation
    if (template.organisationId !== organisationId) {
      errors.push("Template belongs to different organisation");
    }

    // Check all required roles exist (future enhancement)
    const requiredRoles = new Set(
      template.tasks.map((t) => t.requiredRole).filter((r) => r)
    );

    if (requiredRoles.size > 0) {
      // Would check if users with these roles exist in organisation
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const instantiationService = new InstantiationService();
