// ABOUTME: Analytics API endpoints - computes project and task metrics
// ABOUTME: Provides dashboard analytics and project performance data

import { Router, Request, Response, NextFunction } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { prisma } from "../lib/prisma";

const router = Router();

/**
 * GET /api/analytics/dashboard
 * Get overall dashboard analytics for the current user
 */
router.get("/dashboard", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const organisationId = req.user!.organisationId;

    // Get all projects for the organisation
    const projects = await prisma.project.findMany({
      where: {
        organisationId: organisationId,
      },
      include: {
        activities: {
          include: {
            tasks: true,
          },
        },
      },
    });

    // Calculate project metrics
    const totalProjects = projects.length;
    const activeProjects = projects.filter((p) => p.status === "IN_PROGRESS").length;
    const completedProjects = projects.filter((p) => p.status === "COMPLETED").length;
    const onTrackProjects = projects.filter((p) => p.progressPercentage >= 70).length;
    const atRiskProjects = projects.filter((p) => p.progressPercentage >= 40 && p.progressPercentage < 70).length;
    const offTrackProjects = projects.filter((p) => p.progressPercentage < 40).length;

    // Calculate task metrics
    let totalTasks = 0;
    let completedTasks = 0;
    let inProgressTasks = 0;
    let overdueTasks = 0;

    const now = new Date();

    projects.forEach((project) => {
      project.activities.forEach((activity) => {
        activity.tasks.forEach((task) => {
          totalTasks++;
          if (task.status === "COMPLETED" || task.status === "VERIFIED") {
            completedTasks++;
          } else if (task.status === "IN_PROGRESS") {
            inProgressTasks++;
          }
          if (task.endDate && new Date(task.endDate) < now && task.status !== "COMPLETED" && task.status !== "VERIFIED") {
            overdueTasks++;
          }
        });
      });
    });

    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    res.json({
      projectMetrics: {
        totalProjects,
        activeProjects,
        completedProjects,
        onTrackProjects,
        atRiskProjects,
        offTrackProjects,
      },
      taskMetrics: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        overdueTasks,
        completionRate: Math.round(completionRate * 100) / 100,
        averageTaskDuration: 0,
      },
      timelineData: [],
      topProjects: [],
      activitySummary: [],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/projects/:projectId
 * Get analytics for a specific project
 */
router.get("/projects/:projectId", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        activities: {
          include: {
            tasks: true,
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Calculate completion percentage
    let totalTasks = 0;
    let completedTasks = 0;
    const taskBreakdown: { label: string; value: number }[] = [
      { label: "Not Started", value: 0 },
      { label: "In Progress", value: 0 },
      { label: "On Hold", value: 0 },
      { label: "Completed", value: 0 },
      { label: "Verified", value: 0 },
    ];

    project.activities.forEach((activity) => {
      activity.tasks.forEach((task) => {
        totalTasks++;
        if (task.status === "COMPLETED" || task.status === "VERIFIED") {
          completedTasks++;
        }
        if (task.status === "NOT_STARTED") taskBreakdown[0].value++;
        else if (task.status === "IN_PROGRESS") taskBreakdown[1].value++;
        else if (task.status === "ON_HOLD") taskBreakdown[2].value++;
        else if (task.status === "COMPLETED") taskBreakdown[3].value++;
        else if (task.status === "VERIFIED") taskBreakdown[4].value++;
      });
    });

    const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    res.json({
      completionPercentage: Math.round(completionPercentage * 100) / 100,
      taskBreakdown: taskBreakdown.filter((item) => item.value > 0),
      timelineChart: [],
      criticalPath: [],
      resourceUtilization: [],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/schedule/:projectId
 * Get project schedule for Gantt chart
 */
router.get("/schedule/:projectId", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        activities: {
          include: {
            tasks: true,
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const items = project.activities.map((activity) => ({
      id: activity.id,
      name: activity.name,
      startDate: activity.startDate,
      endDate: activity.endDate,
      predecessorIds: [],
    }));

    // Add tasks as items too
    project.activities.forEach((activity) => {
      activity.tasks.forEach((task) => {
        items.push({
          id: task.id,
          name: task.name,
          startDate: task.startDate,
          endDate: task.endDate,
          predecessorIds: [],
        });
      });
    });

    // Find critical path (simplified - items with no slack)
    const criticalPath = items
      .filter((item) => item.startDate && item.endDate)
      .map((item) => item.id);

    res.json({
      items,
      criticalPath,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
