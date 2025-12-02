import { GiftingTransaction, IGiftingTransaction } from '../schemas/gifting-transaction.schema';
import { type InsertGiftingTransaction } from '@shared/schema';

export class GiftingTransactionService {
  async getAllGiftingTransactions(): Promise<IGiftingTransaction[]> {
    try {
      return await GiftingTransaction.find()
        .populate("userId", "email first_name last_name", "User")
        .sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Error fetching gifting transactions: ${error}`);
    }
  }

  async getGiftingTransactionById(id: string): Promise<IGiftingTransaction | null> {
    try {
      return await GiftingTransaction.findById(id);
    } catch (error) {
      throw new Error(`Error finding gifting transaction: ${error}`);
    }
  }

  async getGiftingTransactionByGiftId(giftId: string): Promise<IGiftingTransaction | null> {
    try {
      return await GiftingTransaction.findOne({ giftId });
    } catch (error) {
      throw new Error(`Error finding gifting transaction: ${error}`);
    }
  }

  async createGiftingTransaction(transactionData: InsertGiftingTransaction): Promise<IGiftingTransaction> {
    try {
      const transaction = new GiftingTransaction(transactionData);
      return await transaction.save();
    } catch (error) {
      throw new Error(`Error creating gifting transaction: ${error}`);
    }
  }

  async updateGiftingTransaction(id: string, updateData: Partial<IGiftingTransaction>): Promise<IGiftingTransaction | null> {
    try {
      return await GiftingTransaction.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      );
    } catch (error) {
      throw new Error(`Error updating gifting transaction: ${error}`);
    }
  }

  async getTransactionsByWallet(walletAddress: string): Promise<IGiftingTransaction[]> {
    try {
      return await GiftingTransaction.find({
        $or: [
          { senderWallet: walletAddress },
          { receiverWallet: walletAddress }
        ]
      }).sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Error fetching wallet transactions: ${error}`);
    }
  }
}