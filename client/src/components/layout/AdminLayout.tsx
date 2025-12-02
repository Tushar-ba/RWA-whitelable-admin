import { useAuth } from "@/providers/AuthProvider";
import { useLocation } from "wouter";
import { useEffect } from "react";
import Sidebar from "./Sidebar";
import { Bell, ChevronDown, User, ArrowRight, BellOff } from "lucide-react";
import { WalletButton } from "@/components/wallet/WalletButton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type Notification } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { isAuthenticated, user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { unreadCount, notifications = [], isConnected, createTestNotification } = useRealtimeNotifications();

  useEffect(() => {
    if (!isAuthenticated) {
      // Store the current route to redirect back after login
      if (location !== '/login') {
        localStorage.setItem('intendedRoute', location);
      }
      setLocation("/login");
    }
  }, [isAuthenticated, setLocation, location]);

  // Helper functions for notifications
  const formatNotificationDate = (date: Date | string | null | undefined) => {
    if (!date) return "";
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInMs = now.getTime() - notificationDate.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    
    if (diffInHours > 0) {
      return `${diffInHours}h ago`;
    } else if (diffInMinutes > 0) {
      return `${diffInMinutes}m ago`;
    } else {
      return "Just now";
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "purchase":
        return "💳";
      case "redemption":
        return "📤";
      case "mint":
        return "🪙";
      case "transaction":
        return "⚡";
      case "system_alert":
        return "⚠️";
      default:
        return "🔔";
    }
  };

  // Get recent unread notifications for dropdown (limit to 5)
  const recentNotifications = notifications.filter(n => !n.isRead).slice(0, 5);

  // Mark notification as read mutation
  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return await apiRequest.put(`/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread"] });
    },
  });

  // Handle clicking on a notification
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification._id);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="h-screen flex bg-gray-50">
      <Sidebar />
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <h2 className="text-2xl font-semibold text-gray-800">Admin Dashboard</h2>
            </div>
            <div className="flex items-center space-x-4">
              <WalletButton />
              
              {/* Notifications Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative p-2" data-testid="button-notifications">
                    <Bell className="h-6 w-6 text-gray-600" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center" data-testid="text-unread-count">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80" data-testid="dropdown-notifications">
                  <div className="p-3 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                      <div className="flex items-center space-x-1">
                        <div 
                          className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
                          title={isConnected ? 'Connected' : 'Disconnected'}
                        />
                        <span className="text-xs text-gray-500">
                          {isConnected ? 'Live' : 'Offline'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {recentNotifications.length > 0 ? (
                    <>
                      <div className="max-h-64 overflow-y-auto">
                        {recentNotifications.map((notification) => (
                          <DropdownMenuItem 
                            key={notification._id} 
                            className="p-3 cursor-pointer hover:bg-gray-50" 
                            data-testid={`notification-${notification._id}`}
                            onClick={() => handleNotificationClick(notification)}
                          >
                            <div className="flex items-start space-x-3 w-full">
                              <div className="text-lg">
                                {getNotificationIcon(notification.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {notification.title}
                                </p>
                                <p className="text-xs text-gray-500 line-clamp-2">
                                  {notification.message}
                                </p>
                                <div className="flex items-center justify-between mt-1">
                                  <Badge 
                                    variant={notification.priority === 'high' ? 'destructive' : 'secondary'} 
                                    className="text-xs"
                                  >
                                    {notification.priority || 'normal'}
                                  </Badge>
                                  <span className="text-xs text-gray-400">
                                    {formatNotificationDate(notification.createdAt)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </div>
                      
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => setLocation("/notifications")}
                        className="p-3 cursor-pointer text-center font-medium text-blue-600 hover:text-blue-700"
                        data-testid="button-view-all"
                      >
                        <div className="flex items-center justify-center space-x-2 w-full">
                          <span>View All Notifications</span>
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <div className="p-6 text-center text-gray-500" data-testid="text-no-notifications">
                      <BellOff className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                      <p className="text-sm">No new notifications</p>
                      <DropdownMenuItem 
                        onClick={() => setLocation("/notifications")}
                        className="mt-2 cursor-pointer text-center text-blue-600 hover:text-blue-700"
                        data-testid="button-view-all-empty"
                      >
                        <div className="flex items-center justify-center space-x-2 w-full">
                          <span>View All Notifications</span>
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      </DropdownMenuItem>
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-brand-light-gold text-brand-dark">
                        {user?.name?.charAt(0) || "A"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-gray-700">{user?.name || "Admin User"}</span>
                    <ChevronDown className="h-4 w-4 text-gray-600" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setLocation("/profile")}>
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout}>
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        
        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
