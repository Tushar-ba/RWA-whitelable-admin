import { AppUser } from '../schemas/user.schema';
import { PurchaseHistory } from '../schemas/purchase-history.schema';
import { Redemption } from '../schemas/redemption.schema';
import { GiftingTransaction } from '../schemas/gifting-transaction.schema';
import { PurchaseRequest } from '../schemas/purchase-request.schema';
import { RedemptionRequest } from '../schemas/redemption-request.schema';

export class DashboardService {
  
  // Get comprehensive dashboard metrics
  async getDashboardMetrics() {
    try {
      const [
        totalUsers,
        mintedTokensData,
        successfulTransactions,
        recentPurchaseRequests,
        recentRedemptionRequests
      ] = await Promise.all([
        this.getTotalUsers(),
        this.getMintedTokensCount(),
        this.getSuccessfulTransactionsValue(),
        this.getRecentPurchaseRequests(),
        this.getRecentRedemptionRequests()
      ]);

      return {
        totalUsers,
        tokensMinted: mintedTokensData.count,
        tokensMinedValue: mintedTokensData.totalValue,
        transactionVolume: successfulTransactions.totalValue,
        successfulTransactionCount: successfulTransactions.count,
        pendingRequests: recentPurchaseRequests.count + recentRedemptionRequests.count,
        pendingPurchaseRequests: recentPurchaseRequests.count,
        pendingRedemptionRequests: recentRedemptionRequests.count,
        recentActivity: {
          purchases: recentPurchaseRequests.recent,
          redemptions: recentRedemptionRequests.recent,
          totalPurchases: recentPurchaseRequests.totalCount,
          totalRedemptions: recentRedemptionRequests.totalCount
        }
      };
    } catch (error) {
      console.error('❌ Dashboard metrics error:', error);
      throw new Error('Failed to retrieve dashboard metrics');
    }
  }

  // Get total users count
  async getTotalUsers() {
    try {
      const count = await AppUser.countDocuments({ 
        account_status: { $ne: 'deleted' } 
      });
      return count;
    } catch (error) {
      console.error('❌ Get total users error:', error);
      return 0;
    }
  }

  // Get minted tokens count and total value
  async getMintedTokensCount() {
    try {
      // Get all completed purchase transactions (these represent minted tokens)
      const completedPurchases = await PurchaseHistory.find({ 
        status: 'completed' 
      }).lean();

      const count = completedPurchases.length;
      const totalValue = completedPurchases.reduce((sum, purchase) => {
        return sum + parseFloat(purchase.tokenAmount || '0');
      }, 0);

      return {
        count: this.formatNumber(count),
        totalValue: this.formatCurrency(totalValue)
      };
    } catch (error) {
      console.error('❌ Get minted tokens error:', error);
      return { count: '0', totalValue: '$0.0M' };
    }
  }

  // Get successful transactions total value
  async getSuccessfulTransactionsValue() {
    try {
      const [purchases, redemptions, gifts] = await Promise.all([
        PurchaseHistory.find({ status: 'completed' }).lean(),
        Redemption.find({ status: { $in: ['delivered', 'completed'] } }).lean(),
        GiftingTransaction.find({ status: 'completed' }).lean()
      ]);

      const purchaseValue = purchases.reduce((sum, tx) => sum + parseFloat(tx.usdAmount || '0'), 0);
      const redemptionValue = redemptions.reduce((sum, tx) => sum + parseFloat(tx.totalCostUSD || '0'), 0);
      const giftValue = gifts.reduce((sum, tx) => sum + parseFloat(tx.totalCostUSD || '0'), 0);

      const totalValue = purchaseValue + redemptionValue + giftValue;
      const totalCount = purchases.length + redemptions.length + gifts.length;

      return {
        totalValue: this.formatCurrency(totalValue),
        count: totalCount
      };
    } catch (error) {
      console.error('❌ Get successful transactions error:', error);
      return { totalValue: '$0.0M', count: 0 };
    }
  }

