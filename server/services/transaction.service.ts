import {
  PurchaseHistory,
  IPurchaseHistory,
} from "../schemas/purchase-history.schema";
import {
  GiftingTransaction,
  IGiftingTransaction,
} from "../schemas/gifting-transaction.schema";
import { Redemption, IRedemption } from "../schemas/redemption.schema";
import { AppUser } from "../schemas/user.schema";
import { Wallet } from "../schemas/wallet.schema";
import mongoose from "mongoose";

export interface TransactionFilters {
  search?: string;
  status?: string;
  metal?: string;
  network?: string;
  paymentMethod?: string;
  token?: string;
  transferType?: string;
  startDate?: string;
  endDate?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface TransactionResponse<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
  summary?: {
    totalValue: number;
    completedTransactions: number;
    pendingTransactions: number;
    failedTransactions: number;
  };
}

export class TransactionService {
  private redemptionModel = Redemption;

  // Buy Transaction Methods
  async getBuyTransactions(
    filters: any = {},
    pagination: PaginationOptions,
  ): Promise<TransactionResponse<any>> {
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = pagination;

    // Use filters object directly for MongoDB query
    let query: any = { ...filters };

    // Handle special cases for filters
    if (query.status === "all") {
      delete query.status;
    }
    if (query.metal === "all") {
      delete query.metal;
    }
    if (query.network === "all") {
      delete query.network;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Execute query with populate
    const [transactions, totalItems] = await Promise.all([
      PurchaseHistory.find(query)
        .populate("userId", "email first_name last_name")
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      PurchaseHistory.countDocuments(query),
    ]);

    // Map populated user data
    let enrichedTransactions = transactions.map((transaction) => {
      const user = transaction.userId as any;
      return {
        ...transaction,
        userName:
          user?.first_name && user?.last_name
            ? `${user.first_name} ${user.last_name}`
            : "Unknown User",
        userEmail: user?.email || "Unknown Email",
      };
    });

    // Search filtering is now handled in MongoDB query via $or

    // Format response data
    const formattedTransactions = enrichedTransactions.map(
      (transaction: any) => ({
        id: transaction._id,
        userName: transaction.userName,
        userEmail: transaction.userEmail,
        assetType: transaction.metal,
        tokenAmount: parseFloat(transaction.tokenAmount),
        usdAmount: parseFloat(transaction.usdAmount),
        fee: parseFloat(transaction.feeAmount),
        status: transaction.status,
        network: transaction.networkType,
        paymentMethod: transaction.paymentMethod,
        transactionHash: transaction.transactionHash,
        walletAddress: transaction.walletAddress,
        transactionDate: transaction.createdAt,
        date: transaction.date,
        time: transaction.time,
      }),
    );

    // Calculate summary
    const summary = {
      totalValue: enrichedTransactions.reduce(
        (sum, t) => sum + parseFloat(t.usdAmount || "0"),
        0,
      ),
      completedTransactions: enrichedTransactions.filter(
        (t) => t.status === "completed",
      ).length,
      pendingTransactions: enrichedTransactions.filter(
        (t) => t.status === "pending",
      ).length,
      failedTransactions: enrichedTransactions.filter(
        (t) => t.status === "failed",
      ).length,
    };

    return {
      data: formattedTransactions,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        itemsPerPage: limit,
      },
      summary,
    };
  }

