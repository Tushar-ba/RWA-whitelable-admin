import mongoose, { Schema, Document } from "mongoose";

export interface IWallet extends Document {
  _id: string;
  userId: string;
  userEmail: string;
  walletAddress: string;
  balance: {
    [token: string]: string;
  };
  isActive: boolean;
  createdAt: Date;
}

const WalletSchema = new Schema<IWallet>(
  {
    userEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    userId: {
      type: String,
      ref:"User"
    },
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    balance: {
      type: Map,
      of: String,
      default: {},
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

export const Wallet = mongoose.model<IWallet>("Wallet", WalletSchema);
