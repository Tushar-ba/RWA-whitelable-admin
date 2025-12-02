import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Eye, Gift, Bell, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TransactionHash } from "@/components/TransactionHash";
import { type GiftingTransaction } from "@shared/schema";

export default function GiftingManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [tokenFilter, setTokenFilter] = useState("all");

  const { data: transactions = [], isLoading } = useQuery<GiftingTransaction[]>({
    queryKey: ["/api/gifting-transactions"],
  });

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch = transaction.senderWallet.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.receiverWallet.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.giftId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesToken = tokenFilter === "all" || transaction.token === tokenFilter;
    return matchesSearch && matchesToken;
  });

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "";
    return new Date(date).toLocaleString();
  };

  const getTokenBadge = (token: string) => {
    return (
      <Badge variant="outline" className={token === "GLD" ? "bg-yellow-50 text-yellow-800" : "bg-gray-50 text-gray-800"}>
        <div className={`w-2 h-2 rounded-full mr-2 ${
          token === "GLD" ? "bg-yellow-500" : "bg-gray-400"
        }`}></div>
        {token}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const truncateWallet = (wallet: string) => {
    return `${wallet.substring(0, 8)}...${wallet.substring(wallet.length - 6)}`;
  };

  const totalTransactions = transactions.length;
  const totalVolume = transactions.reduce((sum, t) => sum + parseFloat(t.quantity), 0);
  const goldTransactions = transactions.filter(t => t.token === "GLD").length;
  const silverTransactions = transactions.filter(t => t.token === "SLV").length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Gifting Management</h1>
        <div className="flex items-center space-x-4">
          <Button variant="outline" className="text-blue-600 border-blue-600 hover:bg-blue-50">
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Gifts</p>
                <p className="text-3xl font-bold text-gray-900">{totalTransactions}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Gift className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-green-500 text-sm font-medium">+5.2%</span>
              <span className="text-gray-500 text-sm ml-2">from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Volume</p>
                <p className="text-3xl font-bold text-gray-900">{totalVolume.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <div className="w-6 h-6 bg-green-600 rounded"></div>
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-green-500 text-sm font-medium">+12.5%</span>
              <span className="text-gray-500 text-sm ml-2">tokens transferred</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Gold Gifts</p>
                <p className="text-3xl font-bold text-gray-900">{goldTransactions}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <div className="w-6 h-6 bg-yellow-500 rounded-full"></div>
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-gray-500 text-sm">
                {totalTransactions > 0 ? Math.round((goldTransactions / totalTransactions) * 100) : 0}% of total
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Silver Gifts</p>
                <p className="text-3xl font-bold text-gray-900">{silverTransactions}</p>
              </div>
              <div className="p-3 bg-gray-100 rounded-full">
                <div className="w-6 h-6 bg-gray-400 rounded-full"></div>
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-gray-500 text-sm">
                {totalTransactions > 0 ? Math.round((silverTransactions / totalTransactions) * 100) : 0}% of total
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Gifting Transactions</CardTitle>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={tokenFilter} onValueChange={setTokenFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tokens</SelectItem>
                  <SelectItem value="GLD">Gold (GLD)</SelectItem>
                  <SelectItem value="SLV">Silver (SLV)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction Hash</TableHead>
                <TableHead>Sender</TableHead>
                <TableHead>Receiver Wallet</TableHead>
                <TableHead>Token</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction: any) => (
                <TableRow key={transaction.id || transaction._id}>
                  <TableCell>
                    <TransactionHash 
                      hash={transaction.transactionHash} 
                      data-testid={`txn-hash-${transaction.id || transaction._id}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {transaction?.userId?.first_name && transaction?.userId?.last_name 
                      ? `${transaction.userId.first_name} ${transaction.userId.last_name}`
                      : transaction?.userId?.email || 'Unknown User'}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {truncateWallet(transaction.receiverWallet || transaction.recipientWallet)}
                  </TableCell>
                  <TableCell>{getTokenBadge(transaction.token)}</TableCell>
                  <TableCell className="font-medium">
                    {parseFloat(transaction.quantity).toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 6 
                    })}
                  </TableCell>
                  <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                  <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-900">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredTransactions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No gifting transactions found matching your criteria
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">1</span> to{" "}
              <span className="font-medium">{Math.min(filteredTransactions.length, 10)}</span> of{" "}
              <span className="font-medium">{filteredTransactions.length}</span> results
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              <Button size="sm">
                1
              </Button>
              <Button variant="outline" size="sm" disabled>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Notification Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-green-800">Real-time Monitoring Active</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 p-4 bg-green-50 rounded-lg">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <div>
              <p className="font-medium text-green-800">Live Notification System</p>
              <p className="text-sm text-green-600">
                Automatically receiving alerts for new gifting transactions. Email notifications are sent for all transfers.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
