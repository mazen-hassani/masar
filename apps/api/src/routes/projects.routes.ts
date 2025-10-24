// ABOUTME: Projects API endpoints for CRUD operations
// ABOUTME: Implements RESTful routes for project management with proper validation

import { Router, Request, Response, NextFunction } from "express";
import { authMiddleware, requireRole } from "../middleware/auth.middleware";
import { projectsService } from "../services/projects.service";
import { activitiesService } from "../services/activities.service";
import { tasksService } from "../services/tasks.service";
import { z } from "zod";

const router = Router();

// Request validation schemas
const CreateProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  startDate: z.string().datetime(),
  timezone: z.string().optional(),
  memberIds: z.array(z.string()).optional(),
});

const UpdateProjectSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  startDate: z.string().datetime().optional(),
  timezone: z.string().optional(),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "VERIFIED"]).optional(),
  progressPercentage: z.number().min(0).max(100).optional(),
  memberIds: z.array(z.string()).optional(),
});

/**
 * POST /api/projects
 * Create a new project
 */
router.post("/", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = CreateProjectSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validation.error.errors,
      });
    }

    const project = await projectsService.createProject({
      ...validation.data,
      startDate: new Date(validation.data.startDate),
      ownerUserId: req.user!.id,
      organisationId: req.user!.organisationId,
    });

    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/projects
 * List all projects for the user
 */
router.get("/", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const pageSize = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const status = req.query.status as string | undefined;

    // Convert page/pageSize to skip/take
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const result = await projectsService.listProjects({
      organisationId: req.user!.organisationId,
      userId: req.user!.id,
      status: status as any,
      skip,
      take: Math.min(take, 100), // Cap at 100
    });

    // Transform to PaginatedResponse format
    const totalPages = Math.ceil(result.pagination.total / pageSize);

    res.json({
      data: result.projects,
      total: result.pagination.total,
      page,
      pageSize,
      totalPages,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/projects/:id
 * Get project details
 */
router.get("/:id", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await projectsService.getProjectById(req.params.id, req.user!.id);
    res.json(project);
  } catch (error) {
    if (error instanceof Error && error.message === "Project not found") {
      return res.status(404).json({ error: "Project not found" });
    }
    if (error instanceof Error && error.message === "Unauthorized access to project") {
      return res.status(403).json({ error: "Unauthorized access to project" });
    }
    next(error);
  }
});

/**
 * PUT /api/projects/:id
 * Update project
 */
router.put("/:id", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = UpdateProjectSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validation.error.errors,
      });
    }

    const project = await projectsService.updateProject(req.params.id, validation.data, req.user!.id);

    res.json(project);
  } catch (error) {
    if (error instanceof Error && error.message === "Project not found") {
      return res.status(404).json({ error: "Project not found" });
    }
    if (error instanceof Error && error.message === "Unauthorized to update this project") {
      return res.status(403).json({ error: "Unauthorized to update this project" });
    }
    next(error);
  }
});

/**
 * DELETE /api/projects/:id
 * Delete project
 */
router.delete("/:id", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await projectsService.deleteProject(req.params.id, req.user!.id);
    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Project not found") {
      return res.status(404).json({ error: "Project not found" });
    }
    if (error instanceof Error && error.message === "Unauthorized to delete this project") {
      return res.status(403).json({ error: "Unauthorized to delete this project" });
    }
    next(error);
  }
});

/**
 * GET /api/projects/:id/stats
 * Get project statistics
 */
router.get("/:id/stats", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Verify access first
    await projectsService.getProjectById(req.params.id, req.user!.id);

    const stats = await projectsService.getProjectStats(req.params.id);
    res.json(stats);
  } catch (error) {
    if (error instanceof Error && error.message === "Project not found") {
      return res.status(404).json({ error: "Project not found" });
    }
    if (error instanceof Error && error.message === "Unauthorized access to project") {
      return res.status(403).json({ error: "Unauthorized access to project" });
    }
    next(error);
  }
});

/**
 * GET /api/projects/:projectId/activities
 * Get all activities in a project
 */
router.get("/:projectId/activities", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Verify project access
    await projectsService.getProjectById(req.params.projectId, req.user!.id);

    const skip = req.query.skip ? parseInt(req.query.skip as string) : 0;
    const take = req.query.take ? parseInt(req.query.take as string) : 50;

    const result = await activitiesService.listActivitiesByProject(req.params.projectId, skip, take);
    // Return just the activities array (not paginated response)
    res.json(result.activities);
  } catch (error) {
    if (error instanceof Error && error.message === "Project not found") {
      return res.status(404).json({ error: "Project not found" });
    }
    next(error);
  }
});

/**
 * POST /api/projects/:projectId/activities
 * Create a new activity in a project
 */
