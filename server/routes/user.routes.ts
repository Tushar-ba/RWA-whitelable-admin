import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const userController = new UserController();

// User routes - all protected
router.get('/', authenticateToken, userController.getAllUsers);
router.get('/:id/transactions', authenticateToken, userController.getUserTransactions); // More specific route first
router.get('/:id/wallets', authenticateToken, userController.getUserWallets); // Get user wallets
router.get('/:id/balances', authenticateToken, userController.getUserBalances); // Get user token balances
router.get('/:id', authenticateToken, userController.getUserById);
router.put('/:id', authenticateToken, userController.updateUser);
router.post('/:id/freeze-unfreeze', authenticateToken, userController.freezeUnfreezeUser); // Freeze/Unfreeze account
router.post('/:id/wipe-tokens', authenticateToken, userController.wipeUserTokens); // Wipe user tokens

export default router;