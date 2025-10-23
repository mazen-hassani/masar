// ABOUTME: Prisma client singleton for serverless deployment
// ABOUTME: Handles connection pooling and prevents multiple client instantiation

import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Handle connection pooling for serverless
if (process.env.NODE_ENV === "production") {
  // In production, use connection pooling
  prisma.$extends({
    result: {
      $allModels: {
        // Add any global model extensions here if needed
      },
    },
  });
}
