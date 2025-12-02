import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, BellOff, Gift, AlertTriangle, ShoppingCart, Users, ArrowUpCircle, Coins, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { type Notification } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

export default function Notifications() {
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("PUT", `/api/notifications/${id}/read`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "";
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInMs = now.getTime() - notificationDate.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays > 0) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    } else if (diffInHours > 0) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else if (diffInMinutes > 0) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    } else {
      return "Just now";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "purchase":
        return <ShoppingCart className="h-5 w-5 text-green-600" />;
      case "redemption":
        return <ArrowUpCircle className="h-5 w-5 text-blue-600" />;
      case "mint":
        return <Coins className="h-5 w-5 text-yellow-600" />;
      case "transaction":
        return <Activity className="h-5 w-5 text-purple-600" />;
      case "gifting":
        return <Gift className="h-5 w-5 text-pink-600" />;
      case "system_alert":
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case "user_action":
        return <Users className="h-5 w-5 text-indigo-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      purchase: "bg-green-100 text-green-800",
      redemption: "bg-blue-100 text-blue-800",
      mint: "bg-yellow-100 text-yellow-800",
      transaction: "bg-purple-100 text-purple-800",
      gifting: "bg-pink-100 text-pink-800",
      system_alert: "bg-red-100 text-red-800",
      user_action: "bg-indigo-100 text-indigo-800",
    };

    const labels = {
      purchase: "Purchase",
      redemption: "Redemption",
      mint: "Token Mint",
      transaction: "Transaction",
      gifting: "Gifting",
      system_alert: "System Alert",
      user_action: "User Action",
    };

    return (
      <Badge variant="secondary" className={colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800"}>
        {labels[type as keyof typeof labels] || type}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive">High</Badge>;
      case "normal":
        return <Badge variant="secondary">Normal</Badge>;
      case "low":
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="secondary">Normal</Badge>;
    }
  };

  const getNetworkBadge = (network: string) => {
    if (!network) return null;
    
    switch (network) {
      case "canton":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-800 text-xs">
            Canton Network
          </Badge>
        );
      case "ethereum":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-800 text-xs">
            Ethereum
          </Badge>
        );
      case "solana":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-800 text-xs">
            Solana
          </Badge>
        );
      default:
        return <Badge variant="outline" className="text-xs">{network}</Badge>;
    }
  };

  const getAssetBadge = (asset: string) => {
    if (!asset) return null;
    
    switch (asset) {
      case "gold":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-800 text-xs">
            Gold
          </Badge>
        );
      case "silver":
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-800 text-xs">
            Silver
          </Badge>
        );
      default:
        return <Badge variant="outline" className="text-xs">{asset}</Badge>;
    }
  };

  const handleMarkAsRead = (notification: Notification) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 border rounded-lg animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
      </div>

      <div className="space-y-4">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
              !notification.isRead ? "bg-blue-50 border-blue-200" : "bg-white border-gray-200"
            }`}
            onClick={() => handleMarkAsRead(notification)}
          >
            <div className="flex items-start space-x-4">
              <div className="p-2 rounded-full bg-gray-100">
                {getTypeIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                    {!notification.isRead && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{formatDate(notification.createdAt)}</p>
                </div>
                <p className="text-sm text-gray-600 mb-3">{notification.message}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {getTypeBadge(notification.type)}
                  {getPriorityBadge(notification.priority || "normal")}
                  {notification.asset && getAssetBadge(notification.asset)}
                  {notification.network && getNetworkBadge(notification.network)}
                  {notification.quantity && (
                    <Badge variant="outline" className="text-xs">
                      {notification.quantity}
                    </Badge>
                  )}
                  {notification.relatedId && (
                    <Badge variant="outline" className="text-xs">
                      ID: {notification.relatedId}
                    </Badge>
                  )}
                  {notification.userEmail && (
                    <Badge variant="outline" className="text-xs">
                      User: {notification.userEmail}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {notifications.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <BellOff className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p>No notifications available</p>
          </div>
        )}
      </div>
    </div>
  );
}
