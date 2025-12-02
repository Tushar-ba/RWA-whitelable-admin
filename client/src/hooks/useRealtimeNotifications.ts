import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { socketService } from '@/lib/socket';
import { queryClient } from '@/lib/queryClient';

interface NotificationData {
  type: 'new_notification' | 'role_notification' | 'permission_notification';
  notification?: any;
  notificationList?: any;
  unreadCount?: number;
}

export const useRealtimeNotifications = () => {
  const { user, isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Handle new notifications
  const handleNotificationUpdate = useCallback((data: NotificationData) => {
    console.log('📬 Handling notification update:', data);
    
    // Update notifications list if provided
    if (data.notificationList) {
      setNotifications(data.notificationList);
    }
    
    // Update unread count if provided
    if (typeof data.unreadCount === 'number') {
      setUnreadCount(data.unreadCount);
    }
    
    // Show toast notification for new notifications
    if (data.type === 'new_notification' && data.notification) {
      console.log('🔔 New notification:', data.notification.title);
    }
  }, []);

  // Handle unread count updates
  const handleUnreadCountUpdate = useCallback((count: number) => {
    console.log('🔢 Updating unread count:', count);
    setUnreadCount(count);
  }, []);

  // Initialize socket connection when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      // Connect to socket with authentication - using session-based auth
      const socket = socketService.connect(user.id, 'session');
      
      // Authenticate and join notification rooms
      socketService.authenticateAndJoinRooms(user.id, 'session');
        
      // Set up notification listeners
      const unsubscribeNotifications = socketService.onNotification(handleNotificationUpdate);
      const unsubscribeUnreadCount = socketService.onUnreadCountUpdate(handleUnreadCountUpdate);
      
      // Track connection status
      const checkConnection = () => {
        setIsConnected(socketService.connected ?? false);
      };
      
      socket.on('connect', checkConnection);
      socket.on('disconnect', checkConnection);
      
      checkConnection(); // Initial check
      
      // Cleanup on unmount or auth change
      return () => {
        unsubscribeNotifications();
        unsubscribeUnreadCount();
        socket.off('connect', checkConnection);
        socket.off('disconnect', checkConnection);
      };
    } else {
      // Disconnect if not authenticated
      if (socketService.connected) {
        socketService.disconnect();
        setIsConnected(false);
        setUnreadCount(0);
      }
    }
  }, [isAuthenticated, user?.id, handleNotificationUpdate, handleUnreadCountUpdate]);

  // Method to create a test notification
  const createTestNotification = useCallback(async (type: 'buyToken' | 'redeemToken' | 'system' = 'buyToken') => {
    if (!user?.id) return;
    
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: type,
          title: `Test ${type} Notification`,
          message: `This is a test notification for ${type} event generated at ${new Date().toLocaleTimeString()}`,
          priority: 'normal',
          targetAdminId: user.id
        }),
      });
      
      if (response.ok) {
        console.log('✅ Test notification created successfully');
      } else {
        console.error('❌ Failed to create test notification');
      }
    } catch (error) {
      console.error('❌ Error creating test notification:', error);
    }
  }, [user?.id]);

  return {
    unreadCount,
    notifications,
    isConnected,
    isAuthenticated,
    createTestNotification
  };
};