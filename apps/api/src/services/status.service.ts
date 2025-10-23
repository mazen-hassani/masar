// ABOUTME: Service for status lifecycle management and tracking
// ABOUTME: Validates status transitions and calculates tracking status based on dates

import { prisma } from "@/lib/prisma";
import { BaseService } from "./base.service";
import { calendarService, CalendarConfig } from "./calendar.service";
import { Status, TrackingStatus, Role } from "@prisma/client";

export interface StatusTransition {
  from: Status;
  to: Status;
  allowedRoles?: Role[];
  validConditions?: string[];
}

export interface TrackingStatusResult {
  status: TrackingStatus;
  percentageComplete: number;
  daysRemaining: number;
  riskReason?: string;
}

// Valid status transitions
const VALID_TRANSITIONS: StatusTransition[] = [
  // NOT_STARTED -> IN_PROGRESS
  { from: Status.NOT_STARTED, to: Status.IN_PROGRESS },
  // IN_PROGRESS -> ON_HOLD
  { from: Status.IN_PROGRESS, to: Status.ON_HOLD },
  // ON_HOLD -> IN_PROGRESS
  { from: Status.ON_HOLD, to: Status.IN_PROGRESS },
  // IN_PROGRESS -> COMPLETED
  { from: Status.IN_PROGRESS, to: Status.COMPLETED },
  // COMPLETED -> VERIFIED (PM only)
  { from: Status.COMPLETED, to: Status.VERIFIED, allowedRoles: ["PM", "PMO"] },
  // VERIFIED -> IN_PROGRESS (to rework)
  { from: Status.VERIFIED, to: Status.IN_PROGRESS, allowedRoles: ["PM", "PMO"] },
  // NOT_STARTED -> COMPLETED (shortcut)
  { from: Status.NOT_STARTED, to: Status.COMPLETED },
];

export class StatusService extends BaseService {
  /**
   * Validate if a status transition is allowed
   */
  isValidTransition(from: Status, to: Status, userRole?: string): boolean {
    const transition = VALID_TRANSITIONS.find((t) => t.from === from && t.to === to);

    if (!transition) {
      return false;
    }

    if (transition.allowedRoles && userRole) {
      return transition.allowedRoles.includes(userRole as Role);
    }

    return true;
  }

  /**
   * Get all valid next statuses from current status
   */
  getValidNextStatuses(currentStatus: Status, userRole?: string): Status[] {
    return VALID_TRANSITIONS.filter((t) => {
      if (t.from !== currentStatus) {
        return false;
      }

      if (t.allowedRoles && userRole) {
        return t.allowedRoles.includes(userRole as Role);
      }

      return !t.allowedRoles; // If no role restriction, always valid
    }).map((t) => t.to);
  }

  /**
   * Get human-readable error message for invalid transition
   */
  getTransitionErrorMessage(from: Status, to: Status, userRole?: string): string {
    const validTransition = VALID_TRANSITIONS.find((t) => t.from === from && t.to === to);

    if (!validTransition) {
      const validNexts = this.getValidNextStatuses(from, userRole);
      if (validNexts.length === 0) {
        return `Cannot transition from ${from} status`;
      }
      return `Cannot transition from ${from} to ${to}. Valid transitions: ${validNexts.join(", ")}`;
    }

    if (validTransition.allowedRoles && userRole) {
      if (!validTransition.allowedRoles.includes(userRole as Role)) {
        return `Only users with ${validTransition.allowedRoles.join(", ")} role can perform this action`;
      }
    }

    return "Invalid status transition";
  }

  /**
   * Update task status with validation
   */
  async updateTaskStatus(
    taskId: string,
    newStatus: Status,
    userRole?: string
  ): Promise<any> {
    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        throw new Error("Task not found");
      }

      // Validate transition
      if (!this.isValidTransition(task.status, newStatus, userRole)) {
        throw new Error(
          this.getTransitionErrorMessage(task.status, newStatus, userRole)
        );
      }

