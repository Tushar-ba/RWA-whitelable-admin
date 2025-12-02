import mongoose, { Schema, Document } from "mongoose";

export interface IRedemptionRequest extends Document {
  _id: string;
  requestId: string;
  walletAddress: string;
  userId?: mongoose.Types.ObjectId;
  userEmail: string;
  token: string;
  quantity: string;
  redemptionMethod: string;
  status: string;
  notes?: string;
  rejectionReason?: string;
  transactionHash?: string;
  burnedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RedemptionRequestSchema = new Schema<IRedemptionRequest>(
  {
    requestId: {
      type: String,
      required: true,
      unique: true,
    },
    walletAddress: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    userEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    token: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    quantity: {
      type: String,
      required: true,
    },
    redemptionMethod: {
      type: String,
      required: true,
      enum: ["physical_delivery", "cash_settlement"],
    },
    status: {
      type: String,
      required: true,
      enum: [
        "pending",
        "approved",
        "rejected",
        "processing",
        "fulfilled",
        "cancelled",
        "completed",
      ],
      default: "pending",
    },
    notes: {
      type: String,
      trim: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    transactionHash: {
      type: String,
      trim: true,
    },
    burnedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

export const RedemptionRequest = mongoose.model<IRedemptionRequest>(
  "RedemptionRequest",
  RedemptionRequestSchema,
);
