export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  permission: string;
  icon?: string;
}

export const navigationItems: NavigationItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/dashboard",
    permission: "Dashboard",
    icon: "LayoutDashboard",
  },
  {
    id: "role-management",
    label: "Role Management",
    path: "/role-management",
    permission: "Role Management",
    icon: "Shield",
  },
  {
    id: "admin-management",
    label: "Admin Management",
    path: "/admin-management",
    permission: "Admin Management",
    icon: "UserCog",
  },
  {
    id: "user-management",
    label: "User Management",
    path: "/user-management",
    permission: "User Management",
    icon: "Users",
  },
  {
    id: "assets-storage",
    label: "Assets Storage",
    path: "/stock-management",
    permission: "Assets Storage",
    icon: "Package",
  },
  {
    id: "purchase-requests",
    label: "Purchase Requests",
    path: "/purchase-requests",
    permission: "Purchase Requests",
    icon: "ShoppingCart",
  },
  {
    id: "redemption-requests",
    label: "Redemption Requests",
    path: "/redemption-requests",
    permission: "Redemption Requests",
    icon: "ArrowUpCircle",
  },
  // {
  //   id: "wallet-management",
  //   label: "Wallet Management",
  //   path: "/wallet-management",
  //   permission: "Wallet Management",
  //   icon: "Wallet",
  // },
  {
    id: "transactions",
    label: "Transactions",
    path: "/transactions",
    permission: "Transactions",
    icon: "Receipt",
  },
  {
    id: "notifications",
    label: "Notifications",
    path: "/notifications",
    permission: "Notifications",
    icon: "Bell",
  },
  {
    id: "platform-fee-management",
    label: "Platform Fee Management",
    path: "/master-management",
    permission: "Platform Fee Management",
    icon: "Settings",
  },
];

// Helper function to get navigation item by permission
export const getNavigationByPermission = (
  permission: string,
): NavigationItem | undefined => {
  return navigationItems.find((item) => item.permission === permission);
};

// Helper function to get all permissions
export const getAllPermissions = (): string[] => {
  return navigationItems.map((item) => item.permission);
};

// Helper function to check if user has permission for a route
export const hasPermissionForRoute = (
  userPermissions: string[],
  routePath: string,
): boolean => {
  const navItem = navigationItems.find((item) => item.path === routePath);
  return navItem ? userPermissions.includes(navItem.permission) : false;
};
