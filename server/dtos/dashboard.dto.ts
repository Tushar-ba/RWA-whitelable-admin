export interface DashboardMetricsDto {
  totalUsers: number;
  tokensMinted: string;
  transactionVolume: string;
  pendingRequests: number;
  pendingPurchaseRequests: number;
  pendingRedemptionRequests: number;
}

export interface RecentActivityDto {
  type: string;
  userEmail: string;
  amount: string;
  date: Date;
  icon: string;
  color: string;
}