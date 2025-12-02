import { Server as SocketIOServer, Socket } from 'socket.io';
import { Notification, INotification } from '../schemas/notification.schema';
import { Admin } from '../schemas/admin.schema';
import { NotificationService } from './notification.service';
import { SOCKET_EVENTS, SOCKET_ROOMS } from '../constants/socket.constants';
import mongoose from 'mongoose';

interface ISocketNotificationRequestObj {
  startIndex: number;
  itemsPerPage: number;
  adminId?: string;
}

interface ConnectedAdmin {
  _id: string;
  email: string;
  roles: string[];
  permissions: string[];
  isSuperAdmin: boolean;
}

export class RealtimeNotificationService {
  private io: SocketIOServer;
  private notificationService: NotificationService;
  private connectedAdmins: Map<string, ConnectedAdmin> = new Map();
  private changeStream?: any;

  constructor(io: SocketIOServer) {
    this.io = io;
    this.notificationService = new NotificationService();
    this.initializeChangeStream();
  }

  private initializeChangeStream(): void {
    try {
      // Watch for changes in the Notification collection
      this.changeStream = Notification.watch([], { 
        fullDocument: 'updateLookup',
        fullDocumentBeforeChange: 'whenAvailable' 
      });

      this.changeStream.on('change', async (change: any) => {
        console.log('📬 Notification change detected:', change.operationType);
        
        if (change.operationType === 'insert' && change.fullDocument) {
          await this.handleNewNotification(change.fullDocument as INotification);
        }
        
        if (change.operationType === 'update' && change.fullDocument) {
          await this.handleNotificationUpdate(change.fullDocument as INotification);
        }
      });

      this.changeStream.on('error', (error: any) => {
        console.error('❌ Notification change stream error:', error);
        // Attempt to restart change stream
        setTimeout(() => this.initializeChangeStream(), 5000);
      });

      console.log('✅ Notification change stream initialized');
    } catch (error) {
      console.error('❌ Failed to initialize notification change stream:', error);
    }
  }

