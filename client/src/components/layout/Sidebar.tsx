import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  Shield,
  Package,
  ShoppingCart,
  RotateCcw,
  UserCheck,
  Wallet,
  Gift,
  Bell,
  Settings,
  Receipt,
  ArrowUpCircle,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import logoImage from "@/assets/logo.png";
import { navigationItems as navConfig } from "@/config/navigation";
import { useAuth } from "@/providers/AuthProvider";

// Icon mapping for navigation items
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Users: UserCheck,
  Package,
  ShoppingCart,
  ArrowUpCircle: RotateCcw,
  Wallet,
  Receipt,
  Bell,
  Shield: Users, // Role Management uses Users icon
  UserCog: Shield, // Admin Management uses Shield icon
  Settings,
};

// Transform navigation config to match sidebar structure
const navigationItems = navConfig
  .map((item) => ({
    href: item.path === "/dashboard" ? "/" : item.path,
    icon: iconMap[item.icon || "Package"] || Package,
    label: item.label,
    permission: item.permission,
  }))
  .filter((item) => !["Gifting Management"].includes(item.label)); // Remove items not in our navigation config

export default function Sidebar() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();

  const { data: unreadNotifications = [] } = useQuery<any[]>({
    queryKey: ["/api/notifications/unread"],
  });

  // Filter navigation items based on user permissions
  const filteredNavigationItems = navigationItems.filter((item) => {
    if (!isAuthenticated || !user) return false;

    // Super admins have access to all navigation items
    if (user.isSuperAdmin) return true;

    // Regular admins only see items they have permission for
    return user.permissions && user.permissions.includes(item.permission);
  });

  return (
    <aside className="w-64 bg-white text-gray-700 border-r border-gray-200 flex-shrink-0 h-screen overflow-hidden">
      <div className="p-6 h-full overflow-y-auto">
        <div className="flex items-center mb-8">
          <img
            src={logoImage}
            alt="Solulab Assets Logo"
            className="w-8 h-8 mr-3"
          />
          <h1 className="text-xl font-bold text-brand-dark">Solulab Assets</h1>
        </div>

        <nav className="space-y-2">
          {filteredNavigationItems.map((item) => {
            const isActive = location === item.href;
            const notificationCount =
              item.href === "/notifications" ? unreadNotifications.length : 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "nav-item flex items-center p-3 rounded-xl transition-all text-gray-700 font-semibold shadow-sm",
                  isActive
                    ? "active bg-gradient-to-r from-brand-brown to-brand-dark-gold !text-white shadow-lg"
                    : "hover:bg-gradient-to-r hover:from-brand-dark-gold hover:to-brand-brown hover:text-white hover:shadow-xl"
                )}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.label}
                {/* {notificationCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {notificationCount}
                  </span>
                )} */}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
