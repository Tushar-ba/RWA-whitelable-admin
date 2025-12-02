import { Request, Response } from 'express';
import { TransactionService, TransactionFilters, PaginationOptions } from '../services/transaction.service';
import { ResponseUtil } from '../utils/response.util';

export class TransactionController {
  private transactionService: TransactionService;

  constructor() {
    this.transactionService = new TransactionService();
  }

  // Get Buy Transactions
  getBuyTransactions = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters: TransactionFilters = {
        search: req.query.search as string,
        status: req.query.status as string,
        metal: req.query.metal as string,
        network: req.query.network as string,
        paymentMethod: req.query.paymentMethod as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string
      };

      const pagination: PaginationOptions = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        sortBy: req.query.sortBy as string || 'createdAt',
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc'
      };

      const result = await this.transactionService.getBuyTransactions(filters, pagination);
      
      ResponseUtil.success(res, result, 'Buy transactions retrieved successfully');
    } catch (error) {
      console.error('Error fetching buy transactions:', error);
      ResponseUtil.error(res, 'Failed to retrieve buy transactions', 500);
    }
  };

  // Get Gifting Transactions
  getGiftingTransactions = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters: TransactionFilters = {
        search: req.query.search as string,
        status: req.query.status as string,
        token: req.query.token as string,
        network: req.query.network as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string
      };

      const pagination: PaginationOptions = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        sortBy: req.query.sortBy as string || 'createdAt',
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc'
      };

      const result = await this.transactionService.getGiftingTransactions(filters, pagination);
      
      ResponseUtil.success(res, result, 'Gifting transactions retrieved successfully');
    } catch (error) {
      console.error('Error fetching gifting transactions:', error);
      ResponseUtil.error(res, 'Failed to retrieve gifting transactions', 500);
    }
  };

  // Get Redemption Requests (All status types supported)
  getRedemptionRequests = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters: TransactionFilters = {
        search: req.query.search as string,
        status: req.query.status as string, // Support all status types
        token: req.query.token as string,
        network: req.query.network as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string
      };

      const pagination: PaginationOptions = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        sortBy: req.query.sortBy as string || 'createdAt',
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc'
      };

      const result = await this.transactionService.getRedemptionRequests(filters, pagination);
      
      ResponseUtil.success(res, result, 'Redemption requests retrieved successfully');
    } catch (error) {
      console.error('Error fetching redemption requests:', error);
      ResponseUtil.error(res, 'Failed to retrieve redemption requests', 500);
    }
  };

  // Get Redemption Request by ID
  getRedemptionRequestById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.transactionService.getRedemptionRequestById(id);
      
      if (!result) {
        ResponseUtil.error(res, 'Redemption request not found', 404);
        return;
      }
      
      ResponseUtil.success(res, result, 'Redemption request retrieved successfully');
    } catch (error) {
      console.error('Error fetching redemption request:', error);
      ResponseUtil.error(res, 'Failed to retrieve redemption request', 500);
    }
  };

  // Update Redemption Request
  updateRedemptionRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const result = await this.transactionService.updateRedemptionRequest(id, updateData);
      
      if (!result) {
        ResponseUtil.error(res, 'Redemption request not found', 404);
        return;
      }
      
      ResponseUtil.success(res, result, 'Redemption request updated successfully');
    } catch (error) {
      console.error('Error updating redemption request:', error);
      ResponseUtil.error(res, 'Failed to update redemption request', 500);
    }
  };

  // Get Redemption Transactions
  getRedemptionTransactions = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters: TransactionFilters = {
        search: req.query.search as string,
        status: req.query.status as string,
        token: req.query.token as string,
        network: req.query.network as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string
      };

      const pagination: PaginationOptions = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        sortBy: req.query.sortBy as string || 'createdAt',
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc'
      };

      const result = await this.transactionService.getRedemptionTransactions(filters, pagination);
      
      ResponseUtil.success(res, result, 'Redemption transactions retrieved successfully');
    } catch (error) {
      console.error('Error fetching redemption transactions:', error);
      ResponseUtil.error(res, 'Failed to retrieve redemption transactions', 500);
    }
  };

  // Get Transaction Statistics (for dashboard or summary purposes)
  getTransactionStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters: TransactionFilters = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string
      };

      const pagination: PaginationOptions = {
        page: 1,
        limit: 1000 // Get enough records for stats calculation
      };

      // Get data from all transaction types
      const [buyResult, giftingResult, redemptionResult] = await Promise.all([
        this.transactionService.getBuyTransactions(filters, pagination),
        this.transactionService.getGiftingTransactions(filters, pagination),
        this.transactionService.getRedemptionTransactions(filters, pagination)
      ]);

      const stats = {
        buy: {
          total: buyResult.pagination.totalItems,
          totalValue: buyResult.summary?.totalValue || 0,
          completed: buyResult.summary?.completedTransactions || 0,
          pending: buyResult.summary?.pendingTransactions || 0,
          failed: buyResult.summary?.failedTransactions || 0
        },
        gifting: {
          total: giftingResult.pagination.totalItems,
          totalValue: giftingResult.summary?.totalValue || 0,
          completed: giftingResult.summary?.completedTransactions || 0,
          pending: giftingResult.summary?.pendingTransactions || 0,
          failed: giftingResult.summary?.failedTransactions || 0
        },
        redemption: {
          total: redemptionResult.pagination.totalItems,
          totalValue: redemptionResult.summary?.totalValue || 0,
          completed: redemptionResult.summary?.completedTransactions || 0,
          pending: redemptionResult.summary?.pendingTransactions || 0,
          failed: redemptionResult.summary?.failedTransactions || 0
        },
        overall: {
          totalTransactions: buyResult.pagination.totalItems + giftingResult.pagination.totalItems + redemptionResult.pagination.totalItems,
          totalValue: (buyResult.summary?.totalValue || 0) + (giftingResult.summary?.totalValue || 0) + (redemptionResult.summary?.totalValue || 0),
          totalCompleted: (buyResult.summary?.completedTransactions || 0) + (giftingResult.summary?.completedTransactions || 0) + (redemptionResult.summary?.completedTransactions || 0),
          totalPending: (buyResult.summary?.pendingTransactions || 0) + (giftingResult.summary?.pendingTransactions || 0) + (redemptionResult.summary?.pendingTransactions || 0),
          totalFailed: (buyResult.summary?.failedTransactions || 0) + (giftingResult.summary?.failedTransactions || 0) + (redemptionResult.summary?.failedTransactions || 0)
        }
      };

      ResponseUtil.success(res, stats, 'Transaction statistics retrieved successfully');
    } catch (error) {
      console.error('Error fetching transaction statistics:', error);
      ResponseUtil.error(res, 'Failed to retrieve transaction statistics', 500);
    }
  };
}