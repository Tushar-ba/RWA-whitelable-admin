import { NotificationService } from './notification.service';
import { INotification } from '../schemas/notification.schema';

export class RoleBasedNotificationService {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * Send notifications for fee and asset storage changes - show to all admins
   */
  async notifyFeeOrAssetStorageChange(type: 'fee_change' | 'asset_storage_change', title: string, message: string, relatedId?: string) {
    const notification = {
      type: 'system',
      title,
      message,
      relatedId,
      priority: 'high',
      targetRoles: ['DEFAULT_ADMIN_ROLE'], // All admins
      targetPermissions: ['Platform Fee Management', 'Assets Storage'], // Anyone with these permissions
      targetAdminId: undefined, // Not specific to one admin
      isRead: false
    };

    console.log(`📢 Creating ${type} notification for all admins:`, title);
    return await this.notificationService.createNotification(notification);
  }

  /**
   * Send notifications for purchase/redemption requests - show to supply controller admin
   */
  async notifyPurchaseOrRedemptionRequest(type: 'purchase_request' | 'redemption_request', title: string, message: string, relatedId?: string) {
    const notification = {
      type: type === 'purchase_request' ? 'purchase' : 'redemption',
      title,
      message,
      relatedId,
      priority: 'normal',
      targetRoles: ['SUPPLY_CONTROLLER'], // Supply controller role
      targetPermissions: ['Purchase Requests', 'Redemption Requests'], // Anyone with these permissions
      targetAdminId: undefined,
      isRead: false
    };

    console.log(`📢 Creating ${type} notification for supply controller:`, title);
    return await this.notificationService.createNotification(notification);
  }

  /**
   * Send notifications for token operations (buyToken, redeemToken)
   */
  async notifyTokenOperation(type: 'buyToken' | 'redeemToken', title: string, message: string, relatedId?: string, priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal') {
    const notification = {
      type,
      title,
      message,
      relatedId,
      priority,
      targetRoles: ['DEFAULT_ADMIN_ROLE', 'SUPPLY_CONTROLLER'], // Both admin types
      targetPermissions: ['Transactions', 'Wallet Management'], // Anyone with these permissions
      targetAdminId: undefined,
      isRead: false
    };

    console.log(`📢 Creating ${type} notification for admins:`, title);
    return await this.notificationService.createNotification(notification);
  }

  /**
   * Send system-wide notifications to all admins
   */
  async notifySystemEvent(title: string, message: string, priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal', relatedId?: string) {
    const notification = {
      type: 'system',
      title,
      message,
      relatedId,
      priority,
      targetRoles: ['DEFAULT_ADMIN_ROLE'], // All admins
      targetPermissions: ['Dashboard'], // Anyone with dashboard access
      targetAdminId: undefined,
      isRead: false
    };

    console.log(`📢 Creating system notification for all admins:`, title);
    return await this.notificationService.createNotification(notification);
  }

  /**
   * Send notification to specific admin by ID
   */
  async notifySpecificAdmin(adminId: string, type: string, title: string, message: string, priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal', relatedId?: string) {
    const notification = {
      type,
      title,
      message,
      relatedId,
      priority,
      targetAdminId: adminId, // Specific admin
      targetRoles: [], // No role targeting
      targetPermissions: [], // No permission targeting
      isRead: false
    };

    console.log(`📢 Creating notification for specific admin ${adminId}:`, title);
    return await this.notificationService.createNotification(notification);
  }
}