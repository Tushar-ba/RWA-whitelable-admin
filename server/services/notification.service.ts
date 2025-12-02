import { Notification, INotification } from '../schemas/notification.schema';
import { type InsertNotification } from '@shared/schema';

export class NotificationService {
  async getAllNotifications(): Promise<INotification[]> {
    try {
      return await Notification.find().sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Error fetching notifications: ${error}`);
    }
  }

  async getUnreadNotifications(adminRoles?: string[], adminPermissions?: string[], adminId?: string): Promise<INotification[]> {
    try {
      // Build query to filter notifications based on targeting
      const query: any = { isRead: false };
      
      // If targeting parameters are provided, filter notifications
      if (adminRoles || adminPermissions || adminId) {
        const targetingConditions = [];
        
        // Check if notification targets this specific admin
        if (adminId) {
          targetingConditions.push({ targetAdminId: adminId });
        }
        
        // Check if notification targets admin's roles
        if (adminRoles && adminRoles.length > 0) {
          targetingConditions.push({ targetRoles: { $in: adminRoles } });
        }
        
        // Check if notification targets admin's permissions
        if (adminPermissions && adminPermissions.length > 0) {
          targetingConditions.push({ targetPermissions: { $in: adminPermissions } });
        }
        
        // Check for notifications with no specific targeting (broadcast to all)
        targetingConditions.push({ 
          targetAdminId: { $exists: false },
          targetRoles: { $size: 0 },
          targetPermissions: { $size: 0 }
        });
        
        query.$or = targetingConditions;
      }
      
      return await Notification.find(query).sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Error fetching unread notifications: ${error}`);
    }
  }

  async getNotificationById(id: string): Promise<INotification | null> {
    try {
      return await Notification.findById(id);
    } catch (error) {
      throw new Error(`Error finding notification: ${error}`);
    }
  }

  async createNotification(notificationData: InsertNotification): Promise<INotification> {
    try {
      const notification = new Notification({
        ...notificationData,
        isRead: false
      });
      return await notification.save();
    } catch (error) {
      throw new Error(`Error creating notification: ${error}`);
    }
  }

  async markNotificationRead(id: string): Promise<INotification | null> {
    try {
      return await Notification.findByIdAndUpdate(
        id,
        { isRead: true },
        { new: true }
      );
    } catch (error) {
      throw new Error(`Error marking notification as read: ${error}`);
    }
  }

  async markAllNotificationsRead(): Promise<void> {
    try {
      await Notification.updateMany(
        { isRead: false },
        { isRead: true }
      );
    } catch (error) {
      throw new Error(`Error marking all notifications as read: ${error}`);
    }
  }

  async getUnreadCount(): Promise<number> {
    try {
      return await Notification.countDocuments({ isRead: false });
    } catch (error) {
      throw new Error(`Error counting unread notifications: ${error}`);
    }
  }
}