// ABOUTME: Seed script for populating test data into PostgreSQL database
// ABOUTME: Creates sample organisations, users, projects, activities, and tasks

import { PrismaClient, Role, Status, TrackingStatus, DependencyType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

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
      name: "Acme Corporation",
      timezone: "UTC",
      workingDaysOfWeek: "MTWTFSS", // Monday to Sunday (but we'll use M-F in practice)
      workingHours: [
        { start: "09:00", end: "13:00" },
        { start: "14:00", end: "18:00" },
      ],
    },
  });

  console.log(`✅ Created organisation: ${organisation.name}`);

  // Create users
  console.log("👥 Creating users...");
  const pmoUser = await prisma.user.create({
    data: {
      email: "pmo@acme.com",
      name: "Project Management Officer",
      passwordHash: "$2a$10$placeholder", // Will be replaced with actual hash in auth
      role: Role.PMO,
      organisationId: organisation.id,
    },
  });

  const pmUser = await prisma.user.create({
    data: {
      email: "pm@acme.com",
      name: "Project Manager",
      passwordHash: "$2a$10$placeholder",
      role: Role.PM,
      organisationId: organisation.id,
    },
  });

  const devUser = await prisma.user.create({
    data: {
      email: "dev@acme.com",
      name: "Developer",
      passwordHash: "$2a$10$placeholder",
      role: Role.TEAM_MEMBER,
      organisationId: organisation.id,
    },
  });

  const designerUser = await prisma.user.create({
    data: {
      email: "designer@acme.com",
      name: "Designer",
      passwordHash: "$2a$10$placeholder",
      role: Role.TEAM_MEMBER,
      organisationId: organisation.id,
    },
  });

  console.log(`✅ Created ${4} users`);

  // Add holidays
  console.log("📅 Adding holidays...");
  const today = new Date();
  const christmas = new Date(today.getFullYear(), 11, 25); // December 25

  if (christmas < today) {
    // If Christmas has passed, use next year's
    christmas.setFullYear(today.getFullYear() + 1);
  }

  await prisma.holiday.create({
    data: {
      date: christmas,
      description: "Christmas Day",
      organisationId: organisation.id,
    },
  });

  console.log("✅ Added holidays");

  // Create project
  console.log("📊 Creating project...");
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 30); // 30 days from now

  const project = await prisma.project.create({
    data: {
      name: "Website Redesign",
      description: "Redesign company website with modern UI",
      organisationId: organisation.id,
      ownerUserId: pmUser.id,
      members: {
        connect: [{ id: devUser.id }, { id: designerUser.id }],
      },
      startDate,
      timezone: "UTC",
      status: Status.IN_PROGRESS,
      progressPercentage: 25,
    },
  });

  console.log(`✅ Created project: ${project.name}`);

  // Create activities
  console.log("🎯 Creating activities...");
  const activity1StartDate = new Date(startDate);
  const activity1EndDate = new Date(activity1StartDate);
  activity1EndDate.setDate(activity1EndDate.getDate() + 10);

  const activity1 = await prisma.activity.create({
    data: {
      projectId: project.id,
      name: "Design Phase",
      description: "Create UI/UX designs for new website",
      startDate: activity1StartDate,
      endDate: activity1EndDate,
      status: Status.COMPLETED,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 100,
    },
  });

  const activity2StartDate = new Date(activity1EndDate);
  activity2StartDate.setDate(activity2StartDate.getDate() + 1);
  const activity2EndDate = new Date(activity2StartDate);
  activity2EndDate.setDate(activity2EndDate.getDate() + 15);

  const activity2 = await prisma.activity.create({
    data: {
      projectId: project.id,
      name: "Development Phase",
      description: "Implement designs using React and TypeScript",
      startDate: activity2StartDate,
      endDate: activity2EndDate,
      status: Status.IN_PROGRESS,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 50,
    },
  });

  const activity3StartDate = new Date(activity2EndDate);
  activity3StartDate.setDate(activity3StartDate.getDate() + 1);
  const activity3EndDate = new Date(activity3StartDate);
  activity3EndDate.setDate(activity3EndDate.getDate() + 5);

  const activity3 = await prisma.activity.create({
    data: {
      projectId: project.id,
      name: "Testing Phase",
      description: "QA testing and bug fixes",
      startDate: activity3StartDate,
      endDate: activity3EndDate,
      status: Status.NOT_STARTED,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 0,
    },
  });

  console.log(`✅ Created ${3} activities`);

  // Create tasks
  console.log("✅ Creating tasks...");

  // Tasks for Design Phase
  await prisma.task.create({
    data: {
      activityId: activity1.id,
      name: "Create wireframes",
      description: "Create wireframes for all pages",
      startDate: activity1StartDate,
      endDate: new Date(activity1StartDate.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days
      duration: 24,
      assigneeUserId: designerUser.id,
      status: Status.COMPLETED,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 100,
    },
  });

  await prisma.task.create({
    data: {
      activityId: activity1.id,
      name: "Design visual mockups",
      description: "Create high-fidelity mockups in Figma",
      startDate: new Date(activity1StartDate.getTime() + 3 * 24 * 60 * 60 * 1000),
      endDate: activity1EndDate,
      duration: 40,
      assigneeUserId: designerUser.id,
      status: Status.COMPLETED,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 100,
    },
  });

  // Tasks for Development Phase
  await prisma.task.create({
    data: {
      activityId: activity2.id,
      name: "Setup React project",
      description: "Setup project structure with TypeScript and Tailwind",
      startDate: activity2StartDate,
      endDate: new Date(activity2StartDate.getTime() + 2 * 24 * 60 * 60 * 1000),
      duration: 16,
      assigneeUserId: devUser.id,
      status: Status.COMPLETED,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 100,
    },
  });

  const task2 = await prisma.task.create({
    data: {
      activityId: activity2.id,
      name: "Implement component library",
      description: "Build reusable React components",
      startDate: new Date(activity2StartDate.getTime() + 2 * 24 * 60 * 60 * 1000),
      endDate: new Date(activity2StartDate.getTime() + 8 * 24 * 60 * 60 * 1000),
      duration: 40,
      assigneeUserId: devUser.id,
      status: Status.IN_PROGRESS,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 60,
    },
  });

  const task3 = await prisma.task.create({
    data: {
      activityId: activity2.id,
      name: "Integrate backend API",
      description: "Connect frontend to backend endpoints",
      startDate: new Date(activity2StartDate.getTime() + 8 * 24 * 60 * 60 * 1000),
      endDate: activity2EndDate,
      duration: 32,
      assigneeUserId: devUser.id,
      status: Status.NOT_STARTED,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 0,
    },
  });

  // Tasks for Testing Phase
  await prisma.task.create({
    data: {
      activityId: activity3.id,
      name: "Manual testing",
      description: "Test all features across browsers",
      startDate: activity3StartDate,
      endDate: new Date(activity3StartDate.getTime() + 3 * 24 * 60 * 60 * 1000),
      duration: 24,
      assigneeUserId: devUser.id,
      status: Status.NOT_STARTED,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 0,
    },
  });

  await prisma.task.create({
    data: {
      activityId: activity3.id,
      name: "Fix bugs",
      description: "Address QA findings",
      startDate: new Date(activity3StartDate.getTime() + 3 * 24 * 60 * 60 * 1000),
      endDate: activity3EndDate,
      duration: 16,
      assigneeUserId: devUser.id,
      status: Status.NOT_STARTED,
      trackingStatus: TrackingStatus.ON_TRACK,
      progressPercentage: 0,
    },
  });

  console.log("✅ Created 7 tasks");

  // Create dependencies
  console.log("🔗 Creating dependencies...");

  // Activity dependency: Design → Development
  await prisma.dependency.create({
    data: {
      activityPredecessorId: activity1.id,
      activitySuccessorId: activity2.id,
      dependencyType: DependencyType.FS,
      lag: 0,
    },
  });

  // Activity dependency: Development → Testing
  await prisma.dependency.create({
    data: {
      activityPredecessorId: activity2.id,
      activitySuccessorId: activity3.id,
      dependencyType: DependencyType.FS,
      lag: 0,
    },
  });

  // Task dependency: Setup → Components
  await prisma.dependency.create({
    data: {
      taskPredecessorId: await prisma.task
        .findFirst({
          where: { name: "Setup React project" },
          select: { id: true },
        })
        .then((t) => t?.id || ""),
      taskSuccessorId: task2.id,
      dependencyType: DependencyType.FS,
      lag: 0,
    },
  });

  // Task dependency: Components → API Integration
  await prisma.dependency.create({
    data: {
      taskPredecessorId: task2.id,
      taskSuccessorId: task3.id,
      dependencyType: DependencyType.FS,
      lag: 0,
    },
  });

  console.log("✅ Created dependencies");

  // Create baseline
  console.log("📊 Creating baseline...");
  const baseline = await prisma.projectBaseline.create({
    data: {
      projectId: project.id,
      name: "Planned v1",
      baselineDate: startDate,
    },
  });

  // Create baseline snapshot
  await prisma.baselineSnapshot.create({
    data: {
      baselineId: baseline.id,
      data: {
        [activity1.id]: { startDate: activity1StartDate, endDate: activity1EndDate, status: Status.NOT_STARTED },
        [activity2.id]: { startDate: activity2StartDate, endDate: activity2EndDate, status: Status.NOT_STARTED },
        [activity3.id]: { startDate: activity3StartDate, endDate: activity3EndDate, status: Status.NOT_STARTED },
      },
    },
  });

  console.log("✅ Created baseline");

  console.log("\n🎉 Database seeding complete!");
  console.log("\nSample credentials:");
  console.log(`  PMO:       pmo@acme.com`);
  console.log(`  PM:        pm@acme.com`);
  console.log(`  Developer: dev@acme.com`);
  console.log(`  Designer:  designer@acme.com`);
  console.log("\n📊 Sample data created:");
  console.log(`  • 1 Organisation (Acme Corporation)`);
  console.log(`  • 4 Users (PMO, PM, 2 Team Members)`);
  console.log(`  • 1 Project (Website Redesign)`);
  console.log(`  • 3 Activities (Design, Development, Testing)`);
  console.log(`  • 7 Tasks`);
  console.log(`  • 4 Dependencies`);
  console.log(`  • 1 Baseline with snapshot`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
