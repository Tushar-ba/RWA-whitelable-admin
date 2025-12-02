import { useApiQuery } from './useApiQuery';
import { DashboardMetrics, RecentActivity } from '@/types';

// Dashboard metrics hook
export function useDashboardMetrics() {
  return useApiQuery<DashboardMetrics>(['dashboard', 'metrics'], '/dashboard/metrics');
}

// Recent activity hook
export function useRecentActivity() {
  return useApiQuery<RecentActivity[]>(['dashboard', 'recent-activity'], '/dashboard/recent-activity');
}