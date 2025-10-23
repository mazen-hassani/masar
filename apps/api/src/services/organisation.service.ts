// ABOUTME: Service for Organisation entity CRUD operations
// ABOUTME: Handles organisation management and multi-tenancy

import { prisma } from "@/lib/prisma";
import { BaseService, PaginationParams, PaginatedResponse } from "./base.service";
import { Organisation } from "@prisma/client";

export class OrganisationService extends BaseService {
  /**
   * Create a new organisation
   */
  async create(data: {
    name: string;
    timezone?: string;
    workingDaysOfWeek?: string;
    workingHours?: unknown;
  }): Promise<Organisation> {
    try {
      return await prisma.organisation.create({
        data: {
          name: data.name,
          timezone: data.timezone || "UTC",
          workingDaysOfWeek: data.workingDaysOfWeek || "MTWTF",
          workingHours: data.workingHours || [
            { start: "09:00", end: "13:00" },
            { start: "14:00", end: "18:00" },
          ],
        },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Get organisation by ID
   */
  async getById(id: string): Promise<Organisation | null> {
    try {
      return await prisma.organisation.findUnique({
        where: { id },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Get all organisations (paginated)
   */
  async getAll(
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<Organisation>> {
    const skip = params.skip || 0;
    const take = params.take || 20;

    try {
      const [organisations, total] = await Promise.all([
        prisma.organisation.findMany({
          skip,
          take,
          orderBy: this.buildOrderBy(params.sortBy, params.sortOrder),
        }),
        prisma.organisation.count(),
      ]);

      return this.createPaginatedResponse(organisations, total, skip, take);
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Update organisation
   */
  async update(
    id: string,
    data: Partial<{
      name: string;
      timezone: string;
      workingDaysOfWeek: string;
      workingHours: unknown;
    }>
  ): Promise<Organisation> {
    try {
      return await prisma.organisation.update({
        where: { id },
        data,
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Delete organisation (cascades to all data)
   */
  async delete(id: string): Promise<Organisation> {
    try {
      return await prisma.organisation.delete({
        where: { id },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Get organisation with all relations
   */
  async getWithRelations(id: string) {
    try {
      return await prisma.organisation.findUnique({
        where: { id },
        include: {
          users: true,
          projects: true,
          holidays: true,
        },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }
}

export const organisationService = new OrganisationService();
