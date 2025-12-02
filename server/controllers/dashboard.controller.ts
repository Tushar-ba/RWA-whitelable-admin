import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class DashboardController {
  private dashboardService: DashboardService;

  constructor() {
    this.dashboardService = new DashboardService();
  }

  getMetrics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const metrics = await this.dashboardService.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      console.error('Get dashboard metrics error:', error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  };

  getUserGrowthStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const growthStats = await this.dashboardService.getUserGrowthStats(days);
      res.json(growthStats);
    } catch (error) {
      console.error('Get user growth stats error:', error);
      res.status(500).json({ message: "Failed to fetch user growth statistics" });
    }
  };

  getTransactionStatsByMetal = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const metalStats = await this.dashboardService.getTransactionStatsByMetal();
      res.json(metalStats);
    } catch (error) {
      console.error('Get transaction stats by metal error:', error);
      res.status(500).json({ message: "Failed to fetch transaction statistics by metal" });
    }
  };

  getUserActivityTrends = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const filter = req.query.filter as '7days' | '1month' | '3months' | 'all' || '7days';
      const activityTrends = await this.dashboardService.getUserActivityTrends(filter);
      res.json(activityTrends);
    } catch (error) {
      console.error('Get user activity trends error:', error);
      res.status(500).json({ message: "Failed to fetch user activity trends" });
    }
  };

}