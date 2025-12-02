import { Request, Response } from 'express';
import { StockService } from '../services/stock.service';

export class StockController {
  private stockService: StockService;

  constructor() {
    this.stockService = new StockService();
  }

  getAllStock = async (req: Request, res: Response): Promise<void> => {
    try {
      const stock = await this.stockService.getAllStock();
      res.json(stock);
    } catch (error) {
      console.error('Get stock error:', error);
      res.status(500).json({ message: "Failed to fetch stock" });
    }
  };

  getStockHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const history = await this.stockService.getStockHistory();
      res.json(history);
    } catch (error) {
      console.error('Get stock history error:', error);
      res.status(500).json({ message: "Failed to fetch stock history" });
    }
  };

  updateStock = async (req: Request, res: Response): Promise<void> => {
    try {
      const { metal, operationType, quantity, notes, updatedBy } = req.body;
      
      const currentStock = await this.stockService.getStockByAsset(metal);
      if (!currentStock) {
        res.status(404).json({ message: "Stock not found for metal" });
        return;
      }

      const quantityNum = parseFloat(quantity);
      const currentTotal = parseFloat(currentStock.totalQuantity);
      const currentReserved = parseFloat(currentStock.reservedQuantity);

      let newTotal = currentTotal;
      if (operationType === "add") {
        newTotal = currentTotal + quantityNum;
      } else if (operationType === "remove") {
        newTotal = currentTotal - quantityNum;
        if (newTotal < 0) {
          res.status(400).json({ message: "Insufficient stock" });
          return;
        }
      }

      const newAvailable = newTotal - currentReserved;

      // Update stock
      const updatedStock = await this.stockService.updateStock(metal, {
        totalQuantity: newTotal.toString(),
        availableQuantity: newAvailable.toString(),
        updatedBy: updatedBy || "admin",
      });

      // Create history record
      await this.stockService.createStockHistory({
        asset: metal,
        operationType,
        quantity: quantity.toString(),
        notes,
        updatedBy,
      });

      res.json(updatedStock);
    } catch (error) {
      console.error('Update stock error:', error);
      res.status(400).json({ message: "Failed to update stock" });
    }
  };
}