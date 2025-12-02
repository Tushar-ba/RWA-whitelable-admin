import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { RoleBasedNotificationService } from '../services/role-based-notifications.service';

export class NotificationController {
  private notificationService: NotificationService;
  private roleBasedNotificationService: RoleBasedNotificationService;

  constructor() {
    this.notificationService = new NotificationService();
    this.roleBasedNotificationService = new RoleBasedNotificationService();
  }

  getAllNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
      const notifications = await this.notificationService.getAllNotifications();
      res.json(notifications);
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  };

  getUnreadNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get admin info from authenticated session
      const admin = (req as any).admin;
      let adminRoles: string[] = [];
      let adminPermissions: string[] = [];
      let adminId: string | undefined;

      if (admin) {
        adminRoles = admin.roles || [];
        adminPermissions = admin.permissions || [];
        adminId = admin.id;
      }

      const notifications = await this.notificationService.getUnreadNotifications(
        adminRoles, 
        adminPermissions, 
        adminId
      );
      res.json(notifications);
    } catch (error) {
      console.error('Get unread notifications error:', error);
      res.status(500).json({ message: "Failed to fetch unread notifications" });
    }
  };

  markNotificationRead = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const notification = await this.notificationService.markNotificationRead(id);
      
      if (!notification) {
        res.status(404).json({ message: "Notification not found" });
        return;
      }
      
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error('Mark notification read error:', error);
      res.status(400).json({ message: "Failed to mark notification as read" });
    }
  };

  markAllNotificationsRead = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.notificationService.markAllNotificationsRead();
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error('Mark all notifications read error:', error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  };

  createNotification = async (req: Request, res: Response): Promise<void> => {
    try {
      const { type, title, message, priority = 'normal', targetAdminId } = req.body;
      
      if (!type || !title || !message) {
        res.status(400).json({ message: "Type, title, and message are required" });
        return;
      }

      const notificationData = {
        type,
        title,
        message,
        priority,
        targetAdminId,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const notification = await this.notificationService.createNotification(notificationData);
      res.status(201).json({ 
        message: "Notification created successfully",
        notification 
      });
    } catch (error) {
      console.error('Create notification error:', error);
      res.status(500).json({ message: "Failed to create notification" });
    }
  };

  // Test endpoint for role-based notifications
  testRoleBasedNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('🧪 Testing role-based notifications...');
      
      // Test 1: Create notification for all admins (fee change)
      const feeNotification = await this.roleBasedNotificationService.notifyFeeOrAssetStorageChange(
        'fee_change',
        'Platform Fee Updated',
        'The platform fee has been updated to 2.5%. This affects all new transactions.',
        'fee-setting-001'
      );
      
      // Test 2: Create notification for supply controller only (purchase request)
      const purchaseNotification = await this.roleBasedNotificationService.notifyPurchaseOrRedemptionRequest(
        'purchase_request',
        'New Purchase Request',
        'A new $1,500 gold purchase request requires approval.',
        'purchase-req-123'
      );
      
      // Test 3: Create system notification for all admins
      const systemNotification = await this.roleBasedNotificationService.notifySystemEvent(
        'System Maintenance Scheduled',
        'Scheduled maintenance window: August 25, 2025 from 2:00 AM - 4:00 AM UTC.',
        'high',
        'maint-08252025'
      );

      res.json({ 
        message: "Role-based notifications created successfully",
        notifications: {
          feeNotification: feeNotification._id,
          purchaseNotification: purchaseNotification._id,
          systemNotification: systemNotification._id
        }
      });
    } catch (error) {
      console.error('Test role-based notifications error:', error);
      res.status(500).json({ message: "Failed to create test notifications" });
    }
  };
}