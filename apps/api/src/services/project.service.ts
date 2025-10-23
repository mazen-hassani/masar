// ABOUTME: Service for Project entity CRUD operations and queries
// ABOUTME: Handles project management, filtering, and complex queries

import { prisma } from "@/lib/prisma";
import { BaseService, PaginationParams, PaginatedResponse } from "./base.service";
import { Project, Status } from "@prisma/client";

export interface ProjectFilters {
  organisationId: string;
  status?: Status;
  ownerUserId?: string;
  search?: string;
}

export class ProjectService extends BaseService {
  /**
   * Create a new project
   */
  async create(data: {
    name: string;
    description?: string;
    organisationId: string;
    ownerUserId: string;
    startDate: Date;
    timezone?: string;
    memberUserIds?: string[];
  }): Promise<Project> {
    try {
      return await prisma.project.create({
        data: {
          name: data.name,
          description: data.description,
          organisationId: data.organisationId,
          ownerUserId: data.ownerUserId,
          startDate: data.startDate,
          timezone: data.timezone || "UTC",
          members: data.memberUserIds
            ? {
                connect: data.memberUserIds.map((id) => ({ id })),
              }
            : undefined,
        },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Get project by ID
   */
  async getById(id: string): Promise<Project | null> {
    try {
      return await prisma.project.findUnique({
        where: { id },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Get projects by organisation (filtered & paginated)
   */
  async getByOrganisation(
    organisationId: string,
    filters: Partial<ProjectFilters> = {},
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<Project>> {
    const skip = params.skip || 0;
    const take = params.take || 20;

    const where: any = { organisationId };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.ownerUserId) {
      where.ownerUserId = filters.ownerUserId;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    try {
      const [projects, total] = await Promise.all([
        prisma.project.findMany({
          where,
          skip,
          take,
          orderBy: this.buildOrderBy(params.sortBy, params.sortOrder),
        }),
        prisma.project.count({ where }),
      ]);

      return this.createPaginatedResponse(projects, total, skip, take);
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Get projects assigned to user
   */
  async getByMember(
    userId: string,
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<Project>> {
    const skip = params.skip || 0;
    const take = params.take || 20;

    try {
      const [projects, total] = await Promise.all([
        prisma.project.findMany({
          where: {
            members: {
              some: { id: userId },
            },
          },
          skip,
          take,
          orderBy: this.buildOrderBy(params.sortBy, params.sortOrder),
        }),
        prisma.project.count({
          where: {
            members: {
              some: { id: userId },
            },
          },
        }),
      ]);

      return this.createPaginatedResponse(projects, total, skip, take);
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Update project
   */
  async update(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      status: Status;
      progressPercentage: number;
      timezone: string;
    }>
  ): Promise<Project> {
    try {
      return await prisma.project.update({
        where: { id },
        data,
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Delete project (cascades)
   */
  async delete(id: string): Promise<Project> {
    try {
      return await prisma.project.delete({
        where: { id },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Add member to project
   */
  async addMember(projectId: string, userId: string): Promise<void> {
    try {
      await prisma.project.update({
        where: { id: projectId },
        data: {
          members: {
            connect: { id: userId },
          },
        },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Remove member from project
   */
  async removeMember(projectId: string, userId: string): Promise<void> {
    try {
      await prisma.project.update({
        where: { id: projectId },
        data: {
          members: {
            disconnect: { id: userId },
          },
        },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Get project with all relations
   */
  async getWithRelations(id: string) {
    try {
      return await prisma.project.findUnique({
        where: { id },
        include: {
          organisation: true,
          owner: true,
          members: true,
          activities: {
            include: {
              tasks: true,
            },
          },
          baselines: {
            include: {
              snapshots: true,
            },
          },
        },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Get project summary (for dashboard)
   */
  async getSummary(id: string) {
    try {
      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          activities: {
            select: {
              id: true,
              status: true,
              progressPercentage: true,
              tasks: {
                select: {
                  status: true,
                  progressPercentage: true,
                },
              },
            },
          },
          members: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      if (!project) return null;

      // Calculate metrics
      const allTasks = project.activities.flatMap((a) => a.tasks);
      const completedActivities = project.activities.filter((a) => a.status === "COMPLETED").length;
      const completedTasks = allTasks.filter((t) => t.status === "COMPLETED").length;

      return {
        ...project,
        metrics: {
          totalActivities: project.activities.length,
          completedActivities,
          totalTasks: allTasks.length,
          completedTasks,
          averageProgress: allTasks.length > 0
            ? allTasks.reduce((sum, t) => sum + t.progressPercentage, 0) / allTasks.length
            : 0,
        },
      };
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }
}

export const projectService = new ProjectService();