      // Update task
      const updated = await prisma.task.update({
        where: { id: taskId },
        data: {
          status: newStatus,
          updatedAt: new Date(),
        },
      });

      // If status changed to COMPLETED or VERIFIED, update percentage
      if (newStatus === Status.COMPLETED || newStatus === Status.VERIFIED) {
        await prisma.task.update({
          where: { id: taskId },
          data: { progressPercentage: 100 },
        });
      }

      return updated;
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Update activity status with validation
   */
  async updateActivityStatus(
    activityId: string,
    newStatus: Status,
    userRole?: string
  ): Promise<any> {
    try {
      const activity = await prisma.activity.findUnique({
        where: { id: activityId },
        include: { tasks: true },
      });

      if (!activity) {
        throw new Error("Activity not found");
      }

      // Validate transition
      if (!this.isValidTransition(activity.status, newStatus, userRole)) {
        throw new Error(
          this.getTransitionErrorMessage(activity.status, newStatus, userRole)
        );
      }

      // Additional validation for VERIFIED status
      if (newStatus === Status.VERIFIED) {
        const unverifiedTasks = activity.tasks.filter((t) => t.status !== Status.VERIFIED);
        if (unverifiedTasks.length > 0) {
          throw new Error(
            `Cannot verify activity with ${unverifiedTasks.length} unverified task(s)`
          );
        }
      }

      // Update activity
      const updated = await prisma.activity.update({
        where: { id: activityId },
        data: {
          status: newStatus,
          updatedAt: new Date(),
        },
      });

      // If status changed to COMPLETED or VERIFIED, update percentage
      if (newStatus === Status.COMPLETED || newStatus === Status.VERIFIED) {
        await prisma.activity.update({
          where: { id: activityId },
          data: { progressPercentage: 100 },
        });
      }

      return updated;
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Calculate tracking status based on progress and timeline
   */
  async calculateTrackingStatus(
    itemId: string,
    itemType: "task" | "activity",
    calendar: CalendarConfig,
    organisationId: string
  ): Promise<TrackingStatusResult> {
    try {
      const item =
        itemType === "task"
          ? await prisma.task.findUnique({
              where: { id: itemId },
              include: { activity: { include: { project: true } } },
            })
          : await prisma.activity.findUnique({
              where: { id: itemId },
              include: { project: true },
            });

      if (!item) {
        throw new Error(`${itemType} not found`);
      }

      const project = itemType === "task" ? item.activity.project : item.project;

      // Only calculate for IN_PROGRESS items
      if (item.status !== Status.IN_PROGRESS) {
        const statusMap: Record<Status, TrackingStatus> = {
          [Status.NOT_STARTED]: TrackingStatus.ON_TRACK,
          [Status.IN_PROGRESS]: TrackingStatus.ON_TRACK,
          [Status.ON_HOLD]: TrackingStatus.AT_RISK,
          [Status.COMPLETED]: TrackingStatus.ON_TRACK,
          [Status.VERIFIED]: TrackingStatus.ON_TRACK,
        };
        return {
          status: statusMap[item.status] || TrackingStatus.ON_TRACK,
          percentageComplete: item.progressPercentage || 0,
          daysRemaining: 0,
        };
      }

      const now = new Date();
      const endDate = item.endDate;

      // Calculate working days remaining
      const workingDaysRemaining = await calendarService.calculateWorkingDuration(
        now,
        endDate,
        calendar,
        organisationId
      );

      // Get task duration
      const totalDuration = await calendarService.calculateWorkingDuration(
        item.startDate,
        item.endDate,
        calendar,
        organisationId
      );

      // Calculate expected progress based on elapsed time
      const elapsedDuration = await calendarService.calculateWorkingDuration(
        item.startDate,
        now,
        calendar,
        organisationId
      );

      const expectedProgress = totalDuration > 0 ? (elapsedDuration / totalDuration) * 100 : 0;
      const actualProgress = item.progressPercentage || 0;

      // Determine tracking status (default 80% at-risk threshold)
      const riskThreshold = 80;
      const progressBehind = expectedProgress > (actualProgress + 5); // 5% buffer

      let trackingStatus = TrackingStatus.ON_TRACK;
      let riskReason: string | undefined;

      if (endDate < now) {
        trackingStatus = TrackingStatus.OFF_TRACK;
        riskReason = "Past due date";
      } else if (progressBehind) {
        trackingStatus = TrackingStatus.AT_RISK;
        riskReason = `Expected ${expectedProgress.toFixed(1)}% complete, actual ${actualProgress}%`;
      } else if (actualProgress < 10 && elapsedDuration > 0) {
        trackingStatus = TrackingStatus.AT_RISK;
        riskReason = "Minimal progress despite time elapsed";
      }

      return {
        status: trackingStatus,
        percentageComplete: actualProgress,
        daysRemaining: Math.ceil(workingDaysRemaining / 8), // Convert hours to days
        riskReason,
      };
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Update tracking status for a task or activity
   */
  async updateTrackingStatus(
    itemId: string,
    itemType: "task" | "activity",
    calendar: CalendarConfig,
    organisationId: string
  ): Promise<void> {
    try {
      const trackingResult = await this.calculateTrackingStatus(
        itemId,
        itemType,
        calendar,
        organisationId
      );

      if (itemType === "task") {
        await prisma.task.update({
          where: { id: itemId },
          data: { trackingStatus: trackingResult.status },
        });
      } else {
        await prisma.activity.update({
          where: { id: itemId },
          data: { trackingStatus: trackingResult.status },
        });
      }
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Update progress percentage for a task
   */
  async updateTaskProgress(taskId: string, percentage: number): Promise<any> {
    try {
      if (percentage < 0 || percentage > 100) {
        throw new Error("Percentage must be between 0 and 100");
      }

      const task = await prisma.task.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        throw new Error("Task not found");
      }

      // Only allow editing progress for IN_PROGRESS tasks
      if (task.status !== Status.IN_PROGRESS) {
        throw new Error("Can only update progress for IN_PROGRESS tasks");
      }

      return await prisma.task.update({
        where: { id: taskId },
        data: {
          progressPercentage: percentage,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Calculate activity progress from child tasks
   */
  async calculateActivityProgress(activityId: string): Promise<number> {
    try {
      const activity = await prisma.activity.findUnique({
        where: { id: activityId },
        include: { tasks: true },
      });

      if (!activity) {
        throw new Error("Activity not found");
      }

      if (activity.tasks.length === 0) {
        return 0;
      }

      const totalProgress = activity.tasks.reduce(
        (sum, task) => sum + (task.progressPercentage || 0),
        0
      );

      return Math.round(totalProgress / activity.tasks.length);
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Update activity progress based on child tasks
   */
  async updateActivityProgressFromTasks(activityId: string): Promise<any> {
    try {
      const progress = await this.calculateActivityProgress(activityId);

      return await prisma.activity.update({
        where: { id: activityId },
        data: {
          progressPercentage: progress,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Bulk update tracking status for all activities in a project
   */
  async updateProjectTrackingStatus(
    projectId: string,
    calendar: CalendarConfig,
    organisationId: string
  ): Promise<number> {
    try {
      const activities = await prisma.activity.findMany({
        where: { projectId },
      });

      let updatedCount = 0;

      for (const activity of activities) {
        try {
          await this.updateTrackingStatus(activity.id, "activity", calendar, organisationId);
          updatedCount++;
        } catch (error) {
          // Log but continue with other activities
          console.error(`Failed to update tracking status for activity ${activity.id}:`, error);
        }
      }

      return updatedCount;
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }
}

export const statusService = new StatusService();
