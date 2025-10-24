// ABOUTME: Service layer for activity CRUD operations and status management
// ABOUTME: Handles activity creation, updates, status transitions, and progress tracking

import { prisma } from "../lib/prisma";
import { Status, TrackingStatus } from "@prisma/client";

export interface CreateActivityInput {
  projectId: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  status?: Status;
}

export interface UpdateActivityInput {
  name?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  status?: Status;
  progressPercentage?: number;
}

export class ActivitiesService {
  /**
   * Create a new activity
   */
  async createActivity(input: CreateActivityInput) {
    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    const activity = await prisma.activity.create({
      data: {
        projectId: input.projectId,
        name: input.name,
        description: input.description,
        startDate: input.startDate,
        endDate: input.endDate,
        status: input.status || Status.NOT_STARTED,
        trackingStatus: TrackingStatus.ON_TRACK,
        progressPercentage: 0,
      },
      include: {
        tasks: true,
        predecessorDeps: true,
        successorDeps: true,
      },
    });

    return activity;
  }

  /**
   * Get activity by ID
   */
  async getActivityById(activityId: string) {
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        project: true,
        tasks: {
          orderBy: { startDate: "asc" },
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

    if (!activity) {
      throw new Error("Activity not found");
    }

    return activity;
  }

  /**
   * List activities by project
   */
  async listActivitiesByProject(projectId: string, skip = 0, take = 50) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where: { projectId },
        include: {
          tasks: { select: { id: true, status: true, progressPercentage: true } },
          predecessorDeps: true,
          successorDeps: true,
        },
        orderBy: { startDate: "asc" },
        skip,
        take,
      }),
      prisma.activity.count({ where: { projectId } }),
    ]);

    return {
      activities,
      pagination: {
        total,
        skip,
        take,
        hasMore: skip + take < total,
      },
    };
  }

  /**
   * Update activity
   */
  async updateActivity(activityId: string, input: UpdateActivityInput) {
    const activity = await this.getActivityById(activityId);

    const updated = await prisma.activity.update({
      where: { id: activityId },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.startDate && { startDate: input.startDate }),
        ...(input.endDate && { endDate: input.endDate }),
        ...(input.status && { status: input.status }),
        ...(input.progressPercentage !== undefined && {
          progressPercentage: Math.min(100, Math.max(0, input.progressPercentage)),
        }),
      },
      include: {
        tasks: true,
        predecessorDeps: true,
        successorDeps: true,
      },
    });

    return updated;
  }

  /**
   * Change activity status
   */
  async changeStatus(activityId: string, newStatus: Status) {
    const activity = await this.getActivityById(activityId);

    // Validation: can't mark as VERIFIED unless all child tasks are VERIFIED
    if (newStatus === Status.VERIFIED) {
      const unverifiedTasks = activity.tasks.filter((t) => t.status !== Status.VERIFIED);
      if (unverifiedTasks.length > 0) {
        throw new Error("Cannot verify activity. Some tasks are not verified.");
      }
    }

    return this.updateActivity(activityId, { status: newStatus });
  }

  /**
   * Delete activity (cascades to tasks)
   */
  async deleteActivity(activityId: string) {
    await this.getActivityById(activityId); // Verify exists

    await prisma.activity.delete({
      where: { id: activityId },
    });

    return { message: "Activity deleted successfully" };
  }

  /**
   * Recalculate activity progress (average of child tasks)
   */
  async recalculateProgress(activityId: string) {
    const activity = await this.getActivityById(activityId);

    if (activity.tasks.length === 0) {
      return this.updateActivity(activityId, { progressPercentage: 0 });
    }

    const avgProgress =
      activity.tasks.reduce((sum, t) => sum + t.progressPercentage, 0) / activity.tasks.length;

    return this.updateActivity(activityId, {
      progressPercentage: Math.round(avgProgress),
    });
  }
}

export const activitiesService = new ActivitiesService();
