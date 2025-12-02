import mongoose, { Schema, Document } from "mongoose";

export interface IGiftingTransaction extends Document {
  _id: string;
  userId: mongoose.Types.ObjectId;
  recipientWallet: string;
  token: "gold" | "silver";
  quantity: string;
  message?: string;
  network: "ethereum" | "polygon" | "bsc" | "solana";
  status:
    | "pending"
    | "processing"
    | "completed"
    | "failed"
    | "cancelled"
    | "success";
  transactionHash?: string;
  networkFee: string;
  tokenValueUSD: string;
  totalCostUSD: string;
  gramsAmount: string;
  currentTokenPrice: string;
  createdAt: Date;
  updatedAt: Date;
}

const GiftingTransactionSchema = new Schema<IGiftingTransaction>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipientWallet: {
      type: String,
      required: true,
      trim: true,
    },
    token: {
      type: String,
      required: true,
      enum: ["gold", "silver"],
    },
    quantity: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      trim: true,
    },
    network: {
      type: String,
      required: true,
      enum: ["ethereum", "polygon", "bsc", "solana"],
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "processing", "completed", "failed", "cancelled"],
      default: "pending",
    },
    transactionHash: {
      type: String,
      trim: true,
    },
    networkFee: {
      type: String,
      required: true,
    },
    tokenValueUSD: {
      type: String,
      required: true,
    },
    totalCostUSD: {
      type: String,
      required: true,
    },
    gramsAmount: {
      type: String,
      required: true,
    },
    currentTokenPrice: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Create indexes for better query performance
GiftingTransactionSchema.index({ userId: 1 });
GiftingTransactionSchema.index({ status: 1 });
GiftingTransactionSchema.index({ token: 1 });
GiftingTransactionSchema.index({ network: 1 });
GiftingTransactionSchema.index({ createdAt: -1 });

export const GiftingTransaction = mongoose.model<IGiftingTransaction>(
  "Giftings",
  GiftingTransactionSchema,
);
