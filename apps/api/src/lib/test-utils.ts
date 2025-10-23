// ABOUTME: Test utilities for database and API testing
// ABOUTME: Provides helpers for creating test data and managing test database state

import { PrismaClient } from "@prisma/client";

let prismaInstance: PrismaClient | null = null;

/**
 * Get or create Prisma client for testing
 */
export function getPrismaForTests(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient();
  }
  return prismaInstance;
}

/**
 * Reset database between tests (clear all data)
 */
export async function resetDatabase(): Promise<void> {
  const prisma = getPrismaForTests();

  try {
    // Delete in order of foreign key dependencies
    await prisma.auditLog.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.dependency.deleteMany();
    await prisma.baselineSnapshot.deleteMany();
    await prisma.projectBaseline.deleteMany();
    await prisma.task.deleteMany();
    await prisma.activity.deleteMany();
    // Clear many-to-many relations
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "_ProjectMembers" CASCADE`);
    await prisma.project.deleteMany();
    await prisma.holiday.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organisation.deleteMany();
  } catch (error) {
    console.error("Failed to reset database:", error);
    throw error;
  }
}

/**
 * Disconnect Prisma client
 */
export async function disconnectDatabase(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
}

/**
 * Test data builder for Organisation
 */
export function createTestOrganisation(overrides = {}) {
  return {
    name: "Test Organisation",
    timezone: "UTC",
    workingDaysOfWeek: "MTWTFSS",
    workingHours: [
      { start: "09:00", end: "13:00" },
      { start: "14:00", end: "18:00" },
    ],
    ...overrides,
  };
}

/**
 * Test data builder for User
 */
export function createTestUser(organisationId: string, overrides = {}) {
  return {
    email: `user-${Date.now()}@test.com`,
    name: "Test User",
    passwordHash: "$2a$10$placeholder",
    role: "TEAM_MEMBER" as const,
    organisationId,
    ...overrides,
  };
}

/**
 * Test data builder for Project
 */
export function createTestProject(
  organisationId: string,
  ownerUserId: string,
  overrides = {}
) {
  const now = new Date();
  const futureDate = new Date(now);
  futureDate.setDate(futureDate.getDate() + 30);

  return {
    name: `Test Project ${Date.now()}`,
    description: "Test project description",
    organisationId,
    ownerUserId,
    startDate: now,
    timezone: "UTC",
    status: "NOT_STARTED" as const,
    progressPercentage: 0,
    ...overrides,
  };
}

/**
 * Test data builder for Activity
 */
export function createTestActivity(projectId: string, overrides = {}) {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 10);

  return {
    projectId,
    name: `Test Activity ${Date.now()}`,
    description: "Test activity description",
    startDate: now,
    endDate,
    status: "NOT_STARTED" as const,
    trackingStatus: "ON_TRACK" as const,
    progressPercentage: 0,
    ...overrides,
  };
}

/**
 * Test data builder for Task
 */
export function createTestTask(activityId: string, overrides = {}) {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 5);

  return {
    activityId,
    name: `Test Task ${Date.now()}`,
    description: "Test task description",
    startDate: now,
    endDate,
    duration: 40,
    status: "NOT_STARTED" as const,
    trackingStatus: "ON_TRACK" as const,
    progressPercentage: 0,
    ...overrides,
  };
}

/**
 * Global setup for test suite
 */
export async function setupTestDatabase(): Promise<void> {
  // Ensure we have a Prisma instance
  getPrismaForTests();
}

/**
 * Global teardown for test suite
 */
export async function teardownTestDatabase(): Promise<void> {
  await disconnectDatabase();
}
