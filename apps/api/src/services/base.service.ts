// ABOUTME: Base service class providing common CRUD operations
// ABOUTME: Extends with pagination, filtering, and error handling

import { Prisma } from "@prisma/client";

export interface PaginationParams {
  skip?: number;
  take?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  skip: number;
  take: number;
  hasMore: boolean;
}

export class BaseService {
  /**
   * Create paginated response metadata
   */
  protected createPaginatedResponse<T>(
    data: T[],
    total: number,
    skip: number,
    take: number
  ): PaginatedResponse<T> {
    return {
      data,
      total,
      skip,
      take,
      hasMore: skip + take < total,
    };
  }

  /**
   * Build Prisma order by clause
   */
  protected buildOrderBy(sortBy?: string, sortOrder: "asc" | "desc" = "asc") {
    if (!sortBy) return undefined;
    return { [sortBy]: sortOrder };
  }

  /**
   * Handle Prisma errors and convert to readable messages
   */
  protected handlePrismaError(error: unknown): Error {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case "P2002":
          return new Error(`Unique constraint violation on ${error.meta?.target}`);
        case "P2025":
          return new Error("Record not found");
        case "P2003":
          return new Error("Foreign key constraint violation");
        case "P2014":
          return new Error("Required relation violation");
        default:
          return new Error(`Database error: ${error.message}`);
      }
    }

    if (error instanceof Error) {
      return error;
    }

    return new Error("Unknown error occurred");
  }
}
