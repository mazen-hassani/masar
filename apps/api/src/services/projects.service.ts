// ABOUTME: Service layer for project CRUD operations and business logic
// ABOUTME: Handles project creation, updates, queries, and validation

import { prisma } from "../lib/prisma";
import { Status, Role } from "@prisma/client";

export interface CreateProjectInput {
  name: string;
  description?: string;
  startDate: Date;
  timezone?: string;
  ownerUserId: string;
  organisationId: string;
  memberIds?: string[];
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  startDate?: Date;
  timezone?: string;
  status?: Status;
  progressPercentage?: number;
  memberIds?: string[];
}

export interface ProjectFilters {
  organisationId: string;
  userId?: string;
  status?: Status;
  skip?: number;
  take?: number;
}

export class ProjectsService {
  /**
   * Create a new project
   */
  async createProject(input: CreateProjectInput) {
    // Verify user has permission to create projects (PM or PMO)
    const user = await prisma.user.findUnique({
      where: { id: input.ownerUserId },
    });

    if (!user || (user.role !== Role.PM && user.role !== Role.PMO)) {
      throw new Error("User does not have permission to create projects");
    }

    // Create project
    const project = await prisma.project.create({
      data: {
        name: input.name,
        description: input.description,
        startDate: input.startDate,
        timezone: input.timezone || "UTC",
        status: Status.NOT_STARTED,
        progressPercentage: 0,
        organisationId: input.organisationId,
        ownerUserId: input.ownerUserId,
        members: input.memberIds
          ? {
              connect: input.memberIds.map((id) => ({ id })),
            }
          : undefined,
      },
      include: {
        owner: true,
        members: true,
      },
    });

    return project;
  }

  /**
   * Get project by ID with relationships
   */
  async getProjectById(projectId: string, userId?: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        organisation: true,
        owner: true,
        members: true,
        activities: {
          orderBy: { startDate: "asc" },
        },
      },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    // Check access control
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (
        user?.role !== Role.PMO &&
        project.ownerUserId !== userId &&
        !project.members.some((m) => m.id === userId)
      ) {
        throw new Error("Unauthorized access to project");
      }
    }

    return project;
  }

  /**
   * List projects with filters
   */
  async listProjects(filters: ProjectFilters) {
    const { organisationId, userId, status, skip = 0, take = 50 } = filters;

    const where: any = {
      organisationId,
    };

    // Filter by status if provided
    if (status) {
      where.status = status;
    }

    // Filter by user access
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (user?.role !== Role.PMO) {
        // Non-PMO users see only projects they own or are members of
        where.OR = [
          { ownerUserId: userId },
          { members: { some: { id: userId } } },
        ];
      }
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          owner: true,
          members: { select: { id: true, name: true, email: true } },
          activities: { select: { id: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.project.count({ where }),
    ]);

    return {
      projects,
      pagination: {
        total,
        skip,
        take,
        hasMore: skip + take < total,
      },
    };
  }

  /**
   * Update project
   */
  async updateProject(projectId: string, input: UpdateProjectInput, userId: string) {
    // Get project first to check ownership
    const project = await this.getProjectById(projectId, userId);

    // Only owner or PMO can update
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (user?.role !== Role.PMO && project.ownerUserId !== userId) {
      throw new Error("Unauthorized to update this project");
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.startDate && { startDate: input.startDate }),
        ...(input.timezone && { timezone: input.timezone }),
        ...(input.status && { status: input.status }),
        ...(input.progressPercentage !== undefined && {
          progressPercentage: input.progressPercentage,
        }),
        ...(input.memberIds && {
          members: {
            set: input.memberIds.map((id) => ({ id })),
          },
        }),
      },
      include: {
        owner: true,
        members: true,
        activities: true,
      },
    });

    return updated;
  }

  /**
   * Delete project
   */
  async deleteProject(projectId: string, userId: string) {
    const project = await this.getProjectById(projectId, userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (user?.role !== Role.PMO && project.ownerUserId !== userId) {
      throw new Error("Unauthorized to delete this project");
    }

    // Delete cascade (activities, tasks, dependencies, baselines)
    await prisma.project.delete({
      where: { id: projectId },
    });

    return { message: "Project deleted successfully" };
  }

  /**
   * Get project statistics
   */
  async getProjectStats(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        activities: {
          include: {
            tasks: {
              select: { status: true, progressPercentage: true },
            },
          },
        },
      },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    const totalActivities = project.activities.length;
    const totalTasks = project.activities.reduce((sum, a) => sum + a.tasks.length, 0);

    const completedActivities = project.activities.filter(
      (a) => a.status === Status.COMPLETED || a.status === Status.VERIFIED
    ).length;

    const completedTasks = project.activities.reduce(
      (sum, a) => sum + a.tasks.filter((t) => t.status === Status.COMPLETED || t.status === Status.VERIFIED).length,
      0
    );

    return {
      projectId: project.id,
      name: project.name,
      status: project.status,
      progressPercentage: project.progressPercentage,
      totalActivities,
      completedActivities,
      totalTasks,
      completedTasks,
      activityCompletionRate: totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0,
      taskCompletionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
    };
  }
}

export const projectsService = new ProjectsService();
