import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { RealtimeNotificationService } from "../services/realtime-notification.service";
import { SOCKET_EVENTS } from "../constants/socket.constants";

// Import all route modules
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import stockRoutes from './stock.routes';
import purchaseRequestRoutes from './purchase-request.routes';
import redemptionRequestRoutes from './redemption-request.routes';
import walletRoutes from './wallet.routes';
import roleRoutes from './role.routes';
import notificationRoutes from './notification.routes';
import systemSettingsRoutes from './system-settings.routes';
import dashboardRoutes from './dashboard.routes';
import profileRoutes from './profile.routes';
import adminRoutes from './admin.routes';
import assetStorageRoutes from './asset-storage.routes';
import { transactionRoutes } from './transaction.routes';
import allocatedVaultRoutes from './allocated-vault.routes';
import goldPricesRoutes from './gold-prices';


export async function registerRoutes(app: Express): Promise<Server> {
  // Debug middleware for API routes
  app.use('/api/*', (req, res, next) => {
    console.log(`API Request: ${req.method} ${req.path}`, req.body);
    next();
  });

  // Register all routes with their respective prefixes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/stock', stockRoutes);
  app.use('/api/purchase-requests', purchaseRequestRoutes);
  app.use('/api/redemption-requests', redemptionRequestRoutes);
  app.use('/api/wallets', walletRoutes);
  app.use('/api/roles', roleRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/system-settings', systemSettingsRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/admins', adminRoutes);
  app.use('/api/asset-storage', assetStorageRoutes);
  app.use('/api/transactions', transactionRoutes);
  app.use('/api/allocated-vaults', allocatedVaultRoutes);
  app.use('/api/gold-prices', goldPricesRoutes);

  const httpServer = createServer(app);

  // Initialize Socket.IO server
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === "development" ? true : false,
      methods: ["GET", "POST"]
    },
    path: "/socket.io/"
  });

  // Initialize realtime notification service
  const realtimeNotificationService = new RealtimeNotificationService(io);

  // Socket.IO connection handling
  io.on("connection", async (socket) => {
    console.log("🔌 Socket.IO client connected:", socket.id);

    // Handle realtime notification connection
    await realtimeNotificationService.handleConnection(socket);

    // Send welcome message to client
    socket.emit(SOCKET_EVENTS.WELCOME, { message: "Socket.IO connection established successfully!" });

    // Handle disconnection
    socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
      console.log("🔌 Socket.IO client disconnected:", socket.id, "Reason:", reason);
    });

    // Handle custom events (example)
    socket.on(SOCKET_EVENTS.PING, () => {
      socket.emit(SOCKET_EVENTS.PONG, { timestamp: new Date().toISOString() });
    });
  });

  // Store the notification service for access in other parts of the application
  (global as any).realtimeNotificationService = realtimeNotificationService;

  return httpServer;
}