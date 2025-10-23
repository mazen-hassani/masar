// ABOUTME: Service for automatic project scheduling based on dependencies and calendar
// ABOUTME: Calculates dates, critical path, and slack time for activities and tasks

import { prisma } from "@/lib/prisma";
import { BaseService } from "./base.service";
import { dependencyService } from "./dependency.service";
import { calendarService, CalendarConfig } from "./calendar.service";
import { Dependency, DependencyType } from "@prisma/client";

export interface ScheduleItem {
  id: string;
  name: string;
  type: "activity" | "task";
  durationHours: number;
  startDate: Date;
  endDate: Date;
  earlyStart: Date;
  earlyEnd: Date;
  lateStart: Date;
  lateEnd: Date;
  slack: number; // days
  isCritical: boolean;
  predecessorIds: string[];
  successorIds: string[];
}

export interface ProjectSchedule {
  projectId: string;
  startDate: Date;
  endDate: Date;
  totalDurationDays: number;
  items: ScheduleItem[];
  criticalPath: string[]; // Array of item IDs on critical path
  isFeasible: boolean;
  warnings: string[];
}

export interface SchedulingOptions {
  respectCurrentDates?: boolean; // If true, don't change dates for items already started
  constraintMode?: "tight" | "loose"; // tight = minimize slack, loose = maximize flexibility
  calendar?: CalendarConfig;
}

interface DependencyNode {
  id: string;
  type: "activity" | "task";
  durationHours: number;
  predecessors: Array<{ id: string; lag: number; type: DependencyType }>;
  successors: Array<{ id: string; lag: number; type: DependencyType }>;
  earlyStart?: Date;
  earlyEnd?: Date;
  lateStart?: Date;
  lateEnd?: Date;
}

