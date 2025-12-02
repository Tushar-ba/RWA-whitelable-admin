import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, ArrowRightLeft, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { CSVLink } from "react-csv";
import { formatDate } from "@/utils";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TransferTransaction {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  assetType: "gold" | "silver";
  amount: number;
  totalValue: number;
  status: "completed" | "pending" | "failed" | "cancelled";
  transactionDate: Date;
  transferType: "internal" | "external";
  fee: number;
  network?: string;
}

export default function TransferTransaction() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [metalFilter, setMetalFilter] = useState("all");
  const [networkFilter, setNetworkFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: transactionResponse, isLoading } = useQuery<{
    data: TransferTransaction[];
    pagination: any;
    summary: any;
  }>({
    queryKey: ["/api/transactions/transfer"],
  });

  const transactions = transactionResponse?.data?.data || [];

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.fromUserName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.toUserName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || transaction.status === statusFilter;
    const matchesMetal = metalFilter === "all" || transaction.assetType === metalFilter;
    const matchesNetwork = networkFilter === "all" || transaction.network === networkFilter;
    const matchesType = typeFilter === "all" || transaction.transferType === typeFilter;
    return matchesSearch && matchesStatus && matchesMetal && matchesNetwork && matchesType;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + itemsPerPage);

  // CSV export data
  const csvData = filteredTransactions.map(transaction => ({
    'Transaction ID': transaction.id,
    'From': transaction.fromUserName,
    'To': transaction.toUserName,
    'Asset Type': transaction.assetType,
    'Amount': `${transaction.amount} oz`,
    'Value': `$${transaction.totalValue}`,
    'Fee': `$${transaction.fee}`,
    'Type': transaction.transferType,
    'Status': transaction.status,
    'Network': transaction.network || 'ethereum',
    'Date': formatDate(transaction.transactionDate)
  }));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "default";
      case "pending": return "secondary";
      case "failed": return "destructive";
      case "cancelled": return "outline";
      default: return "secondary";
    }
  };

  const getNetworkBadge = (network: string) => {
    switch (network) {
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
      default:
        return <Badge variant="outline">{network}</Badge>;
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

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

  const totalTransactions = filteredTransactions.length;
  const completedTransactions = filteredTransactions.filter(t => t.status === "completed").length;
  const totalValue = filteredTransactions
    .filter(t => t.status === "completed")
    .reduce((sum, t) => sum + t.totalValue, 0);
  const totalFees = filteredTransactions
    .filter(t => t.status === "completed")
    .reduce((sum, t) => sum + t.fee, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Transfer Transactions</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transfers</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-brand-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions}</div>
            <p className="text-xs text-gray-600">All transfer transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <div className="h-4 w-4 bg-green-500 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedTransactions}</div>
            <p className="text-xs text-gray-600">Successfully transferred</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <div className="h-4 w-4 bg-brand-gold rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-brand-brown">{formatCurrency(totalValue)}</div>
            <p className="text-xs text-gray-600">Completed transfers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fees</CardTitle>
            <div className="h-4 w-4 bg-blue-500 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalFees)}</div>
            <p className="text-xs text-gray-600">Collected fees</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by sender, recipient, or transaction ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={metalFilter} onValueChange={setMetalFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Asset Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assets</SelectItem>
            <SelectItem value="gold">Gold</SelectItem>
            <SelectItem value="silver">Silver</SelectItem>
          </SelectContent>
        </Select>

        <Select value={networkFilter} onValueChange={setNetworkFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Network" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Networks</SelectItem>
            <SelectItem value="canton">Canton Network</SelectItem>
            <SelectItem value="ethereum">Ethereum</SelectItem>
            <SelectItem value="solana">Solana</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Transfer Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="internal">Internal</SelectItem>
            <SelectItem value="external">External</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Transfer Transaction History</CardTitle>
            <CSVLink
              data={csvData}
              filename={`transfer-transactions-${new Date().toISOString().split('T')[0]}.csv`}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-brand-brown hover:bg-brand-brown/90 rounded-md transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </CSVLink>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction ID</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Asset Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Chain/Network</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-mono text-sm">
                    {transaction.id}
                  </TableCell>
                  <TableCell className="font-medium">
                    {transaction.fromUserName}
                  </TableCell>
                  <TableCell className="font-medium">
                    {transaction.toUserName}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <div className={`h-3 w-3 rounded-full ${
                        transaction.assetType === 'gold' ? 'bg-yellow-500' : 'bg-gray-400'
                      }`}></div>
                      <span className="capitalize">{transaction.assetType}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {transaction.amount} oz
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(transaction.totalValue)}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(transaction.fee)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {transaction.transferType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(transaction.status)}>
                      {transaction.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getNetworkBadge(transaction.network || "ethereum")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{startIndex + 1}</span> to{" "}
                <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredTransactions.length)}</span> of{" "}
                <span className="font-medium">{filteredTransactions.length}</span> results
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(page)}
                      className={currentPage === page ? "bg-brand-brown text-white" : ""}
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {filteredTransactions.length === 0 && (
        <div className="text-center py-12">
          <ArrowRightLeft className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No transfer transactions found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your search criteria or filters.
          </p>
        </div>
      )}
    </div>
  );
}