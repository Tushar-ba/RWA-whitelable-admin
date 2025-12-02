import { Request, Response } from "express";
import { AllocatedVaultService } from "../services/allocated-vault.service";

export class AllocatedVaultController {
  private allocatedVaultService: AllocatedVaultService;

  constructor() {
    this.allocatedVaultService = new AllocatedVaultService();
  }

  getAllAllocatedVaults = async (req: Request, res: Response): Promise<void> => {
    try {
      const vaults = await this.allocatedVaultService.getAllAllocatedVaults();
      
      res.json({
        success: true,
        data: vaults,
        message: "Allocated vaults retrieved successfully"
      });
    } catch (error) {
      console.error("❌ Get allocated vaults error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch allocated vaults"
      });
    }
  };

  getVaultByPurchaseRequestId = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const vault = await this.allocatedVaultService.getVaultByPurchaseRequestId(id);

      if (!vault) {
        res.status(404).json({
          success: false,
          error: "Vault allocation not found for this purchase request"
        });
        return;
      }

      res.json({
        success: true,
        data: vault,
        message: "Vault allocation retrieved successfully"
      });
    } catch (error) {
      console.error("❌ Get vault by purchase request error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch vault allocation"
      });
    }
  };

  getVaultsByUserId = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const vaults = await this.allocatedVaultService.getVaultsByUserId(userId);

      res.json({
        success: true,
        data: vaults,
        message: "User vault allocations retrieved successfully"
      });
    } catch (error) {
      console.error("❌ Get vaults by user error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch user vault allocations"
      });
    }
  };

  getVaultStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await this.allocatedVaultService.getVaultStatistics();

      res.json({
        success: true,
        data: stats,
        message: "Vault statistics retrieved successfully"
      });
    } catch (error) {
      console.error("❌ Get vault statistics error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch vault statistics"
      });
    }
  };

  updateVaultStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['allocated', 'released'].includes(status)) {
        res.status(400).json({
          success: false,
          error: "Invalid status. Must be 'allocated' or 'released'"
        });
        return;
      }

      const updatedVault = await this.allocatedVaultService.updateVaultStatus(id, status);

      if (!updatedVault) {
        res.status(404).json({
          success: false,
          error: "Vault allocation not found"
        });
        return;
      }

      res.json({
        success: true,
        data: updatedVault,
        message: "Vault status updated successfully"
      });
    } catch (error) {
      console.error("❌ Update vault status error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update vault status"
      });
    }
  };
}