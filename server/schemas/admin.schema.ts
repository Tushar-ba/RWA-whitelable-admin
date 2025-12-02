import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IAdmin extends Document {
  _id: mongoose.Types.ObjectId;
  user_id: string;
  email: string;
  password_hash: string;
  full_name: string;
  roles: string[];
  isSuperAdmin: boolean;
  isDeleted: boolean;
  isInvited: boolean;
  permissions: string[];
  isAccepted: boolean;
  phone_number?: string;
  wallet_address?: string;
  network?: string;
  account_status: string;
  email_verified: boolean;
  two_factor_enabled: boolean;
  created_at: Date;
  updated_at: Date;
  email_verification_expires?: Date;
  email_verification_token?: string;
  otp_attempts: number;
  two_factor_expires?: Date;
  two_factor_token?: string;
  last_login?: Date;
  last_otp_sent?: Date;
  otp?: string;
  otp_expires_at?: Date;
}

const AdminSchema = new Schema<IAdmin>({
  user_id: { 
    type: String, 
    required: true, 
    unique: true,
    default: () => uuidv4()
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password_hash: {
    type: String,
    required: true
  },
  full_name: {
    type: String,
    required: true,
    trim: true
  },
  roles: [{
    type: String,
    default: "DEFAULT_ADMIN_ROLE"
  }],
  isSuperAdmin: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  isInvited: {
    type: Boolean,
    default: false
  },
  permissions: [{
    type: String
  }],
  isAccepted: {
    type: Boolean,
    default: true
  },
  phone_number: {
    type: String,
    default: ""
  },
  wallet_address: {
    type: String,
    default: ""
  },
  network: {
    type: String,
    default: ""
  },
  account_status: {
    type: String,
    default: "verified"
  },
  email_verified: {
    type: Boolean,
    default: true
  },
  two_factor_enabled: {
    type: Boolean,
    default: false
  },
  email_verification_expires: {
    type: Date,
    default: null
  },
  email_verification_token: {
    type: String,
    default: null
  },
  otp_attempts: {
    type: Number,
    default: 0
  },
  two_factor_expires: {
    type: Date
  },
  two_factor_token: {
    type: String
  },
  last_login: {
    type: Date
  },
  last_otp_sent: {
    type: Date
  },
  otp: {
    type: String
  },
  otp_expires_at: {
    type: Date
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

export const Admin = mongoose.model<IAdmin>('Admin', AdminSchema);