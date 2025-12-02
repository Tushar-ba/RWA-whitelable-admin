import { Router } from 'express';
import { RedemptionRequestController } from '../controllers/redemption-request.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const redemptionRequestController = new RedemptionRequestController();

// Redemption request routes - all protected
router.get('/', authenticateToken, redemptionRequestController.getAllRedemptionRequests);
router.get('/:id', authenticateToken, redemptionRequestController.getRedemptionRequestById);
router.put('/:id', authenticateToken, redemptionRequestController.updateRedemptionRequest);
router.patch('/:id', authenticateToken, redemptionRequestController.updateRedemptionRequest);

export default router;