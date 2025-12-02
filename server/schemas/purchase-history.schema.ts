import mongoose, { Schema, Document } from "mongoose";

export interface IPurchaseHistory extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  metal: "gold" | "silver";
  tokenAmount: string;
  usdAmount: string;
  feeAmount: string;
  date: string;
  time: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  networkType: "private" | "public";
  paymentMethod: "credit_card" | "bank_transfer" | "crypto" | "wire_transfer" | "wallet";
  transactionHash?: string;
  walletAddress: string;
  errorMessage?: string;
  vaultAllocated?: boolean;
  vaultNumber?: string;
  vaultLocation?: string;
  allocationNotes?: string;
  tokensMinted?: boolean;
  notes?: string;
  rejectionReason?: string;
  kycStatus?: "pending" | "approved" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseHistorySchema = new Schema<IPurchaseHistory>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // References the User model
      required: true,
    },
    metal: {
      type: String,
      required: true,
      enum: ["gold", "silver"],
    },
    tokenAmount: {
      type: String,
      required: true,
    },
    usdAmount: {
      type: String,
      required: true,
    },
    feeAmount: {
      type: String,
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "processing", "completed", "failed", "cancelled"],
      default: "pending",
    },
    networkType: {
      type: String,
      required: true,
      enum: ["private", "public"],
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ["credit_card", "bank_transfer", "crypto", "wire_transfer", "wallet"],
    },
    transactionHash: {
      type: String,
      trim: true,
    },
    walletAddress: {
      type: String,
      required: true,
      trim: true,
    },
    errorMessage: {
      type: String,
      trim: true,
    },
    vaultAllocated: {
      type: Boolean,
      default: false,
    },
    vaultNumber: {
      type: String,
      trim: true,
    },
    vaultLocation: {
      type: String,
      trim: true,
    },
    allocationNotes: {
      type: String,
      trim: true,
    },
    tokensMinted: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      trim: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    kycStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  },
);

// Create indexes for better query performance
PurchaseHistorySchema.index({ userId: 1 });
PurchaseHistorySchema.index({ status: 1 });
PurchaseHistorySchema.index({ metal: 1 });
PurchaseHistorySchema.index({ networkType: 1 });
PurchaseHistorySchema.index({ createdAt: -1 });

export const PurchaseHistory = mongoose.model<IPurchaseHistory>(
  "PurchaseHistory",
  PurchaseHistorySchema,
  "purchasehistory",
);
