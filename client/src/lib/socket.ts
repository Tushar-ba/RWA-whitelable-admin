import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@/constants/socket.constants';

interface NotificationEventData {
  type: 'new_notification' | 'role_notification' | 'permission_notification';
  notification?: any;
  notificationList?: any;
  unreadCount?: number;
}

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private notificationCallbacks: ((data: NotificationEventData) => void)[] = [];
  private unreadCountCallbacks: ((count: number) => void)[] = [];

  connect(adminId?: string, token?: string) {
    if (this.socket?.connected) {
      return this.socket;
    }

    // Connect to Socket.IO server on same host and port
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socketUrl = `${window.location.protocol}//${window.location.host}`;
    
    console.log('🔌 Connecting to Socket.IO server at:', socketUrl);

    this.socket = io(socketUrl, {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    // Set up event listeners
    this.setupEventListeners();

    // Join notification room if admin credentials provided
    if (adminId && token) {
      this.joinNotificationRoom(adminId, token);
    }

    return this.socket;
  }

  private joinNotificationRoom(adminId: string, token: string) {
    if (this.socket) {
      this.socket.emit(SOCKET_EVENTS.JOIN_ROOM, { adminId, token });
    }
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on(SOCKET_EVENTS.CONNECT, () => {
      this.isConnected = true;
      console.log('✅ Socket.IO connected successfully! Socket ID:', this.socket?.id);
    });

    this.socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
      this.isConnected = false;
      console.log('❌ Socket.IO disconnected. Reason:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error);
    });

    this.socket.on(SOCKET_EVENTS.WELCOME, (data) => {
      console.log('🎉 Welcome message from server:', data.message);
      if (data.unreadCount !== undefined) {
        this.notifyUnreadCountUpdate(data.unreadCount);
      }
    });

    this.socket.on(SOCKET_EVENTS.PONG, (data) => {
      console.log('🏓 Pong received from server:', data);
    });

    // Real-time notification events
    this.socket.on(SOCKET_EVENTS.NOTIFICATION, (data: NotificationEventData) => {
      console.log('📬 Real-time notification received:', data);
      this.notifyNotificationUpdate(data);
      
      if (data.unreadCount !== undefined) {
        this.notifyUnreadCountUpdate(data.unreadCount);
      }
    });

    this.socket.on(SOCKET_EVENTS.NOTIFICATION_COUNT_UPDATE, (data) => {
      console.log('🔢 Notification count update:', data);
      if (data.unreadCount !== undefined) {
        this.notifyUnreadCountUpdate(data.unreadCount);
      }
    });

    this.socket.on('error', (error) => {
      console.error('❌ Socket.IO error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      console.log('🔌 Socket.IO disconnected manually');
    }
  }

  private notifyNotificationUpdate(data: NotificationEventData) {
    this.notificationCallbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('❌ Error in notification callback:', error);
      }
    });
  }

  private notifyUnreadCountUpdate(count: number) {
    this.unreadCountCallbacks.forEach(callback => {
      try {
        callback(count);
      } catch (error) {
        console.error('❌ Error in unread count callback:', error);
      }
    });
  }

  // Public methods for managing notification callbacks
  onNotification(callback: (data: NotificationEventData) => void) {
    this.notificationCallbacks.push(callback);
    return () => {
      const index = this.notificationCallbacks.indexOf(callback);
      if (index > -1) {
        this.notificationCallbacks.splice(index, 1);
      }
    };
  }

  onUnreadCountUpdate(callback: (count: number) => void) {
    this.unreadCountCallbacks.push(callback);
    return () => {
      const index = this.unreadCountCallbacks.indexOf(callback);
      if (index > -1) {
        this.unreadCountCallbacks.splice(index, 1);
      }
    };
  }

  emit(event: string, data?: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('⚠️ Socket.IO not connected. Cannot emit event:', event);
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (data: any) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  get connected() {
    return this.isConnected && this.socket?.connected;
  }

  get socketId() {
    return this.socket?.id;
  }

  // Example method to test ping/pong
  sendPing() {
    this.emit(SOCKET_EVENTS.PING);
    console.log('🏓 Ping sent to server');
  }

  // Method to authenticate and join notification rooms
  authenticateAndJoinRooms(adminId: string, token: string) {
    if (this.socket?.connected) {
      this.joinNotificationRoom(adminId, token);
    }
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;