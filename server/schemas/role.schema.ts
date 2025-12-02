import mongoose, { Schema, Document } from 'mongoose';

export interface IRole extends Document {
  _id: string;
  name: string;
  description: string;
  permissions: string[];
  blockchainRoleId: string;
  isActive: boolean;
  createdAt: Date;
}

const RoleSchema = new Schema<IRole>({
  name: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  permissions: {
    type: [String],
    required: true,
    default: []
  },
  blockchainRoleId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export const Role = mongoose.model<IRole>('Role', RoleSchema);