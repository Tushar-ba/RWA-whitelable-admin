import { Router } from 'express';
import { TransactionController } from '../controllers/transaction.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const transactionController = new TransactionController();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Buy transaction routes
router.get('/buy', transactionController.getBuyTransactions);

// Gifting transaction routes
router.get('/gifting', transactionController.getGiftingTransactions);

// Redemption transaction routes
router.get('/redemption', transactionController.getRedemptionTransactions);

// Redemption requests route (pending only)
router.get('/redemption-requests', transactionController.getRedemptionRequests);

// Get individual redemption request details
router.get('/redemption-requests/:id', transactionController.getRedemptionRequestById);

// Update redemption request status
router.put('/redemption-requests/:id', transactionController.updateRedemptionRequest);
router.patch('/redemption-requests/:id', transactionController.updateRedemptionRequest);

// Transaction statistics route
router.get('/stats', transactionController.getTransactionStats);



export { router as transactionRoutes };