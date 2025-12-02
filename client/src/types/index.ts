export interface DashboardMetrics {
  totalUsers: number;
  tokensMinted: string;
  transactionVolume: string;
  pendingRequests: number;
  pendingPurchaseRequests: number;
  pendingRedemptionRequests: number;
  recentActivity?: {
    purchases: any[];
    redemptions: any[];
    totalPurchases: number;
    totalRedemptions: number;
  };
}

export interface RecentActivity {
  type: string;
  userEmail: string;
  amount: string;
  date: Date;
  icon: string;
  color: string;
}

export interface User {
  _id: string;
  id: string;
  user_id: string;
  email: string;
  password_hash: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  full_name?: string;
  phone_number?: string;
  organization_name?: string;
  country: string;
  state: string;
  account_status: string;
  email_verified: boolean;
  email_verification_token?: string;
  email_verification_expires?: Date;
  otp_attempts?: number;
  password_reset_token?: string;
  password_reset_expires?: Date;
  last_otp_sent?: Date;
  referral_code?: string;
  terms_accepted: boolean;
  last_login?: Date;
  two_factor_enabled: boolean;
  two_factor_token?: string;
  two_factor_expires?: Date;

  // Admin-specific fields
  roles?: string[];
  permissions?: string[];
  isSuperAdmin?: boolean;
  walletAddress?: string;

  created_at: Date;
  updated_at: Date;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  verifyOTP: (otp: string) => Promise<void>;
  resendOTP: () => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface StockUpdateData {
  metal: string;
  operationType: "add" | "remove";
  quantity: string;
  notes?: string;
  updatedBy: string;
}

export interface SystemFees {
  maintenance: {
    amount: number;
    percentage: number;
  };
  redemption: {
    fixed: number;
    insurance: number;
    taxRates: {
      india: number;
      uae: number;
      usa: number;
    };
  };
}
