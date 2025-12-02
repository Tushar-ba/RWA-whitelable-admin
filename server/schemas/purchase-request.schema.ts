import mongoose, { Schema, Document } from 'mongoose';

export interface IPurchaseRequest extends Document {
  _id: string;
  requestId: string;
  userEmail: string;
  asset: string;
  usdcAmount: string;
  platformFee: string;
  kycStatus: string;
  status: string;
  autoApproved: boolean;
  vaultAllocated: boolean;
  vaultNumber?: string;
  vaultLocation?: string;
  allocationNotes?: string;
  tokensMinted: boolean;
  notes?: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseRequestSchema = new Schema<IPurchaseRequest>({
  requestId: {
    type: String,
    required: true,
    unique: true
  },
  userEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  asset: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  usdcAmount: {
    type: String,
    required: true
  },
  platformFee: {
    type: String,
    required: true
  },
  kycStatus: {
    type: String,
    required: true,
    enum: ['verified', 'pending', 'rejected']
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  autoApproved: {
    type: Boolean,
    default: false
  },
  vaultAllocated: {
    type: Boolean,
    default: false
  },
  vaultNumber: {
    type: String,
    trim: true
  },
  vaultLocation: {
    type: String,
    trim: true
  },
  allocationNotes: {
    type: String,
    trim: true
  },
  tokensMinted: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    trim: true
  },
  rejectionReason: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

export const PurchaseRequest = mongoose.model<IPurchaseRequest>('PurchaseRequest', PurchaseRequestSchema);