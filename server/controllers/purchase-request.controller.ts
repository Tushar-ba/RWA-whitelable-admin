import { Request, Response } from "express";
import { PurchaseRequestService } from "../services/purchase-request.service";
import { AllocatedVaultService } from "../services/allocated-vault.service";
import { emailService } from "../services/email.service";

export class PurchaseRequestController {
  private purchaseRequestService: PurchaseRequestService;
  private allocatedVaultService: AllocatedVaultService;

  constructor() {
    this.purchaseRequestService = new PurchaseRequestService();
    this.allocatedVaultService = new AllocatedVaultService();
  }

  getAllPurchaseRequests = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const requests =
        await this.purchaseRequestService.getAllPurchaseRequests();

      // Return in the same format as redemption requests for consistency
      res.json({
        success: true,
        data: {
          data: requests,
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalItems: requests.length,
            itemsPerPage: requests.length,
          },
          summary: {
            totalRequests: requests.length,
            totalValue: requests.reduce(
              (sum, req) => sum + (parseFloat(req.usdAmount) || 0),
              0,
            ),
            averageValue:
              requests.length > 0
                ? requests.reduce(
                    (sum, req) => sum + (parseFloat(req.usdAmount) || 0),
                    0,
                  ) / requests.length
                : 0,
          },
        },
      });
    } catch (error) {
      console.error("❌ Get purchase requests error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch purchase requests",
      });
    }
  };

  getPurchaseRequestById = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const { id } = req.params;

      const request =
        await this.purchaseRequestService.getPurchaseRequestById(id);

      if (!request) {
        res.status(404).json({
          success: false,
          error: "Purchase request not found",
        });
        return;
      }

      // Fetch vault allocation details if vault is allocated
      let vaultAllocation = null;
      if (request.vaultAllocated) {
        try {
          vaultAllocation = await this.allocatedVaultService.getVaultByPurchaseRequestId(id);
        } catch (vaultError) {
          console.warn("⚠️ Could not fetch vault allocation details:", vaultError);
        }
      }

      // Include vault allocation in the response
      const responseData = {
        ...request,
        vaultAllocation: vaultAllocation || null
      };

      res.json({
        success: true,
        data: responseData,
        message: "Purchase request retrieved successfully",
      });
    } catch (error) {
      console.error("Get purchase request error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch purchase request",
      });
    }
  };

  // Update purchase request status
  updatePurchaseRequestStatus = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        res.status(400).json({
          success: false,
          error: "Status is required",
        });
        return;
      }

      const validStatuses = [
        "pending",
        "processing",
        "completed",
        "failed",
        "cancelled",
      ];
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          error: "Invalid status value",
        });
        return;
      }

      const updatedRequest =
        await this.purchaseRequestService.updatePurchaseRequestStatus(
          id,
          status,
        );

      if (!updatedRequest) {
        res.status(404).json({
          success: false,
          error: "Purchase request not found",
        });
        return;
      }

      res.json({
        success: true,
        data: updatedRequest,
        message: "Purchase request status updated successfully",
      });
    } catch (error) {
      console.error("Update purchase request status error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update purchase request status",
      });
    }
  };

  allocateVault = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { 
        ownedPortion, 
        barSerialNumber, 
        brandInfo, 
        grossWeight, 
        fineness, 
        fineWeight, 
        notes,
        vaultNumber, 
        vaultLocation 
      } = req.body;

      // Find the request
      let request =
        await this.purchaseRequestService.getPurchaseRequestById(id);
      if (!request) {
        request =
          await this.purchaseRequestService.getPurchaseRequestByRequestId(id);
      }

      if (!request) {
        res.status(404).json({ message: "Purchase request not found" });
        return;
      }

      if (request.status !== "pending" && request.status !== "approved") {
        res.status(400).json({ message: "Request must be pending or approved" });
        return;
      }

      if (request.vaultAllocated) {
        res.status(400).json({ message: "Vault already allocated" });
        return;
      }

      // Check if bar serial number already exists
      const existingVault = await this.allocatedVaultService.getVaultByBarSerial(barSerialNumber);
      if (existingVault) {
        res.status(400).json({ message: "Bar serial number already allocated to another vault" });
        return;
      }

      // Generate vault details if not provided
      const finalVaultNumber = vaultNumber || `VAULT-${Date.now()}`;
      const finalVaultLocation = vaultLocation || "Primary Vault";

      // Ensure userId exists
      if (!request.userId) {
        res.status(400).json({ message: "Purchase request missing user information" });
        return;
      }

      // Create vault allocation record in AllocatedVaults collection
      const allocatedVault = await this.allocatedVaultService.createAllocatedVault({
        purchaseRequestId: request.id,
        requestId: request.requestId || `REQ-${Date.now()}`,
        userId: request.userId._id ? request.userId._id.toString() : request.userId.toString(),
        vaultNumber: finalVaultNumber,
        vaultLocation: finalVaultLocation,
        ownedPortion,
        barSerialNumber,
        brandInfo,
        grossWeight,
        fineness,
        fineWeight,
        notes: notes || ''
      });

      // Update purchase request status and vault flags
      const updatedRequest =
        await this.purchaseRequestService.updatePurchaseHistoryWithVault(request.id, {
          vaultAllocated: true,
          status: "processing", // Update status to processing
          vaultNumber: finalVaultNumber,
          vaultLocation: finalVaultLocation,
          allocationNotes: `Vault allocated: ${finalVaultNumber}. See AllocatedVaults collection for detailed allocation data.`,
          updatedAt: new Date(),
        });

      res.json({
        success: true,
        data: {
          purchaseRequest: updatedRequest,
          allocatedVault: allocatedVault
        },
        message: "Vault allocated successfully"
      });
    } catch (error) {
      console.error("Allocate vault error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to allocate vault" 
      });
    }
  };

  mintTokens = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { transactionHash, tokensMinted, status } = req.body;

      // Find the request
      let request =
        await this.purchaseRequestService.getPurchaseRequestById(id);
      if (!request) {
        request =
          await this.purchaseRequestService.getPurchaseRequestByRequestId(id);
      }

      if (!request) {
        res.status(404).json({ message: "Purchase request not found" });
        return;
      }

      if (request.status !== "processing" && request.status !== "approved") {
        res.status(400).json({ message: "Request must be processing or approved" });
        return;
      }

      if (!request.vaultAllocated) {
        res.status(400).json({ message: "Vault must be allocated first" });
        return;
      }

      if (request.tokensMinted) {
        res.status(400).json({ message: "Tokens already minted" });
        return;
      }

      // Update the purchase request in PurchaseHistory collection
      const updatedRequest =
        await this.purchaseRequestService.updatePurchaseHistoryStatus(request.id, {
          tokensMinted: true,
          status: "completed", // Update status to completed when tokens are minted
          transactionHash: transactionHash || request.transactionHash,
          updatedAt: new Date(),
        });

      // Send mint success email to user with vault allocation details
      try {
        // Get vault allocation details
        const vaultAllocation = await this.allocatedVaultService.getVaultByPurchaseRequestId(request.id);
        
        if (vaultAllocation && request.userId) {
          // Prepare user details - handle both populated and string userId
          let userEmail: string;
          let userName: string;
          
          if (typeof request.userId === 'object' && request.userId.email) {
            userEmail = request.userId.email;
            userName = request.userId.first_name && request.userId.last_name 
              ? `${request.userId.first_name} ${request.userId.last_name}`
              : request.userName || userEmail;
          } else {
            // If userId is just a string, use fallback fields
            userEmail = request.userEmail || 'investor@example.com';
            userName = request.userName || userEmail;
          }

          // Prepare vault allocation details for email
          const vaultDetails = {
            vaultNumber: vaultAllocation.vaultNumber,
            vaultLocation: vaultAllocation.vaultLocation,
            ownedPortion: vaultAllocation.ownedPortion,
            barSerialNumber: vaultAllocation.barSerialNumber,
            brandInfo: vaultAllocation.brandInfo,
            grossWeight: vaultAllocation.grossWeight,
            fineness: vaultAllocation.fineness,
            fineWeight: vaultAllocation.fineWeight,
          };

          // Prepare token details for email
          const tokenDetails = {
            metal: request.metal || request.asset,
            tokenAmount: request.tokenAmount,
            usdAmount: request.usdAmount,
            transactionHash: transactionHash || request.transactionHash || 'N/A',
          };

          // Send email notification
          await emailService.sendMintSuccessEmail(
            userEmail,
            userName,
            vaultDetails,
            tokenDetails
          );

          console.log(`✅ Mint success email sent to ${userEmail}`);
        } else {
          console.warn('⚠️ Unable to send mint success email: Missing vault allocation or user details');
        }
      } catch (emailError) {
        console.error('❌ Failed to send mint success email:', emailError);
        // Don't fail the request if email sending fails
      }

      res.json({
        success: true,
        data: updatedRequest,
        message: "Tokens minted successfully"
      });
    } catch (error) {
      console.error("Mint tokens error:", error);
      res.status(400).json({ message: "Failed to mint tokens" });
    }
  };
}
