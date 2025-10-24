// ABOUTME: Projects API endpoints for CRUD operations
// ABOUTME: Implements RESTful routes for project management with proper validation

import { Router, Request, Response, NextFunction } from "express";
import { authMiddleware, requireRole } from "../middleware/auth.middleware";
import { projectsService } from "../services/projects.service";
import { activitiesService } from "../services/activities.service";
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
    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Project not found") {
      return res.status(404).json({ error: "Project not found" });
    }
    next(error);
  }
});

export default router;
