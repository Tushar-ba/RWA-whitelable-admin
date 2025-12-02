import 'dotenv/config';
import express from "express";
import cookieParser from "cookie-parser";
import { connectDatabase } from "./config/database";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { requestLogger } from "./middleware/logger.middleware";
import { errorHandler } from "./middleware/error.middleware";
import { DatabaseSeeder } from "./utils/seed.util";
import { AuthService } from "./services/auth.service";
import { AssetStorageService } from "./services/asset-storage.service";

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Custom middleware
app.use(requestLogger);

(async () => {
  try {
    // Connect to MongoDB
    await connectDatabase();

    // Seed database with initial data (optional)
    // await DatabaseSeeder.seedDatabase();

    // Create super admin
    const authService = new AuthService();
    await authService.createSuperAdmin();

    // Initialize asset storage
    const assetStorageService = new AssetStorageService();
    await assetStorageService.initializeAssetStorage();

    // Register routes
    const server = await registerRoutes(app);

    // Error handling middleware (must be last)
    app.use(errorHandler);

    // Setup Vite in development and static files in production
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Always serve the app on the environment-specified port (default 3003)
    const port = parseInt(process.env.PORT || "5000", 10);

    // Cross-platform safe listen
    server.listen(port, "0.0.0.0", () => {
      log(`✅ Server running on http://localhost:${port} (bound to 0.0.0.0)`);
    });

  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
})();
