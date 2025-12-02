import mongoose, { Schema, Document } from 'mongoose';

export interface IAllocatedVault extends Document {
  purchaseRequestId: mongoose.Types.ObjectId;
  requestId: string; // REQ-2025-xxx format
  userId: mongoose.Types.ObjectId;
  vaultNumber: string;
  vaultLocation: string;
  
  // Vault allocation details from PAXG report format
  ownedPortion: string;
  barSerialNumber: string;
  brandInfo: string;
  grossWeight: string;
  fineness: string;
  fineWeight: string;
  
  // Additional metadata
  allocationDate: Date;
  notes?: string;
  status: 'allocated' | 'released';
  
  createdAt: Date;
  updatedAt: Date;
}

const AllocatedVaultSchema: Schema = new Schema({
  purchaseRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseRequest',
    required: true,
    unique: true
  },
  requestId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vaultNumber: {
    type: String,
    required: true,
    index: true
  },
  vaultLocation: {
    type: String,
    required: true
  },
  ownedPortion: {
    type: String,
    required: true
  },
  barSerialNumber: {
    type: String,
    required: true,
    unique: true
  },
  brandInfo: {
    type: String,
    required: true
  },
  grossWeight: {
    type: String,
    required: true
  },
  fineness: {
    type: String,
    required: true
  },
  fineWeight: {
    type: String,
    required: true
  },
  allocationDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  notes: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['allocated', 'released'],
    default: 'allocated'
  }
}, {
  timestamps: true
});

// Add indexes for efficient queries
AllocatedVaultSchema.index({ purchaseRequestId: 1 });
AllocatedVaultSchema.index({ userId: 1 });
AllocatedVaultSchema.index({ vaultNumber: 1 });
AllocatedVaultSchema.index({ barSerialNumber: 1 });
AllocatedVaultSchema.index({ allocationDate: -1 });

export default mongoose.model<IAllocatedVault>('AllocatedVault', AllocatedVaultSchema);