// ABOUTME: Service layer for task CRUD operations and assignments
// ABOUTME: Handles task creation, updates, status transitions, and assignee management

import { prisma } from "../lib/prisma";
import { Status, TrackingStatus } from "@prisma/client";

export interface CreateTaskInput {
  activityId: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  duration: number; // in working hours
  assigneeUserId?: string;
}

export interface UpdateTaskInput {
  name?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  duration?: number;
  assigneeUserId?: string | null;
  status?: Status;
  progressPercentage?: number;
}

export class TasksService {
  /**
   * Create a new task
   */
  async createTask(input: CreateTaskInput) {
    // Verify activity exists
    const activity = await prisma.activity.findUnique({
      where: { id: input.activityId },
    });

    if (!activity) {
      throw new Error("Activity not found");
    }

    // Verify assignee exists if provided
    if (input.assigneeUserId) {
      const assignee = await prisma.user.findUnique({
        where: { id: input.assigneeUserId },
      });

      if (!assignee) {
        throw new Error("Assignee not found");
      }
    }

    const task = await prisma.task.create({
      data: {
        activityId: input.activityId,
        name: input.name,
        description: input.description,
        startDate: input.startDate,
        endDate: input.endDate,
        duration: input.duration,
        assigneeUserId: input.assigneeUserId,
        status: Status.NOT_STARTED,
        trackingStatus: TrackingStatus.ON_TRACK,
        progressPercentage: 0,
      },
      include: {
        activity: true,
        assignee: true,
        predecessorDeps: true,
        successorDeps: true,
      },
    });

    return task;
  }

  /**
   * Get task by ID
   */
  async getTaskById(taskId: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        activity: {
          include: { project: true },
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

    if (!task) {
      throw new Error("Task not found");
    }

    return task;
  }

  /**
   * List tasks by activity
   */
  async listTasksByActivity(activityId: string, skip = 0, take = 50) {
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
    });

    if (!activity) {
      throw new Error("Activity not found");
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where: { activityId },
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          predecessorDeps: true,
          successorDeps: true,
        },
        orderBy: { startDate: "asc" },
        skip,
        take,
      }),
      prisma.task.count({ where: { activityId } }),
    ]);

    return {
      tasks,
      pagination: {
        total,
        skip,
        take,
        hasMore: skip + take < total,
      },
    };
  }

  /**
   * List tasks assigned to a user
   */
  async listTasksByAssignee(userId: string, skip = 0, take = 50) {
    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where: { assigneeUserId: userId },
        include: {
          activity: {
            include: { project: true },
          },
          assignee: true,
        },
        orderBy: { startDate: "asc" },
        skip,
        take,
      }),
      prisma.task.count({ where: { assigneeUserId: userId } }),
    ]);

    return {
      tasks,
      pagination: {
        total,
        skip,
        take,
        hasMore: skip + take < total,
      },
    };
  }

  /**
   * Update task
   */
  async updateTask(taskId: string, input: UpdateTaskInput) {
    const task = await this.getTaskById(taskId);

    // Verify new assignee if provided
    if (input.assigneeUserId !== undefined && input.assigneeUserId !== null) {
      const assignee = await prisma.user.findUnique({
        where: { id: input.assigneeUserId },
      });

      if (!assignee) {
        throw new Error("Assignee not found");
      }
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.startDate && { startDate: input.startDate }),
        ...(input.endDate && { endDate: input.endDate }),
        ...(input.duration && { duration: input.duration }),
        ...(input.assigneeUserId !== undefined && { assigneeUserId: input.assigneeUserId }),
        ...(input.status && { status: input.status }),
        ...(input.progressPercentage !== undefined && {
          progressPercentage: Math.min(100, Math.max(0, input.progressPercentage)),
        }),
      },
      include: {
        activity: true,
        assignee: true,
        predecessorDeps: true,
        successorDeps: true,
      },
    });

    return updated;
  }

  /**
   * Change task status
   */
  async changeStatus(taskId: string, newStatus: Status) {
    await this.getTaskById(taskId); // Verify exists

    return this.updateTask(taskId, { status: newStatus });
  }

  /**
   * Delete task
   */
  async deleteTask(taskId: string) {
    await this.getTaskById(taskId); // Verify exists

    await prisma.task.delete({
      where: { id: taskId },
    });

    return { message: "Task deleted successfully" };
  }

  /**
   * Get tasks that are overdue
   */
  async getOverdueTasks(projectId: string) {
    const now = new Date();

    const tasks = await prisma.task.findMany({
      where: {
        activity: { projectId },
        endDate: { lt: now },
        status: {
          in: [Status.NOT_STARTED, Status.IN_PROGRESS, Status.ON_HOLD],
        },
      },
      include: {
        activity: true,
        assignee: true,
      },
      orderBy: { endDate: "asc" },
    });

    return tasks;
  }
}

export const tasksService = new TasksService();
