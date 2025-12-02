import mongoose from "mongoose";
import { Wallet, IWallet } from "../schemas/wallet.schema";
import { AppUser } from "../schemas/user.schema";
import { type InsertWallet } from "@shared/schema";

export class WalletService {
  async getAllWallets(): Promise<IWallet[]> {
    try {
      return await Wallet.find({ isActive: true }).sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Error fetching wallets: ${error}`);
    }
  }

  async getWalletById(id: string): Promise<IWallet | null> {
    try {
      return await Wallet.findById(id);
    } catch (error) {
      throw new Error(`Error finding wallet: ${error}`);
    }
  }
  async getWalletsByuserID(Id: string): Promise<IWallet[]> {
    try {
      // Direct string match first
      const directMatch = await Wallet.find({ userId: Id }).sort({ createdAt: -1 });
      if (directMatch.length > 0) {
        return directMatch;
      }
      
      // Try ObjectId match
      try {
        const objectIdMatch = await Wallet.find({ userId: new mongoose.Types.ObjectId(Id) }).sort({ createdAt: -1 });
        if (objectIdMatch.length > 0) {
          return objectIdMatch;
        }
      } catch (err) {
        // ObjectId conversion failed, continue with other methods
      }
      
      // Handle corrupted userId structure with buffer comparison
      const allWallets = await Wallet.find({}).sort({ createdAt: -1 });
      const matchedByBuffer = allWallets.filter(wallet => {
        if (wallet.userId && typeof wallet.userId === 'object') {
          // Handle Mongoose document with buffer in _doc property
          if (wallet.userId._doc && wallet.userId._doc.buffer) {
            try {
              const bufferAsObjectId = new mongoose.Types.ObjectId(wallet.userId._doc.buffer);
              return bufferAsObjectId.toString() === Id;
            } catch (err) {
              return false;
            }
          }
        }
        return false;
      });
      
      if (matchedByBuffer.length > 0) {
        return matchedByBuffer;
      }
      
      // Fallback to email matching
      try {
        const user = await AppUser.findById(Id);
        if (user && user.email) {
          return await Wallet.find({ userEmail: user.email }).sort({ createdAt: -1 });
        }
      } catch (err) {
        // User not found, return empty array
      }
      
      return [];
    } catch (error) {
      console.error('Error finding wallets by userId:', error);
      throw new Error(`Error finding wallets: ${error}`);
    }
  }

  async getWalletByUserID(Id: string): Promise<IWallet | null> {
    try {
      // Return the primary/first wallet for this user
      return await Wallet.findOne({ userId: Id }).sort({ createdAt: 1 });
    } catch (error) {
      console.error('Error finding wallet by userId:', error);
      throw new Error(`Error finding wallet: ${error}`);
    }
  }

  async getWalletsByEmail(email: string): Promise<IWallet[]> {
    try {
      return await Wallet.find({ userEmail: email, isActive: true });
    } catch (error) {
      throw new Error(`Error finding wallets: ${error}`);
    }
  }

  async getWalletByAddress(walletAddress: string): Promise<IWallet | null> {
    try {
      return await Wallet.findOne({ walletAddress, isActive: true });
    } catch (error) {
      throw new Error(`Error finding wallet: ${error}`);
    }
  }

  async createWallet(walletData: InsertWallet): Promise<IWallet> {
    try {
      const wallet = new Wallet(walletData);
      return await wallet.save();
    } catch (error) {
      throw new Error(`Error creating wallet: ${error}`);
    }
  }

  async updateWallet(
    id: string,
    updateData: Partial<IWallet>,
  ): Promise<IWallet | null> {
    try {
      return await Wallet.findByIdAndUpdate(id, updateData, { new: true });
    } catch (error) {
      throw new Error(`Error updating wallet: ${error}`);
    }
  }

  async updateWalletBalance(
    walletAddress: string,
    token: string,
    newBalance: string,
  ): Promise<IWallet | null> {
    try {
      return await Wallet.findOneAndUpdate(
        { walletAddress, isActive: true },
        { [`balance.${token}`]: newBalance },
        { new: true },
      );
    } catch (error) {
      throw new Error(`Error updating wallet balance: ${error}`);
    }
  }
}
