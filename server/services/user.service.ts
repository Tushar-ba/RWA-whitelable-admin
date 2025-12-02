import { AppUser, IAppUser } from "../schemas/user.schema";
import { Wallet } from "../schemas/wallet.schema";
import { type InsertAppUser } from "@shared/schema";
import { TransactionService, UserTransaction } from "./transaction.service";
import { WalletService } from "./wallet.service";

export interface UserQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  kycStatus?: string;
  account_status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedUsersResponse {
  users: IAppUser[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalUsers: number;
    limit: number;
  };
}

export interface UserWithTransactions {
  _id: string;
  user_id: string;
  email: string;
  password_hash: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  organization_name?: string;
  country: string;
  state: string;
  account_status: string;
  email_verified: boolean;
  email_verification_token?: string;
  email_verification_expires?: Date;
  otp_attempts?: number;
  password_reset_token?: string;
  password_reset_expires?: Date;
  last_otp_sent?: Date;
  referral_code?: string;
  terms_accepted: boolean;
  last_login?: Date;
  two_factor_enabled: boolean;
  two_factor_token?: string;
  two_factor_expires?: Date;
  created_at: Date;
  updated_at: Date;
  transactions?: UserTransaction[];
  transactionStats?: {
    totalPurchases: number;
    totalRedemptions: number;
    totalGiftsSent: number;
    totalGiftsReceived: number;
    pendingTransactions: number;
  };
}

export class UserService {
  private transactionService: TransactionService;
  private walletService: WalletService;
  constructor() {
    this.transactionService = new TransactionService();
    this.walletService = new WalletService();
  }

  async getAllUsers(): Promise<IAppUser[]> {
    try {
      return await AppUser.find().sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Error fetching users: ${error}`);
    }
  }

  async getUsersWithFilters(
    params: UserQueryParams,
  ): Promise<PaginatedUsersResponse> {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        kycStatus = "",
        account_status = "",
        sortBy = "createdAt",
        sortOrder = "desc",
      } = params;

      // Build query object
      const query: any = {};

      // Add search functionality
      if (search) {
        query.$or = [
          { email: { $regex: search, $options: "i" } },
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
        ];
      }

      // Add KYC status filter
      if (kycStatus && kycStatus !== "all") {
        query.kycStatus = kycStatus;
      }

      // Add account status filter
      if (account_status && account_status !== "all") {
        query.account_status = account_status;
      }

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Build sort object
      const sort: any = {};
      sort[sortBy] = sortOrder === "asc" ? 1 : -1;

      // Execute queries
      const [users, totalUsers] = await Promise.all([
        AppUser.find(query).sort(sort).skip(skip).limit(limit).exec(),
        AppUser.countDocuments(query),
      ]);

      const totalPages = Math.ceil(totalUsers / limit);

      return {
        users,
        pagination: {
          currentPage: page,
          totalPages,
          totalUsers,
          limit,
        },
      };
    } catch (error) {
      throw new Error(`Error fetching users with filters: ${error}`);
    }
  }

  async getUserById(
    id: string,
    includeTransactions: boolean = false,
  ): Promise<UserWithTransactions | null> {
    try {
      const user = await AppUser.findById(id);
      // const wallets = await Wallet.findOne({ userId: user?._id });
      // console.log(wallets, "wallets");
      // Check if user exists
      if (!user) {
        return null;
      }
      const userObj = user.toObject();
      const wallets = await this.walletService.getWalletsByuserID(user._id.toString());

      if (!includeTransactions) {
        return { ...userObj, wallets };
      }

      // Get user transactions and stats
      // Note: wallet field not available in user schema yet, using undefined for now
      // const [transactions, transactionStats] = await Promise.all([
      //   this.transactionService.getUserTransactions(user.email, undefined),
      //   this.transactionService.getTransactionStats(user.email, undefined)
      // ]);

      return {
        ...userObj,
        wallets,
        // transactions,
        // transactionStats
      } as UserWithTransactions;
    } catch (error) {
      throw new Error(`Error finding user: ${error}`);
    }
  }

  async getUserByEmail(email: string): Promise<IAppUser | null> {
    try {
      return await AppUser.findOne({ email });
    } catch (error) {
      throw new Error(`Error finding user: ${error}`);
    }
  }

  async createUser(userData: InsertAppUser): Promise<IAppUser> {
    try {
      const user = new AppUser({
        ...userData,
        joinDate: new Date(),
        lastActivity: new Date(),
      });
      return await user.save();
    } catch (error) {
      throw new Error(`Error creating user: ${error}`);
    }
  }

  async updateUser(
    id: string,
    updateData: Partial<IAppUser>,
  ): Promise<IAppUser | null> {
    try {
      return await AppUser.findByIdAndUpdate(
        id,
        { ...updateData, lastActivity: new Date() },
        { new: true },
      );
    } catch (error) {
      throw new Error(`Error updating user: ${error}`);
    }
  }

  async updateUserActivity(email: string): Promise<IAppUser | null> {
    try {
      return await AppUser.findOneAndUpdate(
        { email },
        { lastActivity: new Date() },
        { new: true },
      );
    } catch (error) {
      throw new Error(`Error updating user activity: ${error}`);
    }
  }

  async getUsersCount(): Promise<number> {
    try {
      return await AppUser.countDocuments();
    } catch (error) {
      throw new Error(`Error counting users: ${error}`);
    }
  }
}
