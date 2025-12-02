import { Router } from 'express';
import { PurchaseRequestController } from '../controllers/purchase-request.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const purchaseRequestController = new PurchaseRequestController();

// Purchase request routes - all protected
router.get('/', authenticateToken, purchaseRequestController.getAllPurchaseRequests);
router.get('/:id', authenticateToken, purchaseRequestController.getPurchaseRequestById);
router.put('/:id', authenticateToken, purchaseRequestController.updatePurchaseRequestStatus);
router.post('/:id/allocate-vault', authenticateToken, purchaseRequestController.allocateVault);
router.post('/:id/mint-tokens', authenticateToken, purchaseRequestController.mintTokens);

export default router;