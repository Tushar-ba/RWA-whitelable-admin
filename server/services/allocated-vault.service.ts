import AllocatedVault, { IAllocatedVault } from '../schemas/allocated-vault.schema';
import mongoose from 'mongoose';

export class AllocatedVaultService {
  async createAllocatedVault(vaultData: {
    purchaseRequestId: string;
    requestId: string;
    userId: string;
    vaultNumber: string;
    vaultLocation: string;
    ownedPortion: string;
    barSerialNumber: string;
    brandInfo: string;
    grossWeight: string;
    fineness: string;
    fineWeight: string;
    notes?: string;
  }): Promise<IAllocatedVault> {
    const allocatedVault = new AllocatedVault({
      ...vaultData,
      purchaseRequestId: new mongoose.Types.ObjectId(vaultData.purchaseRequestId),
      userId: new mongoose.Types.ObjectId(vaultData.userId),
      allocationDate: new Date(),
      status: 'allocated'
    });

    return await allocatedVault.save();
  }

  async getVaultByPurchaseRequestId(purchaseRequestId: string): Promise<IAllocatedVault | null> {
    return await AllocatedVault.findOne({
      purchaseRequestId: new mongoose.Types.ObjectId(purchaseRequestId)
    }).populate('userId', 'email first_name last_name');
  }

  async getVaultsByUserId(userId: string): Promise<IAllocatedVault[]> {
    return await AllocatedVault.find({
      userId: new mongoose.Types.ObjectId(userId)
    }).populate('purchaseRequestId').sort({ allocationDate: -1 });
  }

  async getAllAllocatedVaults(): Promise<IAllocatedVault[]> {
    return await AllocatedVault.find()
      .populate('userId', 'email first_name last_name')
      .populate('purchaseRequestId')
      .sort({ allocationDate: -1 });
  }

  async updateVaultStatus(
    purchaseRequestId: string, 
    status: 'allocated' | 'released'
  ): Promise<IAllocatedVault | null> {
    return await AllocatedVault.findOneAndUpdate(
      { purchaseRequestId: new mongoose.Types.ObjectId(purchaseRequestId) },
      { status, updatedAt: new Date() },
      { new: true }
    );
  }

  async getVaultByBarSerial(barSerialNumber: string): Promise<IAllocatedVault | null> {
    return await AllocatedVault.findOne({ barSerialNumber });
  }

  async deleteVaultAllocation(purchaseRequestId: string): Promise<boolean> {
    const result = await AllocatedVault.deleteOne({
      purchaseRequestId: new mongoose.Types.ObjectId(purchaseRequestId)
    });
    return result.deletedCount > 0;
  }

  async getVaultStatistics() {
    const stats = await AllocatedVault.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalGrossWeight: { $sum: { $toDouble: '$grossWeight' } },
          totalFineWeight: { $sum: { $toDouble: '$fineWeight' } }
        }
      }
    ]);

    const totalVaults = await AllocatedVault.countDocuments();
    const uniqueUsers = await AllocatedVault.distinct('userId').then(users => users.length);

    return {
      totalVaults,
      uniqueUsers,
      statusBreakdown: stats,
    };
  }
}