// ABOUTME: Service for Activity entity CRUD operations
// ABOUTME: Handles activity management within projects with nested task queries

import { prisma } from "@/lib/prisma";
import { BaseService, PaginationParams, PaginatedResponse } from "./base.service";
import { Activity, Status, TrackingStatus } from "@prisma/client";

export interface ActivityFilters {
  projectId: string;
  status?: Status;
  trackingStatus?: TrackingStatus;
  search?: string;
}

export class ActivityService extends BaseService {
  /**
   * Create a new activity
   */
  async create(data: {
    projectId: string;
    name: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    status?: Status;
  }): Promise<Activity> {
    try {
      return await prisma.activity.create({
        data: {
          projectId: data.projectId,
          name: data.name,
          description: data.description,
          startDate: data.startDate,
          endDate: data.endDate,
          status: data.status || "NOT_STARTED",
        },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Get activity by ID
   */
  async getById(id: string): Promise<Activity | null> {
    try {
      return await prisma.activity.findUnique({
        where: { id },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Get activities in project (filtered & paginated)
   */
  async getByProject(
    projectId: string,
    filters: Partial<ActivityFilters> = {},
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<Activity>> {
    const skip = params.skip || 0;
    const take = params.take || 20;

    const where: any = { projectId };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.trackingStatus) {
      where.trackingStatus = filters.trackingStatus;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    try {
      const [activities, total] = await Promise.all([
        prisma.activity.findMany({
          where,
          skip,
          take,
          orderBy: this.buildOrderBy(params.sortBy || "startDate", params.sortOrder),
        }),
        prisma.activity.count({ where }),
      ]);

      return this.createPaginatedResponse(activities, total, skip, take);
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Update activity
   */
  async update(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      startDate: Date;
      endDate: Date;
      status: Status;
      trackingStatus: TrackingStatus;
      progressPercentage: number;
      verificationChecklist: unknown;
    }>
  ): Promise<Activity> {
    try {
      return await prisma.activity.update({
        where: { id },
        data,
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Delete activity (cascades to tasks)
   */
  async delete(id: string): Promise<Activity> {
    try {
      return await prisma.activity.delete({
        where: { id },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Get activity with tasks and dependencies
   */
  async getWithRelations(id: string) {
    try {
      return await prisma.activity.findUnique({
        where: { id },
        include: {
          project: true,
          tasks: {
            include: {
              assignee: true,
              predecessorDeps: true,
              successorDeps: true,
            },
          },
          predecessorDeps: {
            include: {
              activityPredecessor: true,
            },
          },
          successorDeps: {
            include: {
              activitySuccessor: true,
            },
          },
        },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Get activities ordered by start date
   */
  async getOrdered(projectId: string): Promise<Activity[]> {
    try {
      return await prisma.activity.findMany({
        where: { projectId },
        orderBy: { startDate: "asc" },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Update activity progress from child tasks
   */
  async updateProgressFromTasks(activityId: string): Promise<Activity> {
    try {
      // Get all tasks
      const tasks = await prisma.task.findMany({
        where: { activityId },
        select: { progressPercentage: true },
      });

      // Calculate average progress
      const avgProgress =
        tasks.length > 0
          ? tasks.reduce((sum, t) => sum + t.progressPercentage, 0) / tasks.length
          : 0;

      return await prisma.activity.update({
        where: { activityId },
        data: { progressPercentage: avgProgress },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }
}

export const activityService = new ActivityService();
