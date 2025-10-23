// ABOUTME: Service for Task entity CRUD operations and queries
// ABOUTME: Handles task management, assignment, and complex filtering

import { prisma } from "@/lib/prisma";
import { BaseService, PaginationParams, PaginatedResponse } from "./base.service";
import { Task, Status, TrackingStatus } from "@prisma/client";

export interface TaskFilters {
  activityId?: string;
  assigneeUserId?: string;
  status?: Status;
  trackingStatus?: TrackingStatus;
  search?: string;
}

export class TaskService extends BaseService {
  /**
   * Create a new task
   */
  async create(data: {
    activityId: string;
    name: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    duration: number;
    assigneeUserId?: string;
    status?: Status;
  }): Promise<Task> {
    try {
      return await prisma.task.create({
        data: {
          activityId: data.activityId,
          name: data.name,
          description: data.description,
          startDate: data.startDate,
          endDate: data.endDate,
          duration: data.duration,
          assigneeUserId: data.assigneeUserId,
          status: data.status || "NOT_STARTED",
        },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Get task by ID
   */
  async getById(id: string): Promise<Task | null> {
    try {
      return await prisma.task.findUnique({
        where: { id },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Get tasks in activity
   */
  async getByActivity(
    activityId: string,
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<Task>> {
    const skip = params.skip || 0;
    const take = params.take || 20;

    try {
      const [tasks, total] = await Promise.all([
        prisma.task.findMany({
          where: { activityId },
          skip,
          take,
          orderBy: this.buildOrderBy(params.sortBy || "startDate", params.sortOrder),
        }),
        prisma.task.count({ where: { activityId } }),
      ]);

      return this.createPaginatedResponse(tasks, total, skip, take);
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Get tasks assigned to user
   */
  async getByAssignee(
    assigneeUserId: string,
    filters: Partial<TaskFilters> = {},
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<Task>> {
    const skip = params.skip || 0;
    const take = params.take || 20;

    const where: any = { assigneeUserId };

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
      const [tasks, total] = await Promise.all([
        prisma.task.findMany({
          where,
          skip,
          take,
          orderBy: this.buildOrderBy(params.sortBy || "endDate", params.sortOrder),
          include: { activity: { include: { project: true } } },
        }),
        prisma.task.count({ where }),
      ]);

      return this.createPaginatedResponse(tasks, total, skip, take);
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Get overdue tasks
   */
  async getOverdue(assigneeUserId?: string): Promise<Task[]> {
    const now = new Date();
    const where: any = {
      endDate: { lt: now },
      status: { not: "COMPLETED" },
    };

    if (assigneeUserId) {
      where.assigneeUserId = assigneeUserId;
    }

    try {
      return await prisma.task.findMany({
        where,
        orderBy: { endDate: "asc" },
        include: { activity: { include: { project: true } } },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Update task
   */
  async update(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      startDate: Date;
      endDate: Date;
      duration: number;
      assigneeUserId: string | null;
      status: Status;
      trackingStatus: TrackingStatus;
      progressPercentage: number;
    }>
  ): Promise<Task> {
    try {
      return await prisma.task.update({
        where: { id },
        data,
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Delete task
   */
  async delete(id: string): Promise<Task> {
    try {
      return await prisma.task.delete({
        where: { id },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Assign task to user
   */
  async assign(id: string, assigneeUserId: string): Promise<Task> {
    try {
      return await prisma.task.update({
        where: { id },
        data: { assigneeUserId },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Unassign task
   */
  async unassign(id: string): Promise<Task> {
    try {
      return await prisma.task.update({
        where: { id },
        data: { assigneeUserId: null },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Get task with dependencies and related data
   */
  async getWithRelations(id: string) {
    try {
      return await prisma.task.findUnique({
        where: { id },
        include: {
          activity: {
            include: {
              project: true,
            },
          },
          assignee: true,
          predecessorDeps: {
            include: {
              taskPredecessor: true,
            },
          },
          successorDeps: {
            include: {
              taskSuccessor: true,
            },
          },
        },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Filter tasks by multiple criteria
   */
  async filter(
    filters: Partial<TaskFilters>,
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<Task>> {
    const skip = params.skip || 0;
    const take = params.take || 20;

    const where: any = {};

    if (filters.activityId) {
      where.activityId = filters.activityId;
    }

    if (filters.assigneeUserId) {
      where.assigneeUserId = filters.assigneeUserId;
    }

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
      const [tasks, total] = await Promise.all([
        prisma.task.findMany({
          where,
          skip,
          take,
          orderBy: this.buildOrderBy(params.sortBy, params.sortOrder),
          include: { activity: true, assignee: true },
        }),
        prisma.task.count({ where }),
      ]);

      return this.createPaginatedResponse(tasks, total, skip, take);
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }
}

export const taskService = new TaskService();
