import { Request, Response } from "express";
import { UserService, UserQueryParams } from "../services/user.service";
import { TransactionService } from "../services/transaction.service";
import { WalletService } from "../services/wallet.service";
import { AccountStatus } from "../config/enums";

export class UserController {
  private userService: UserService;
  private transactionService: TransactionService;
  private walletService: WalletService;

  constructor() {
    this.userService = new UserService();
    this.transactionService = new TransactionService();
    this.walletService = new WalletService();
  }

  getAllUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      // Check if query parameters are provided for filtering/pagination
      const hasQueryParams = Object.keys(req.query).length > 0;

      if (hasQueryParams) {
        const queryParams: UserQueryParams = {
          page: req.query.page ? parseInt(req.query.page as string) : 1,
          limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
          search: req.query.search as string,
          kycStatus: req.query.kycStatus as string,
          account_status: req.query.account_status as string,
          sortBy: req.query.sortBy as string,
          sortOrder: req.query.sortOrder as "asc" | "desc",
        };

        const result = await this.userService.getUsersWithFilters(queryParams);
        res.json(result);
      } else {
        // Return all users for backward compatibility
        const users = await this.userService.getAllUsers();
        res.json(users);
      }
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  };

  getUserById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const includeTransactions = req.query.includeTransactions === 'true';
      
      const user = await this.userService.getUserById(id, includeTransactions);

      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      res.json(user);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  };

  getUserTransactions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      // Extract query parameters for filtering, search, and pagination
      const {
        page = "1",
        limit = "10",
        status,
        search,
        sortBy = "createdAt",
        sortOrder = "desc"
      } = req.query;

      // First get the user to get their email
      const user = await this.userService.getUserById(id, false);
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      // Build filter object - try both email and user ID approaches
      const filters: any = {
        $or: [
          { userEmail: user.email },
          { userId: id }
        ]
      };
      
      // Add status filter if provided
      if (status && status !== "all") {
        filters.status = status;
      }
      
      // Add search filter if provided (search in transaction hash, wallet address, or metal type)
      if (search && typeof search === 'string') {
        filters.$or = [
          { transactionHash: { $regex: search, $options: 'i' } },
          { walletAddress: { $regex: search, $options: 'i' } },
          { metal: { $regex: search, $options: 'i' } }
        ];
      }

      // Get user transactions with pagination and filtering
      const transactions = await this.transactionService.getBuyTransactions(
        filters,
        { 
          page: parseInt(page as string), 
          limit: parseInt(limit as string),
          sortBy: sortBy as string,
          sortOrder: (sortOrder as string) === "asc" ? "asc" : "desc"
        }
      );
      
      res.json(transactions);
    } catch (error) {
      console.error("Get user transactions error:", error);
      res.status(500).json({ message: "Failed to fetch user transactions" });
    }
  };

  updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const user = await this.userService.updateUser(id, updates);

      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      res.json(user);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(400).json({ message: "Failed to update user" });
    }
  };

  // Get user wallet addresses
  getUserWallets = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      const wallets = await this.walletService.getWalletsByuserID(id);
      
      res.json({
        success: true,
        wallets: wallets.map(wallet => ({
          _id: wallet._id,
          walletAddress: wallet.walletAddress,
          userEmail: wallet.userEmail,
          balance: wallet.balance,
          isActive: wallet.isActive,
          createdAt: wallet.createdAt
        }))
      });
    } catch (error) {
      console.error("Get user wallets error:", error);
      res.status(500).json({ message: "Failed to fetch user wallets" });
    }
  };

  // Freeze/Unfreeze user account
  freezeUnfreezeUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { action, network, token } = req.body; // action: 'freeze' or 'unfreeze'
      
      // Update user account status
      const accountStatus = action === 'freeze' ? AccountStatus.SUSPENDED : AccountStatus.ACTIVE;
      const user = await this.userService.updateUser(id, { account_status: accountStatus });

      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      // Also update wallet status if needed
      const wallets = await this.walletService.getWalletsByuserID(id);
      for (const wallet of wallets) {
        await this.walletService.updateWallet(wallet._id.toString(), {
          isActive: action === 'unfreeze'
        });
      }

      res.json({
        success: true,
        message: `User account ${action}d successfully`,
        user: {
          ...user,
          account_status: accountStatus
        }
      });
    } catch (error) {
      console.error(`Freeze/Unfreeze user error:`, error);
      res.status(500).json({ message: `Failed to ${req.body.action} user account` });
    }
  };

  // Wipe user tokens
  wipeUserTokens = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { network, token } = req.body;
      
      // Get user wallets
      const wallets = await this.walletService.getWalletsByuserID(id);
      
      if (wallets.length === 0) {
        res.status(404).json({ message: "No wallets found for user" });
        return;
      }

      // Set token balance to 0
      const tokenKey = token.toLowerCase(); // 'gold' or 'silver'
      
      for (const wallet of wallets) {
        await this.walletService.updateWalletBalance(
          wallet.walletAddress,
          tokenKey,
          "0"
        );
      }

      res.json({
        success: true,
        message: `${token} tokens wiped successfully for user on ${network} network`,
        walletsUpdated: wallets.length
      });
    } catch (error) {
      console.error("Wipe user tokens error:", error);
      res.status(500).json({ message: "Failed to wipe user tokens" });
    }
  };

  // Get user token balances
  getUserBalances = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      const wallets = await this.walletService.getWalletsByuserID(id);
      
      const balances: {
        gold: string;
        silver: string;
        totalWallets: number;
        walletBalances: Array<{
          walletAddress: string;
          gold: string;
          silver: string;
          isActive: boolean;
        }>;
      } = {
        gold: "0",
        silver: "0",
        totalWallets: wallets.length,
        walletBalances: []
      };

      // Aggregate balances from all wallets
      let totalGold = 0;
      let totalSilver = 0;

      for (const wallet of wallets) {
        const goldBalance = parseFloat((wallet.balance as any)?.gold || "0");
        const silverBalance = parseFloat((wallet.balance as any)?.silver || "0");
        
        totalGold += goldBalance;
        totalSilver += silverBalance;

        balances.walletBalances.push({
          walletAddress: wallet.walletAddress,
          gold: (wallet.balance as any)?.gold || "0",
          silver: (wallet.balance as any)?.silver || "0",
          isActive: wallet.isActive
        });
      }

      balances.gold = totalGold.toString();
      balances.silver = totalSilver.toString();
      
      res.json({
        success: true,
        balances
      });
    } catch (error) {
      console.error("Get user balances error:", error);
      res.status(500).json({ message: "Failed to fetch user balances" });
    }
  };
}
