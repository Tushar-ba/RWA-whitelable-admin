import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const dashboardController = new DashboardController();

// Dashboard routes - all protected
router.get('/metrics', authenticateToken, dashboardController.getMetrics);
router.get('/user-growth', authenticateToken, dashboardController.getUserGrowthStats);
router.get('/transaction-stats', authenticateToken, dashboardController.getTransactionStatsByMetal);
router.get('/activity-trends', authenticateToken, dashboardController.getUserActivityTrends);

export default router;