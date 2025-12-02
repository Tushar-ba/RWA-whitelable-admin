import { Router } from 'express';
import { AssetStorageController } from '../controllers/asset-storage.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const assetStorageController = new AssetStorageController();

// Asset Storage routes - all protected
router.get('/', authenticateToken, assetStorageController.getAssetStorage);
router.post('/update', authenticateToken, assetStorageController.updateAssetStorage);
router.get('/history', authenticateToken, assetStorageController.getLiquidityHistory);

// Mint transaction routes
router.post('/mint', authenticateToken, assetStorageController.createMintTransaction);
router.get('/mint-transactions', authenticateToken, assetStorageController.getMintTransactions);
router.patch('/mint/:id/status', authenticateToken, assetStorageController.updateMintStatus);

export default router;