  private async handleNewNotification(notification: INotification): Promise<void> {
    try {
      console.log('🔥 Processing new notification:', notification.type, notification.title);
      
      // Send notification to all connected admins that should receive it
      for (const [socketId, connectedAdmin] of Array.from(this.connectedAdmins.entries())) {
        // Check if this admin should receive this notification
        const shouldReceive = await this.shouldAdminReceiveNotification(notification, connectedAdmin);
        
        if (shouldReceive) {
          // Get updated notification list and unread count for this admin
          const adminNotifications = await this.getRecentNotifications(connectedAdmin._id);
          const adminUnreadCount = await this.getUnreadCount(connectedAdmin._id);
          
          // Emit to this specific connected admin
          this.io.to(socketId).emit(SOCKET_EVENTS.NOTIFICATION, {
            type: 'new_notification',
            notification: notification,
            notificationList: adminNotifications,
            unreadCount: adminUnreadCount
          });

          // Also emit unread count update
          this.io.to(socketId).emit('unread_count_update', adminUnreadCount);

          console.log(`📬 New notification sent to admin ${connectedAdmin.email}: ${notification.type}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Error handling new notification:', error);
    }
  }

  private async handleNotificationUpdate(notification: INotification): Promise<void> {
    try {
      // If notification was marked as read, update all connected admins
      if (notification.isRead) {
        // Update all connected admins with fresh notification list and unread count
        for (const [socketId, connectedAdmin] of Array.from(this.connectedAdmins.entries())) {
          const adminUnreadCount = await this.getUnreadCount(connectedAdmin._id);
          const adminNotifications = await this.getRecentNotifications(connectedAdmin._id);
          
          this.io.to(socketId).emit('unread_count_update', adminUnreadCount);
          this.io.to(socketId).emit(SOCKET_EVENTS.NOTIFICATION, {
            type: 'notification_list_updated',
            notificationList: adminNotifications,
            unreadCount: adminUnreadCount
          });
        }
      }
    } catch (error) {
      console.error('❌ Error handling notification update:', error);
    }
  }

  private async shouldAdminReceiveNotification(notification: INotification, admin: ConnectedAdmin): Promise<boolean> {
    try {
      // If specific admin is targeted
      if (notification.targetAdminId && notification.targetAdminId === admin._id) {
        return true;
      }

      // If roles are targeted
      if (notification.targetRoles && notification.targetRoles.length > 0) {
        const hasMatchingRole = notification.targetRoles.some(role => admin.roles.includes(role));
        if (hasMatchingRole) return true;
      }

      // If permissions are targeted
      if (notification.targetPermissions && notification.targetPermissions.length > 0) {
        const hasMatchingPermission = notification.targetPermissions.some(permission => admin.permissions.includes(permission));
        if (hasMatchingPermission) return true;
      }

      // If no specific targeting (broadcast to all), return true
      if (!notification.targetAdminId && 
          (!notification.targetRoles || notification.targetRoles.length === 0) && 
          (!notification.targetPermissions || notification.targetPermissions.length === 0)) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Error checking if admin should receive notification:', error);
      return false;
    }
  }

  private async getTargetAdminIds(notification: INotification): Promise<string[]> {
    try {
      const targetIds: Set<string> = new Set();

      // If specific admin is targeted
      if (notification.targetAdminId) {
        targetIds.add(notification.targetAdminId);
      }

      // If roles are targeted
      if (notification.targetRoles && notification.targetRoles.length > 0) {
        const adminsWithRoles = await Admin.find({
          roles: { $in: notification.targetRoles },
          isDeleted: false,
          account_status: 'active'
        });
        adminsWithRoles.forEach(admin => targetIds.add(admin._id.toString()));
      }

      // If permissions are targeted
      if (notification.targetPermissions && notification.targetPermissions.length > 0) {
        const adminsWithPermissions = await Admin.find({
          permissions: { $in: notification.targetPermissions },
          isDeleted: false,
          account_status: 'active'
        });
        adminsWithPermissions.forEach(admin => targetIds.add(admin._id.toString()));
      }

      // If no specific targeting, send to all active admins
      if (targetIds.size === 0) {
        const allAdmins = await Admin.find({
          isDeleted: false,
          account_status: 'active'
        });
        allAdmins.forEach(admin => targetIds.add(admin._id.toString()));
      }

      return Array.from(targetIds);
    } catch (error) {
      console.error('❌ Error getting target admin IDs:', error);
      return [];
    }
  }

  private async emitToRoleRooms(notification: INotification): Promise<void> {
    // Emit to role-specific rooms
    if (notification.targetRoles && notification.targetRoles.length > 0) {
      for (const role of notification.targetRoles) {
        this.io.to(`${SOCKET_ROOMS.ROLE}${role}`).emit(SOCKET_EVENTS.NOTIFICATION, {
          type: 'role_notification',
          notification: notification
        });
      }
    }

    // Emit to permission-specific rooms
    if (notification.targetPermissions && notification.targetPermissions.length > 0) {
      for (const permission of notification.targetPermissions) {
        this.io.to(`${SOCKET_ROOMS.PERMISSION}${permission}`).emit(SOCKET_EVENTS.NOTIFICATION, {
          type: 'permission_notification',
          notification: notification
        });
      }
    }
  }

  private async getNotificationList(data: ISocketNotificationRequestObj, admin: ConnectedAdmin): Promise<any> {
    try {
      // Build query based on admin's roles and permissions
      const query: any = {
        $or: [
          { targetRoles: { $in: admin.roles } },
          { targetPermissions: { $in: admin.permissions } },
          { targetAdminId: { $exists: false }, targetRoles: { $exists: false }, targetPermissions: { $exists: false } }
        ]
      };

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .skip((data.startIndex - 1) * data.itemsPerPage)
        .limit(data.itemsPerPage);

      const totalCount = await Notification.countDocuments(query);

      return {
        notifications,
        totalCount,
        currentPage: Math.ceil(data.startIndex / data.itemsPerPage),
        totalPages: Math.ceil(totalCount / data.itemsPerPage)
      };
    } catch (error) {
      console.error('❌ Error getting notification list:', error);
      return { notifications: [], totalCount: 0, currentPage: 1, totalPages: 1 };
    }
  }

  private async getRecentNotifications(adminId: string): Promise<any[]> {
    try {
      const admin = await Admin.findById(adminId);
      if (!admin) return [];

      const query: any = {
        $or: [
          { targetRoles: { $in: admin.roles } },
          { targetPermissions: { $in: admin.permissions } },
          { targetAdminId: { $exists: false }, targetRoles: { $exists: false }, targetPermissions: { $exists: false } }
        ]
      };

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(50); // Get recent 50 notifications

      return notifications;
    } catch (error) {
      console.error('❌ Error getting recent notifications:', error);
      return [];
    }
  }

  private async getUnreadCount(adminId: string): Promise<number> {
    try {
      const admin = await Admin.findById(adminId);
      if (!admin) return 0;

      const query: any = {
        isRead: false,
        $or: [
          { targetRoles: { $in: admin.roles } },
          { targetPermissions: { $in: admin.permissions } },
          { targetAdminId: { $exists: false }, targetRoles: { $exists: false }, targetPermissions: { $exists: false } }
        ]
      };

      return await Notification.countDocuments(query);
    } catch (error) {
      console.error('❌ Error getting unread count:', error);
      return 0;
    }
  }

  // Method to handle socket connection
  public async handleConnection(socket: Socket): Promise<void> {
    console.log('🔌 Socket connected:', socket.id);

    // Handle admin authentication and room joining
    socket.on(SOCKET_EVENTS.JOIN_ROOM, async (data: { adminId: string; token: string }) => {
      try {
        // Verify admin and get details
        const admin = await Admin.findById(data.adminId);
        if (!admin) {
          socket.emit('error', { message: 'Admin not found' });
          return;
        }

        // Store admin info
        const connectedAdmin: ConnectedAdmin = {
          _id: admin._id.toString(),
          email: admin.email,
          roles: admin.roles,
          permissions: admin.permissions,
          isSuperAdmin: admin.isSuperAdmin
        };

        this.connectedAdmins.set(socket.id, connectedAdmin);

        // Join admin-specific room
        socket.join(`${SOCKET_ROOMS.ADMIN}${admin._id}`);
        
        // Join role-based rooms
        admin.roles.forEach(role => {
          socket.join(`${SOCKET_ROOMS.ROLE}${role}`);
        });

        // Join permission-based rooms
        admin.permissions.forEach(permission => {
          socket.join(`${SOCKET_ROOMS.PERMISSION}${permission}`);
        });

        // Send welcome message with current unread count and notifications list
        const unreadCount = await this.getUnreadCount(admin._id.toString());
        const notifications = await this.getRecentNotifications(admin._id.toString());
        
        socket.emit(SOCKET_EVENTS.WELCOME, {
          message: 'Real-time notifications connected',
          unreadCount: unreadCount
        });
        
        socket.emit(SOCKET_EVENTS.NOTIFICATION, {
          type: 'notification_list',
          notificationList: notifications,
          unreadCount: unreadCount
        });

        console.log(`✅ Admin ${admin.email} connected to notification system`);
      } catch (error) {
        console.error('❌ Error handling socket join room:', error);
        socket.emit('error', { message: 'Failed to join notification room' });
      }
    });

    // Handle disconnection
    socket.on(SOCKET_EVENTS.DISCONNECT, () => {
      this.connectedAdmins.delete(socket.id);
      console.log('🔌 Socket disconnected:', socket.id);
    });
  }

  // Method to create and emit a new notification
  public async createAndEmitNotification(notificationData: {
    type: string;
    title: string;
    message: string;
    relatedId?: string;
    priority?: string;
    targetAdminId?: string;
    targetRoles?: string[];
    targetPermissions?: string[];
  }): Promise<INotification | null> {
    try {
      const notification = await this.notificationService.createNotification({
        ...notificationData,
        priority: notificationData.priority || 'normal'
      });

      // The change stream will automatically handle the emission
      return notification;
    } catch (error) {
      console.error('❌ Error creating and emitting notification:', error);
      return null;
    }
  }

  // Cleanup method
  public cleanup(): void {
    if (this.changeStream) {
      this.changeStream.close();
    }
  }
}