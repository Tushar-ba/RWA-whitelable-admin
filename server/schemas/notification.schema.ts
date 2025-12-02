import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  _id: string;
  type: string;
  title: string;
  message: string;
  relatedId?: string;
  priority: string;
  isRead: boolean;
  targetAdminId?: string; // Specific admin to notify
  targetRoles?: string[]; // Roles that should receive this notification
  targetPermissions?: string[]; // Permissions that should receive this notification
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  type: {
    type: String,
    required: true,
    enum: ['purchase', 'redemption', 'gifting', 'system', 'user', 'buyToken', 'redeemToken', 'transaction', 'wallet']
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  relatedId: {
    type: String,
    trim: true
  },
  priority: {
    type: String,
    required: true,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  targetAdminId: {
    type: String,
    trim: true
  },
  targetRoles: [{
    type: String,
    trim: true
  }],
  targetPermissions: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);