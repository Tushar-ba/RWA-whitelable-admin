export const SOCKET_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',

  // Notification events
  NOTIFICATION: 'notification',
  NOTIFICATION_MARKED_READ: 'notification_marked_read',
  NOTIFICATION_COUNT_UPDATE: 'notification_count_update',
  UNREAD_COUNT_UPDATE: 'unread_count_update',

  // System events
  SYSTEM_UPDATE: 'system_update',
  USER_STATUS_CHANGE: 'user_status_change',

  // Transaction events
  TRANSACTION_UPDATE: 'transaction_update',
  PURCHASE_REQUEST_UPDATE: 'purchase_request_update',
  REDEMPTION_REQUEST_UPDATE: 'redemption_request_update',

  // Token events
  TOKEN_MINTED: 'token_minted',
  TOKEN_BURNED: 'token_burned',
  TOKEN_TRANSFERRED: 'token_transferred',

  // Test events
  PING: 'ping',
  PONG: 'pong',
  WELCOME: 'welcome'
} as const;

export type SocketEvent = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];