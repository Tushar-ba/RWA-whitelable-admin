import { Response } from 'express';
import { AssetStorageService } from '../services/asset-storage.service';
import { ResponseUtil } from '../utils/response.util';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { z } from 'zod';

export class AssetStorageController {
  private assetStorageService: AssetStorageService;

  constructor() {
    this.assetStorageService = new AssetStorageService();
  }

  // Get current asset storage values
  getAssetStorage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const assetStorage = await this.assetStorageService.getAssetStorage();
      ResponseUtil.success(res, assetStorage, 'Asset storage retrieved successfully');
    } catch (error: any) {
      console.error('Get asset storage error:', error);
      ResponseUtil.error(res, 'Failed to retrieve asset storage', 500);
    }
  };

  // Update asset storage values
  updateAssetStorage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const updateSchema = z.object({
        asset: z.enum(['gold', 'silver']),
        storedValue: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid decimal format'),
        description: z.string().optional()
      });

      const validatedData = updateSchema.parse(req.body);
      const adminId = req.admin?.adminId;
      
      if (!adminId) {
        ResponseUtil.unauthorized(res, 'Admin authentication required');
        return;
      }

      const result = await this.assetStorageService.updateAssetStorage(
        validatedData.asset,
        validatedData.storedValue,
        adminId,
        validatedData.description
      );

      ResponseUtil.success(res, result, 'Asset storage updated successfully');
    } catch (error: any) {
      console.error('Update asset storage error:', error);
      
      if (error instanceof z.ZodError) {
        ResponseUtil.badRequest(res, `Validation error: ${error.errors[0].message}`);
        return;
      }
      
      ResponseUtil.error(res, error.message || 'Failed to update asset storage', 500);
    }
  };

  // Get liquidity management history
  getLiquidityHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { asset, limit = 50, offset = 0 } = req.query;
      
      const history = await this.assetStorageService.getLiquidityHistory(
        asset as string,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      ResponseUtil.success(res, history, 'Liquidity history retrieved successfully');
    } catch (error: any) {
      console.error('Get liquidity history error:', error);
      ResponseUtil.error(res, 'Failed to retrieve liquidity history', 500);
    }
  };

  // Create mint transaction and deduct from storage
  createMintTransaction = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const mintSchema = z.object({
        userId: z.string().min(1, 'User ID is required'),
        asset: z.enum(['gold', 'silver']),
        tokenAmount: z.string().regex(/^\d+(\.\d{1,8})?$/, 'Invalid token amount format'),
        goldValueToDeduct: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid decimal format').optional(),
        silverValueToDeduct: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid decimal format').optional(),
      });

      const validatedData = mintSchema.parse(req.body);
      const adminId = req.admin?.adminId;
      
      if (!adminId) {
        ResponseUtil.unauthorized(res, 'Admin authentication required');
        return;
      }

      const result = await this.assetStorageService.createMintTransaction(validatedData, adminId);
      ResponseUtil.success(res, result, 'Mint transaction created and asset storage updated');
    } catch (error: any) {
      console.error('Create mint transaction error:', error);
      
      if (error instanceof z.ZodError) {
        ResponseUtil.badRequest(res, `Validation error: ${error.errors[0].message}`);
        return;
      }
      
      ResponseUtil.error(res, error.message || 'Failed to create mint transaction', 500);
    }
  };

  // Get mint transactions
  getMintTransactions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { asset, status, limit = 50, offset = 0 } = req.query;
      
      const transactions = await this.assetStorageService.getMintTransactions(
        asset as string,
        status as string,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      ResponseUtil.success(res, transactions, 'Mint transactions retrieved successfully');
    } catch (error: any) {
      console.error('Get mint transactions error:', error);
      ResponseUtil.error(res, 'Failed to retrieve mint transactions', 500);
    }
  };

  // Update mint transaction status
  updateMintStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const statusSchema = z.object({
        status: z.enum(['pending', 'completed', 'failed']),
        transactionHash: z.string().optional(),
        notes: z.string().optional()
      });

      const validatedData = statusSchema.parse(req.body);
      const adminId = req.admin?.adminId;
      
      if (!adminId) {
        ResponseUtil.unauthorized(res, 'Admin authentication required');
        return;
      }

      const result = await this.assetStorageService.updateMintStatus(id, validatedData, adminId);
      ResponseUtil.success(res, result, 'Mint transaction status updated');
    } catch (error: any) {
      console.error('Update mint status error:', error);
      
      if (error instanceof z.ZodError) {
        ResponseUtil.badRequest(res, `Validation error: ${error.errors[0].message}`);
        return;
      }
      
      ResponseUtil.error(res, error.message || 'Failed to update mint status', 500);
    }
  };
}