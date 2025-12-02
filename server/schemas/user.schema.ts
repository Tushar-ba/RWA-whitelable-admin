import mongoose, { Schema, Document } from 'mongoose';
import { AccountStatus } from 'server/config/enums';

export interface IAppUser extends Document {
  _id: string;
  email: string;
  password_hash: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  organization_name?: string;
  country: string;
  state: string;
  account_status: AccountStatus;
  email_verified: boolean;
  email_verification_token?: string;
  email_verification_expires?: Date;
  otp_attempts?: number;
  password_reset_token?: string;
  password_reset_expires?: Date;
  last_otp_sent?: Date;
  referral_code?: string;
  terms_accepted: boolean;
  last_login?: Date;
  two_factor_enabled: boolean;
  two_factor_token?: string;
  two_factor_expires?: Date;
  created_at: Date;
  updated_at: Date;
}

const AppUserSchema = new Schema<IAppUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true},
    password_hash: { type: String, required: true },
    first_name: { type: String },
    last_name: { type: String },
    phone_number: { type: String },
    organization_name: { type: String },
    country: { type: String, required: true },
    state: { type: String, required: true },
    account_status: {
      type: String,
      enum: AccountStatus,
      required: true,
    },
    email_verified: { type: Boolean, default: false },
    email_verification_token: { type: String },
    email_verification_expires: { type: Date },
    otp_attempts: { type: Number, default: 0 },
    password_reset_token: { type: String },
    password_reset_expires: { type: Date },
    last_otp_sent: { type: Date },
    referral_code: { type: String },
    terms_accepted: { type: Boolean, required: true },
    last_login: { type: Date },
    two_factor_enabled: { type: Boolean, default: false },
    two_factor_token: { type: String },
    two_factor_expires: { type: Date },
  },
  {
    timestamps:true,
  }
);

export const AppUser = mongoose.model<IAppUser>('User', AppUserSchema);
