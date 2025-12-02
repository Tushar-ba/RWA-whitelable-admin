import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemSettings extends Document {
  _id: string;
  key: string;
  value: any;
  updatedAt: Date;
  updatedBy: string;
}

const SystemSettingsSchema = new Schema<ISystemSettings>({
  key: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  value: {
    type: Schema.Types.Mixed,
    required: true
  },
  updatedBy: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

export const SystemSettings = mongoose.model<ISystemSettings>('SystemSettings', SystemSettingsSchema);