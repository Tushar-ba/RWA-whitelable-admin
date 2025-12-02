import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Gift,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { CSVLink } from "react-csv";
import { formatDate } from "@/utils";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TransactionHash } from "@/components/TransactionHash";

interface GiftingTransaction {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  assetType: "gold" | "silver";
  amount: number;
  totalValue: number;
  status: "completed" | "pending" | "failed" | "cancelled";
  transactionDate: Date;
  message?: string;
}

export default function GiftingTransaction() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [metalFilter, setMetalFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { data: transactionResponse, isLoading } = useQuery<{
    success: boolean;
    data: {
      data: any[];
      pagination: any;
      summary: any;
    };
  }>({
    queryKey: ["/api/transactions/gifting"],
  });

  const transactions = transactionResponse?.data?.data || [];

  const filteredTransactions = transactions.filter((transaction: any) => {
    const matchesSearch =
      (transaction.senderName || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (transaction.recipientName || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (transaction.id || transaction._id || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || transaction.status === statusFilter;
    const matchesMetal =
      metalFilter === "all" || transaction.assetType === metalFilter;
    return matchesSearch && matchesStatus && matchesMetal;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  // CSV export data
  const csvData = filteredTransactions.map((transaction: any) => ({
    "Transaction ID": transaction.id,
    Sender: transaction.senderName,
    Recipient: transaction.recipientWalletAddress,
    "Asset Type": transaction.assetType,
    Amount: `${transaction.amount} oz`,
    Value: `$${transaction.totalValue}`,
    Status: transaction.status,
    Message: transaction.message || "No message",
    Date: formatDate(transaction.transactionDate),
  }));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "pending":
        return "secondary";
      case "failed":
        return "destructive";
      case "cancelled":
        return "outline";
      default:
        return "secondary";
    }
  };

  // Reset current page when filters change
  const handleFilterChange = (filterType: string, value: string) => {
    setCurrentPage(1);
    switch (filterType) {
      case "search":
        setSearchTerm(value);
        break;
      case "status":
        setStatusFilter(value);
        break;
      case "metal":
        setMetalFilter(value);
        break;
    }
  };

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Generate page numbers for pagination controls
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    return pageNumbers;
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
  const completedTransactions = filteredTransactions.filter(
    (t: any) => t.status === "completed" || t.status === "success",
  ).length;
  const totalValue = filteredTransactions
    .filter((t: any) => t.status === "completed")
    .reduce((sum: number, t: any) => sum + (t.totalValue || 0), 0);
  const pendingTransactions = filteredTransactions.filter(
    (t: any) => t.status === "pending",
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">
          Gifting Transactions
        </h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gifts</CardTitle>
            <Gift className="h-4 w-4 text-brand-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions}</div>
            <p className="text-xs text-gray-600">All gifting transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <div className="h-4 w-4 bg-green-500 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {completedTransactions}
            </div>
            <p className="text-xs text-gray-600">Successfully gifted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <div className="h-4 w-4 bg-brand-gold rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-brand-brown">
              {formatCurrency(totalValue)}
            </div>
            <p className="text-xs text-gray-600">Completed gifts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <div className="h-4 w-4 bg-yellow-500 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {pendingTransactions}
            </div>
            <p className="text-xs text-gray-600">Awaiting confirmation</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by sender, recipient..."
            value={searchTerm}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            className="pl-10"
            data-testid="input-search-transactions"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(value) => handleFilterChange("status", value)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value={"completed" || "success"}>Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={metalFilter}
          onValueChange={(value) => handleFilterChange("metal", value)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Asset Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assets</SelectItem>
            <SelectItem value="GOLD">Gold</SelectItem>
            <SelectItem value="SILVER">Silver</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Gifting Transaction History</CardTitle>
            <CSVLink
              data={csvData}
              filename={`gifting-transactions-${new Date().toISOString().split("T")[0]}.csv`}
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
                <TableHead>Transaction Hash</TableHead>
                <TableHead>Sender</TableHead>
                <TableHead>Recipient Wallet Add</TableHead>
                <TableHead>Asset Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransactions.map((transaction: any) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-mono text-sm">
                    <TransactionHash
                      hash={transaction.transactionHash}
                      data-testid={`txn-hash-${transaction.id || transaction._id}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {transaction.senderName}
                  </TableCell>
                  <TableCell className="font-medium">
                    <TransactionHash
                      hash={transaction.recipientWalletAddress}
                      data-textid={`txn-hash-${transaction.recipientWalletAddress}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <div
                        className={`h-3 w-3 rounded-full ${
                          transaction.assetType === "gold"
                            ? "bg-yellow-500"
                            : "bg-gray-400"
                        }`}
                      ></div>
                      <span className="capitalize">
                        {transaction.assetType}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{transaction.amount} oz</TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(transaction.totalValue)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(transaction.status)}>
                      {transaction.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="text-sm text-gray-600 truncate">
                      {transaction.message || "No message"}
                    </p>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {filteredTransactions.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <div
                  className="text-sm text-gray-700"
                  data-testid="text-pagination-info"
                >
                  Showing{" "}
                  <span className="font-medium">
                    {Math.min(startIndex + 1, filteredTransactions.length)}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium">
                    {Math.min(
                      startIndex + itemsPerPage,
                      filteredTransactions.length,
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium">
                    {filteredTransactions.length}
                  </span>{" "}
                  results
                </div>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger
                    className="w-20"
                    data-testid="select-items-per-page"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-gray-700">per page</span>
              </div>

              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  data-testid="button-previous-page"
                  className="flex items-center"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>

                {getPageNumbers().map((pageNumber) => (
                  <Button
                    key={pageNumber}
                    variant={currentPage === pageNumber ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNumber)}
                    className={
                      currentPage === pageNumber
                        ? "bg-primary text-primary-foreground"
                        : ""
                    }
                    data-testid={`button-page-${pageNumber}`}
                  >
                    {pageNumber}
                  </Button>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  data-testid="button-next-page"
                  className="flex items-center"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {filteredTransactions.length === 0 && (
        <div className="text-center py-12">
          <Gift className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">
            No gifting transactions found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your search criteria or filters.
          </p>
        </div>
      )}
    </div>
  );
}
