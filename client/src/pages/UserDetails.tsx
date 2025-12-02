import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, User, Mail, Phone, Calendar, Shield, CreditCard, AlertTriangle, Ban, Lock, Unlock, Trash2, Snowflake, Search, ChevronLeft, ChevronRight, Filter, Copy, Check, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import ConfirmationModal from "@/components/modals/ConfirmationModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEvmFrozenStatus, useEvmFreeze, useEvmUnfreeze, useEvmWipe } from "@/hooks/useEvmOperations";

interface User {
  _id: string;
  user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  account_status: string;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
  wallets: Array<{
    address: string;
    type: string;
  }>
  last_login?: Date;
  // Optional fields that may not exist yet
  walletAddress?: string;
  goldBalance?: number;
  silverBalance?: number;
  kycStatus?: string;
}

interface Transaction {
  _id: string;
  id?: string;
  type?: "purchase" | "redemption" | "gifting_sent" | "gifting_received";
  amount?: string;
  asset?: string;
  token?: string;
  quantity?: string;
  usdcAmount?: string;
  platformFee?: string;
  status: string;
  createdAt?: Date;
  updatedAt?: Date;
  transactionDate?: Date;
  notes?: string;
  vaultNumber?: string;
  redemptionMethod?: string;
  senderWallet?: string;
  receiverWallet?: string;
  fee?: number;
  network?: string;
  description?: string;
  assetType?: string;
  tokenAmount?: number;
  usdAmount?: string;
  feeAmount?: string;
  userName?: string;
  userEmail?: string;
  paymentMethod?: string;
  transactionHash?: string;
  walletAddress?: string;
}

interface TransactionsResponse {
  data: Transaction[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
  summary?: {
    totalValue: number;
    completedTransactions: number;
    pendingTransactions: number;
    failedTransactions: number;
  };
}

interface UserWallet {
  _id: string;
  walletAddress: string;
  userEmail: string;
  balance: {
    gold?: string;
    silver?: string;
  };
  isActive: boolean;
  createdAt: Date;
}

interface UserBalances {
  gold: string;
  silver: string;
  totalWallets: number;
  walletBalances: Array<{
    walletAddress: string;
    gold: string;
    silver: string;
    isActive: boolean;
  }>;
}

export default function UserDetails() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // State for new features
  const [selectedNetwork, setSelectedNetwork] = useState<string>("solana");
  const [selectedToken, setSelectedToken] = useState<string>("gold");
  const [selectedWallet, setSelectedWallet] = useState<string>("");
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [showUnfreezeModal, setShowUnfreezeModal] = useState(false);
  const [showWipeModal, setShowWipeModal] = useState(false);

  // Transaction filters state
  const [transactionFilters, setTransactionFilters] = useState({
    page: 1,
    limit: 10,
    status: "all",
    search: "",
  });

  // Copy functionality state
  const [copiedWallet, setCopiedWallet] = useState<string | null>(null);

  // EVM operations hooks
  const evmFrozenStatusQuery = useEvmFrozenStatus(
    selectedToken as 'gold' | 'silver',
    selectedNetwork === 'public' && selectedWallet ? selectedWallet : null
  );

  const evmFreezeMutation = useEvmFreeze();
  const evmUnfreezeMutation = useEvmUnfreeze();
  const evmWipeMutation = useEvmWipe();

