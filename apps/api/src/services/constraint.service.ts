// ABOUTME: Service for managing manual date constraints and date edit validation
// ABOUTME: Handles constraint conflicts, propagation, and provides valid date ranges

import { prisma } from "@/lib/prisma";
import { BaseService } from "./base.service";
import { dependencyService } from "./dependency.service";
import { schedulerService } from "./scheduler.service";
import { calendarService, CalendarConfig } from "./calendar.service";
import { DependencyType } from "@prisma/client";

export interface DateConstraint {
  id: string;
  itemId: string;
  itemType: "activity" | "task";
  constraintType: "ASAP" | "ALAP" | "MUST_START_ON" | "MUST_FINISH_ON" | "START_NO_EARLIER" | "START_NO_LATER" | "FINISH_NO_EARLIER" | "FINISH_NO_LATER";
  constraintDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DateEditValidation {
  valid: boolean;
  newStartDate: Date;
  newEndDate: Date;
  violations: DateConstraintViolation[];
  warnings: string[];
  affectedItems: Array<{ id: string; reason: string }>;
}

export interface DateConstraintViolation {
  violationType: "PREDECESSOR_CONFLICT" | "SUCCESSOR_CONFLICT" | "HARD_CONSTRAINT" | "CALENDAR_CONSTRAINT" | "DURATION_INVALID";
  message: string;
  affectedItemId?: string;
  affectedItemName?: string;
  suggestedDate?: Date;
}

export interface ValidDateRange {
  itemId: string;
  minStartDate: Date;
  maxStartDate: Date;
  minEndDate: Date;
  maxEndDate: Date;
  constraints: DateConstraint[];
  violations: DateConstraintViolation[];
}

interface ConstrainedItem {
  id: string;
  type: "activity" | "task";
  currentStart: Date;
  currentEnd: Date;
  duration: number;
}

export class ConstraintService extends BaseService {
  /**
   * Create a hard constraint on an item
   */
  async addConstraint(
    itemId: string,
    itemType: "activity" | "task",
    constraintType: string,
    constraintDate: Date
  ): Promise<DateConstraint> {
    try {
      const constraint = await prisma.dateConstraint.create({
        data: {
          itemId,
          itemType,
          constraintType,
          constraintDate,
        },
      });

      return this.mapToDateConstraint(constraint);
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Remove a constraint
   */
  async removeConstraint(constraintId: string): Promise<DateConstraint> {
    try {
      const constraint = await prisma.dateConstraint.delete({
        where: { id: constraintId },
      });

      return this.mapToDateConstraint(constraint);
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Get all constraints for an item
   */
  async getItemConstraints(itemId: string): Promise<DateConstraint[]> {
    try {
      const constraints = await prisma.dateConstraint.findMany({
        where: { itemId },
        orderBy: { createdAt: "desc" },
      });

      return constraints.map((c) => this.mapToDateConstraint(c));
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Get all constraints for a project
   */
  async getProjectConstraints(projectId: string): Promise<DateConstraint[]> {
    try {
      const constraints = await prisma.dateConstraint.findMany({
        where: {
          OR: [
            { activity: { projectId } },
            { task: { activity: { projectId } } },
          ],
        },
        orderBy: { createdAt: "desc" },
      });

      return constraints.map((c) => this.mapToDateConstraint(c));
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Validate and edit activity/task dates
   */
  async validateDateEdit(
    itemId: string,
    itemType: "activity" | "task",
    newStartDate: Date,
    newEndDate: Date,
    calendar?: CalendarConfig,
    organisationId?: string
  ): Promise<DateEditValidation> {
    try {
      // Get item details
      let item: ConstrainedItem | null = null;
      let projectId = "";

      if (itemType === "activity") {
        const activity = await prisma.activity.findUnique({
          where: { id: itemId },
        });
        if (!activity) {
          throw new Error(`Activity not found: ${itemId}`);
        }
        item = {
          id: activity.id,
          type: "activity",
          currentStart: activity.startDate,
          currentEnd: activity.endDate,
          duration: (activity.endDate.getTime() - activity.startDate.getTime()) / (1000 * 60 * 60),
        };
        projectId = activity.projectId;
      } else {
        const task = await prisma.task.findUnique({
          where: { id: itemId },
          include: { activity: true },
        });
        if (!task) {
          throw new Error(`Task not found: ${itemId}`);
        }
        item = {
          id: task.id,
          type: "task",
          currentStart: task.startDate,
          currentEnd: task.endDate,
          duration: task.duration || 0,
        };
        projectId = task.activity.projectId;
      }

      // Get calendar if not provided
      if (!calendar || !organisationId) {
        const project = await prisma.project.findUniqueOrThrow({
          where: { id: projectId },
        });
        organisationId = project.organisationId;
        calendar = await calendarService.getOrganisationCalendar(organisationId);
      }

      const violations: DateConstraintViolation[] = [];
      const warnings: string[] = [];
      const affectedItems: Array<{ id: string; reason: string }> = [];
      let valid = true;

      // Validate duration
      const durationHours = (newEndDate.getTime() - newStartDate.getTime()) / (1000 * 60 * 60);
      if (durationHours < 0) {
        violations.push({
          violationType: "DURATION_INVALID",
          message: "End date cannot be before start date",
        });
        valid = false;
      }

      // Check constraints on this item
      const constraints = await this.getItemConstraints(itemId);
      for (const constraint of constraints) {
        const violation = this.validateConstraintViolation(
          constraint,
          newStartDate,
          newEndDate
        );
        if (violation) {
          violations.push(violation);
          valid = false;
        }
      }

      // Check predecessor constraints
      const predecessors = await this.getPredecessorInfo(itemId, itemType);
      for (const pred of predecessors) {
        const predViolation = this.validatePredecessorConstraint(
          pred,
          newStartDate,
          newEndDate
        );
        if (predViolation) {
          violations.push(predViolation);
          affectedItems.push({
            id: pred.predecessorId,
            reason: `Predecessor constraint violated`,
          });
          valid = false;
        }
      }

      // Check successor constraints
      const successors = await this.getSuccessorInfo(itemId, itemType);
      for (const succ of successors) {
        const succViolation = this.validateSuccessorConstraint(
          succ,
          newStartDate,
          newEndDate
        );
        if (succViolation) {
          violations.push(succViolation);
          affectedItems.push({
            id: succ.successorId,
            reason: `Successor constraint violated`,
          });
          valid = false;
        }
      }

      // Check working calendar
      const calendarViolation = await this.validateCalendarConstraint(
        newStartDate,
        newEndDate,
        calendar,
        organisationId
      );
      if (calendarViolation) {
        violations.push(calendarViolation);
        valid = false;
      }

      if (!valid) {
        warnings.push("Date edit has constraint violations. Manual override may be needed.");
      }

      return {
        valid,
        newStartDate,
        newEndDate,
        violations,
        warnings,
        affectedItems,
      };
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Apply date edit with validation
   */
  async applyDateEdit(
    itemId: string,
    itemType: "activity" | "task",
    newStartDate: Date,
    newEndDate: Date,
    forceOverride: boolean = false,
    calendar?: CalendarConfig,
    organisationId?: string
  ): Promise<{ success: boolean; validation: DateEditValidation }> {
    try {
      // Validate the edit
      const validation = await this.validateDateEdit(
        itemId,
        itemType,
        newStartDate,
        newEndDate,
        calendar,
        organisationId
      );

      if (!validation.valid && !forceOverride) {
        return {
          success: false,
          validation,
        };
      }

      // Apply the edit
      if (itemType === "activity") {
        await prisma.activity.update({
          where: { id: itemId },
          data: {
            startDate: newStartDate,
            endDate: newEndDate,
          },
        });
      } else {
        await prisma.task.update({
          where: { id: itemId },
          data: {
            startDate: newStartDate,
            endDate: newEndDate,
          },
        });
      }

      return {
        success: true,
        validation,
      };
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Get valid date range for an item
   */
  async getValidDateRange(
    itemId: string,
    itemType: "activity" | "task",
    calendar?: CalendarConfig,
    organisationId?: string
  ): Promise<ValidDateRange> {
    try {
      // Get item duration
      let durationHours = 0;
      let projectId = "";

      if (itemType === "activity") {
        const activity = await prisma.activity.findUniqueOrThrow({
          where: { id: itemId },
        });
        durationHours = (activity.endDate.getTime() - activity.startDate.getTime()) / (1000 * 60 * 60);
        projectId = activity.projectId;
      } else {
        const task = await prisma.task.findUniqueOrThrow({
          where: { id: itemId },
          include: { activity: true },
        });
        durationHours = task.duration || 0;
        projectId = task.activity.projectId;
      }

      // Get calendar if not provided
      if (!calendar || !organisationId) {
        const project = await prisma.project.findUniqueOrThrow({
          where: { id: projectId },
        });
        organisationId = project.organisationId;
        calendar = await calendarService.getOrganisationCalendar(organisationId);
      }

      // Initialize range as wide as possible
      let minStartDate = new Date(0);
      let maxStartDate = new Date(8640000000000000);
      let minEndDate = new Date(0);
      let maxEndDate = new Date(8640000000000000);

      const violations: DateConstraintViolation[] = [];

      // Get constraints
      const constraints = await this.getItemConstraints(itemId);

      // Apply hard constraints
      for (const constraint of constraints) {
        switch (constraint.constraintType) {
          case "MUST_START_ON":
            minStartDate = new Date(
              Math.max(minStartDate.getTime(), constraint.constraintDate.getTime())
            );
            maxStartDate = new Date(
              Math.min(maxStartDate.getTime(), constraint.constraintDate.getTime())
            );
            break;
          case "MUST_FINISH_ON":
            minEndDate = new Date(
              Math.max(minEndDate.getTime(), constraint.constraintDate.getTime())
            );
            maxEndDate = new Date(
              Math.min(maxEndDate.getTime(), constraint.constraintDate.getTime())
            );
            break;
          case "START_NO_EARLIER":
            minStartDate = new Date(
              Math.max(minStartDate.getTime(), constraint.constraintDate.getTime())
            );
            break;
          case "START_NO_LATER":
            maxStartDate = new Date(
              Math.min(maxStartDate.getTime(), constraint.constraintDate.getTime())
            );
            break;
          case "FINISH_NO_EARLIER":
            minEndDate = new Date(
              Math.max(minEndDate.getTime(), constraint.constraintDate.getTime())
            );
            break;
          case "FINISH_NO_LATER":
            maxEndDate = new Date(
              Math.min(maxEndDate.getTime(), constraint.constraintDate.getTime())
            );
            break;
        }
      }

      // Check predecessor constraints
      const predecessors = await this.getPredecessorInfo(itemId, itemType);
      for (const pred of predecessors) {
        const predMinStart = new Date(pred.endDate.getTime() + pred.lag * 24 * 60 * 60 * 1000);
        minStartDate = new Date(Math.max(minStartDate.getTime(), predMinStart.getTime()));
      }

      // Check successor constraints
      const successors = await this.getSuccessorInfo(itemId, itemType);
      for (const succ of successors) {
        const succMaxEnd = new Date(succ.startDate.getTime() - succ.lag * 24 * 60 * 60 * 1000);
        maxEndDate = new Date(Math.min(maxEndDate.getTime(), succMaxEnd.getTime()));
      }

      // Validate range feasibility
      if (minStartDate > maxStartDate) {
        violations.push({
          violationType: "HARD_CONSTRAINT",
          message: "No valid start date possible with current constraints",
        });
      }

      if (minEndDate > maxEndDate) {
        violations.push({
          violationType: "HARD_CONSTRAINT",
          message: "No valid end date possible with current constraints",
        });
      }

      return {
        itemId,
        minStartDate,
        maxStartDate,
        minEndDate,
        maxEndDate,
        constraints,
        violations,
      };
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Propagate date changes to dependent items
   */
  async propagateDateChanges(
    itemId: string,
    itemType: "activity" | "task",
    calendar?: CalendarConfig,
    organisationId?: string
  ): Promise<Array<{ id: string; type: string; newStart: Date; newEnd: Date }>> {
    try {
      const changes: Array<{ id: string; type: string; newStart: Date; newEnd: Date }> = [];

      // Get item
      let item: ConstrainedItem | null = null;
      let projectId = "";

      if (itemType === "activity") {
        const activity = await prisma.activity.findUniqueOrThrow({
          where: { id: itemId },
        });
        item = {
          id: activity.id,
          type: "activity",
          currentStart: activity.startDate,
          currentEnd: activity.endDate,
          duration: (activity.endDate.getTime() - activity.startDate.getTime()) / (1000 * 60 * 60),
        };
        projectId = activity.projectId;
      } else {
        const task = await prisma.task.findUniqueOrThrow({
          where: { id: itemId },
          include: { activity: true },
        });
        item = {
          id: task.id,
          type: "task",
          currentStart: task.startDate,
          currentEnd: task.endDate,
          duration: task.duration || 0,
        };
        projectId = task.activity.projectId;
      }

      if (!calendar || !organisationId) {
        const project = await prisma.project.findUniqueOrThrow({
          where: { id: projectId },
        });
        organisationId = project.organisationId;
        calendar = await calendarService.getOrganisationCalendar(organisationId);
      }

      // Get successors and update their start dates
      const successors = await this.getSuccessorInfo(itemId, itemType);
      for (const succ of successors) {
        const newSuccStart = new Date(item.currentEnd.getTime() + succ.lag * 24 * 60 * 60 * 1000);
        const newSuccEnd = await calendarService.addWorkingTime(
          newSuccStart,
          succ.duration,
          calendar,
          organisationId
        );

        if (succ.type === "activity") {
          await prisma.activity.update({
            where: { id: succ.successorId },
            data: {
              startDate: newSuccStart,
              endDate: newSuccEnd,
            },
          });
        } else {
          await prisma.task.update({
            where: { id: succ.successorId },
            data: {
              startDate: newSuccStart,
              endDate: newSuccEnd,
            },
          });
        }

        changes.push({
          id: succ.successorId,
          type: succ.type,
          newStart: newSuccStart,
          newEnd: newSuccEnd,
        });
      }

      return changes;
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Helper: Get predecessor dependency info
   */
  private async getPredecessorInfo(
    itemId: string,
    itemType: "activity" | "task"
  ): Promise<
    Array<{ predecessorId: string; endDate: Date; lag: number; type: string }>
  > {
    const preds: Array<{
      predecessorId: string;
      endDate: Date;
      lag: number;
      type: string;
    }> = [];

    if (itemType === "activity") {
      const deps = await dependencyService.getActivityPredecessors(itemId);
      for (const dep of deps) {
        if (dep.activityPredecessor) {
          preds.push({
            predecessorId: dep.activityPredecessor.id,
            endDate: dep.activityPredecessor.endDate,
            lag: dep.lag || 0,
            type: "activity",
          });
        }
      }
    } else {
      const deps = await dependencyService.getTaskPredecessors(itemId);
      for (const dep of deps) {
        if (dep.taskPredecessor) {
          preds.push({
            predecessorId: dep.taskPredecessor.id,
            endDate: dep.taskPredecessor.endDate,
            lag: dep.lag || 0,
            type: "task",
          });
        }
      }
    }

    return preds;
  }

  /**
   * Helper: Get successor dependency info
   */
  private async getSuccessorInfo(
    itemId: string,
    itemType: "activity" | "task"
  ): Promise<
    Array<{
      successorId: string;
      startDate: Date;
      duration: number;
      lag: number;
      type: string;
    }>
  > {
    const succs: Array<{
      successorId: string;
      startDate: Date;
      duration: number;
      lag: number;
      type: string;
    }> = [];

    if (itemType === "activity") {
      const deps = await dependencyService.getActivitySuccessors(itemId);
      for (const dep of deps) {
        if (dep.activitySuccessor) {
          const duration =
            (dep.activitySuccessor.endDate.getTime() -
              dep.activitySuccessor.startDate.getTime()) /
            (1000 * 60 * 60);
          succs.push({
            successorId: dep.activitySuccessor.id,
            startDate: dep.activitySuccessor.startDate,
            duration,
            lag: dep.lag || 0,
            type: "activity",
          });
        }
      }
    } else {
      const deps = await dependencyService.getTaskSuccessors(itemId);
      for (const dep of deps) {
        if (dep.taskSuccessor) {
          succs.push({
            successorId: dep.taskSuccessor.id,
            startDate: dep.taskSuccessor.startDate,
            duration: dep.taskSuccessor.duration || 0,
            lag: dep.lag || 0,
            type: "task",
          });
        }
      }
    }

    return succs;
  }

  /**
   * Helper: Validate constraint violation
   */
  private validateConstraintViolation(
    constraint: DateConstraint,
    newStart: Date,
    newEnd: Date
  ): DateConstraintViolation | null {
    switch (constraint.constraintType) {
      case "MUST_START_ON":
        if (newStart.getTime() !== constraint.constraintDate.getTime()) {
          return {
            violationType: "HARD_CONSTRAINT",
            message: `Item must start on ${constraint.constraintDate.toISOString()}`,
            suggestedDate: constraint.constraintDate,
          };
        }
        break;
      case "MUST_FINISH_ON":
        if (newEnd.getTime() !== constraint.constraintDate.getTime()) {
          return {
            violationType: "HARD_CONSTRAINT",
            message: `Item must finish on ${constraint.constraintDate.toISOString()}`,
            suggestedDate: constraint.constraintDate,
          };
        }
        break;
      case "START_NO_EARLIER":
        if (newStart < constraint.constraintDate) {
          return {
            violationType: "HARD_CONSTRAINT",
            message: `Start date cannot be earlier than ${constraint.constraintDate.toISOString()}`,
            suggestedDate: constraint.constraintDate,
          };
        }
        break;
      case "START_NO_LATER":
        if (newStart > constraint.constraintDate) {
          return {
            violationType: "HARD_CONSTRAINT",
            message: `Start date cannot be later than ${constraint.constraintDate.toISOString()}`,
            suggestedDate: constraint.constraintDate,
          };
        }
        break;
      case "FINISH_NO_EARLIER":
        if (newEnd < constraint.constraintDate) {
          return {
            violationType: "HARD_CONSTRAINT",
            message: `End date cannot be earlier than ${constraint.constraintDate.toISOString()}`,
            suggestedDate: constraint.constraintDate,
          };
        }
        break;
      case "FINISH_NO_LATER":
        if (newEnd > constraint.constraintDate) {
          return {
            violationType: "HARD_CONSTRAINT",
            message: `End date cannot be later than ${constraint.constraintDate.toISOString()}`,
            suggestedDate: constraint.constraintDate,
          };
        }
        break;
    }
    return null;
  }

  /**
   * Helper: Validate predecessor constraint
   */
  private validatePredecessorConstraint(
    pred: { predecessorId: string; endDate: Date; lag: number; type: string },
    newStart: Date,
    newEnd: Date
  ): DateConstraintViolation | null {
    const minStart = new Date(pred.endDate.getTime() + pred.lag * 24 * 60 * 60 * 1000);
    if (newStart < minStart) {
      return {
        violationType: "PREDECESSOR_CONFLICT",
        message: `Cannot start before predecessor finishes (${minStart.toISOString()})`,
        affectedItemId: pred.predecessorId,
        suggestedDate: minStart,
      };
    }
    return null;
  }

  /**
   * Helper: Validate successor constraint
   */
  private validateSuccessorConstraint(
    succ: {
      successorId: string;
      startDate: Date;
      duration: number;
      lag: number;
      type: string;
    },
    newStart: Date,
    newEnd: Date
  ): DateConstraintViolation | null {
    const maxEnd = new Date(succ.startDate.getTime() - succ.lag * 24 * 60 * 60 * 1000);
    if (newEnd > maxEnd) {
      return {
        violationType: "SUCCESSOR_CONFLICT",
        message: `Cannot end after successor starts (${maxEnd.toISOString()})`,
        affectedItemId: succ.successorId,
        suggestedDate: maxEnd,
      };
    }
    return null;
  }

  /**
   * Helper: Validate calendar constraint
   */
  private async validateCalendarConstraint(
    newStart: Date,
    newEnd: Date,
    calendar: CalendarConfig,
    organisationId: string
  ): Promise<DateConstraintViolation | null> {
    // Check if dates fall on working days
    const startWorkingTime = await calendarService.calculateWorkingDuration(
      newStart,
      newStart,
      calendar,
      organisationId
    );

    if (startWorkingTime === 0) {
      return {
        violationType: "CALENDAR_CONSTRAINT",
        message: "Start date falls on a non-working day",
      };
    }

    return null;
  }

  /**
   * Helper: Map database constraint to interface
   */
  private mapToDateConstraint(constraint: any): DateConstraint {
    return {
      id: constraint.id,
      itemId: constraint.itemId,
      itemType: constraint.itemType,
      constraintType: constraint.constraintType,
      constraintDate: constraint.constraintDate,
      createdAt: constraint.createdAt,
      updatedAt: constraint.updatedAt,
    };
  }
}

export const constraintService = new ConstraintService();
