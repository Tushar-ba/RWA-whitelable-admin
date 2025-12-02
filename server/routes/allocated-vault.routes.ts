import { Router } from 'express';
import { AllocatedVaultController } from '../controllers/allocated-vault.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const allocatedVaultController = new AllocatedVaultController();

// Get all allocated vaults (admin only)
router.get('/', authenticateToken, allocatedVaultController.getAllAllocatedVaults);

// Get vault by purchase request ID
router.get('/purchase-request/:id', authenticateToken, allocatedVaultController.getVaultByPurchaseRequestId);

// Get vaults by user ID
router.get('/user/:userId', authenticateToken, allocatedVaultController.getVaultsByUserId);

// Get vault statistics
router.get('/statistics', authenticateToken, allocatedVaultController.getVaultStatistics);

// Update vault status
router.patch('/:id/status', authenticateToken, allocatedVaultController.updateVaultStatus);

export default router;