export class SchedulerService extends BaseService {
  /**
   * Calculate schedule for entire project
   */
  async calculateProjectSchedule(
    projectId: string,
    options: SchedulingOptions = {}
  ): Promise<ProjectSchedule> {
    try {
      // Get project and all items
      const project = await prisma.project.findUniqueOrThrow({
        where: { id: projectId },
        include: {
          activities: {
            include: {
              tasks: true,
            },
          },
        },
      });

      const calendar = options.calendar ||
        (await calendarService.getOrganisationCalendar(project.organisationId));

      // Build dependency graph
      const nodes = await this.buildDependencyGraph(projectId);

      if (nodes.size === 0) {
        // No items in project
        return {
          projectId,
          startDate: project.startDate,
          endDate: project.startDate,
          totalDurationDays: 0,
          items: [],
          criticalPath: [],
          isFeasible: true,
          warnings: [],
        };
      }

      // Perform topological sort
      const topoOrder = this.topologicalSort(nodes);

      // Forward pass: calculate early start/end dates
      const projectStartDate = new Date(project.startDate);
      await this.forwardPass(nodes, projectStartDate, calendar, project.organisationId);

      // Backward pass: calculate late start/end dates
      await this.backwardPass(nodes, calendar, project.organisationId);

      // Calculate slack and identify critical items
      const scheduleItems = this.buildScheduleItems(nodes);
      const criticalPath = this.identifyCriticalPath(nodes);

      // Find project end date
      let projectEndDate = projectStartDate;
      for (const item of scheduleItems) {
        if (item.endDate > projectEndDate) {
          projectEndDate = item.endDate;
        }
      }

      // Calculate total duration in days
      const totalDurationDays = Math.ceil(
        (projectEndDate.getTime() - projectStartDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Check feasibility
      const warnings = this.validateSchedule(scheduleItems);
      const isFeasible = warnings.length === 0;

      return {
        projectId,
        startDate: projectStartDate,
        endDate: projectEndDate,
        totalDurationDays,
        items: scheduleItems,
        criticalPath,
        isFeasible,
        warnings,
      };
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Build dependency graph from database
   */
  private async buildDependencyGraph(projectId: string): Promise<Map<string, DependencyNode>> {
    const nodes = new Map<string, DependencyNode>();

    // Get all activities
    const activities = await prisma.activity.findMany({
      where: { projectId },
      include: { tasks: true },
    });

    // Get all tasks
    const tasks = await prisma.task.findMany({
      where: {
        activity: {
          projectId,
        },
      },
    });

    // Get all dependencies
    const dependencies = await prisma.dependency.findMany({
      where: {
        OR: [
          { activityPredecessor: { projectId } },
          { taskPredecessor: { activity: { projectId } } },
        ],
      },
    });

    // Create nodes for activities
    for (const activity of activities) {
      const durationHours = Math.max(
        ...(activity.tasks.map((t) => t.duration || 0) || [0])
      ) || 0;

      nodes.set(activity.id, {
        id: activity.id,
        type: "activity",
        durationHours: activity.endDate && activity.startDate
          ? (activity.endDate.getTime() - activity.startDate.getTime()) / (1000 * 60 * 60)
          : durationHours,
        predecessors: [],
        successors: [],
      });
    }

    // Create nodes for tasks
    for (const task of tasks) {
      nodes.set(task.id, {
        id: task.id,
        type: "task",
        durationHours: task.duration || 0,
        predecessors: [],
        successors: [],
      });
    }

    // Build dependency relationships
    for (const dep of dependencies) {
      // Activity-to-Activity dependencies
      if (dep.activityPredecessorId && dep.activitySuccessorId) {
        const predNode = nodes.get(dep.activityPredecessorId);
        const succNode = nodes.get(dep.activitySuccessorId);

        if (predNode && succNode) {
          predNode.successors.push({
            id: dep.activitySuccessorId,
            lag: dep.lag || 0,
            type: dep.dependencyType,
          });
          succNode.predecessors.push({
            id: dep.activityPredecessorId,
            lag: dep.lag || 0,
            type: dep.dependencyType,
          });
        }
      }

      // Task-to-Task dependencies
      if (dep.taskPredecessorId && dep.taskSuccessorId) {
        const predNode = nodes.get(dep.taskPredecessorId);
        const succNode = nodes.get(dep.taskSuccessorId);

        if (predNode && succNode) {
          predNode.successors.push({
            id: dep.taskSuccessorId,
            lag: dep.lag || 0,
            type: dep.dependencyType,
          });
          succNode.predecessors.push({
            id: dep.taskPredecessorId,
            lag: dep.lag || 0,
            type: dep.dependencyType,
          });
        }
      }
    }

    return nodes;
  }

  /**
   * Topological sort using Kahn's algorithm
   */
  private topologicalSort(nodes: Map<string, DependencyNode>): string[] {
    const inDegree = new Map<string, number>();
    const queue: string[] = [];
    const result: string[] = [];

    // Initialize in-degrees
    for (const [id, node] of nodes) {
      inDegree.set(id, node.predecessors.length);
      if (node.predecessors.length === 0) {
        queue.push(id);
      }
    }

    // Process queue
    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      const node = nodes.get(current)!;
      for (const successor of node.successors) {
        const deg = inDegree.get(successor.id) || 0;
        inDegree.set(successor.id, deg - 1);

        if (deg - 1 === 0) {
          queue.push(successor.id);
        }
      }
    }

    // Check for cycles (should not happen due to earlier validation)
    if (result.length !== nodes.size) {
      throw new Error("Cycle detected in project dependencies");
    }

    return result;
  }

  /**
   * Forward pass: calculate early start and early end dates
   */
  private async forwardPass(
    nodes: Map<string, DependencyNode>,
    projectStartDate: Date,
    calendar: CalendarConfig,
    organisationId: string
  ): Promise<void> {
    const topoOrder = this.topologicalSort(nodes);

    for (const itemId of topoOrder) {
      const node = nodes.get(itemId)!;

      if (node.predecessors.length === 0) {
        // No predecessors: start at project start
        node.earlyStart = new Date(projectStartDate);
      } else {
        // Calculate early start based on all predecessors
        let maxEarlyStart = new Date(0);

        for (const pred of node.predecessors) {
          const predNode = nodes.get(pred.id)!;
          const predEarlyEnd = predNode.earlyEnd || new Date(projectStartDate);

          // Calculate dependency constraint
          let constraintDate = new Date(predEarlyEnd);

          switch (pred.type) {
            case DependencyType.FS: // Finish-to-Start
              constraintDate = new Date(predEarlyEnd);
              break;
            case DependencyType.SS: // Start-to-Start
              constraintDate = new Date(predNode.earlyStart || projectStartDate);
              break;
            case DependencyType.FF: // Finish-to-Finish
              constraintDate = new Date(predEarlyEnd);
              break;
            case DependencyType.SF: // Start-to-Finish
              constraintDate = new Date(predNode.earlyStart || projectStartDate);
              break;
          }

          // Add lag in days
          if (pred.lag > 0) {
            constraintDate = new Date(
              constraintDate.getTime() + pred.lag * 24 * 60 * 60 * 1000
            );
          }

          if (constraintDate > maxEarlyStart) {
            maxEarlyStart = constraintDate;
          }
        }

        node.earlyStart = maxEarlyStart;
      }

      // Calculate early end date
      node.earlyEnd = await calendarService.addWorkingTime(
        node.earlyStart,
        node.durationHours,
        calendar,
        organisationId
      );
    }
  }

  /**
   * Backward pass: calculate late start and late end dates
   */
  private async backwardPass(
    nodes: Map<string, DependencyNode>,
    calendar: CalendarConfig,
    organisationId: string
  ): Promise<void> {
    const topoOrder = this.topologicalSort(nodes);
    const reverseOrder = topoOrder.reverse();

    // Find project end date
    let projectEndDate = new Date(0);
    for (const node of nodes.values()) {
      if (node.earlyEnd && node.earlyEnd > projectEndDate) {
        projectEndDate = node.earlyEnd;
      }
    }

    for (const itemId of reverseOrder) {
      const node = nodes.get(itemId)!;

      if (node.successors.length === 0) {
        // No successors: end at project end
        node.lateEnd = new Date(projectEndDate);
      } else {
        // Calculate late end based on all successors
        let minLateEnd = new Date(8640000000000000); // Max date

        for (const succ of node.successors) {
          const succNode = nodes.get(succ.id)!;
          const succLateStart = succNode.lateStart || projectEndDate;

          // Calculate dependency constraint
          let constraintDate = new Date(succLateStart);

          switch (succ.type) {
            case DependencyType.FS: // Finish-to-Start
              constraintDate = new Date(succLateStart);
              break;
            case DependencyType.SS: // Start-to-Start
              constraintDate = new Date(succNode.lateEnd || projectEndDate);
              break;
            case DependencyType.FF: // Finish-to-Finish
              constraintDate = new Date(succNode.lateEnd || projectEndDate);
              break;
            case DependencyType.SF: // Start-to-Finish
              constraintDate = new Date(succLateStart);
              break;
          }

          // Subtract lag in days
          if (succ.lag > 0) {
            constraintDate = new Date(
              constraintDate.getTime() - succ.lag * 24 * 60 * 60 * 1000
            );
          }

          if (constraintDate < minLateEnd) {
            minLateEnd = constraintDate;
          }
        }

        node.lateEnd = minLateEnd;
      }

      // Calculate late start date by subtracting duration
      // Note: This is a simplified calculation; full implementation would subtract working hours
      const durationMs = (node.durationHours * 60 * 60 * 1000);
      node.lateStart = new Date(node.lateEnd!.getTime() - durationMs);
    }
  }

  /**
   * Build schedule item results from nodes
   */
  private buildScheduleItems(nodes: Map<string, DependencyNode>): ScheduleItem[] {
    const items: ScheduleItem[] = [];

    for (const [id, node] of nodes) {
      const slack = node.lateStart && node.earlyStart
        ? (node.lateStart.getTime() - node.earlyStart.getTime()) / (1000 * 60 * 60 * 24)
        : 0;

      const isCritical = slack < 1; // Critical if slack < 1 day

      items.push({
        id,
        name: `${node.type}-${id.substring(0, 8)}`,
        type: node.type,
        durationHours: node.durationHours,
        startDate: node.earlyStart || new Date(),
        endDate: node.earlyEnd || new Date(),
        earlyStart: node.earlyStart || new Date(),
        earlyEnd: node.earlyEnd || new Date(),
        lateStart: node.lateStart || new Date(),
        lateEnd: node.lateEnd || new Date(),
        slack: Math.max(0, slack),
        isCritical,
        predecessorIds: node.predecessors.map((p) => p.id),
        successorIds: node.successors.map((s) => s.id),
      });
    }

    return items;
  }

  /**
   * Identify critical path items
   */
  private identifyCriticalPath(nodes: Map<string, DependencyNode>): string[] {
    const criticalItems: string[] = [];

    for (const [id, node] of nodes) {
      const slack = node.lateStart && node.earlyStart
        ? (node.lateStart.getTime() - node.earlyStart.getTime()) / (1000 * 60 * 60 * 24)
        : 0;

      if (slack < 1) {
        criticalItems.push(id);
      }
    }

    return criticalItems;
  }

  /**
   * Validate schedule for feasibility issues
   */
  private validateSchedule(items: ScheduleItem[]): string[] {
    const warnings: string[] = [];

    // Check for overlapping dates
    const itemsByType = new Map<string, ScheduleItem[]>();
    for (const item of items) {
      if (!itemsByType.has(item.type)) {
        itemsByType.set(item.type, []);
      }
      itemsByType.get(item.type)!.push(item);
    }

    // Check if project duration is reasonable
    if (items.length > 0) {
      let maxEnd = items[0].endDate;
      let minStart = items[0].startDate;

      for (const item of items) {
        if (item.endDate > maxEnd) maxEnd = item.endDate;
        if (item.startDate < minStart) minStart = item.startDate;
      }

      const durationDays = (maxEnd.getTime() - minStart.getTime()) / (1000 * 60 * 60 * 24);
      if (durationDays < 0) {
        warnings.push("Negative project duration detected");
      }
    }

    return warnings;
  }

  /**
   * Get critical path for visualization
   */
  async getCriticalPath(projectId: string): Promise<ScheduleItem[]> {
    try {
      const schedule = await this.calculateProjectSchedule(projectId);
      return schedule.items.filter((item) => item.isCritical);
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Get slack time analysis for all items
   */
  async getSlackAnalysis(projectId: string): Promise<
    Array<{ itemId: string; slack: number; isCritical: boolean }>
  > {
    try {
      const schedule = await this.calculateProjectSchedule(projectId);
      return schedule.items.map((item) => ({
        itemId: item.id,
        slack: item.slack,
        isCritical: item.isCritical,
      }));
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Get dependency chain from item to end of project
   */
  async getDependencyChain(itemId: string): Promise<string[]> {
    try {
      const chain: string[] = [itemId];
      const visited = new Set<string>([itemId]);
      const queue: string[] = [itemId];

      while (queue.length > 0) {
        const current = queue.shift()!;

        // Check if it's an activity or task
        const activity = await prisma.activity.findUnique({
          where: { id: current },
          select: { id: true },
        });

        if (activity) {
          const deps = await dependencyService.getActivitySuccessors(current);
          for (const dep of deps) {
            if (!visited.has(dep.activitySuccessorId!)) {
              visited.add(dep.activitySuccessorId!);
              chain.push(dep.activitySuccessorId!);
              queue.push(dep.activitySuccessorId!);
            }
          }
        } else {
          const deps = await dependencyService.getTaskSuccessors(current);
          for (const dep of deps) {
            if (!visited.has(dep.taskSuccessorId!)) {
              visited.add(dep.taskSuccessorId!);
              chain.push(dep.taskSuccessorId!);
              queue.push(dep.taskSuccessorId!);
            }
          }
        }
      }

      return chain;
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Calculate resource leveling needs
   */
  async getResourceLevelingAnalysis(projectId: string): Promise<
    Array<{ date: Date; itemCount: number; itemIds: string[] }>
  > {
    try {
      const schedule = await this.calculateProjectSchedule(projectId);

      // Group items by week for leveling analysis
      const weekGroups = new Map<string, ScheduleItem[]>();

      for (const item of schedule.items) {
        const weekStart = this.getWeekStart(item.earlyStart);
        const weekKey = weekStart.toISOString();

        if (!weekGroups.has(weekKey)) {
          weekGroups.set(weekKey, []);
        }
        weekGroups.get(weekKey)!.push(item);
      }

      // Convert to result format
      const result: Array<{ date: Date; itemCount: number; itemIds: string[] }> = [];
      for (const [weekKey, items] of weekGroups) {
        result.push({
          date: new Date(weekKey),
          itemCount: items.length,
          itemIds: items.map((i) => i.id),
        });
      }

      return result.sort((a, b) => a.date.getTime() - b.date.getTime());
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Get start of week for a given date
   */
  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }
}

export const schedulerService = new SchedulerService();
