import { Request, Response } from 'express';
import { WalletService } from '../services/wallet.service';

export class WalletController {
  private walletService: WalletService;

  constructor() {
    this.walletService = new WalletService();
  }

  getAllWallets = async (req: Request, res: Response): Promise<void> => {
    try {
      const wallets = await this.walletService.getAllWallets();
      res.json(wallets);
    } catch (error) {
      console.error('Get wallets error:', error);
      res.status(500).json({ message: "Failed to fetch wallets" });
    }
  };

  getWalletById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const wallet = await this.walletService.getWalletById(id);
      
      if (!wallet) {
        res.status(404).json({ message: "Wallet not found" });
        return;
      }
      
      res.json(wallet);
    } catch (error) {
      console.error('Get wallet error:', error);
      res.status(500).json({ message: "Failed to fetch wallet" });
    }
  };

  updateWallet = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const wallet = await this.walletService.updateWallet(id, updates);
      
      if (!wallet) {
        res.status(404).json({ message: "Wallet not found" });
        return;
      }
      
      res.json(wallet);
    } catch (error) {
      console.error('Update wallet error:', error);
      res.status(400).json({ message: "Failed to update wallet" });
    }
  };
}