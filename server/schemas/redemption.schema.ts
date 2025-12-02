import mongoose, { Schema, Document } from 'mongoose';

export interface IRedemption extends Document {
  _id: string;
  id: string;
  userId: string;
  token: 'gold' | 'silver';
  quantity: string;
  gramsAmount: string;
  tokenValueUSD: string;
  network: 'ethereum' | 'polygon' | 'bsc' | 'solana';
  deliveryAddress: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  status: 'pending' | 'processing' | 'approved' | 'shipped' | 'delivered' | 'cancelled' | 'failed';
  transactionHash?: string;
  requestId?: string;
  errorMessage?: string;
  deliveryFee: string;
  totalCostUSD: string;
  approvedAt?: Date;
  completedAt?: Date;
  currentTokenPrice: string;
  createdAt: Date;
  updatedAt: Date;
}

const RedemptionSchema = new Schema<IRedemption>({
  id: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  token: {
    type: String,
    required: true,
    enum: ['gold', 'silver']
  },
  quantity: {
    type: String,
    required: true
  },
  gramsAmount: {
    type: String,
    required: true
  },
  tokenValueUSD: {
    type: String,
    required: true
  },
  network: {
    type: String,
    required: true,
    enum: ['ethereum', 'polygon', 'bsc', 'solana']
  },
  deliveryAddress: {
    type: String,
    required: true,
    trim: true
  },
  streetAddress: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  state: {
    type: String,
    required: true,
    trim: true
  },
  zipCode: {
    type: String,
    required: true,
    trim: true
  },
  country: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'approved', 'shipped', 'delivered', 'cancelled', 'failed'],
    default: 'pending'
  },
  transactionHash: {
    type: String,
    trim: true
  },
  requestId: {
    type: String,
    trim: true
  },
  errorMessage: {
    type: String,
    trim: true
  },
  deliveryFee: {
    type: String,
    required: true
  },
  totalCostUSD: {
    type: String,
    required: true
  },
  approvedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  currentTokenPrice: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Create indexes for better query performance
RedemptionSchema.index({ userId: 1 });
RedemptionSchema.index({ status: 1 });
RedemptionSchema.index({ token: 1 });
RedemptionSchema.index({ network: 1 });
RedemptionSchema.index({ createdAt: -1 });

export const Redemption = mongoose.model<IRedemption>('Redemption', RedemptionSchema);