// ABOUTME: API entry point - starts Express server and initializes Prisma connection
// ABOUTME: Handles graceful shutdown and error handling for serverless deployment

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { prisma } from "./lib/prisma";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes (will be added in subsequent steps)
app.get("/api", (req, res) => {
  res.json({
    message: "Task Management Tool API",
    version: "0.1.0",
    endpoints: {
      health: "/api/health",
      auth: "/api/auth",
      projects: "/api/projects",
      activities: "/api/activities",
      tasks: "/api/tasks",
    },
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    path: req.path,
    method: req.method,
  });
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Database connection successful");

    const server = app.listen(PORT, () => {
      console.log(`✅ API running on http://localhost:${PORT}`);
      console.log(`📝 Health check: http://localhost:${PORT}/api/health`);
    });

    // Graceful shutdown
    process.on("SIGTERM", async () => {
      console.log("🛑 SIGTERM signal received: closing HTTP server");
      server.close(async () => {
        await prisma.$disconnect();
        console.log("✅ HTTP server closed, database disconnected");
        process.exit(0);
      });
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

startServer();

export default app;