  // Copy wallet address function
  const handleCopyWallet = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedWallet(address);
      toast({
        title: "Copied!",
        description: "Wallet address copied to clipboard",
      });
      setTimeout(() => setCopiedWallet(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast({
        title: "Copy failed",
        description: "Failed to copy wallet address",
        variant: "destructive",
      });
    }
  };

  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/users", id],
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery<TransactionsResponse>({
    queryKey: ["/api/users", id, "transactions", transactionFilters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: transactionFilters.page.toString(),
        limit: transactionFilters.limit.toString(),
        ...(transactionFilters.status !== "all" && { status: transactionFilters.status }),
        ...(transactionFilters.search && { search: transactionFilters.search }),
      });
      
      const response = await apiRequest.get<TransactionsResponse>(`/api/users/${id}/transactions?${params}`);

      return response;
    },
    enabled: !!id,
  });

  // New queries for wallets and balances
  const { data: userWallets, isLoading: walletsLoading } = useQuery<{ success: boolean; wallets: UserWallet[] }>({
    queryKey: ["/api/users", id, "wallets"],
    queryFn: async () => {
      const response = await apiRequest.get<{ success: boolean; wallets: UserWallet[] }>(`/api/users/${id}/wallets`);
      return response;
    },
  });

  const { data: userBalances, isLoading: balancesLoading } = useQuery<{ success: boolean; balances: UserBalances }>({
    queryKey: ["/api/users", id, "balances"],
    queryFn: async () => {
      const response = await apiRequest.get<{ success: boolean; balances: UserBalances }>(`/api/users/${id}/balances`);
      return response;
    },
  });

  // Mutation for freeze/unfreeze
  const freezeUnfreezeMutation = useMutation({
    mutationFn: async (action: 'freeze' | 'unfreeze') => {
      const response = await apiRequest.post(`/api/users/${id}/freeze-unfreeze`, {
        action,
        network: selectedNetwork,
        token: selectedToken
      });
      return response;
    },
    onSuccess: (data, action) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", id, "wallets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", id, "balances"] });
      toast({
        title: "Success",
        description: `User account ${action}d successfully`,
      });
      setShowFreezeModal(false);
      setShowUnfreezeModal(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update user account status",
        variant: "destructive",
      });
      setShowFreezeModal(false);
      setShowUnfreezeModal(false);
    },
  });

  // Mutation for wiping tokens
  const wipeTokensMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest.post(`/api/users/${id}/wipe-tokens`, {
        network: selectedNetwork,
        token: selectedToken
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", id, "balances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", id, "wallets"] });
      toast({
        title: "Success",
        description: `${selectedToken} tokens wiped successfully`,
      });
      setShowWipeModal(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to wipe user tokens",
        variant: "destructive",
      });
      setShowWipeModal(false);
    },
  });

  const getKycStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "suspended":
      case "frozen":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTransactionStatusColor = (status: string) => {
    switch (status) {
      case "approved":
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
      case "rejected":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getNetworkBadge = (network: string) => {
    switch (network?.toLowerCase()) {
      case "canton":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-800">
            Canton Network
          </Badge>
        );
      case "ethereum":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-800">
            Ethereum
          </Badge>
        );
      case "solana":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-800">
            Solana
          </Badge>
        );
      case "polyfog":
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-800">
            Polyfog
          </Badge>
        );
      default:
        return <Badge variant="outline">{network || "Unknown"}</Badge>;
    }
  };

  const handleFreezeUser = () => {
    console.log("here")
    if (selectedNetwork === 'public' && selectedWallet) {
      console.log("here if")

      // EVM freeze operation
      evmFreezeMutation.freeze({
        tokenType: selectedToken as 'gold' | 'silver',
        address: selectedWallet
      });
    } else {
      // Traditional freeze operation
      setShowFreezeModal(true);
    }
  };

  const handleUnfreezeUser = () => {
    if (selectedNetwork === 'public' && selectedWallet) {
      // EVM unfreeze operation
      evmUnfreezeMutation.unfreeze({
        tokenType: selectedToken as 'gold' | 'silver',
        address: selectedWallet
      });
    } else {
      // Traditional unfreeze operation
      setShowUnfreezeModal(true);
    }
  };

  const handleWipeTokens = () => {
    if (selectedNetwork === 'public' && selectedWallet) {
      // EVM wipe operation
      evmWipeMutation.wipe({
        tokenType: selectedToken as 'gold' | 'silver',
        address: selectedWallet
      });
    } else {
      // Traditional wipe operation
      setShowWipeModal(true);
    }
  };

  const confirmFreezeUser = () => {
    freezeUnfreezeMutation.mutate('freeze');
  };

  const confirmUnfreezeUser = () => {
    freezeUnfreezeMutation.mutate('unfreeze');
  };

  const confirmWipeTokens = () => {
    wipeTokensMutation.mutate();
  };

  // Helper function to check if user account is frozen (for Solana) or address is frozen (for Polygon)
  const isAccountFrozen = selectedNetwork === 'public' 
    ? evmFrozenStatusQuery.data || false
    : user?.account_status === 'frozen' || user?.account_status === 'suspended';

  if (userLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-32 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">User not found</h2>
        <p className="text-gray-600 mt-2">The user you're looking for doesn't exist.</p>
        <Button 
          onClick={() => setLocation("/user-management")}
          className="mt-4"
        >
          Back to User Management
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => setLocation("/user-management")}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center space-x-3">
            <User className="h-8 w-8 text-brand-gold" />
            <h1 className="text-3xl font-bold text-gray-900">User Details</h1>
          </div>
        </div>
      </div>

      {/* Network and Token Selection Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Account Management Controls</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Network and Token Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500 mb-2 block">Network</label>
              <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
                <SelectTrigger data-testid="select-network">
                  <SelectValue placeholder="Select Network" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solana">Solana</SelectItem>
                  <SelectItem value="public">Polygon</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500 mb-2 block">Token</label>
              <Select value={selectedToken} onValueChange={setSelectedToken}>
                <SelectTrigger data-testid="select-token">
                  <SelectValue placeholder="Select Token" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="silver">Silver</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500 mb-2 block">Wallet Address</label>
              <Select value={selectedWallet} onValueChange={setSelectedWallet}>
                <SelectTrigger data-testid="select-wallet">
                  <SelectValue placeholder="Select Wallet Address" />
                </SelectTrigger>
                <SelectContent>
                  {walletsLoading ? (
                    <SelectItem value="loading">Loading wallets...</SelectItem>
                  ) : !user?.wallets || user.wallets.length === 0 ? (
                    <SelectItem value="no-wallets">No wallets found</SelectItem>
                  ) : (
      user?.wallets?.filter(chain => chain.type === selectedNetwork)
                      .map((wallet) => (
                        <SelectItem key={wallet.address} value={wallet.address}>
                          {`${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`}
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* EVM Status Indicator */}
          {selectedNetwork === 'public' && selectedWallet && selectedToken && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <Wallet className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  Polygon Network - {selectedToken.toUpperCase()} Token Operations
                </span>
                {evmFrozenStatusQuery.isLoading && (
                  <span className="text-xs text-blue-600">Checking status...</span>
                )}
                {evmFrozenStatusQuery.data !== undefined && (
                  <Badge variant={evmFrozenStatusQuery.data ? "destructive" : "default"}>
                    {evmFrozenStatusQuery.data ? "Frozen" : "Active"}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Address: {selectedWallet.slice(0, 6)}...{selectedWallet.slice(-4)}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {selectedNetwork === 'public' ? (
              // EVM Operations for Polygon Network
              <>
                {!selectedWallet ? (
                  <div className="text-sm text-gray-500">
                    Select a Polygon wallet address to enable EVM operations
                  </div>
                ) : !import.meta.env.VITE_GOLD_TOKEN_CONTRACT && !import.meta.env.VITE_SILVER_TOKEN_CONTRACT ? (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 font-medium">EVM Operations Not Configured</p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Contract addresses not set. Please configure VITE_GOLD_TOKEN_CONTRACT and VITE_SILVER_TOKEN_CONTRACT environment variables.
                    </p>
                  </div>
                ) : !isAccountFrozen ? (
                  <Button
                    onClick={handleFreezeUser}
                    variant="outline"
                    className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                    disabled={evmFreezeMutation.isPending}
                    data-testid="button-freeze-address"
                  >
                    <Snowflake className="mr-2 h-4 w-4" />
                    {evmFreezeMutation.isPending ? 'Freezing...' : `Freeze ${selectedToken.toUpperCase()} Address`}
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={handleUnfreezeUser}
                      variant="outline"
                      className="border-green-300 text-green-700 hover:bg-green-50"
                      disabled={evmUnfreezeMutation.isPending}
                      data-testid="button-unfreeze-address"
                    >
                      <Unlock className="mr-2 h-4 w-4" />
                      {evmUnfreezeMutation.isPending ? 'Unfreezing...' : `Unfreeze ${selectedToken.toUpperCase()} Address`}
                    </Button>
                    <Button
                      onClick={handleWipeTokens}
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700"
                      disabled={evmWipeMutation.isPending}
                      data-testid="button-wipe-address-tokens"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {evmWipeMutation.isPending ? 'Wiping...' : `Wipe ${selectedToken.toUpperCase()} Tokens`}
                    </Button>
                  </>
                )}
              </>
            ) : (
              // Traditional Operations for Solana Network
              <>
                {!isAccountFrozen ? (
                  <Button
                    onClick={handleFreezeUser}
                    variant="outline"
                    className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                    data-testid="button-freeze-account"
                  >
                    <Snowflake className="mr-2 h-4 w-4" />
                    Freeze Account
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={handleUnfreezeUser}
                      variant="outline"
                      className="border-green-300 text-green-700 hover:bg-green-50"
                      data-testid="button-unfreeze-account"
                    >
                      <Unlock className="mr-2 h-4 w-4" />
                      Unfreeze Account
                    </Button>
                    <Button
                      onClick={handleWipeTokens}
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700"
                      data-testid="button-wipe-tokens"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Wipe Tokens
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* User Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Basic Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Name</label>
              <p className="text-gray-900" data-testid="text-user-name">
                {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.first_name || user.last_name || 'Not provided'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="text-gray-900" data-testid="text-user-email">{user.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Phone</label>
              <p className="text-gray-900" data-testid="text-user-phone">{user.phone_number || 'Not provided'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <Badge className={`${getStatusColor(user.account_status)} mt-1`} data-testid="badge-account-status">
                {user.account_status}
              </Badge>
            </div>
            {user.kycStatus && (
              <div>
                <label className="text-sm font-medium text-gray-500">KYC Status</label>
                <Badge className={`${getKycStatusColor(user.kycStatus)} mt-1`} data-testid="badge-kyc-status">
                  {user.kycStatus}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Token Balances */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5" />
              <span>Token Balances</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {balancesLoading ? (
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Gold Balance</label>
                    <p className="text-xl font-bold text-yellow-600" data-testid="text-gold-balance">
                      {userBalances?.balances?.gold || "0"} tokens
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Silver Balance</label>
                    <p className="text-xl font-bold text-gray-500" data-testid="text-silver-balance">
                      {userBalances?.balances?.silver || "0"} tokens
                    </p>
                  </div>
                </div>
                <Separator />
                <div>
                  <label className="text-sm font-medium text-gray-500">Total Wallets</label>
                  <p className="text-gray-900" data-testid="text-total-wallets">
                    {userBalances?.balances?.totalWallets || 0}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Wallet Addresses Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wallet className="h-5 w-5" />
            <span>Connected Wallet Addresses</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="solana" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="solana" data-testid="tab-solana-wallets">
                Solana Wallets
              </TabsTrigger>
              <TabsTrigger value="polygon" data-testid="tab-polygon-wallets">
                Polygon Wallets
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="solana" className="mt-4">
              <div className="space-y-3">
                {walletsLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
                    ))}
                  </div>
                ) : user?.wallets?.filter(wallet => wallet.type === 'solana').length === 0 ? (
                  <div className="text-center py-8 text-gray-500" data-testid="text-no-solana-wallets">
                    <Wallet className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <p>No Solana wallets found</p>
                  </div>
                ) : (
                  user?.wallets?.filter(wallet => wallet.type === 'solana').map((wallet, index) => (
                    <div 
                      key={`${wallet.address}-${index}`} 
                      className="flex items-center justify-between p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                      data-testid={`wallet-solana-${index}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 break-all">
                          {wallet.address}
                        </p>
                        <p className="text-xs text-gray-500">Solana Network</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyWallet(wallet.address)}
                        className="ml-3 flex-shrink-0"
                        data-testid={`button-copy-solana-${index}`}
                      >
                        {copiedWallet === wallet.address ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="polygon" className="mt-4">
              <div className="space-y-3">
                {walletsLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
                    ))}
                  </div>
                ) : user?.wallets?.filter(wallet => wallet.type === 'public').length === 0 ? (
                  <div className="text-center py-8 text-gray-500" data-testid="text-no-polygon-wallets">
                    <Wallet className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <p>No Polygon wallets found</p>
                  </div>
                ) : (
                  user?.wallets?.filter(wallet => wallet.type === 'public').map((wallet, index) => (
                    <div 
                      key={`${wallet.address}-${index}`} 
                      className="flex items-center justify-between p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                      data-testid={`wallet-polygon-${index}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 break-all">
                          {wallet.address}
                        </p>
                        <p className="text-xs text-gray-500">Polygon Network</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyWallet(wallet.address)}
                        className="ml-3 flex-shrink-0"
                        data-testid={`button-copy-polygon-${index}`}
                      >
                        {copiedWallet === wallet.address ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Transaction History</span>
            <Badge variant="secondary" data-testid="text-transaction-count">
              {transactions?.pagination?.totalItems || 0} transactions
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <Select 
                  value={transactionFilters.status} 
                  onValueChange={(value) => 
                    setTransactionFilters(prev => ({ ...prev, status: value, page: 1 }))
                  }
                >
                  <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search transactions..."
                  value={transactionFilters.search}
                  onChange={(e) => 
                    setTransactionFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))
                  }
                  className="pl-10 w-[250px]"
                  data-testid="input-search-transactions"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Show:</span>
              <Select 
                value={transactionFilters.limit.toString()} 
                onValueChange={(value) => 
                  setTransactionFilters(prev => ({ ...prev, limit: parseInt(value), page: 1 }))
                }
              >
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-600">per page</span>
            </div>
          </div>

          {/* Transaction Table */}
          {transactionsLoading ? (
            <div className="space-y-4">
              {[...Array(transactionFilters.limit)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          ) : (!transactions || !transactions?.data || !Array.isArray(transactions.data) || transactions.data.length === 0) ? (
            <div className="text-center py-8 text-gray-500" data-testid="text-no-transactions">
              <Calendar className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p>No transactions found</p>
              {transactionFilters.search && (
                <p className="text-sm mt-1">Try adjusting your search or filters</p>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Amount(USD)</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Network</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions?.data && Array.isArray(transactions.data) && transactions.data.length > 0 && transactions.data.map((transaction: Transaction, index: number) => (
                    <TableRow key={transaction?._id || index} data-testid={`row-transaction-${index}`}>
                      <TableCell className="capitalize">
                        <span className={transaction?.assetType === 'gold' ? 'text-yellow-600 font-medium' : 'text-gray-500 font-medium'}>
                          {transaction?.assetType || 'Unknown'}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {transaction?.tokenAmount ? `${Number(transaction.tokenAmount).toFixed(6)} tokens` : '0 tokens'}
                      </TableCell>
                      <TableCell className="font-medium">
                        ${transaction?.usdAmount || '0.00'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {transaction?.fee ? `$${Number(transaction.fee).toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getTransactionStatusColor(transaction?.status)} text-xs`}>
                          {transaction?.status?.toUpperCase() || 'UNKNOWN'}
                        </Badge>
                      </TableCell>
                      <TableCell>{getNetworkBadge(transaction?.network?.toUpperCase() || "ETHEREUM")}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {transaction?.transactionDate 
                          ? new Date(transaction.transactionDate).toLocaleDateString() 
                          : transaction?.createdAt 
                            ? new Date(transaction.createdAt).toLocaleDateString()
                            : 'Unknown'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              {transactions?.pagination && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    Showing {((transactionFilters.page - 1) * transactionFilters.limit) + 1} to{' '}
                    {Math.min(transactionFilters.page * transactionFilters.limit, transactions.pagination.totalItems)} of{' '}
                    {transactions.pagination.totalItems} results
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTransactionFilters(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                      disabled={transactionFilters.page <= 1}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: transactions.pagination.totalPages }, (_, i) => i + 1)
                        .filter(pageNum => {
                          const currentPage = transactionFilters.page;
                          return pageNum === 1 || 
                                 pageNum === transactions.pagination?.totalPages || 
                                 Math.abs(pageNum - currentPage) <= 1;
                        })
                        .map((pageNum, index, array) => (
                          <div key={pageNum}>
                            {index > 0 && array[index - 1] !== pageNum - 1 && (
                              <span className="px-2 text-gray-400">...</span>
                            )}
                            <Button
                              variant={pageNum === transactionFilters.page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setTransactionFilters(prev => ({ ...prev, page: pageNum }))}
                              className="w-10"
                              data-testid={`button-page-${pageNum}`}
                            >
                              {pageNum}
                            </Button>
                          </div>
                        ))
                      }
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTransactionFilters(prev => ({ ...prev, page: Math.min(transactions.pagination?.totalPages || 1, prev.page + 1) }))}
                      disabled={transactionFilters.page >= (transactions.pagination?.totalPages || 1)}
                      data-testid="button-next-page"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={showFreezeModal}
        onClose={() => setShowFreezeModal(false)}
        onConfirm={confirmFreezeUser}
        title="Freeze User Account"
        description={`Are you sure you want to freeze ${user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.first_name || user.last_name || 'this user'}'s account? This will prevent them from performing any transactions on the ${selectedNetwork} network for ${selectedToken} tokens.`}
        confirmText="Freeze Account"
        variant="warning"
        isLoading={freezeUnfreezeMutation.isPending}
      />

      <ConfirmationModal
        isOpen={showUnfreezeModal}
        onClose={() => setShowUnfreezeModal(false)}
        onConfirm={confirmUnfreezeUser}
        title="Unfreeze User Account"
        description={`Are you sure you want to unfreeze ${user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.first_name || user.last_name || 'this user'}'s account? This will restore their access to perform transactions.`}
        confirmText="Unfreeze Account"
        variant="success"
        isLoading={freezeUnfreezeMutation.isPending}
      />

      <ConfirmationModal
        isOpen={showWipeModal}
        onClose={() => setShowWipeModal(false)}
        onConfirm={confirmWipeTokens}
        title="Wipe User Tokens"
        description={`Are you sure you want to wipe all ${selectedToken} tokens for this user on the ${selectedNetwork} network? This action cannot be undone and will set their token balance to 0.`}
        confirmText="Wipe Tokens"
        variant="danger"
        isLoading={wipeTokensMutation.isPending}
      />
    </div>
  );
}