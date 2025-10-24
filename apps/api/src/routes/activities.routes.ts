// ABOUTME: Activities API endpoints for CRUD operations and status management
// ABOUTME: Implements RESTful routes for activity management within projects

import { Router, Request, Response, NextFunction } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { activitiesService } from "../services/activities.service";
import { z } from "zod";

const router = Router();

const CreateActivitySchema = z.object({
  projectId: z.string(),
  name: z.string().min(1, "Activity name is required"),
  description: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

const UpdateActivitySchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "VERIFIED"]).optional(),
  progressPercentage: z.number().min(0).max(100).optional(),
});

const ChangeStatusSchema = z.object({
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "VERIFIED"]),
});

/**
 * POST /api/activities
 * Create a new activity
 */
router.post("/", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = CreateActivitySchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validation.error.errors,
      });
    }

    const activity = await activitiesService.createActivity({
      ...validation.data,
      startDate: new Date(validation.data.startDate),
      endDate: new Date(validation.data.endDate),
    });

    res.status(201).json(activity);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/activities/:id
 * Get activity details
 */
router.get("/:id", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activity = await activitiesService.getActivityById(req.params.id);
    res.json(activity);
  } catch (error) {
    if (error instanceof Error && error.message === "Activity not found") {
      return res.status(404).json({ error: "Activity not found" });
    }
    next(error);
  }
});

/**
 * GET /api/activities/project/:projectId
 * List activities by project
 */
router.get("/project/:projectId", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const skip = req.query.skip ? parseInt(req.query.skip as string) : 0;
    const take = req.query.take ? parseInt(req.query.take as string) : 50;

    const result = await activitiesService.listActivitiesByProject(req.params.projectId, skip, take);
    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Project not found") {
      return res.status(404).json({ error: "Project not found" });
    }
    next(error);
  }
});

/**
 * PUT /api/activities/:id
 * Update activity
 */
router.put("/:id", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = UpdateActivitySchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validation.error.errors,
      });
    }

    const activity = await activitiesService.updateActivity(
      req.params.id,
      {
        ...validation.data,
        startDate: validation.data.startDate ? new Date(validation.data.startDate) : undefined,
        endDate: validation.data.endDate ? new Date(validation.data.endDate) : undefined,
      }
    );

    res.json(activity);
  } catch (error) {
    if (error instanceof Error && error.message === "Activity not found") {
      return res.status(404).json({ error: "Activity not found" });
    }
    next(error);
  }
});

/**
 * PATCH /api/activities/:id/status
 * Change activity status
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

    const activity = await activitiesService.changeStatus(req.params.id, validation.data.status);
    res.json(activity);
  } catch (error) {
    if (error instanceof Error && error.message === "Activity not found") {
      return res.status(404).json({ error: "Activity not found" });
    }
    if (error instanceof Error && error.message.includes("Cannot verify")) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

/**
 * DELETE /api/activities/:id
 * Delete activity
 */
router.delete("/:id", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await activitiesService.deleteActivity(req.params.id);
    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Activity not found") {
      return res.status(404).json({ error: "Activity not found" });
    }
    next(error);
  }
});

/**
 * PATCH /api/activities/:id/recalculate-progress
 * Recalculate activity progress based on child tasks
 */
router.patch("/:id/recalculate-progress", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activity = await activitiesService.recalculateProgress(req.params.id);
    res.json(activity);
  } catch (error) {
    if (error instanceof Error && error.message === "Activity not found") {
      return res.status(404).json({ error: "Activity not found" });
    }
    next(error);
  }
});

export default router;
