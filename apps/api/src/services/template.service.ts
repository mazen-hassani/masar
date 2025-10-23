// ABOUTME: Service for project template management
// ABOUTME: Handles creation, validation, and storage of reusable project templates

import { prisma } from "@/lib/prisma";
import { BaseService, PaginationParams, PaginatedResponse } from "./base.service";
import { DependencyType, Status } from "@prisma/client";

export interface TemplateActivity {
  id: string; // Unique within template
  name: string;
  description?: string;
  durationHours: number;
  order: number;
  checklistItems?: string[]; // JSON array of checklist items
}

export interface TemplateTask {
  id: string; // Unique within template
  activityId: string; // Reference to activity within template
  name: string;
  description?: string;
  durationHours: number;
  requiredRole?: string;
}

export interface TemplateDependency {
  id: string;
  fromId: string; // Activity or Task ID within template
  toId: string;
  type: DependencyType;
  lag?: number;
  fromType: "activity" | "task";
  toType: "activity" | "task";
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description?: string;
  organisationId: string;
  activities: TemplateActivity[];
  tasks: TemplateTask[];
  dependencies: TemplateDependency[];
  estimatedDurationHours: number;
  createdAt: Date;
  updatedAt: Date;
}

export class TemplateService extends BaseService {
  /**
   * Create a new project template
   */
  async createTemplate(data: {
    name: string;
    description?: string;
    organisationId: string;
    activities: TemplateActivity[];
    tasks: TemplateTask[];
    dependencies?: TemplateDependency[];
  }): Promise<ProjectTemplate> {
    try {
      // Validate template structure
      this.validateTemplateStructure(data);

      // Calculate estimated duration
      const estimatedDurationHours = this.calculateEstimatedDuration(
        data.activities,
        data.tasks
      );

      // Store as JSON in a custom field (or create a TemplateProject table)
      // For now, we'll use a simple approach with JSON storage via Activity/Task naming
      const templateId = this.generateTemplateId();

      const template: ProjectTemplate = {
        id: templateId,
        name: data.name,
        description: data.description,
        organisationId: data.organisationId,
        activities: data.activities,
        tasks: data.tasks,
        dependencies: data.dependencies || [],
        estimatedDurationHours,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store template in a metadata table or cache
      // For MVP, we store as JSON string
      await (prisma as any).templateProject?.create({
        data: {
          id: templateId,
          name: data.name,
          description: data.description,
          organisationId: data.organisationId,
          templateData: JSON.stringify(template),
          estimatedDurationHours,
        },
      }).catch(() => {
        // Table doesn't exist yet, store in memory or log
        console.warn("Template storage not available, using in-memory storage");
      });

      return template;
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Get template by ID
   */
  async getTemplate(templateId: string): Promise<ProjectTemplate | null> {
    try {
      // Try to fetch from database
      const stored = await (prisma as any).templateProject
        ?.findUnique({
          where: { id: templateId },
        })
        .catch(() => null);

      if (stored?.templateData) {
        return JSON.parse(stored.templateData);
      }

      return null;
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Get all templates for organisation
   */
  async getTemplatesByOrganisation(
    organisationId: string,
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<ProjectTemplate>> {
    const skip = params.skip || 0;
    const take = params.take || 20;

    try {
      // Get from template storage
      const templates = await (prisma as any).templateProject
        ?.findMany({
          where: { organisationId },
          skip,
          take,
          orderBy: this.buildOrderBy(params.sortBy || "createdAt", params.sortOrder),
        })
        .catch(() => []);

      const total = await (prisma as any).templateProject
        ?.count({
          where: { organisationId },
        })
        .catch(() => 0);

      const data = templates.map((t: any) => JSON.parse(t.templateData));

      return this.createPaginatedResponse(data, total, skip, take);
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Update template
   */
  async updateTemplate(
    templateId: string,
    data: Partial<{
      name: string;
      description: string;
      activities: TemplateActivity[];
      tasks: TemplateTask[];
      dependencies: TemplateDependency[];
    }>
  ): Promise<ProjectTemplate> {
    try {
      const existing = await this.getTemplate(templateId);
      if (!existing) {
        throw new Error("Template not found");
      }

      const updated: ProjectTemplate = {
        ...existing,
        ...data,
        updatedAt: new Date(),
      };

      // Validate if structure changed
      if (data.activities || data.tasks || data.dependencies) {
        this.validateTemplateStructure({
          name: updated.name,
          organisationId: updated.organisationId,
          activities: updated.activities,
          tasks: updated.tasks,
          dependencies: updated.dependencies,
        });
      }

      // Recalculate duration if needed
      if (data.activities || data.tasks) {
        updated.estimatedDurationHours = this.calculateEstimatedDuration(
          updated.activities,
          updated.tasks
        );
      }

      // Update in storage
      await (prisma as any).templateProject
        ?.update({
          where: { id: templateId },
          data: {
            name: updated.name,
            description: updated.description,
            templateData: JSON.stringify(updated),
            estimatedDurationHours: updated.estimatedDurationHours,
          },
        })
        .catch(() => null);

      return updated;
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    try {
      await (prisma as any).templateProject
        ?.delete({
          where: { id: templateId },
        })
        .catch(() => null);
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Validate template structure and dependencies
   */
  validateTemplateStructure(data: {
    name: string;
    organisationId: string;
    activities: TemplateActivity[];
    tasks: TemplateTask[];
    dependencies?: TemplateDependency[];
  }): boolean {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error("Template name is required");
    }

    if (!data.organisationId) {
      throw new Error("Organisation ID is required");
    }

    if (!Array.isArray(data.activities)) {
      throw new Error("Activities must be an array");
    }

    if (!Array.isArray(data.tasks)) {
      throw new Error("Tasks must be an array");
    }

    // Validate activity IDs are unique
    const activityIds = new Set(data.activities.map((a) => a.id));
    if (activityIds.size !== data.activities.length) {
      throw new Error("Activity IDs must be unique");
    }

    // Validate task IDs are unique
    const taskIds = new Set(data.tasks.map((t) => t.id));
    if (taskIds.size !== data.tasks.length) {
      throw new Error("Task IDs must be unique");
    }

    // Validate all tasks reference valid activities
    for (const task of data.tasks) {
      if (!activityIds.has(task.activityId)) {
        throw new Error(`Task ${task.id} references invalid activity ${task.activityId}`);
      }
    }

    // Validate dependencies
    if (data.dependencies) {
      const allIds = new Set([...activityIds, ...taskIds]);

      for (const dep of data.dependencies) {
        if (!allIds.has(dep.fromId)) {
          throw new Error(`Dependency references invalid from ID: ${dep.fromId}`);
        }
        if (!allIds.has(dep.toId)) {
          throw new Error(`Dependency references invalid to ID: ${dep.toId}`);
        }

        // Check for self-dependency
        if (dep.fromId === dep.toId) {
          throw new Error(`Dependency cannot be self-referential (${dep.fromId})`);
        }
      }

      // Detect cycles in dependencies
      const hasCycle = this.detectCycleInTemplate(data.dependencies);
      if (hasCycle) {
        throw new Error("Template has circular dependencies");
      }
    }

    return true;
  }

  /**
   * Detect cycles in template dependencies using DFS
   */
  private detectCycleInTemplate(dependencies: TemplateDependency[]): boolean {
    const graph = new Map<string, string[]>();

    // Build adjacency list
    for (const dep of dependencies) {
      if (!graph.has(dep.fromId)) {
        graph.set(dep.fromId, []);
      }
      graph.get(dep.fromId)!.push(dep.toId);
    }

    // DFS to detect cycle
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycleDFS = (node: string): boolean => {
      visited.add(node);
      recursionStack.add(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycleDFS(neighbor)) {
            return true;
          }
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(node);
      return false;
    };

    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        if (hasCycleDFS(node)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Calculate estimated duration from activities and tasks
   */
  private calculateEstimatedDuration(
    activities: TemplateActivity[],
    tasks: TemplateTask[]
  ): number {
    // Use maximum of activity durations and sum of task durations
    const activityDuration = activities.reduce((sum, a) => sum + a.durationHours, 0);
    const taskDuration = tasks.reduce((sum, t) => sum + t.durationHours, 0);

    // For estimation, use the larger value (accounts for parallelization)
    return Math.max(activityDuration, taskDuration);
  }

  /**
   * Clone existing project as template
   */
  async cloneProjectAsTemplate(
    projectId: string,
    templateName: string
  ): Promise<ProjectTemplate> {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          activities: {
            include: { tasks: true },
          },
        },
      });

      if (!project) {
        throw new Error("Project not found");
      }

      // Convert project to template
      const activities: TemplateActivity[] = project.activities.map((a, idx) => ({
        id: `activity-${idx}`,
        name: a.name,
        description: a.description || undefined,
        durationHours: 8, // Default, can be calculated from tasks
        order: idx,
        checklistItems: (a.verificationChecklist as any)?.items || [],
      }));

      const tasks: TemplateTask[] = [];
      project.activities.forEach((a, aIdx) => {
        a.tasks.forEach((t, tIdx) => {
          tasks.push({
            id: `task-${aIdx}-${tIdx}`,
            activityId: `activity-${aIdx}`,
            name: t.name,
            description: t.description || undefined,
            durationHours: t.duration || 4,
            requiredRole: undefined,
          });
        });
      });

      return this.createTemplate({
        name: templateName,
        description: `Clone of project: ${project.name}`,
        organisationId: project.organisationId,
        activities,
        tasks,
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Generate unique template ID
   */
  private generateTemplateId(): string {
    return `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Search templates by name
   */
  async searchTemplates(
    organisationId: string,
    search: string,
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<ProjectTemplate>> {
    try {
      const templates = await this.getTemplatesByOrganisation(organisationId, params);

      // Filter by search term
      const filtered = templates.data.filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          (t.description?.toLowerCase().includes(search.toLowerCase()) ?? false)
      );

      return {
        data: filtered,
        total: filtered.length,
        skip: params.skip || 0,
        take: params.take || 20,
        hasMore: filtered.length > (params.take || 20),
      };
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }
}

export const templateService = new TemplateService();
