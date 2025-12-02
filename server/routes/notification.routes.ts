import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const notificationController = new NotificationController();

// Notification routes - all protected
router.get('/', authenticateToken, notificationController.getAllNotifications);
router.get('/unread', authenticateToken, notificationController.getUnreadNotifications);
router.post('/', authenticateToken, notificationController.createNotification);
router.post('/test-role-based', authenticateToken, notificationController.testRoleBasedNotifications);
router.put('/:id/read', authenticateToken, notificationController.markNotificationRead);
router.put('/mark-all-read', authenticateToken, notificationController.markAllNotificationsRead);

export default router;