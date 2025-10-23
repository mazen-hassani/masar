// ABOUTME: Service for User entity CRUD operations
// ABOUTME: Handles user management, authentication, and role-based access

import { prisma } from "@/lib/prisma";
import { BaseService, PaginationParams, PaginatedResponse } from "./base.service";
import type { Prisma } from "@prisma/client";

export class UserService extends BaseService {
  /**
   * Create a new user
   */
  async create(data: {
    email: string;
    name: string;
    passwordHash: string;
    role?: string;
    organisationId: string;
  }): Promise<any> {
    try {
      return await prisma.user.create({
        data: {
          email: data.email,
          name: data.name,
          passwordHash: data.passwordHash,
          role: data.role || "TEAM_MEMBER",
          organisationId: data.organisationId,
        },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Get user by ID
   */
  async getById(id: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { id },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Get user by email
   */
  async getByEmail(email: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { email },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Get users in organisation (paginated)
   */
  async getByOrganisation(
    organisationId: string,
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<User>> {
    const skip = params.skip || 0;
    const take = params.take || 20;

    try {
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where: { organisationId },
          skip,
          take,
          orderBy: this.buildOrderBy(params.sortBy, params.sortOrder),
        }),
        prisma.user.count({
          where: { organisationId },
        }),
      ]);

      return this.createPaginatedResponse(users, total, skip, take);
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Get users by role
   */
  async getByRole(
    organisationId: string,
    role: Role
  ): Promise<User[]> {
    try {
      return await prisma.user.findMany({
        where: {
          organisationId,
          role,
        },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Update user
   */
  async update(
    id: string,
    data: Partial<{
      email: string;
      name: string;
      passwordHash: string;
      role: Role;
    }>
  ): Promise<User> {
    try {
      return await prisma.user.update({
        where: { id },
        data,
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Delete user
   */
  async delete(id: string): Promise<User> {
    try {
      return await prisma.user.delete({
        where: { id },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Get user with related data
   */
  async getWithRelations(id: string) {
    try {
      return await prisma.user.findUnique({
        where: { id },
        include: {
          organisation: true,
          projectsOwned: true,
          projectsAssigned: true,
          assignedTasks: true,
          refreshTokens: true,
        },
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Check if user exists
   */
  async exists(id: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true },
      });
      return !!user;
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }
}

export const userService = new UserService();
