import { Router } from 'express';
import { StockController } from '../controllers/stock.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const stockController = new StockController();

// Stock routes - all protected
router.get('/', authenticateToken, stockController.getAllStock);
router.get('/history', authenticateToken, stockController.getStockHistory);
router.post('/update', authenticateToken, stockController.updateStock);

export default router;