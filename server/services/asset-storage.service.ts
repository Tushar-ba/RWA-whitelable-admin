import { AssetStorage, AssetLiquidityHistory, MintTransaction, IAssetStorage, IAssetLiquidityHistory, IMintTransaction } from '../schemas/asset-storage.schema';

export class AssetStorageService {
  
  // Initialize asset storage with default values if not exists
  async initializeAssetStorage() {
    try {
      const existingGold = await AssetStorage.findOne({ asset: 'gold' });
      const existingSilver = await AssetStorage.findOne({ asset: 'silver' });

      const defaultAdminId = 'system-init';

      if (!existingGold) {
        await AssetStorage.create({
          asset: 'gold',
          storedValue: '0.00',
          updatedBy: defaultAdminId
        });
      }

      if (!existingSilver) {
        await AssetStorage.create({
          asset: 'silver',
          storedValue: '0.00',
          updatedBy: defaultAdminId
        });
      }

      console.log('✅ Asset storage initialized successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Asset storage initialization failed:', error);
      throw error;
    }
  }

  // Get current asset storage values
  async getAssetStorage() {
    try {
      const assetStorage = await AssetStorage.find({}).sort({ asset: 1 });
      return assetStorage;
    } catch (error) {
      console.error('❌ Get asset storage error:', error);
      throw new Error('Failed to retrieve asset storage');
    }
  }

  // Update asset storage value and create history record
  async updateAssetStorage(asset: 'gold' | 'silver', newValue: string, adminId: string, description?: string) {
    try {
      // Get current value
      const currentStorage = await AssetStorage.findOne({ asset });
      if (!currentStorage) {
        throw new Error(`Asset storage for ${asset} not found`);
      }

      const previousValue = currentStorage.storedValue;
      const changeAmount = (parseFloat(newValue) - parseFloat(previousValue)).toString();

      // Update asset storage
      const updatedStorage = await AssetStorage.findOneAndUpdate(
        { asset },
        {
          storedValue: newValue,
          updatedBy: adminId,
          updatedAt: new Date()
        },
        { new: true }
      );

      // Create history record
      await AssetLiquidityHistory.create({
        asset,
        previousValue,
        newValue,
        changeAmount,
        description: description || `Asset liquidity updated via admin panel`,
        updatedBy: adminId
      });

      return {
        success: true,
        data: updatedStorage,
        change: changeAmount
      };
    } catch (error: any) {
      console.error('❌ Update asset storage error:', error);
      throw new Error(error.message || 'Failed to update asset storage');
    }
  }

  // Get liquidity management history
  async getLiquidityHistory(asset?: string, limit: number = 50, offset: number = 0) {
    try {
      const { Admin } = await import('../schemas/admin.schema');
      const filter = asset ? { asset } : {};
      
      const history = await AssetLiquidityHistory
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .lean();

      // Populate admin names for updatedBy field
      const enrichedHistory = await Promise.all(
        history.map(async (record) => {
          let adminName = 'Unknown Admin';
          
          if (record.updatedBy === 'system-init') {
            adminName = 'System Initialization';
          } else {
            try {
              const admin = await Admin.findById(record.updatedBy).lean();
              if (admin) {
                adminName = admin.full_name || admin.email || 'Admin';
              }
            } catch (error) {
              console.warn(`Could not find admin for ID: ${record.updatedBy}`);
            }
          }
          
          return {
            ...record,
            updatedByName: adminName
          };
        })
      );

      return enrichedHistory;
    } catch (error) {
      console.error('❌ Get liquidity history error:', error);
      throw new Error('Failed to retrieve liquidity history');
    }
  }

  // Create mint transaction and automatically deduct from storage
  async createMintTransaction(data: any, adminId: string) {
    try {
      const {
        userId,
        asset,
        tokenAmount,
        goldValueToDeduct = '0.00',
        silverValueToDeduct = '0.00'
      } = data;

      // Validate sufficient liquidity before proceeding
      if (parseFloat(goldValueToDeduct) > 0) {
        const goldStorage = await AssetStorage.findOne({ asset: 'gold' });
        if (!goldStorage || parseFloat(goldStorage.storedValue) < parseFloat(goldValueToDeduct)) {
          throw new Error('Insufficient gold liquidity for minting');
        }
      }

      if (parseFloat(silverValueToDeduct) > 0) {
        const silverStorage = await AssetStorage.findOne({ asset: 'silver' });
        if (!silverStorage || parseFloat(silverStorage.storedValue) < parseFloat(silverValueToDeduct)) {
          throw new Error('Insufficient silver liquidity for minting');
        }
      }

      // Create mint transaction
      const mintTransaction = await MintTransaction.create({
        userId,
        asset,
        tokenAmount,
        goldValueUsed: goldValueToDeduct,
        silverValueUsed: silverValueToDeduct,
        status: 'pending',
        processedBy: adminId
      });

      // Automatically deduct from asset storage if values are provided
      if (parseFloat(goldValueToDeduct) > 0) {
        const goldStorage = await AssetStorage.findOne({ asset: 'gold' });
        if (goldStorage) {
          const newGoldValue = (parseFloat(goldStorage.storedValue) - parseFloat(goldValueToDeduct)).toString();
          await this.updateAssetStorage('gold', newGoldValue, adminId, `Deducted for mint transaction ${mintTransaction._id}`);
        }
      }

      if (parseFloat(silverValueToDeduct) > 0) {
        const silverStorage = await AssetStorage.findOne({ asset: 'silver' });
        if (silverStorage) {
          const newSilverValue = (parseFloat(silverStorage.storedValue) - parseFloat(silverValueToDeduct)).toString();
          await this.updateAssetStorage('silver', newSilverValue, adminId, `Deducted for mint transaction ${mintTransaction._id}`);
        }
      }

      return {
        success: true,
        data: mintTransaction,
        message: 'Mint transaction created and asset storage updated'
      };
    } catch (error: any) {
      console.error('❌ Create mint transaction error:', error);
      throw new Error(error.message || 'Failed to create mint transaction');
    }
  }

  // Get mint transactions with filters
  async getMintTransactions(asset?: string, status?: string, limit: number = 50, offset: number = 0) {
    try {
      const filter: any = {};
      if (asset) filter.asset = asset;
      if (status) filter.status = status;

      const transactions = await MintTransaction
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .lean();

      return transactions;
    } catch (error) {
      console.error('❌ Get mint transactions error:', error);
      throw new Error('Failed to retrieve mint transactions');
    }
  }

  // Update mint transaction status
  async updateMintStatus(transactionId: string, updateData: any, adminId: string) {
    try {
      const { status, transactionHash, notes } = updateData;

      const updatedTransaction = await MintTransaction.findByIdAndUpdate(
        transactionId,
        {
          status,
          transactionHash,
          notes,
          processedBy: adminId,
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!updatedTransaction) {
        throw new Error('Mint transaction not found');
      }

      return {
        success: true,
        data: updatedTransaction
      };
    } catch (error: any) {
      console.error('❌ Update mint status error:', error);
      throw new Error(error.message || 'Failed to update mint status');
    }
  }
}