  // Get recent purchase requests (all statuses for better activity tracking)
  async getRecentPurchaseRequests() {
    try {
      const recentPurchases = await PurchaseHistory.find({})
        .sort({ createdAt: -1 })
        .lean();
       console.log('🔍 Dashboard recentPurchases count:', recentPurchases);
      const pendingCount = await PurchaseHistory.countDocuments({ 
        status: 'pending'
      });

     

      return {
        count: pendingCount,
        recent: recentPurchases,
        totalCount: recentPurchases.length
      };
    } catch (error) {
      console.error('❌ Get recent purchase requests error:', error);
      return { count: 0, recent: [], totalCount: 0 };
    }
  }

  // Get recent redemption requests (all statuses for better activity tracking)
  async getRecentRedemptionRequests() {
    try {
      const recentRedemptionRequests = await Redemption.find({})
        .sort({ createdAt: -1 })
        .lean();
      const pendingCount = await Redemption.countDocuments({ 
        status: 'pending'
      });
      return {
        count: pendingCount,
        recent: recentRedemptionRequests,
        totalCount: recentRedemptionRequests.length
      }
    } catch (error) {
      console.error('❌ Get recent redemption requests error:', error);
      return { count: 0, recent: [], totalCount: 0 };
    }
  }

  // Get user growth statistics
  async getUserGrowthStats(days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const newUsers = await AppUser.countDocuments({
        created_at: { $gte: startDate },
        account_status: { $ne: 'deleted' }
      });

      const activeUsers = await AppUser.countDocuments({
        last_login: { $gte: startDate },
        account_status: 'active'
      });

      return {
        newUsers,
        activeUsers,
        period: `${days} days`
      };
    } catch (error) {
      console.error('❌ Get user growth stats error:', error);
      return { newUsers: 0, activeUsers: 0, period: `${days} days` };
    }
  }

  // Get transaction statistics by metal type
  async getTransactionStatsByMetal() {
    try {
      const [goldPurchases, silverPurchases, goldRedemptions, silverRedemptions] = await Promise.all([
        PurchaseHistory.countDocuments({ metal: 'gold', status: 'completed' }),
        PurchaseHistory.countDocuments({ metal: 'silver', status: 'completed' }),
        Redemption.countDocuments({ token: 'gold', status: { $in: ['delivered', 'completed'] } }),
        Redemption.countDocuments({ token: 'silver', status: { $in: ['delivered', 'completed'] } })
      ]);

      return {
        gold: {
          purchases: goldPurchases,
          redemptions: goldRedemptions,
          total: goldPurchases + goldRedemptions
        },
        silver: {
          purchases: silverPurchases,
          redemptions: silverRedemptions,
          total: silverPurchases + silverRedemptions
        }
      };
    } catch (error) {
      console.error('❌ Get transaction stats by metal error:', error);
      return {
        gold: { purchases: 0, redemptions: 0, total: 0 },
        silver: { purchases: 0, redemptions: 0, total: 0 }
      };
    }
  }

  // Get user activity trends with daily metrics
  async getUserActivityTrends(filterType: '7days' | '1month' | '3months' | 'all' = '7days') {
    try {
      const dateRange = this.getDateRange(filterType);
      const startDate = dateRange.start;
      const endDate = dateRange.end;

      // Generate date array for the period
      const dates = this.generateDateArray(startDate, endDate);
      
      // Get daily user registrations
      const dailyUserRegistrations = await this.getDailyUserRegistrations(startDate, endDate);
      
      // Get daily transaction counts
      const dailyTransactionCounts = await this.getDailyTransactionCounts(startDate, endDate);

      // Map data to dates array
      const activityData = dates.map(date => {
        const dateStr = date.toISOString().split('T')[0];
        const userCount = dailyUserRegistrations.find(d => d.date === dateStr)?.count || 0;
        const transactionCount = dailyTransactionCounts.find(d => d.date === dateStr)?.count || 0;

        return {
          date: dateStr,
          newUsers: userCount,
          transactions: transactionCount
        };
      });

      return {
        period: filterType,
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        },
        data: activityData,
        summary: {
          totalNewUsers: activityData.reduce((sum, day) => sum + day.newUsers, 0),
          totalTransactions: activityData.reduce((sum, day) => sum + day.transactions, 0),
          avgNewUsersPerDay: Math.round(activityData.reduce((sum, day) => sum + day.newUsers, 0) / activityData.length),
          avgTransactionsPerDay: Math.round(activityData.reduce((sum, day) => sum + day.transactions, 0) / activityData.length)
        }
      };
    } catch (error) {
      console.error('❌ Get user activity trends error:', error);
      throw new Error('Failed to retrieve user activity trends');
    }
  }

  // Get daily user registrations
  private async getDailyUserRegistrations(startDate: Date, endDate: Date) {
    try {
      const pipeline = [
        {
          $match: {
            created_at: { $gte: startDate, $lte: endDate },
            account_status: { $ne: 'deleted' }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$created_at" }
            },
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            date: "$_id",
            count: 1,
            _id: 0
          }
        },
        { $sort: { date: 1 as 1 } }
      ];

      const result = await AppUser.aggregate(pipeline);
      return result;
    } catch (error) {
      console.error('❌ Get daily user registrations error:', error);
      return [];
    }
  }

  // Get daily transaction counts (purchases + redemptions + gifts)
  private async getDailyTransactionCounts(startDate: Date, endDate: Date) {
    try {
      const [purchaseCounts, redemptionCounts, giftCounts] = await Promise.all([
        this.getDailyCountsFromCollection(PurchaseHistory, startDate, endDate, ['completed']),
        this.getDailyCountsFromCollection(Redemption, startDate, endDate, ['delivered', 'completed']),
        this.getDailyCountsFromCollection(GiftingTransaction, startDate, endDate, ['completed'])
      ]);

      // Merge all transaction counts by date
      const allDates = new Set([
        ...purchaseCounts.map((d: any) => d.date),
        ...redemptionCounts.map((d: any) => d.date),
        ...giftCounts.map((d: any) => d.date)
      ]);

      const dailyCounts = Array.from(allDates).map(date => {
        const purchaseCount = purchaseCounts.find((d: any) => d.date === date)?.count || 0;
        const redemptionCount = redemptionCounts.find((d: any) => d.date === date)?.count || 0;
        const giftCount = giftCounts.find((d: any) => d.date === date)?.count || 0;

        return {
          date,
          count: purchaseCount + redemptionCount + giftCount
        };
      }).sort((a, b) => a.date.localeCompare(b.date));

      return dailyCounts;
    } catch (error) {
      console.error('❌ Get daily transaction counts error:', error);
      return [];
    }
  }

  // Helper to get daily counts from any collection
  private async getDailyCountsFromCollection(Model: any, startDate: Date, endDate: Date, statusFilter: string[]) {
    try {
      const pipeline = [
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $in: statusFilter }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
            },
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            date: "$_id",
            count: 1,
            _id: 0
          }
        },
        { $sort: { date: 1 as 1 } }
      ];

      const result = await Model.aggregate(pipeline);
      return result;
    } catch (error) {
      console.error('❌ Get daily counts from collection error:', error);
      return [];
    }
  }

  // Get date range based on filter type
  private getDateRange(filterType: string) {
    const endDate = new Date();
    const startDate = new Date();

    switch (filterType) {
      case '7days':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '1month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case '3months':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case 'all':
        startDate.setFullYear(2020); // Set to a far back date to get all data
        break;
      default:
        startDate.setDate(endDate.getDate() - 7);
    }

    // Set to start of day
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    return { start: startDate, end: endDate };
  }

  // Generate array of dates between start and end
  private generateDateArray(startDate: Date, endDate: Date): Date[] {
    const dates = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  }

  // Helper method to format numbers
  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  // Helper method to format currency
  private formatCurrency(amount: number): string {
    if (amount >= 1000000) {
      return '$' + (amount / 1000000).toFixed(1) + 'M';
    } else if (amount >= 1000) {
      return '$' + (amount / 1000).toFixed(1) + 'K';
    }
    return '$' + amount.toFixed(2);
  }
}