import {
  PurchaseHistory,
  IPurchaseHistory,
} from "../schemas/purchase-history.schema";
import {
  PurchaseRequest,
  IPurchaseRequest,
} from "../schemas/purchase-request.schema";
import { type InsertPurchaseRequest } from "@shared/schema";

export class PurchaseRequestService {
  // Get all purchase requests from purchasehistory table with pending status
  async getAllPurchaseRequests(): Promise<any[]> {
    try {
      const requests = await PurchaseHistory.find()
        .populate("userId", "email first_name last_name")
        .sort({ createdAt: -1 })
        .lean();

      return requests;
    } catch (error) {
      console.error("❌ Error fetching purchase requests:", error);
      throw new Error(`Error fetching purchase requests: ${error}`);
    }
  }

  // Keep original method for backward compatibility
  async getAllPurchaseRequestsOld(): Promise<IPurchaseRequest[]> {
    try {
      return await PurchaseRequest.find().sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Error fetching purchase requests: ${error}`);
    }
  }

  async getPurchaseRequestById(id: string): Promise<any | null> {
    try {
      // Try to find by MongoDB _id first
      let request = null;

      // Check if id looks like a MongoDB ObjectId
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        request = await PurchaseHistory.findById(id).lean();
      }

      if (!request) {
        // If not found, it might be a custom requestId - search in both collections
        request = await PurchaseHistory.findOne({
          $or: [{ requestId: id }, { _id: id }],
        }).lean();
      }

      if (!request) {
        return null;
      }

      // Transform data to match frontend expectations
      return {
        id: request._id.toString(),
        requestId: request._id.toString(),
        userId: request.userId,
        userName: "Unknown User", // You can populate this from user table if needed
        userEmail: "No Email", // You can populate this from user table if needed
        asset: request.metal?.toUpperCase(),
        metal: request.metal,
        tokenAmount: request.tokenAmount,
        usdAmount: request.usdAmount,
        feeAmount: request.feeAmount,
        date: request.date,
        time: request.time,
        status: request.status,
        networkType: request.networkType,
        paymentMethod: request.paymentMethod,
        transactionHash: request.transactionHash,
        walletAddress: request.walletAddress,
        errorMessage: request.errorMessage,
        vaultAllocated: request.vaultAllocated || false,
        tokensMinted: request.tokensMinted || false,
        vaultNumber: request.vaultNumber,
        vaultLocation: request.vaultLocation,
        allocationNotes: request.allocationNotes,
        notes: request.notes,
        rejectionReason: request.rejectionReason,
        kycStatus: request.kycStatus || "pending",
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
      };
    } catch (error) {
      throw new Error(`Error finding purchase request: ${error}`);
    }
  }

  async getPurchaseRequestByRequestId(
    requestId: string,
  ): Promise<IPurchaseRequest | null> {
    try {
      return await PurchaseRequest.findOne({ requestId });
    } catch (error) {
      throw new Error(`Error finding purchase request: ${error}`);
    }
  }

  async createPurchaseRequest(
    requestData: InsertPurchaseRequest,
  ): Promise<IPurchaseRequest> {
    try {
      const request = new PurchaseRequest(requestData);
      return await request.save();
    } catch (error) {
      throw new Error(`Error creating purchase request: ${error}`);
    }
  }

  async updatePurchaseRequest(
    id: string,
    updateData: Partial<IPurchaseRequest>,
  ): Promise<IPurchaseRequest | null> {
    try {
      return await PurchaseRequest.findByIdAndUpdate(
        id,
        { ...updateData, updatedAt: new Date() },
        { new: true },
      );
    } catch (error) {
      throw new Error(`Error updating purchase request: ${error}`);
    }
  }

  async getPendingRequestsCount(): Promise<number> {
    try {
      return await PurchaseHistory.countDocuments({ status: "pending" });
    } catch (error) {
      throw new Error(`Error counting pending requests: ${error}`);
    }
  }

  // Update purchase request status
  async updatePurchaseRequestStatus(
    id: string,
    status: string,
  ): Promise<any | null> {
    try {
      const updatedRequest = await PurchaseHistory.findByIdAndUpdate(
        id,
        { status, updatedAt: new Date() },
        { new: true, lean: true },
      );

      if (!updatedRequest) {
        return null;
      }

      // Transform data to match frontend expectations
      return {
        id: updatedRequest._id.toString(),
        requestId: updatedRequest._id.toString(),
        userId: updatedRequest.userId,
        userName: "Unknown User",
        userEmail: "No Email",
        asset: updatedRequest.metal?.toUpperCase(),
        metal: updatedRequest.metal,
        tokenAmount: updatedRequest.tokenAmount,
        usdAmount: updatedRequest.usdAmount,
        feeAmount: updatedRequest.feeAmount,
        date: updatedRequest.date,
        time: updatedRequest.time,
        status: updatedRequest.status,
        networkType: updatedRequest.networkType,
        paymentMethod: updatedRequest.paymentMethod,
        transactionHash: updatedRequest.transactionHash,
        walletAddress: updatedRequest.walletAddress,
        errorMessage: updatedRequest.errorMessage,
        createdAt: updatedRequest.createdAt,
        updatedAt: updatedRequest.updatedAt,
      };
    } catch (error) {
      throw new Error(`Error updating purchase request: ${error}`);
    }
  }

  async getApprovedRequestsCount(): Promise<number> {
    try {
      return await PurchaseRequest.countDocuments({ status: "approved" });
    } catch (error) {
      throw new Error(`Error counting approved requests: ${error}`);
    }
  }

  async getTotalTransactionVolume(): Promise<number> {
    try {
      const requests = await PurchaseRequest.find({ status: "approved" });
      return requests.reduce(
        (sum, request) => sum + parseFloat(request.usdcAmount),
        0,
      );
    } catch (error) {
      throw new Error(`Error calculating transaction volume: ${error}`);
    }
  }

  // Update purchase history record with vault allocation data
  async updatePurchaseHistoryWithVault(
    id: string,
    updateData: any,
  ): Promise<any | null> {
    try {
      const updatedRequest = await PurchaseHistory.findByIdAndUpdate(
        id,
        { ...updateData, updatedAt: new Date() },
        { new: true, lean: true },
      );

      if (!updatedRequest) {
        return null;
      }

      // Transform data to match frontend expectations
      return {
        id: updatedRequest._id.toString(),
        requestId: updatedRequest._id.toString(),
        userId: updatedRequest.userId,
        userName: "Unknown User",
        userEmail: "No Email",
        asset: updatedRequest.metal?.toUpperCase(),
        metal: updatedRequest.metal,
        tokenAmount: updatedRequest.tokenAmount,
        usdAmount: updatedRequest.usdAmount,
        feeAmount: updatedRequest.feeAmount,
        date: updatedRequest.date,
        time: updatedRequest.time,
        status: updatedRequest.status,
        networkType: updatedRequest.networkType,
        paymentMethod: updatedRequest.paymentMethod,
        transactionHash: updatedRequest.transactionHash,
        walletAddress: updatedRequest.walletAddress,
        errorMessage: updatedRequest.errorMessage,
        vaultAllocated: updatedRequest.vaultAllocated,
        vaultNumber: updatedRequest.vaultNumber,
        vaultLocation: updatedRequest.vaultLocation,
        allocationNotes: updatedRequest.allocationNotes,
        createdAt: updatedRequest.createdAt,
        updatedAt: updatedRequest.updatedAt,
      };
    } catch (error) {
      throw new Error(`Error updating purchase history with vault: ${error}`);
    }
  }

  // Update purchase history record status
  async updatePurchaseHistoryStatus(
    id: string,
    updateData: any,
  ): Promise<any | null> {
    try {
      const updatedRequest = await PurchaseHistory.findByIdAndUpdate(
        id,
        { ...updateData, updatedAt: new Date() },
        { new: true, lean: true },
      );

      if (!updatedRequest) {
        return null;
      }

      // Transform data to match frontend expectations
      return {
        id: updatedRequest._id.toString(),
        requestId: updatedRequest._id.toString(),
        userId: updatedRequest.userId,
        userName: "Unknown User",
        userEmail: "No Email",
        asset: updatedRequest.metal?.toUpperCase(),
        metal: updatedRequest.metal,
        tokenAmount: updatedRequest.tokenAmount,
        usdAmount: updatedRequest.usdAmount,
        feeAmount: updatedRequest.feeAmount,
        date: updatedRequest.date,
        time: updatedRequest.time,
        status: updatedRequest.status,
        networkType: updatedRequest.networkType,
        paymentMethod: updatedRequest.paymentMethod,
        transactionHash: updatedRequest.transactionHash,
        walletAddress: updatedRequest.walletAddress,
        errorMessage: updatedRequest.errorMessage,
        vaultAllocated: updatedRequest.vaultAllocated,
        tokensMinted: updatedRequest.tokensMinted,
        vaultNumber: updatedRequest.vaultNumber,
        vaultLocation: updatedRequest.vaultLocation,
        allocationNotes: updatedRequest.allocationNotes,
        notes: updatedRequest.notes,
        rejectionReason: updatedRequest.rejectionReason,
        kycStatus: updatedRequest.kycStatus,
        createdAt: updatedRequest.createdAt,
        updatedAt: updatedRequest.updatedAt,
      };
    } catch (error) {
      throw new Error(`Error updating purchase history status: ${error}`);
    }
  }
}
