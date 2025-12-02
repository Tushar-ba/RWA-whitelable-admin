import { Stock, IStock, StockHistory, IStockHistory } from '../schemas/stock.schema';
import { type InsertStockHistory } from '@shared/schema';

export class StockService {
  async getAllStock(): Promise<IStock[]> {
    try {
      return await Stock.find().sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Error fetching stock: ${error}`);
    }
  }

  async getStockByAsset(asset: string): Promise<IStock | null> {
    try {
      return await Stock.findOne({ asset: asset.toLowerCase() });
    } catch (error) {
      throw new Error(`Error finding stock: ${error}`);
    }
  }

  async updateStock(asset: string, updateData: Partial<IStock>): Promise<IStock | null> {
    try {
      return await Stock.findOneAndUpdate(
        { asset: asset.toLowerCase() },
        { ...updateData, lastUpdated: new Date() },
        { new: true }
      );
    } catch (error) {
      throw new Error(`Error updating stock: ${error}`);
    }
  }

  async createStockHistory(historyData: InsertStockHistory): Promise<IStockHistory> {
    try {
      const history = new StockHistory(historyData);
      return await history.save();
    } catch (error) {
      throw new Error(`Error creating stock history: ${error}`);
    }
  }

  async getStockHistory(): Promise<IStockHistory[]> {
    try {
      return await StockHistory.find().sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Error fetching stock history: ${error}`);
    }
  }

  async initializeDefaultStock(adminId: string): Promise<void> {
    try {
      // Check if stock already exists
      const existingStock = await Stock.find();
      if (existingStock.length > 0) return;

      // Create default stock
      const defaultStock = [
        {
          asset: 'gold',
          totalQuantity: '15240.5',
          reservedQuantity: '2150.0',
          availableQuantity: '13090.5',
          updatedBy: adminId
        },
        {
          asset: 'silver',
          totalQuantity: '48750.2',
          reservedQuantity: '5200.0',
          availableQuantity: '43550.2',
          updatedBy: adminId
        }
      ];

      await Stock.insertMany(defaultStock);
    } catch (error) {
      throw new Error(`Error initializing default stock: ${error}`);
    }
  }
}