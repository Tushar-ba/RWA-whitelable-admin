import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import {
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";

// Define proper interface for the actual backend response structure
interface IPurchaseHistoryResponse {
  _id: string;
  userId: {
    _id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  metal: "gold" | "silver";
  tokenAmount: string;
  usdAmount: string;
  feeAmount: string;
  date: string;
  time: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  networkType: "private" | "public";
  paymentMethod:
    | "credit_card"
    | "bank_transfer"
    | "crypto"
    | "wire_transfer"
    | "wallet";
  transactionHash?: string;
  walletAddress: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

interface ApiResponse {
  success: boolean;
  data: {
    data: IPurchaseHistoryResponse[];
    pagination: PaginationInfo;
    summary: {
      totalRequests: number;
      totalValue: number;
      averageValue: number;
    };
  };
}

export default function PurchaseRequests() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assetFilter, setAssetFilter] = useState("all");
  const [networkFilter, setNetworkFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { data: response, isLoading } = useQuery<ApiResponse>({
    queryKey: ["/api/purchase-requests"],
  });

  // Refetch data whenever the page loads or user navigates to this page
  useEffect(() => {
    queryClient.invalidateQueries({
      queryKey: ["/api/purchase-requests"],
    });
  }, []);

  const requests = Array.isArray(response?.data?.data)
    ? response?.data?.data
    : [];
  const pagination = response?.data?.pagination;

  console.log(requests, "requests");

  // Filter requests based on search and filter criteria
  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      request.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request._id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false;

    const matchesStatus =
      statusFilter === "all" || request.status === statusFilter;
    const matchesAsset = assetFilter === "all" || request.metal === assetFilter;
    const matchesNetwork =
      networkFilter === "all" || request.networkType === networkFilter;
    return matchesSearch && matchesStatus && matchesAsset && matchesNetwork;
  });

  // Calculate pagination for filtered results
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRequests = filteredRequests.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

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
      case "asset":
        setAssetFilter(value);
        break;
      case "network":
        setNetworkFilter(value);
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

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString();
  };

  const formatCurrency = (amount: string | number) => {
    return `$${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <div className="w-3 h-3 mr-1 rounded-full bg-blue-500"></div>
            Processing
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <div className="w-3 h-3 mr-1 rounded-full bg-yellow-500"></div>
            Pending
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getKYCBadge = (status: string) => {
    switch (status) {
      case "verified":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Verified
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            Pending
          </Badge>
        );
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getAssetBadge = (asset: string) => {
    return (
      <Badge
        variant="outline"
        className={
          asset === "gold"
            ? "bg-yellow-50 text-yellow-800"
            : "bg-gray-50 text-gray-800"
        }
      >
        <div
          className={`w-2 h-2 rounded-full mr-2 ${
            asset === "gold" ? "bg-yellow-500" : "bg-gray-400"
          }`}
        ></div>
        {asset === "gold" ? "Gold (Au)" : "Silver (Ag)"}
      </Badge>
    );
  };

  const getNetworkBadge = (network: string) => {
    switch (network) {
      case "public":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-800">
            <div className="w-2 h-2 rounded-full mr-2 bg-blue-500"></div>
            Public Network
          </Badge>
        );
      case "private":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-800">
            <div className="w-2 h-2 rounded-full mr-2 bg-purple-500"></div>
            Private Network
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-800">
            <div className="w-2 h-2 rounded-full mr-2 bg-gray-400"></div>
            {network}
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 bg-gray-200 rounded animate-pulse"
                ></div>
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
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Purchase Request Management
          </h1>
          {response?.data?.summary && (
            <div className="mt-2 text-sm text-gray-600">
              Total: {response.data.summary.totalRequests} requests • Value:{" "}
              {formatCurrency(response.data.summary.totalValue)} • Average:{" "}
              {formatCurrency(response.data.summary.averageValue)}
            </div>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search requests..."
                  value={searchTerm}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="pl-10"
                  data-testid="input-search-requests"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => handleFilterChange("status", value)}
              >
                <SelectTrigger
                  className="w-32"
                  data-testid="select-status-filter"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={assetFilter}
                onValueChange={(value) => handleFilterChange("asset", value)}
              >
                <SelectTrigger
                  className="w-32"
                  data-testid="select-asset-filter"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assets</SelectItem>
                  <SelectItem value="gold">Gold (Au)</SelectItem>
                  <SelectItem value="silver">Silver (Ag)</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={networkFilter}
                onValueChange={(value) => handleFilterChange("network", value)}
              >
                <SelectTrigger
                  className="w-40"
                  data-testid="select-network-filter"
                >
                  <SelectValue placeholder="Network" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Networks</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>USD Amount</TableHead>
                <TableHead>Fee Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Chain/Network</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRequests.map((request) => (
                <TableRow
                  key={request._id}
                  data-testid={`row-request-${request._id}`}
                >
                  <TableCell data-testid={`text-user-${request._id}`}>
                    {request.userId?.email ||
                      `${request.userId?.first_name || ""} ${request.userId?.last_name || ""}`.trim() ||
                      "No Email"}
                  </TableCell>

                  <TableCell data-testid={`badge-asset-${request._id}`}>
                    {getAssetBadge(request.metal)}
                  </TableCell>
                  <TableCell data-testid={`text-usd-amount-${request._id}`}>
                    {formatCurrency(request.usdAmount)}
                  </TableCell>
                  <TableCell data-testid={`text-fee-amount-${request._id}`}>
                    {formatCurrency(request.feeAmount)} (Fee)
                  </TableCell>
                  <TableCell data-testid={`badge-status-${request._id}`}>
                    {getStatusBadge(request.status)}
                  </TableCell>
                  <TableCell data-testid={`badge-network-${request._id}`}>
                    {getNetworkBadge(request.networkType)}
                  </TableCell>
                  <TableCell>
                    <Link href={`/purchase-requests/${request._id}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-900"
                        data-testid={`button-view-${request._id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredRequests.length === 0 && (
            <div
              className="text-center py-8 text-gray-500"
              data-testid="text-no-results"
            >
              No purchase requests found matching your criteria
            </div>
          )}

          {/* Pagination */}
          {filteredRequests.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <div
                  className="text-sm text-gray-700"
                  data-testid="text-pagination-info"
                >
                  Showing{" "}
                  <span className="font-medium">
                    {Math.min(startIndex + 1, filteredRequests.length)}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium">
                    {Math.min(
                      startIndex + itemsPerPage,
                      filteredRequests.length,
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium">{filteredRequests.length}</span>{" "}
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
    </div>
  );
}
