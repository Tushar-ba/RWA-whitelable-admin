import mongoose, { Schema, Document } from 'mongoose';

export interface IAssetStorage extends Document {
  asset: 'gold' | 'silver';
  storedValue: string;
  updatedBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAssetLiquidityHistory extends Document {
  asset: 'gold' | 'silver';
  previousValue: string;
  newValue: string;
  changeAmount: string;
  description?: string;
  updatedBy: string;
  createdAt?: Date;
}

export interface IMintTransaction extends Document {
  userId: string;
  asset: 'gold' | 'silver';
  tokenAmount: string;
  goldValueUsed: string;
  silverValueUsed: string;
  status: 'pending' | 'completed' | 'failed';
  transactionHash?: string;
  notes?: string;
  processedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const AssetStorageSchema = new Schema<IAssetStorage>({
  asset: {
    type: String,
    required: true,
    unique: true,
    enum: ['gold', 'silver'],
    lowercase: true,
    trim: true
  },
  storedValue: {
    type: String,
    required: true,
    default: '0.00'
  },
  updatedBy: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true
});

const AssetLiquidityHistorySchema = new Schema<IAssetLiquidityHistory>({
  asset: {
    type: String,
    required: true,
    enum: ['gold', 'silver'],
    lowercase: true,
    trim: true
  },
  previousValue: {
    type: String,
    required: true
  },
  newValue: {
    type: String,
    required: true
  },
  changeAmount: {
    type: String,
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  updatedBy: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true
});

const MintTransactionSchema = new Schema<IMintTransaction>({
  userId: {
    type: String,
    required: true,
    trim: true
  },
  asset: {
    type: String,
    required: true,
    enum: ['gold', 'silver'],
    lowercase: true,
    trim: true
  },
  tokenAmount: {
    type: String,
    required: true
  },
  goldValueUsed: {
    type: String,
    required: true,
    default: '0.00'
  },
  silverValueUsed: {
    type: String,
    required: true,
    default: '0.00'
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  transactionHash: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  processedBy: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Create indexes for better query performance
AssetStorageSchema.index({ asset: 1 });
AssetLiquidityHistorySchema.index({ asset: 1 });
AssetLiquidityHistorySchema.index({ createdAt: -1 });
MintTransactionSchema.index({ userId: 1 });
MintTransactionSchema.index({ status: 1 });
MintTransactionSchema.index({ asset: 1 });
MintTransactionSchema.index({ createdAt: -1 });

export const AssetStorage = mongoose.model<IAssetStorage>('AssetStorage', AssetStorageSchema);
export const AssetLiquidityHistory = mongoose.model<IAssetLiquidityHistory>('AssetLiquidityHistory', AssetLiquidityHistorySchema);
export const MintTransaction = mongoose.model<IMintTransaction>('MintTransaction', MintTransactionSchema);