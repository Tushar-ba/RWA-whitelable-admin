import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, Eye, Link, Unlink, Snowflake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { type Wallet } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

export default function WalletManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [isWalletDetailOpen, setIsWalletDetailOpen] = useState(false);
  const { toast } = useToast();

  const { data: wallets = [], isLoading } = useQuery<Wallet[]>({
    queryKey: ["/api/wallets"],
  });

  const updateWalletMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Wallet> }) => {
      const response = await apiRequest("PUT", `/api/wallets/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      toast({
        title: "Success",
        description: "Wallet updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update wallet",
        variant: "destructive",
      });
    },
  });

  const filteredWallets = wallets.filter((wallet) => {
    const matchesSearch = (wallet.userEmail && wallet.userEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         wallet.walletId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         wallet.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || wallet.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case "frozen":
        return <Badge variant="destructive">Frozen</Badge>;
      case "unlinked":
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Unlinked</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleLinkWallet = (wallet: Wallet) => {
    // In a real app, this would open a dialog to select a user
    const email = prompt("Enter user email to link to this wallet:");
    if (email) {
      updateWalletMutation.mutate({
        id: wallet.id,
        data: { userEmail: email, status: "active" },
      });
    }
  };

  const handleUnlinkWallet = (wallet: Wallet) => {
    updateWalletMutation.mutate({
      id: wallet.id,
      data: { userEmail: null, status: "unlinked" },
    });
  };

  const handleFreezeWallet = (wallet: Wallet) => {
    const newStatus = wallet.status === "frozen" ? "active" : "frozen";
    updateWalletMutation.mutate({
      id: wallet.id,
      data: { status: newStatus },
    });
  };

  const handleViewWallet = (wallet: Wallet) => {
    setSelectedWallet(wallet);
    setIsWalletDetailOpen(true);
  };

  const formatBalance = (balance: string | number) => {
    return Number(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  };

  const truncateAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Wallet Management</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search wallets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="frozen">Frozen</SelectItem>
                  <SelectItem value="unlinked">Unlinked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Wallet ID</TableHead>
                <TableHead>User Email</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>GLD Balance</TableHead>
                <TableHead>SLV Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWallets.map((wallet) => (
                <TableRow 
                  key={wallet.id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleViewWallet(wallet)}
                >
                  <TableCell className="font-medium">{wallet.walletId}</TableCell>
                  <TableCell>
                    {wallet.userEmail || (
                      <span className="text-gray-500 italic">Unlinked</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {truncateAddress(wallet.address)}
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                      {formatBalance(wallet.goldBalance || 0)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center">
                      <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                      {formatBalance(wallet.silverBalance || 0)}
                    </span>
                  </TableCell>
                  <TableCell>{getStatusBadge(wallet.status)}</TableCell>
                  <TableCell>{formatDate(wallet.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewWallet(wallet)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {wallet.userEmail ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnlinkWallet(wallet)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Unlink className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLinkWallet(wallet)}
                          className="text-green-600 hover:text-green-900"
                        >
                          <Link className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFreezeWallet(wallet)}
                        className={wallet.status === "frozen" 
                          ? "text-green-600 hover:text-green-900" 
                          : "text-orange-600 hover:text-orange-900"
                        }
                      >
                        <Snowflake className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredWallets.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No wallets found matching your criteria
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">1</span> to{" "}
              <span className="font-medium">{Math.min(filteredWallets.length, 10)}</span> of{" "}
              <span className="font-medium">{filteredWallets.length}</span> results
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              <Button variant="outline" size="sm" className="bg-brand-brown text-white">
                1
              </Button>
              <Button variant="outline" size="sm" disabled>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wallet Detail Dialog */}
      <Dialog open={isWalletDetailOpen} onOpenChange={setIsWalletDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Wallet Details</DialogTitle>
          </DialogHeader>
          {selectedWallet && (
            <div className="space-y-6">
              {/* Wallet Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-600">Wallet ID</p>
                  <p className="text-sm text-gray-900">{selectedWallet.walletId}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedWallet.status)}</div>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-gray-600">Address</p>
                  <p className="text-sm text-gray-900 font-mono break-all">{selectedWallet.address}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">User Email</p>
                  <p className="text-sm text-gray-900">
                    {selectedWallet.userEmail || <span className="italic text-gray-500">Unlinked</span>}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Created Date</p>
                  <p className="text-sm text-gray-900">{formatDate(selectedWallet.createdAt)}</p>
                </div>
              </div>

              {/* Balances */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                      Gold Balance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatBalance(selectedWallet.goldBalance || 0)} GLD
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center">
                      <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
                      Silver Balance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatBalance(selectedWallet.silverBalance || 0)} SLV
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Transaction History Placeholder */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Transaction History</h4>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Token</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                          No transaction history available
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                {selectedWallet.userEmail ? (
                  <Button
                    onClick={() => handleUnlinkWallet(selectedWallet)}
                    variant="destructive"
                    className="flex-1"
                  >
                    Unlink Wallet
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleLinkWallet(selectedWallet)}
                    variant="default"
                    className="flex-1 bg-brand-brown hover:bg-brand-brown/90"
                  >
                    Link to User
                  </Button>
                )}
                <Button
                  onClick={() => handleFreezeWallet(selectedWallet)}
                  variant={selectedWallet.status === "frozen" ? "default" : "destructive"}
                  className="flex-1"
                >
                  {selectedWallet.status === "frozen" ? "Unfreeze Transactions" : "Snowflake Transactions"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
