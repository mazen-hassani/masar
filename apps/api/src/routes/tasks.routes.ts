// ABOUTME: Tasks API endpoints for CRUD operations and assignments
// ABOUTME: Implements RESTful routes for task management within activities

import { Router, Request, Response, NextFunction } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { tasksService } from "../services/tasks.service";
import { z } from "zod";

const router = Router();

const CreateTaskSchema = z.object({
  activityId: z.string(),
  name: z.string().min(1, "Task name is required"),
  description: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  duration: z.number().positive("Duration must be positive"),
  assigneeUserId: z.string().optional(),
});

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

const ChangeStatusSchema = z.object({
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "VERIFIED"]),
});

/**
 * POST /api/tasks
 * Create a new task
 */
router.post("/", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = CreateTaskSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validation.error.errors,
      });
    }

    const task = await tasksService.createTask({
      ...validation.data,
      startDate: new Date(validation.data.startDate),
      endDate: new Date(validation.data.endDate),
    });

    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tasks/activity/:activityId
 * List tasks by activity
 * MUST come before /:id route to avoid conflict
 */
router.get("/activity/:activityId", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const skip = req.query.skip ? parseInt(req.query.skip as string) : 0;
    const take = req.query.take ? parseInt(req.query.take as string) : 50;

    const result = await tasksService.listTasksByActivity(req.params.activityId, skip, take);
    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Activity not found") {
      return res.status(404).json({ error: "Activity not found" });
    }
    next(error);
  }
});

/**
 * GET /api/tasks/assignee/:userId
 * List tasks assigned to user
 * MUST come before /:id route to avoid conflict
 */
router.get("/assignee/:userId", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const skip = req.query.skip ? parseInt(req.query.skip as string) : 0;
    const take = req.query.take ? parseInt(req.query.take as string) : 50;

    const result = await tasksService.listTasksByAssignee(req.params.userId, skip, take);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tasks/project/:projectId/overdue
 * Get overdue tasks for a project
 * MUST come before /:id route to avoid conflict
 */
router.get("/project/:projectId/overdue", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tasks = await tasksService.getOverdueTasks(req.params.projectId);
    res.json({ tasks });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tasks/:id
 * Get task details
 */
router.get("/:id", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await tasksService.getTaskById(req.params.id);
    res.json(task);
  } catch (error) {
    if (error instanceof Error && error.message === "Task not found") {
      return res.status(404).json({ error: "Task not found" });
    }
    next(error);
  }
});

/**
 * PUT /api/tasks/:id
 * Update task
 */
router.put("/:id", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = UpdateTaskSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validation.error.errors,
      });
    }

    const task = await tasksService.updateTask(req.params.id, {
      ...validation.data,
      startDate: validation.data.startDate ? new Date(validation.data.startDate) : undefined,
      endDate: validation.data.endDate ? new Date(validation.data.endDate) : undefined,
    });

    res.json(task);
  } catch (error) {
    if (error instanceof Error && error.message === "Task not found") {
      return res.status(404).json({ error: "Task not found" });
    }
    if (error instanceof Error && error.message === "Assignee not found") {
      return res.status(400).json({ error: "Assignee not found" });
    }
    next(error);
  }
});

/**
 * PATCH /api/tasks/:id/status
 * Change task status
 */
router.patch("/:id/status", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = ChangeStatusSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validation.error.errors,
      });
    }

    const task = await tasksService.changeStatus(req.params.id, validation.data.status);
    res.json(task);
  } catch (error) {
    if (error instanceof Error && error.message === "Task not found") {
      return res.status(404).json({ error: "Task not found" });
    }
    next(error);
  }
});

/**
 * DELETE /api/tasks/:id
 * Delete task
 */
router.delete("/:id", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await tasksService.deleteTask(req.params.id);
    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Task not found") {
      return res.status(404).json({ error: "Task not found" });
    }
    next(error);
  }
});

export default router;
