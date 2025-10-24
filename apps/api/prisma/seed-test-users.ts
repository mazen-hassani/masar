// ABOUTME: Test seeder for creating users with real, testable passwords
// ABOUTME: Creates test users across all roles for login and feature testing

import dotenv from "dotenv";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcrypt";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

// Test user credentials - these are safe for local/staging testing only
const TEST_USERS = [
  {
    email: "pmo@test.com",
    name: "PMO Test User",
    password: "PMOTest123!",
    role: Role.PMO,
  },
  {
    email: "pm@test.com",
    name: "PM Test User",
    password: "PMTest123!",
    role: Role.PM,
  },
  {
    email: "developer@test.com",
    name: "Developer Test User",
    password: "DevTest123!",
    role: Role.TEAM_MEMBER,
  },
  {
    email: "designer@test.com",
    name: "Designer Test User",
    password: "DesignTest123!",
    role: Role.TEAM_MEMBER,
  },
  {
    email: "client@test.com",
    name: "Client Test User",
    password: "ClientTest123!",
    role: Role.CLIENT,
  },
];

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function main() {
  console.log("🌱 Starting test user seeder...\n");

  try {
    // Get or create organisation for test users
    let organisation = await prisma.organisation.findFirst({
      where: { name: "Acme Corporation" },
    });

    if (!organisation) {
      console.log("📍 Creating test organisation...");
      organisation = await prisma.organisation.create({
        data: {
          name: "Acme Corporation",
          timezone: "UTC",
          workingDaysOfWeek: "MTWTFSS",
          workingHours: [
            { start: "09:00", end: "13:00" },
            { start: "14:00", end: "18:00" },
          ],
        },
      });
      console.log(`✅ Created organisation: ${organisation.name}\n`);
    } else {
      console.log(`✅ Using existing organisation: ${organisation.name}\n`);
    }

    // Create test users
    console.log("👥 Creating test users...\n");
    const createdUsers = [];

    for (const testUser of TEST_USERS) {
      // Check if user already exists
      let user = await prisma.user.findUnique({
        where: { email: testUser.email },
      });

      if (user) {
        console.log(
          `⏭️  User already exists: ${testUser.email} (${testUser.role})`
        );
      } else {
        const passwordHash = await hashPassword(testUser.password);
        user = await prisma.user.create({
          data: {
            email: testUser.email,
            name: testUser.name,
            passwordHash,
            role: testUser.role,
            organisationId: organisation.id,
          },
        });
        console.log(
          `✅ Created user: ${testUser.email} (${testUser.role})`
        );
        createdUsers.push(testUser);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("🎉 Test user seeding complete!\n");

    console.log("📋 Test User Credentials:");
    console.log("=".repeat(60) + "\n");

    for (const testUser of TEST_USERS) {
      console.log(`📧 Email:    ${testUser.email}`);
      console.log(`🔑 Password: ${testUser.password}`);
      console.log(`👤 Role:     ${testUser.role}`);
      console.log("");
    }

    console.log("=".repeat(60));
    console.log("\n💡 Quick Reference:");
    console.log("  • Use these credentials to test login on your frontend");
    console.log("  • Test role-based access by trying different users");
    console.log("  • PMO has full system access");
    console.log("  • PM can manage projects");
    console.log("  • TEAM_MEMBER can work on assigned tasks");
    console.log("  • CLIENT has view-only access\n");

    console.log("🌐 API Endpoint:");
    console.log(
      "  POST /api/auth/login"
    );
    console.log("  Content-Type: application/json");
    console.log("");
    console.log("  Body example:");
    console.log('  {');
    console.log('    "email": "pm@test.com",');
    console.log('    "password": "PMTest123!"');
    console.log("  }");
    console.log("\n");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
