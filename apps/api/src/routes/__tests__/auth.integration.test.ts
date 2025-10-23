// ABOUTME: Integration tests for authentication routes
// ABOUTME: Tests login, logout, token refresh, and role-based access control

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import {
  resetDatabase,
  disconnectDatabase,
  createTestOrganisation,
  createTestUser,
} from "@/lib/test-utils";
import { prisma } from "@/lib/prisma";
import { passwordService } from "@/services/password.service";
import { jwtService } from "@/services/jwt.service";

// Mock Express app for testing
import express, { Express } from "express";
import authRoutes from "../auth.routes";
import { authMiddleware } from "@/middleware/auth.middleware";

let app: Express;

describe("Authentication Integration Tests", () => {
  beforeEach(async () => {
    await resetDatabase();

    // Create Express app with auth routes
    app = express();
    app.use(express.json());
    app.use("/api/auth", authRoutes);

    // Add a protected route for testing
    app.get("/api/protected", authMiddleware, (req, res) => {
      res.json({ message: "Protected route accessed" });
    });
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe("Login", () => {
    it("should login successfully with valid credentials", async () => {
      const org = await createTestOrganisation();
      const password = "TestPassword123!";
      const user = await createTestUser(org.id, {
        password,
      });

      const response = await request(app).post("/api/auth/login").send({
        email: user.email,
        password,
      });

      expect(response.status).toBe(200);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.user.id).toBe(user.id);
      expect(response.body.user.email).toBe(user.email);
      expect(response.body.user.role).toBeDefined();
      expect(response.body.user.organisationId).toBe(org.id);
    });

    it("should fail with invalid email", async () => {
      const response = await request(app).post("/api/auth/login").send({
        email: "nonexistent@example.com",
        password: "SomePassword123!",
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Unauthorized");
    });

    it("should fail with incorrect password", async () => {
      const org = await createTestOrganisation();
      const user = await createTestUser(org.id, {
        password: "CorrectPassword123!",
      });

      const response = await request(app).post("/api/auth/login").send({
        email: user.email,
        password: "WrongPassword123!",
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Unauthorized");
    });

    it("should fail with missing credentials", async () => {
      const response = await request(app).post("/api/auth/login").send({
        email: "test@example.com",
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Bad Request");
    });

    it("should store refresh token in database", async () => {
      const org = await createTestOrganisation();
      const password = "TestPassword123!";
      const user = await createTestUser(org.id, { password });

      await request(app).post("/api/auth/login").send({
        email: user.email,
        password,
      });

      const refreshTokens = await prisma.refreshToken.findMany({
        where: { userId: user.id },
      });

      expect(refreshTokens.length).toBeGreaterThan(0);
    });
  });

  describe("Logout", () => {
    it("should logout successfully", async () => {
      const org = await createTestOrganisation();
      const password = "TestPassword123!";
      const user = await createTestUser(org.id, { password });

      // Login first
      const loginRes = await request(app).post("/api/auth/login").send({
        email: user.email,
        password,
      });

      const accessToken = loginRes.body.accessToken;

      // Logout
      const logoutRes = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          refreshToken: loginRes.body.refreshToken,
        });

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.message).toContain("successfully");

      // Verify refresh token is deleted
      const refreshTokens = await prisma.refreshToken.findMany({
        where: { userId: user.id },
      });

      expect(refreshTokens.length).toBe(0);
    });

    it("should fail without authentication", async () => {
      const response = await request(app).post("/api/auth/logout");

      expect(response.status).toBe(401);
    });
  });

  describe("Refresh Token", () => {
    it("should refresh access token successfully", async () => {
      const org = await createTestOrganisation();
      const password = "TestPassword123!";
      const user = await createTestUser(org.id, { password });

      // Login
      const loginRes = await request(app).post("/api/auth/login").send({
        email: user.email,
        password,
      });

      const oldAccessToken = loginRes.body.accessToken;
      const refreshToken = loginRes.body.refreshToken;

      // Wait a moment to ensure different token
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Refresh token
      const refreshRes = await request(app)
        .post("/api/auth/refresh")
        .send({
          refreshToken,
        });

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.accessToken).toBeDefined();
      expect(refreshRes.body.accessToken).not.toBe(oldAccessToken);
    });

    it("should fail with invalid refresh token", async () => {
      const response = await request(app).post("/api/auth/refresh").send({
        refreshToken: "invalid-token",
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Unauthorized");
    });

    it("should fail without refresh token", async () => {
      const response = await request(app).post("/api/auth/refresh");

      expect(response.status).toBe(401);
    });

    it("should fail with expired refresh token", async () => {
      const org = await createTestOrganisation();
      const password = "TestPassword123!";
      const user = await createTestUser(org.id, { password });

      // Create an expired refresh token
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const expiredToken = await prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: "expired-token-123",
          expiresAt: pastDate,
        },
      });

      const response = await request(app).post("/api/auth/refresh").send({
        refreshToken: expiredToken.token,
      });

      expect(response.status).toBe(401);
    });
  });

  describe("Get Current User", () => {
    it("should get current user info", async () => {
      const org = await createTestOrganisation();
      const password = "TestPassword123!";
      const user = await createTestUser(org.id, { password });

      // Login
      const loginRes = await request(app).post("/api/auth/login").send({
        email: user.email,
        password,
      });

      const accessToken = loginRes.body.accessToken;

      // Get current user
      const meRes = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.id).toBe(user.id);
      expect(meRes.body.email).toBe(user.email);
      expect(meRes.body.name).toBeDefined();
      expect(meRes.body.role).toBeDefined();
    });

    it("should fail without authentication", async () => {
      const response = await request(app).get("/api/auth/me");

      expect(response.status).toBe(401);
    });

    it("should fail with invalid token", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer invalid-token");

      expect(response.status).toBe(401);
    });
  });

  describe("Change Password", () => {
    it("should change password successfully", async () => {
      const org = await createTestOrganisation();
      const oldPassword = "OldPassword123!";
      const newPassword = "NewPassword456!";
      const user = await createTestUser(org.id, { password: oldPassword });

      // Login with old password
      const loginRes = await request(app).post("/api/auth/login").send({
        email: user.email,
        password: oldPassword,
      });

      const accessToken = loginRes.body.accessToken;

      // Change password
      const changeRes = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          oldPassword,
          newPassword,
        });

      expect(changeRes.status).toBe(200);

      // Try to login with new password
      const newLoginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: user.email,
          password: newPassword,
        });

      expect(newLoginRes.status).toBe(200);

      // Old password should fail
      const oldLoginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: user.email,
          password: oldPassword,
        });

      expect(oldLoginRes.status).toBe(401);
    });

    it("should fail with wrong old password", async () => {
      const org = await createTestOrganisation();
      const correctPassword = "CorrectPassword123!";
      const user = await createTestUser(org.id, { password: correctPassword });

      const loginRes = await request(app).post("/api/auth/login").send({
        email: user.email,
        password: correctPassword,
      });

      const accessToken = loginRes.body.accessToken;

      const response = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          oldPassword: "WrongPassword123!",
          newPassword: "NewPassword456!",
        });

      expect(response.status).toBe(400);
    });

    it("should fail without authentication", async () => {
      const response = await request(app).post("/api/auth/change-password").send({
        oldPassword: "OldPassword123!",
        newPassword: "NewPassword456!",
      });

      expect(response.status).toBe(401);
    });
  });

  describe("Logout All Devices", () => {
    it("should logout from all devices", async () => {
      const org = await createTestOrganisation();
      const password = "TestPassword123!";
      const user = await createTestUser(org.id, { password });

      // Login twice (simulate multiple devices)
      const login1 = await request(app).post("/api/auth/login").send({
        email: user.email,
        password,
      });

      const login2 = await request(app).post("/api/auth/login").send({
        email: user.email,
        password,
      });

      const accessToken1 = login1.body.accessToken;

      // Verify both refresh tokens exist
      let refreshTokens = await prisma.refreshToken.findMany({
        where: { userId: user.id },
      });
      expect(refreshTokens.length).toBe(2);

      // Logout from all devices
      await request(app)
        .post("/api/auth/logout-all-devices")
        .set("Authorization", `Bearer ${accessToken1}`);

      // Verify all refresh tokens are deleted
      refreshTokens = await prisma.refreshToken.findMany({
        where: { userId: user.id },
      });
      expect(refreshTokens.length).toBe(0);
    });
  });

  describe("Protected Routes", () => {
    it("should access protected route with valid token", async () => {
      const org = await createTestOrganisation();
      const password = "TestPassword123!";
      const user = await createTestUser(org.id, { password });

      const loginRes = await request(app).post("/api/auth/login").send({
        email: user.email,
        password,
      });

      const accessToken = loginRes.body.accessToken;

      const response = await request(app)
        .get("/api/protected")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain("Protected route accessed");
    });

    it("should not access protected route without token", async () => {
      const response = await request(app).get("/api/protected");

      expect(response.status).toBe(401);
    });

    it("should not access protected route with invalid token", async () => {
      const response = await request(app)
        .get("/api/protected")
        .set("Authorization", "Bearer invalid-token");

      expect(response.status).toBe(401);
    });
  });
});