router.post("/:projectId/activities", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Verify project access
    await projectsService.getProjectById(req.params.projectId, req.user!.id);

    const CreateActivitySchema = z.object({
      name: z.string().min(1, "Activity name is required"),
      description: z.string().optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
    });

    const validation = CreateActivitySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validation.error.errors,
      });
    }

    const activity = await activitiesService.createActivity({
      projectId: req.params.projectId,
      ...validation.data,
      startDate: validation.data.startDate ? new Date(validation.data.startDate) : new Date(),
      endDate: validation.data.endDate ? new Date(validation.data.endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days from now
    });

    res.status(201).json(activity);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/projects/:projectId/activities/:activityId/tasks
 * Get all tasks in an activity
 */
router.get("/:projectId/activities/:activityId/tasks", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Verify project access
    await projectsService.getProjectById(req.params.projectId, req.user!.id);

    const skip = req.query.skip ? parseInt(req.query.skip as string) : 0;
    const take = req.query.take ? parseInt(req.query.take as string) : 50;

    const result = await tasksService.listTasksByActivity(req.params.activityId, skip, take);
    // Return just the tasks array (not paginated response)
    res.json(result.tasks);
  } catch (error) {
    if (error instanceof Error && error.message === "Activity not found") {
      return res.status(404).json({ error: "Activity not found" });
    }
    next(error);
  }
});

/**
 * PUT /api/projects/:projectId/activities/:activityId
 * Update activity
 */
router.put("/:projectId/activities/:activityId", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Verify project access
    await projectsService.getProjectById(req.params.projectId, req.user!.id);

    const UpdateActivitySchema = z.object({
      name: z.string().optional(),
      description: z.string().optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      status: z.enum(["NOT_STARTED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "VERIFIED"]).optional(),
      progressPercentage: z.number().min(0).max(100).optional(),
    });

    const validation = UpdateActivitySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validation.error.errors,
      });
    }

    const activity = await activitiesService.updateActivity(req.params.activityId, {
      ...validation.data,
      startDate: validation.data.startDate ? new Date(validation.data.startDate) : undefined,
      endDate: validation.data.endDate ? new Date(validation.data.endDate) : undefined,
    });

    res.json(activity);
  } catch (error) {
    if (error instanceof Error && error.message === "Activity not found") {
      return res.status(404).json({ error: "Activity not found" });
    }
    next(error);
  }
});

/**
 * DELETE /api/projects/:projectId/activities/:activityId
 * Delete activity
 */
router.delete("/:projectId/activities/:activityId", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Verify project access
    await projectsService.getProjectById(req.params.projectId, req.user!.id);

    const result = await activitiesService.deleteActivity(req.params.activityId);
    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Activity not found") {
      return res.status(404).json({ error: "Activity not found" });
    }
    next(error);
  }
});

/**
 * POST /api/projects/:projectId/activities/:activityId/tasks
 * Create task in activity
 */
router.post("/:projectId/activities/:activityId/tasks", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Verify project access
    await projectsService.getProjectById(req.params.projectId, req.user!.id);

    const CreateTaskSchema = z.object({
      name: z.string().min(1, "Task name is required"),
      description: z.string().optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      duration: z.number().positive().optional(),
      assigneeUserId: z.string().optional(),
    });

    const validation = CreateTaskSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validation.error.errors,
      });
    }

    const task = await tasksService.createTask({
      activityId: req.params.activityId,
      ...validation.data,
      startDate: validation.data.startDate ? new Date(validation.data.startDate) : new Date(),
      endDate: validation.data.endDate ? new Date(validation.data.endDate) : new Date(),
      duration: validation.data.duration || 8,
    });

    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/projects/:projectId/activities/:activityId/tasks/:taskId
 * Update task
 */
router.put("/:projectId/activities/:activityId/tasks/:taskId", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Verify project access
    await projectsService.getProjectById(req.params.projectId, req.user!.id);

    const UpdateTaskSchema = z.object({
      name: z.string().optional(),
      description: z.string().optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      duration: z.number().positive().optional(),
      assigneeUserId: z.string().nullable().optional(),
      status: z.enum(["NOT_STARTED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "VERIFIED"]).optional(),
      progressPercentage: z.number().min(0).max(100).optional(),
    });

    const validation = UpdateTaskSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validation.error.errors,
      });
    }

    const task = await tasksService.updateTask(req.params.taskId, {
      ...validation.data,
      startDate: validation.data.startDate ? new Date(validation.data.startDate) : undefined,
      endDate: validation.data.endDate ? new Date(validation.data.endDate) : undefined,
    });

    res.json(task);
  } catch (error) {
    if (error instanceof Error && error.message === "Task not found") {
      return res.status(404).json({ error: "Task not found" });
    }
    next(error);
  }
});

/**
 * DELETE /api/projects/:projectId/activities/:activityId/tasks/:taskId
 * Delete task
 */
router.delete("/:projectId/activities/:activityId/tasks/:taskId", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Verify project access
    await projectsService.getProjectById(req.params.projectId, req.user!.id);

    const result = await tasksService.deleteTask(req.params.taskId);
    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Task not found") {
      return res.status(404).json({ error: "Task not found" });
    }
    next(error);
  }
});

export default router;
