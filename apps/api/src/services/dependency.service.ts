// ABOUTME: Service for Dependency management including cycle detection
// ABOUTME: Handles activity and task dependencies with validation

import { prisma } from "@/lib/prisma";
import { BaseService } from "./base.service";
import { Dependency, DependencyType } from "@prisma/client";

export class DependencyService extends BaseService {
  /**
   * Create a dependency between activities
   */
  async createActivityDependency(data: {
    predecessorId: string;
    successorId: string;
    type: DependencyType;
    lag?: number;
  }): Promise<Dependency> {
    try {
      // Validate no self-dependency
      if (data.predecessorId === data.successorId) {
        throw new Error("Cannot create dependency on itself");
      }

      // Check for cycles before creating
      await this.detectActivityCycle(data.predecessorId, data.successorId);

      return await prisma.dependency.create({
        data: {
          activityPredecessorId: data.predecessorId,
          activitySuccessorId: data.successorId,
          dependencyType: data.type,
          lag: data.lag || 0,
        },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Create a dependency between tasks
   */
  async createTaskDependency(data: {
    predecessorId: string;
    successorId: string;
    type: DependencyType;
    lag?: number;
  }): Promise<Dependency> {
    try {
      // Validate no self-dependency
      if (data.predecessorId === data.successorId) {
        throw new Error("Cannot create dependency on itself");
      }

      // Check for cycles
      await this.detectTaskCycle(data.predecessorId, data.successorId);

      return await prisma.dependency.create({
        data: {
          taskPredecessorId: data.predecessorId,
          taskSuccessorId: data.successorId,
          dependencyType: data.type,
          lag: data.lag || 0,
        },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Get activity predecessors (recursive)
   */
  async getActivityPredecessors(activityId: string): Promise<Dependency[]> {
    try {
      return await prisma.dependency.findMany({
        where: { activitySuccessorId: activityId },
        include: { activityPredecessor: true },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Get activity successors (recursive)
   */
  async getActivitySuccessors(activityId: string): Promise<Dependency[]> {
    try {
      return await prisma.dependency.findMany({
        where: { activityPredecessorId: activityId },
        include: { activitySuccessor: true },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Get task predecessors
   */
  async getTaskPredecessors(taskId: string): Promise<Dependency[]> {
    try {
      return await prisma.dependency.findMany({
        where: { taskSuccessorId: taskId },
        include: { taskPredecessor: true },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Get task successors
   */
  async getTaskSuccessors(taskId: string): Promise<Dependency[]> {
    try {
      return await prisma.dependency.findMany({
        where: { taskPredecessorId: taskId },
        include: { taskSuccessor: true },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Delete a dependency
   */
  async delete(id: string): Promise<Dependency> {
    try {
      return await prisma.dependency.delete({
        where: { id },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Detect circular dependency for activities using DFS
   */
  private async detectActivityCycle(
    fromId: string,
    toId: string
  ): Promise<void> {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = await this.hasActivityCycleDFS(toId, fromId, visited, recursionStack);

    if (hasCycle) {
      throw new Error("Creating this dependency would form a circular dependency");
    }
  }

  /**
   * DFS for cycle detection in activities
   */
  private async hasActivityCycleDFS(
    current: string,
    target: string,
    visited: Set<string>,
    recursionStack: Set<string>
  ): Promise<boolean> {
    visited.add(current);
    recursionStack.add(current);

    // Get all successors of current activity
    const successors = await prisma.dependency.findMany({
      where: { activityPredecessorId: current },
      select: { activitySuccessorId: true },
    });

    for (const successor of successors) {
      if (!successor.activitySuccessorId) continue;

      // If we reached the target, there's a cycle
      if (successor.activitySuccessorId === target) {
        return true;
      }

      if (!visited.has(successor.activitySuccessorId)) {
        if (
          await this.hasActivityCycleDFS(
            successor.activitySuccessorId,
            target,
            visited,
            recursionStack
          )
        ) {
          return true;
        }
      } else if (recursionStack.has(successor.activitySuccessorId)) {
        return true;
      }
    }

    recursionStack.delete(current);
    return false;
  }

  /**
   * Detect circular dependency for tasks
   */
  private async detectTaskCycle(
    fromId: string,
    toId: string
  ): Promise<void> {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = await this.hasTaskCycleDFS(toId, fromId, visited, recursionStack);

    if (hasCycle) {
      throw new Error("Creating this dependency would form a circular dependency");
    }
  }

  /**
   * DFS for cycle detection in tasks
   */
  private async hasTaskCycleDFS(
    current: string,
    target: string,
    visited: Set<string>,
    recursionStack: Set<string>
  ): Promise<boolean> {
    visited.add(current);
    recursionStack.add(current);

    // Get all successors of current task
    const successors = await prisma.dependency.findMany({
      where: { taskPredecessorId: current },
      select: { taskSuccessorId: true },
    });

    for (const successor of successors) {
      if (!successor.taskSuccessorId) continue;

      // If we reached the target, there's a cycle
      if (successor.taskSuccessorId === target) {
        return true;
      }

      if (!visited.has(successor.taskSuccessorId)) {
        if (
          await this.hasTaskCycleDFS(
            successor.taskSuccessorId,
            target,
            visited,
            recursionStack
          )
        ) {
          return true;
        }
      } else if (recursionStack.has(successor.taskSuccessorId)) {
        return true;
      }
    }

    recursionStack.delete(current);
    return false;
  }

  /**
   * Get all dependencies for an activity (incoming and outgoing)
   */
  async getActivityDependencies(activityId: string) {
    try {
      const [incoming, outgoing] = await Promise.all([
        this.getActivityPredecessors(activityId),
        this.getActivitySuccessors(activityId),
      ]);

      return { incoming, outgoing };
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Get all dependencies for a task
   */
  async getTaskDependencies(taskId: string) {
    try {
      const [incoming, outgoing] = await Promise.all([
        this.getTaskPredecessors(taskId),
        this.getTaskSuccessors(taskId),
      ]);

      return { incoming, outgoing };
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }
}

export const dependencyService = new DependencyService();
