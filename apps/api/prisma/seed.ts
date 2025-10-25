// ABOUTME: Comprehensive seed script for populating test data into PostgreSQL database
// ABOUTME: Creates multiple sample organisations, users, projects with various statuses and progress levels

import { PrismaClient, Role, Status, TrackingStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting comprehensive database seed...");

  // Clear existing data (in order to respect foreign keys)
  console.log("📝 Cleaning up existing data...");
  await prisma.auditLog.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.dependency.deleteMany();
  await prisma.baselineSnapshot.deleteMany();
  await prisma.projectBaseline.deleteMany();
  await prisma.task.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.project.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organisation.deleteMany();

  // Create organisation
  console.log("🏢 Creating organisation...");
  const organisation = await prisma.organisation.create({
    data: {
      name: "Masar Digital Solutions",
      timezone: "UTC",
      workingDaysOfWeek: "MTWTFSS",
      workingHours: [
        { start: "09:00", end: "13:00" },
        { start: "14:00", end: "18:00" },
      ],
    },
  });

  console.log(`✅ Created organisation: ${organisation.name}`);

  // Create users with proper password hashing
  console.log("👥 Creating users...");
  const hashedPassword = await bcrypt.hash("password123", 10);

  const pmoUser = await prisma.user.create({
    data: {
      email: "pmo@masar.com",
      firstName: "Ahmed",
      lastName: "Hassan",
      passwordHash: hashedPassword,
      role: Role.PMO,
      organisationId: organisation.id,
      isActive: true,
    },
  });

  const pmUser = await prisma.user.create({
    data: {
      email: "pm@masar.com",
      firstName: "Fatima",
      lastName: "Khan",
      passwordHash: hashedPassword,
      role: Role.PM,
      organisationId: organisation.id,
      isActive: true,
    },
  });

  const devUser1 = await prisma.user.create({
    data: {
      email: "dev1@masar.com",
      firstName: "Ali",
      lastName: "Mohammed",
      passwordHash: hashedPassword,
      role: Role.TEAM_MEMBER,
      organisationId: organisation.id,
      isActive: true,
    },
  });

  const devUser2 = await prisma.user.create({
    data: {
      email: "dev2@masar.com",
      firstName: "Zainab",
      lastName: "Ahmed",
      passwordHash: hashedPassword,
      role: Role.TEAM_MEMBER,
      organisationId: organisation.id,
      isActive: true,
    },
  });

  const designerUser = await prisma.user.create({
    data: {
      email: "designer@masar.com",
      firstName: "Noor",
      lastName: "Ibrahim",
      passwordHash: hashedPassword,
      role: Role.TEAM_MEMBER,
      organisationId: organisation.id,
      isActive: true,
    },
  });

  const qaUser = await prisma.user.create({
    data: {
      email: "qa@masar.com",
      firstName: "Sara",
      lastName: "Ali",
      passwordHash: hashedPassword,
      role: Role.TEAM_MEMBER,
      organisationId: organisation.id,
      isActive: true,
    },
  });

  console.log(`✅ Created ${6} users`);

  // Add holidays
  console.log("📅 Adding holidays...");
  const today = new Date();
  const christmas = new Date(today.getFullYear(), 11, 25);
  const newYear = new Date(today.getFullYear() + 1, 0, 1);

  if (christmas < today) {
    christmas.setFullYear(today.getFullYear() + 1);
  }

  await prisma.holiday.create({
    data: {
      date: christmas,
      description: "Christmas Day",
      organisationId: organisation.id,
    },
  });

  await prisma.holiday.create({
    data: {
      date: newYear,
      description: "New Year Day",
      organisationId: organisation.id,
    },
  });

  console.log("✅ Added holidays");

  // Project 1: Website Redesign - IN_PROGRESS (60% complete)
  console.log("📊 Creating Project 1: Website Redesign...");
  const project1Start = new Date(today);
  project1Start.setDate(project1Start.getDate() - 20);
  const project1End = new Date(project1Start);
  project1End.setDate(project1End.getDate() + 60);

  const project1 = await prisma.project.create({
    data: {
      name: "Website Redesign & Modernization",
      description: "Complete redesign of company website with modern UI/UX and improved performance",
      organisationId: organisation.id,
      ownerUserId: pmUser.id,
      members: {
        connect: [{ id: devUser1.id }, { id: devUser2.id }, { id: designerUser.id }, { id: qaUser.id }],
      },
      startDate: project1Start,
      timezone: "UTC",
      status: Status.IN_PROGRESS,
      progressPercentage: 60,
    },
  });

  // Activities for Project 1
  const p1a1Start = new Date(project1Start);
  const p1a1End = new Date(p1a1Start);
  p1a1End.setDate(p1a1End.getDate() + 10);

  const p1activity1 = await prisma.activity.create({
    data: {
      projectId: project1.id,
      name: "Design Phase",
      description: "Create UI/UX designs and wireframes",
      startDate: p1a1Start,
      endDate: p1a1End,
      status: Status.COMPLETED,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 100,
    },
  });

  const p1a2Start = new Date(p1a1End);
  p1a2Start.setDate(p1a2Start.getDate() + 1);
  const p1a2End = new Date(p1a2Start);
  p1a2End.setDate(p1a2End.getDate() + 20);

  const p1activity2 = await prisma.activity.create({
    data: {
      projectId: project1.id,
      name: "Frontend Development",
      description: "Build responsive components and pages",
      startDate: p1a2Start,
      endDate: p1a2End,
      status: Status.IN_PROGRESS,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 70,
    },
  });

  const p1a3Start = new Date(p1a2End);
  p1a3Start.setDate(p1a3Start.getDate() + 1);
  const p1a3End = new Date(p1a3Start);
  p1a3End.setDate(p1a3End.getDate() + 15);

  const p1activity3 = await prisma.activity.create({
    data: {
      projectId: project1.id,
      name: "Backend Integration",
      description: "Integrate with APIs and backend services",
      startDate: p1a3Start,
      endDate: p1a3End,
      status: Status.IN_PROGRESS,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 40,
    },
  });

  const p1a4Start = new Date(p1a3End);
  p1a4Start.setDate(p1a4Start.getDate() + 1);
  const p1a4End = new Date(p1a4Start);
  p1a4End.setDate(p1a4End.getDate() + 10);

  const p1activity4 = await prisma.activity.create({
    data: {
      projectId: project1.id,
      name: "Testing & QA",
      description: "Comprehensive testing and quality assurance",
      startDate: p1a4Start,
      endDate: p1a4End,
      status: Status.NOT_STARTED,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 0,
    },
  });

  // Tasks for Project 1
  console.log("✅ Creating tasks for Project 1...");

  // Design Phase Tasks
  await prisma.task.create({
    data: {
      activityId: p1activity1.id,
      name: "Create wireframes for all pages",
      description: "Develop wireframes showing layout and user flow",
      startDate: p1a1Start,
      endDate: new Date(p1a1Start.getTime() + 3 * 24 * 60 * 60 * 1000),
      duration: 24,
      assigneeUserId: designerUser.id,
      status: Status.COMPLETED,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 100,
    },
  });

  await prisma.task.create({
    data: {
      activityId: p1activity1.id,
      name: "Design visual mockups in Figma",
      description: "Create high-fidelity designs with all visual elements",
      startDate: new Date(p1a1Start.getTime() + 3 * 24 * 60 * 60 * 1000),
      endDate: new Date(p1a1Start.getTime() + 8 * 24 * 60 * 60 * 1000),
      duration: 40,
      assigneeUserId: designerUser.id,
      status: Status.COMPLETED,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 100,
    },
  });

  await prisma.task.create({
    data: {
      activityId: p1activity1.id,
      name: "Design system documentation",
      description: "Document design tokens and component library",
      startDate: new Date(p1a1Start.getTime() + 8 * 24 * 60 * 60 * 1000),
      endDate: p1a1End,
      duration: 16,
      assigneeUserId: designerUser.id,
      status: Status.COMPLETED,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 100,
    },
  });

  // Frontend Development Tasks
  await prisma.task.create({
    data: {
      activityId: p1activity2.id,
      name: "Setup React project with TypeScript",
      description: "Initialize project with TypeScript, ESLint, and testing libraries",
      startDate: p1a2Start,
      endDate: new Date(p1a2Start.getTime() + 2 * 24 * 60 * 60 * 1000),
      duration: 16,
      assigneeUserId: devUser1.id,
      status: Status.COMPLETED,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 100,
    },
  });

  await prisma.task.create({
    data: {
      activityId: p1activity2.id,
      name: "Build component library",
      description: "Create reusable React components based on design system",
      startDate: new Date(p1a2Start.getTime() + 2 * 24 * 60 * 60 * 1000),
      endDate: new Date(p1a2Start.getTime() + 8 * 24 * 60 * 60 * 1000),
      duration: 48,
      assigneeUserId: devUser1.id,
      status: Status.COMPLETED,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 100,
    },
  });

  await prisma.task.create({
    data: {
      activityId: p1activity2.id,
      name: "Build main pages (Home, Products, Services)",
      description: "Implement pages using component library",
      startDate: new Date(p1a2Start.getTime() + 8 * 24 * 60 * 60 * 1000),
      endDate: new Date(p1a2Start.getTime() + 15 * 24 * 60 * 60 * 1000),
      duration: 56,
      assigneeUserId: devUser2.id,
      status: Status.IN_PROGRESS,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 80,
    },
  });

  await prisma.task.create({
    data: {
      activityId: p1activity2.id,
      name: "Implement responsive design",
      description: "Ensure all pages work on mobile, tablet, and desktop",
      startDate: new Date(p1a2Start.getTime() + 10 * 24 * 60 * 60 * 1000),
      endDate: p1a2End,
      duration: 40,
      assigneeUserId: devUser2.id,
      status: Status.IN_PROGRESS,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 60,
    },
  });

  // Backend Integration Tasks
  await prisma.task.create({
    data: {
      activityId: p1activity3.id,
      name: "API integration setup",
      description: "Set up API clients and authentication",
      startDate: p1a3Start,
      endDate: new Date(p1a3Start.getTime() + 3 * 24 * 60 * 60 * 1000),
      duration: 24,
      assigneeUserId: devUser1.id,
      status: Status.IN_PROGRESS,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 100,
    },
  });

  await prisma.task.create({
    data: {
      activityId: p1activity3.id,
      name: "Implement product listing API",
      description: "Connect to product API and display results",
      startDate: new Date(p1a3Start.getTime() + 3 * 24 * 60 * 60 * 1000),
      endDate: new Date(p1a3Start.getTime() + 8 * 24 * 60 * 60 * 1000),
      duration: 40,
      assigneeUserId: devUser1.id,
      status: Status.IN_PROGRESS,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 50,
    },
  });

  await prisma.task.create({
    data: {
      activityId: p1activity3.id,
      name: "Implement user authentication",
      description: "Set up login, registration, and session management",
      startDate: new Date(p1a3Start.getTime() + 5 * 24 * 60 * 60 * 1000),
      endDate: p1a3End,
      duration: 48,
      assigneeUserId: devUser2.id,
      status: Status.NOT_STARTED,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 0,
    },
  });

  // Testing Tasks
  await prisma.task.create({
    data: {
      activityId: p1activity4.id,
      name: "Unit testing for components",
      description: "Write unit tests for React components",
      startDate: p1a4Start,
      endDate: new Date(p1a4Start.getTime() + 4 * 24 * 60 * 60 * 1000),
      duration: 32,
      assigneeUserId: qaUser.id,
      status: Status.NOT_STARTED,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 0,
    },
  });

  await prisma.task.create({
    data: {
      activityId: p1activity4.id,
      name: "Integration testing",
      description: "Test API integrations and user workflows",
      startDate: new Date(p1a4Start.getTime() + 4 * 24 * 60 * 60 * 1000),
      endDate: new Date(p1a4Start.getTime() + 8 * 24 * 60 * 60 * 1000),
      duration: 32,
      assigneeUserId: qaUser.id,
      status: Status.NOT_STARTED,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 0,
    },
  });

  // Project 2: Mobile App - IN_PROGRESS (35% complete)
  console.log("📊 Creating Project 2: Mobile App Development...");
  const project2Start = new Date(today);
  project2Start.setDate(project2Start.getDate() - 10);
  const project2End = new Date(project2Start);
  project2End.setDate(project2End.getDate() + 90);

  const project2 = await prisma.project.create({
    data: {
      name: "Mobile App Development",
      description: "Develop native mobile app for iOS and Android",
      organisationId: organisation.id,
      ownerUserId: pmUser.id,
      members: {
        connect: [{ id: devUser1.id }, { id: devUser2.id }],
      },
      startDate: project2Start,
      timezone: "UTC",
      status: Status.IN_PROGRESS,
      progressPercentage: 35,
    },
  });

  const p2a1Start = new Date(project2Start);
  const p2a1End = new Date(p2a1Start);
  p2a1End.setDate(p2a1End.getDate() + 15);

  const p2activity1 = await prisma.activity.create({
    data: {
      projectId: project2.id,
      name: "App Design & Prototyping",
      description: "Design mobile app UI/UX and create prototypes",
      startDate: p2a1Start,
      endDate: p2a1End,
      status: Status.IN_PROGRESS,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 60,
    },
  });

  const p2a2Start = new Date(p2a1Start);
  const p2a2End = new Date(p2a2Start);
  p2a2End.setDate(p2a2End.getDate() + 30);

  const p2activity2 = await prisma.activity.create({
    data: {
      projectId: project2.id,
      name: "iOS Development",
      description: "Develop iOS version of the app",
      startDate: p2a2Start,
      endDate: p2a2End,
      status: Status.IN_PROGRESS,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 25,
    },
  });

  const p2a3Start = new Date(p2a1Start);
  const p2a3End = new Date(p2a3Start);
  p2a3End.setDate(p2a3End.getDate() + 30);

  const p2activity3 = await prisma.activity.create({
    data: {
      projectId: project2.id,
      name: "Android Development",
      description: "Develop Android version of the app",
      startDate: p2a3Start,
      endDate: p2a3End,
      status: Status.NOT_STARTED,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 0,
    },
  });

  // Tasks for Project 2
  console.log("✅ Creating tasks for Project 2...");

  await prisma.task.create({
    data: {
      activityId: p2activity1.id,
      name: "Create app wireframes",
      description: "Design information architecture and user flows",
      startDate: p2a1Start,
      endDate: new Date(p2a1Start.getTime() + 4 * 24 * 60 * 60 * 1000),
      duration: 32,
      assigneeUserId: designerUser.id,
      status: Status.COMPLETED,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 100,
    },
  });

  await prisma.task.create({
    data: {
      activityId: p2activity1.id,
      name: "Design visual mockups",
      description: "Create detailed visual designs for all screens",
      startDate: new Date(p2a1Start.getTime() + 4 * 24 * 60 * 60 * 1000),
      endDate: p2a1End,
      duration: 56,
      assigneeUserId: designerUser.id,
      status: Status.IN_PROGRESS,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 80,
    },
  });

  await prisma.task.create({
    data: {
      activityId: p2activity2.id,
      name: "Setup iOS project with SwiftUI",
      description: "Initialize iOS project with necessary dependencies",
      startDate: p2a2Start,
      endDate: new Date(p2a2Start.getTime() + 3 * 24 * 60 * 60 * 1000),
      duration: 24,
      assigneeUserId: devUser1.id,
      status: Status.IN_PROGRESS,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 100,
    },
  });

  await prisma.task.create({
    data: {
      activityId: p2activity2.id,
      name: "Implement iOS screens",
      description: "Build all app screens for iOS",
      startDate: new Date(p2a2Start.getTime() + 3 * 24 * 60 * 60 * 1000),
      endDate: p2a2End,
      duration: 144,
      assigneeUserId: devUser1.id,
      status: Status.IN_PROGRESS,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 40,
    },
  });

  await prisma.task.create({
    data: {
      activityId: p2activity3.id,
      name: "Setup Android project with Kotlin",
      description: "Initialize Android project with Compose",
      startDate: p2a3Start,
      endDate: new Date(p2a3Start.getTime() + 3 * 24 * 60 * 60 * 1000),
      duration: 24,
      assigneeUserId: devUser2.id,
      status: Status.NOT_STARTED,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 0,
    },
  });

  // Project 3: Database Migration - COMPLETED (100%)
  console.log("📊 Creating Project 3: Database Migration...");
  const project3Start = new Date(today);
  project3Start.setDate(project3Start.getDate() - 45);
  const project3End = new Date(today);
  project3End.setDate(project3End.getDate() - 5);

  const project3 = await prisma.project.create({
    data: {
      name: "Database Migration to PostgreSQL",
      description: "Migrate legacy database system to modern PostgreSQL",
      organisationId: organisation.id,
      ownerUserId: pmUser.id,
      members: {
        connect: [{ id: devUser1.id }],
      },
      startDate: project3Start,
      timezone: "UTC",
      status: Status.COMPLETED,
      progressPercentage: 100,
    },
  });

  const p3a1Start = new Date(project3Start);
  const p3a1End = new Date(p3a1Start);
  p3a1End.setDate(p3a1End.getDate() + 10);

  const p3activity1 = await prisma.activity.create({
    data: {
      projectId: project3.id,
      name: "Data Analysis & Planning",
      description: "Analyze current data structure and plan migration",
      startDate: p3a1Start,
      endDate: p3a1End,
      status: Status.COMPLETED,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 100,
    },
  });

  const p3a2Start = new Date(p3a1End);
  p3a2Start.setDate(p3a2Start.getDate() + 1);
  const p3a2End = new Date(p3a2Start);
  p3a2End.setDate(p3a2End.getDate() + 15);

  const p3activity2 = await prisma.activity.create({
    data: {
      projectId: project3.id,
      name: "Migration Execution",
      description: "Execute database migration with zero downtime",
      startDate: p3a2Start,
      endDate: p3a2End,
      status: Status.COMPLETED,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 100,
    },
  });

  const p3a3Start = new Date(p3a2End);
  p3a3Start.setDate(p3a3Start.getDate() + 1);
  const p3a3End = new Date(p3a3Start);
  p3a3End.setDate(p3a3End.getDate() + 5);

  const p3activity3 = await prisma.activity.create({
    data: {
      projectId: project3.id,
      name: "Testing & Validation",
      description: "Comprehensive testing of migrated data",
      startDate: p3a3Start,
      endDate: p3a3End,
      status: Status.COMPLETED,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 100,
    },
  });

  // Tasks for Project 3
  console.log("✅ Creating tasks for Project 3...");

  await prisma.task.create({
    data: {
      activityId: p3activity1.id,
      name: "Document current database schema",
      description: "Create detailed documentation of legacy system",
      startDate: p3a1Start,
      endDate: new Date(p3a1Start.getTime() + 3 * 24 * 60 * 60 * 1000),
      duration: 24,
      assigneeUserId: devUser1.id,
      status: Status.COMPLETED,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 100,
    },
  });

  await prisma.task.create({
    data: {
      activityId: p3activity1.id,
      name: "Design new PostgreSQL schema",
      description: "Create optimized schema for PostgreSQL",
      startDate: new Date(p3a1Start.getTime() + 3 * 24 * 60 * 60 * 1000),
      endDate: p3a1End,
      duration: 40,
      assigneeUserId: devUser1.id,
      status: Status.COMPLETED,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 100,
    },
  });

  await prisma.task.create({
    data: {
      activityId: p3activity2.id,
      name: "Create migration scripts",
      description: "Develop and test migration scripts",
      startDate: p3a2Start,
      endDate: new Date(p3a2Start.getTime() + 5 * 24 * 60 * 60 * 1000),
      duration: 40,
      assigneeUserId: devUser1.id,
      status: Status.COMPLETED,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 100,
    },
  });

  await prisma.task.create({
    data: {
      activityId: p3activity2.id,
      name: "Execute production migration",
      description: "Run migration on production database",
      startDate: new Date(p3a2Start.getTime() + 5 * 24 * 60 * 60 * 1000),
      endDate: p3a2End,
      duration: 32,
      assigneeUserId: devUser1.id,
      status: Status.COMPLETED,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 100,
    },
  });

  await prisma.task.create({
    data: {
      activityId: p3activity3.id,
      name: "Data validation & reconciliation",
      description: "Verify all data migrated correctly",
      startDate: p3a3Start,
      endDate: p3a3End,
      duration: 40,
      assigneeUserId: devUser1.id,
      status: Status.COMPLETED,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 100,
    },
  });

  // Project 4: Security Audit - ON_HOLD (20%)
  console.log("📊 Creating Project 4: Security Audit...");
  const project4Start = new Date(today);
  project4Start.setDate(project4Start.getDate() - 15);
  const project4End = new Date(project4Start);
  project4End.setDate(project4End.getDate() + 30);

  const project4 = await prisma.project.create({
    data: {
      name: "Security Audit & Compliance",
      description: "Conduct comprehensive security audit and compliance review",
      organisationId: organisation.id,
      ownerUserId: pmoUser.id,
      members: {
        connect: [{ id: devUser1.id }],
      },
      startDate: project4Start,
      timezone: "UTC",
      status: Status.ON_HOLD,
      progressPercentage: 20,
    },
  });

  const p4a1Start = new Date(project4Start);
  const p4a1End = new Date(p4a1Start);
  p4a1End.setDate(p4a1End.getDate() + 10);

  const p4activity1 = await prisma.activity.create({
    data: {
      projectId: project4.id,
      name: "Security Assessment",
      description: "Perform security assessment of infrastructure",
      startDate: p4a1Start,
      endDate: p4a1End,
      status: Status.IN_PROGRESS,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 40,
    },
  });

  const p4a2Start = new Date(p4a1End);
  p4a2Start.setDate(p4a2Start.getDate() + 1);
  const p4a2End = new Date(p4a2Start);
  p4a2End.setDate(p4a2End.getDate() + 15);

  const p4activity2 = await prisma.activity.create({
    data: {
      projectId: project4.id,
      name: "Remediation & Implementation",
      description: "Fix security vulnerabilities and implement improvements",
      startDate: p4a2Start,
      endDate: p4a2End,
      status: Status.NOT_STARTED,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 0,
    },
  });

  // Tasks for Project 4
  console.log("✅ Creating tasks for Project 4...");

  await prisma.task.create({
    data: {
      activityId: p4activity1.id,
      name: "Conduct vulnerability scan",
      description: "Scan infrastructure for security vulnerabilities",
      startDate: p4a1Start,
      endDate: new Date(p4a1Start.getTime() + 5 * 24 * 60 * 60 * 1000),
      duration: 40,
      assigneeUserId: devUser1.id,
      status: Status.COMPLETED,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 100,
    },
  });

  await prisma.task.create({
    data: {
      activityId: p4activity1.id,
      name: "Review access controls",
      description: "Audit and document access control policies",
      startDate: new Date(p4a1Start.getTime() + 5 * 24 * 60 * 60 * 1000),
      endDate: p4a1End,
      duration: 32,
      assigneeUserId: devUser1.id,
      status: Status.IN_PROGRESS,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 60,
    },
  });

  await prisma.task.create({
    data: {
      activityId: p4activity2.id,
      name: "Implement security patches",
      description: "Apply all critical and high-priority security patches",
      startDate: p4a2Start,
      endDate: p4a2End,
      duration: 80,
      assigneeUserId: devUser1.id,
      status: Status.NOT_STARTED,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 0,
    },
  });

  console.log(`✅ Created 4 projects with ${4 * 3} activities and ${50} tasks`);
  console.log("✅ Database seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