  // Get Redemption Requests (All statuses supported) - Fixed to use correct model with user population
  async getRedemptionRequests(
    filters: TransactionFilters,
    pagination: PaginationOptions,
  ) {
    try {
      console.log(
        "🔍 TransactionService.getRedemptionRequests called with filters:",
        filters,
      );

      // Build query for redemption requests (using the original Redemption model)
      const query: any = {};

      // Add status filter
      if (filters.status) {
        query.status = filters.status;
      }

      // Add search filters
      if (filters.search) {
        const searchRegex = new RegExp(filters.search, "i");
        query.$or = [
          { userName: searchRegex },
          { userEmail: searchRegex },
          { requestId: searchRegex },
        ];
      }

      if (filters.token) {
        query.$or = [
          { assetType: filters.token.toUpperCase() },
          { token: filters.token.toLowerCase() },
        ];
      }

      if (filters.network) {
        query.network = filters.network;
      }

      // Date range filters
      if (filters.startDate || filters.endDate) {
        query.transactionDate = {};
        if (filters.startDate) {
          query.transactionDate.$gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          query.transactionDate.$lte = new Date(filters.endDate);
        }
      }

      // Calculate pagination
      const skip = (pagination.page - 1) * pagination.limit;
      const sortOptions: any = {};
      sortOptions[pagination.sortBy || "createdAt"] =
        pagination.sortOrder === "asc" ? 1 : -1;

      // Execute query
      const [data, totalItems] = await Promise.all([
        this.redemptionModel
          .find(query)
          .populate("userId", "first_name last_name email")
          .sort(sortOptions)
          .skip(skip)
          .limit(pagination.limit)
          .lean(),
        this.redemptionModel.countDocuments(query),
      ]);

      console.log(
        `📊 Found ${data.length} redemption requests from Redemption collection`,
      );

      const totalPages = Math.ceil(totalItems / pagination.limit);

      // Enhanced transform data with proper user population
      const transformedData = await Promise.all(
        data.map(async (redemption: any) => {
          let userName = redemption.userName || "Unknown User";
          let userEmail = redemption.userEmail || "No Email";

          // If we have userEmail but missing userName, try to find user data
          if (
            redemption.userEmail &&
            (!redemption.userName || redemption.userName === "Unknown User")
          ) {
            const user = await AppUser.findOne({
              email: redemption.userEmail,
            }).lean();
            if (user) {
              userName =
                `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
                "Unknown User";
              console.log(
                `📧 Enhanced user data for ${redemption.userEmail}: ${userName}`,
              );
            }
          }

          return {
            id: redemption.id || redemption._id.toString(),
            requestId: redemption.requestId || redemption._id.toString(),
            userId: redemption.userId,
            userName,
            userEmail,
            token:
              redemption.assetType?.toLowerCase() ||
              redemption.token ||
              "unknown",
            quantity: redemption.tokenAmount || redemption.quantity || 0,
            gramsAmount: redemption.gramsAmount || 0,
            tokenValueUSD:
              redemption.tokenValueUSD || redemption.totalValue || 0,
            network: redemption.network || "Ethereum",
            deliveryAddress: redemption.deliveryAddress || "",
            streetAddress: redemption.streetAddress || "",
            city: redemption.city || "",
            state: redemption.state || "",
            zipCode: redemption.zipCode || "",
            country: redemption.country || "",
            status: redemption.status,
            transactionHash: redemption.transactionHash || "",
            deliveryFee: redemption.deliveryFee || 0,
            totalCostUSD: redemption.totalCostUSD || redemption.totalValue || 0,
            currentTokenPrice:
              redemption.currentTokenPrice || redemption.tokenPrice || 0,
            trackingNumber: redemption.trackingNumber || "",
            transactionDate: redemption.transactionDate || redemption.createdAt,
            createdAt: redemption.createdAt || new Date(),
            updatedAt: redemption.updatedAt || new Date(),
            notes: redemption.notes || "",
            redemptionMethod:
              redemption.redemptionMethod || "physical_delivery",
          };
        }),
      );

      console.log(
        `✅ Returning ${transformedData.length} enhanced redemption requests`,
      );

      // Calculate summary statistics
      const summary = {
        totalRequests: transformedData.length,
        totalValue: transformedData.reduce(
          (sum: number, req: any) =>
            sum + (parseFloat(req.tokenValueUSD?.toString() || "0") || 0),
          0,
        ),
        averageValue:
          transformedData.length > 0
            ? transformedData.reduce(
                (sum: number, req: any) =>
                  sum + (parseFloat(req.tokenValueUSD?.toString() || "0") || 0),
                0,
              ) / transformedData.length
            : 0,
      };

      return {
        data: transformedData,
        pagination: {
          currentPage: pagination.page,
          totalPages,
          totalItems,
          itemsPerPage: pagination.limit,
        },
        summary,
      };
    } catch (error) {
      console.error("Error in getRedemptionRequests:", error);
      throw error;
    }
  }

  // Get single redemption request by ID - Fixed to use correct model with user population
  async getRedemptionRequestById(id: string) {
    try {
      console.log(
        `🔍 TransactionService.getRedemptionRequestById called with id: ${id}`,
      );

      // First try to find by requestId (most common case)
      let redemption = await this.redemptionModel
        .findOne({ requestId: id })
        .populate("userId", "first_name last_name email")
        .lean();

      // If not found and id looks like a MongoDB ObjectId, try that
      if (!redemption && id.match(/^[0-9a-fA-F]{24}$/)) {
        redemption = await this.redemptionModel
          .findById(id)
          .populate("userId", "first_name last_name email")
          .lean();
      }

      // If still not found, try by custom id field
      if (!redemption) {
        redemption = await this.redemptionModel.findOne({ id: id }).lean();
      }

      if (!redemption) {
        console.log(`❌ No redemption found for id: ${id}`);
        return null;
      }

      console.log(
        `✅ Found redemption: ${redemption.requestId || redemption.id}`,
      );

      // Enhanced user data population
      let userName = "Unknown User";
      let userEmail = "No Email";

      // Get user details if userId exists
      // if (redemption.userId) {
      //   const user = await AppUser.findOne({
      //     _id: redemption.userId.toString(),
      //   }).lean();
      //   if (user) {
      //     userName =
      //       `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
      //       "Unknown User";
      //     userEmail = user.email || "No Email";
      //     console.log(
      //       `👤 Enhanced user data for ${redemption.userId}: ${userName} (${userEmail})`,
      //     );
      //   }
      // }

      return {
        id: redemption.id || redemption._id.toString(),
        requestId: redemption.requestId || redemption.id,
        userId: redemption.userId,
        userName,
        userEmail,
        walletAddress: redemption.walletAddress,
        token: redemption.assetType?.toLowerCase() || redemption.token,
        quantity: redemption.tokenAmount || redemption.quantity,
        gramsAmount: redemption.gramsAmount || 0,
        tokenValueUSD: redemption.tokenValueUSD || 0,
        network: redemption.network || "Ethereum",
        deliveryAddress: redemption.deliveryAddress || "",
        streetAddress: redemption.streetAddress || "",
        city: redemption.city || "",
        state: redemption.state || "",
        zipCode: redemption.zipCode || "",
        country: redemption.country || "",
        status: redemption.status,
        transactionHash: redemption.transactionHash || "",
        deliveryFee: redemption.deliveryFee || 0,
        totalCostUSD: redemption.totalCostUSD || 0,
        currentTokenPrice: redemption.currentTokenPrice || 0,
        trackingNumber: redemption.requestId || "", // Using requestId as tracking
        transactionDate: redemption.createdAt,
        createdAt: redemption.createdAt || new Date(),
        updatedAt: redemption.updatedAt || new Date(),
        notes: "", // Notes not available in current schema
        redemptionMethod: "physical_delivery", // Default method
      };
    } catch (error) {
      console.error("Error in getRedemptionRequestById:", error);
      throw error;
    }
  }

  // Update redemption request - Fixed to use correct model
  async updateRedemptionRequest(id: string, updateData: any) {
    try {
      console.log(
        `🔄 TransactionService.updateRedemptionRequest called with id: ${id}`,
      );

      // Check if id is a valid MongoDB ObjectId first
      let query;

      if (mongoose.Types.ObjectId.isValid(id)) {
        query = {
          $or: [{ id: id }, { _id: id }, { requestId: id }],
        };
      } else {
        // If not a valid ObjectId, only search by id and requestId fields
        query = {
          $or: [{ id: id }, { requestId: id }],
        };
      }

      const updatedRedemption = await this.redemptionModel.findOneAndUpdate(
        query,
        {
          ...updateData,
          updatedAt: new Date(),
        },
        { new: true, lean: true },
      );

      if (!updatedRedemption) {
        console.log(`❌ No redemption found for update with id: ${id}`);
        return null;
      }

      console.log(
        `✅ Updated redemption: ${updatedRedemption.requestId || updatedRedemption.id}`,
      );

      // Enhanced user data population
      let userName = "Unknown User";
      let userEmail = "No Email";

      // Get user details if userId exists
      if (updatedRedemption.userId) {
        const user = await AppUser.findOne({
          _id: updatedRedemption.userId.toString(),
        }).lean();
        if (user) {
          userName =
            `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
            "Unknown User";
          userEmail = user.email || "No Email";
          console.log(
            `👤 Enhanced user data for ${updatedRedemption.userId}: ${userName} (${userEmail})`,
          );
        }
      }

      return {
        id: updatedRedemption.id || updatedRedemption._id.toString(),
        requestId: updatedRedemption.requestId || updatedRedemption.id,
        userId: updatedRedemption.userId,
        userName,
        userEmail,
        token: updatedRedemption.token,
        quantity: updatedRedemption.quantity,
        gramsAmount: updatedRedemption.gramsAmount || 0,
        tokenValueUSD: updatedRedemption.tokenValueUSD || 0,
        network: updatedRedemption.network || "Ethereum",
        deliveryAddress: updatedRedemption.deliveryAddress || "",
        streetAddress: updatedRedemption.streetAddress || "",
        city: updatedRedemption.city || "",
        state: updatedRedemption.state || "",
        zipCode: updatedRedemption.zipCode || "",
        country: updatedRedemption.country || "",
        status: updatedRedemption.status,
        transactionHash: updatedRedemption.transactionHash || "",
        deliveryFee: updatedRedemption.deliveryFee || 0,
        totalCostUSD: updatedRedemption.totalCostUSD || 0,
        currentTokenPrice: updatedRedemption.currentTokenPrice || 0,
        trackingNumber: updatedRedemption.requestId || "", // Using requestId as tracking
        transactionDate: updatedRedemption.createdAt,
        createdAt: updatedRedemption.createdAt || new Date(),
        updatedAt: updatedRedemption.updatedAt || new Date(),
        notes: "", // Notes not available in current schema
        redemptionMethod: "physical_delivery", // Default method
      };
    } catch (error) {
      console.error("Error in updateRedemptionRequest:", error);
      throw error;
    }
  }

  // Gifting Transaction Methods
  async getGiftingTransactions(
    filters: TransactionFilters = {},
    pagination: PaginationOptions,
  ): Promise<TransactionResponse<any>> {
    const { search, status, token, network, startDate, endDate } = filters;

    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = pagination;

    // Build query
    const query: any = {};

    // Apply filters
    if (status && status !== "all") {
      query.status = status;
    }
    if (token && token !== "all") {
      query.token = token;
    }
    if (network && network !== "all") {
      query.network = network;
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Execute query with populate
    const [transactions, totalItems] = await Promise.all([
      GiftingTransaction.find(query)
        .populate("userId", "email first_name last_name")
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      GiftingTransaction.countDocuments(query),
    ]);

    // Map populated user data and enhance with recipient details
    const enrichedTransactions = await Promise.all(
      transactions.map(async (transaction) => {
        const user = transaction.userId as any;

        // Get sender details
        const senderName =
          user?.first_name && user?.last_name
            ? `${user.first_name} ${user.last_name}`
            : "Unknown User";
        const senderEmail = user?.email || "Unknown Email";

        // Get recipient details by looking up wallet address
        let recipientId = transaction.recipientWallet;
        let recipientName = "Unknown User";
        let recipientEmail = "Unknown Email";
        let recipientWalletAddress = transaction.recipientWallet;

        try {
          // Find wallet by address
          const recipientWallet = await Wallet.findOne({
            walletAddress: transaction.recipientWallet,
          }).lean();

          if (recipientWallet) {
            // Find user by email from wallet
            const recipientUser = await AppUser.findOne({
              email: recipientWallet.userEmail,
            }).lean();

            if (recipientUser) {
              recipientId = recipientUser._id.toString();
              recipientName =
                recipientUser.first_name && recipientUser.last_name
                  ? `${recipientUser.first_name} ${recipientUser.last_name}`
                  : "Unknown User";
              recipientEmail = recipientUser.email || "Unknown Email";
            }
          }
        } catch (error) {
          console.error("Error looking up recipient details:", error);
          // Keep default values if lookup fails
        }

        return {
          ...transaction,
          senderName,
          senderEmail,
          recipientId,
          recipientName,
          recipientEmail,
          recipientWalletAddress,
        };
      }),
    );

    // Apply search filter
    let filteredTransactions = enrichedTransactions;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredTransactions = enrichedTransactions.filter(
        (transaction) =>
          transaction.senderName.toLowerCase().includes(searchLower) ||
          transaction.senderEmail.toLowerCase().includes(searchLower) ||
          transaction.recipientName.toLowerCase().includes(searchLower) ||
          transaction.recipientEmail.toLowerCase().includes(searchLower) ||
          transaction.recipientWallet.toLowerCase().includes(searchLower) ||
          transaction._id.toString().toLowerCase().includes(searchLower) ||
          (transaction.transactionHash &&
            transaction.transactionHash.toLowerCase().includes(searchLower)),
      );
    }

    // Format response data
    const formattedTransactions = filteredTransactions.map((transaction) => ({
      id: transaction._id,
      senderId: transaction.userId,
      senderName: transaction.senderName,
      senderEmail: transaction.senderEmail,
      recipientId: transaction.recipientId,
      recipientName: transaction.recipientName,
      recipientEmail: transaction.recipientEmail,
      recipientWalletAddress: transaction.recipientWalletAddress,
      assetType: transaction.token,
      amount: parseFloat(transaction.quantity),
      totalValue: parseFloat(transaction.totalCostUSD),
      status: transaction.status,
      transactionDate: transaction.createdAt,
      message: transaction.message,
      network: transaction.network,
      transactionHash: transaction.transactionHash,
      networkFee: parseFloat(transaction.networkFee),
      gramsAmount: parseFloat(transaction.gramsAmount),
      tokenPrice: parseFloat(transaction.currentTokenPrice),
    }));

    // Calculate summary from all enriched transactions (not filtered by search)
    const summary = {
      totalValue: enrichedTransactions.reduce(
        (sum, t) => sum + parseFloat(t.totalCostUSD || "0"),
        0,
      ),
      completedTransactions: enrichedTransactions.filter(
        (t) => t.status === "completed" || t.status === "success"
      ).length,

      pendingTransactions: enrichedTransactions.filter(
        (t) => t.status === "pending",
      ).length,
      failedTransactions: enrichedTransactions.filter(
        (t) => t.status === "failed",
      ).length,
    };

    return {
      data: formattedTransactions,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        itemsPerPage: limit,
      },
      summary,
    };
  }

  // Redemption Transaction Methods
  async getRedemptionTransactions(
    filters: TransactionFilters = {},
    pagination: PaginationOptions,
  ): Promise<TransactionResponse<any>> {
    const { search, status, token, network, startDate, endDate } = filters;

    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = pagination;

    // Build query
    const query: any = {};

    // Apply filters
    if (status && status !== "all") {
      query.status = status;
    }
    if (token && token !== "all") {
      query.token = token;
    }
    if (network && network !== "all") {
      query.network = network;
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Execute query with populate
    const [transactions, totalItems] = await Promise.all([
      Redemption.find(query)
        .populate("userId", "email first_name last_name")
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      Redemption.countDocuments(query),
    ]);

    // Map populated user data
    let enrichedTransactions = transactions.map((transaction) => {
      const user = transaction.userId as any;
      return {
        ...transaction,
        userName:
          user?.first_name && user?.last_name
            ? `${user.first_name} ${user.last_name}`
            : "Unknown User",
        userEmail: user?.email || "Unknown Email",
      };
    });

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      enrichedTransactions = enrichedTransactions.filter(
        (transaction) =>
          transaction.userName.toLowerCase().includes(searchLower) ||
          transaction.userEmail.toLowerCase().includes(searchLower) ||
          transaction.id.toLowerCase().includes(searchLower) ||
          (transaction.requestId &&
            transaction.requestId.toLowerCase().includes(searchLower)) ||
          (transaction.transactionHash &&
            transaction.transactionHash.toLowerCase().includes(searchLower)),
      );
    }

    // Format response data
    const formattedTransactions = enrichedTransactions.map((transaction) => ({
      id: transaction.id,
      userId: transaction.userId,
      userName: transaction.userName,
      userEmail: transaction.userEmail,
      assetType: transaction.token,
      tokenAmount: parseFloat(transaction.quantity),
      gramsAmount: parseFloat(transaction.gramsAmount),
      totalValue: parseFloat(transaction.totalCostUSD),
      status: transaction.status,
      network: transaction.network,
      transactionDate: transaction.createdAt,
      deliveryAddress: `${transaction.streetAddress}, ${transaction.city}, ${transaction.state} ${transaction.zipCode}, ${transaction.country}`,
      transactionHash: transaction.transactionHash,
      requestId: transaction.requestId,
      deliveryFee: parseFloat(transaction.deliveryFee),
      tokenPrice: parseFloat(transaction.currentTokenPrice),
      approvedAt: transaction.approvedAt,
      completedAt: transaction.completedAt,
      trackingNumber: transaction.requestId, // Using requestId as tracking for now
    }));

    // Calculate summary
    const summary = {
      totalValue: enrichedTransactions.reduce(
        (sum, t) => sum + parseFloat(t.totalCostUSD || "0"),
        0,
      ),
      completedTransactions: enrichedTransactions.filter((t) =>
        ["delivered", "completed"].includes(t.status),
      ).length,
      pendingTransactions: enrichedTransactions.filter((t) =>
        ["pending", "processing", "approved", "shipped"].includes(t.status),
      ).length,
      failedTransactions: enrichedTransactions.filter((t) =>
        ["failed", "cancelled"].includes(t.status),
      ).length,
    };

    return {
      data: formattedTransactions,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        itemsPerPage: limit,
      },
      summary,
    };
  }
}
