import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Coins,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  DollarSign,
  Zap,
  Activity,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { DashboardMetrics } from "@/types";
import { LivePricesDisplay } from "@/components/LivePricesDisplay";

export default function Dashboard() {
  const [activityFilter, setActivityFilter] = useState<'7days' | '1month' | '3months' | 'all'>('7days');
  
  const { data: metrics, isLoading: metricsLoading } =
    useQuery<DashboardMetrics>({
      queryKey: ["/api/dashboard/metrics"],
    });

  const { data: activityTrends, isLoading: activityLoading } = useQuery({
    queryKey: ["/api/dashboard/activity-trends", activityFilter],
    queryFn: () => fetch(`/api/dashboard/activity-trends?filter=${activityFilter}`).then(res => res.json()),
  });

  // Mock data for Gold & Silver price trends
  const getGoldSilverData = () => [
    { date: "Jun 1", gold: 2000, silver: 23 },
    { date: "Jun 8", gold: 2010, silver: 23.5 },
    { date: "Jun 15", gold: 2025, silver: 24 },
    { date: "Jun 22", gold: 2035, silver: 24.2 },
    { date: "Jun 29", gold: 2047, silver: 24.7 },
  ];

  if (metricsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">
                  {metrics?.totalUsers || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-green-500 text-sm font-medium">+12.5%</span>
              <span className="text-gray-500 text-sm ml-2">
                from last month
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Tokens Minted
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {metrics?.tokensMinted || "0"}
                </p>
              </div>
              <div className="p-3 bg-brand-light-gold bg-opacity-20 rounded-full">
                <Coins className="h-6 w-6 text-brand-gold" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-green-500 text-sm font-medium">+8.3%</span>
              <span className="text-gray-500 text-sm ml-2">
                GLD: 12.1K, SLV: 3.1K
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Transaction Volume
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {metrics?.transactionVolume || "$0"}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-green-500 text-sm font-medium">+15.7%</span>
              <span className="text-gray-500 text-sm ml-2">USDC Volume</span>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Pending Purchase
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {metrics?.pendingPurchaseRequests || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <ArrowUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-blue-500 text-sm font-medium">
                Needs Review
              </span>
              <span className="text-gray-500 text-sm ml-2">
                Purchase requests
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Pending Redemption
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {metrics?.pendingRedemptionRequests || 0}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <ArrowDown className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-orange-500 text-sm font-medium">
                Needs Review
              </span>
              <span className="text-gray-500 text-sm ml-2">
                Redemption requests
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section - Side by Side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Live Gold & Silver Prices */}
        <Card className="h-fit">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-amber-700">
              Live Gold & Silver Prices
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <LivePricesDisplay />
          </CardContent>
        </Card>

        {/* User Activity Trends */}
        <Card className="h-fit">
          <CardHeader className="pb-4">
            <div className="flex flex-col space-y-3">
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Activity className="h-5 w-5 text-blue-600" />
                <span>User Activity Trends</span>
              </CardTitle>
              <Select value={activityFilter} onValueChange={(value: '7days' | '1month' | '3months' | 'all') => setActivityFilter(value)}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="1month">Last 1 month</SelectItem>
                  <SelectItem value="3months">Last 3 months</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-6">
            {activityLoading ? (
              <div className="h-64 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
                <div className="text-gray-500">Loading activity data...</div>
              </div>
            ) : (
              <div className="h-64 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activityTrends?.data || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "6px",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                        padding: "8px",
                      }}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: "10px" }}
                      iconType="line"
                    />
                    <Line
                      type="monotone"
                      dataKey="newUsers"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      dot={{ fill: "#3b82f6", r: 3 }}
                      activeDot={{ r: 5 }}
                      name="New Users"
                    />
                    <Line
                      type="monotone"
                      dataKey="transactions"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={{ fill: "#10b981", r: 3 }}
                      activeDot={{ r: 5 }}
                      name="Transactions"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-2 bg-white rounded-lg border border-blue-100">
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-xs font-medium text-gray-700">Purchases</span>
                </div>
                <div className="text-lg font-bold text-blue-600 mb-1">
                  {metrics?.recentActivity?.totalPurchases || 0}
                </div>
                <div className="text-xs text-gray-500">
                  Recent: {metrics?.recentActivity?.purchases?.length || 0}
                </div>
              </div>
              <div className="p-2 bg-white rounded-lg border border-green-100">
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-xs font-medium text-gray-700">
                    Redemptions
                  </span>
                </div>
                <div className="text-lg font-bold text-green-600 mb-1">
                  {metrics?.recentActivity?.totalRedemptions || 0}
                </div>
                <div className="text-xs text-gray-500">
                  Recent: {metrics?.recentActivity?.redemptions?.length || 0}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time notifications are running in the background */}
      {/* Check browser console for Socket.IO connection logs */}
    </div>
  );
}
