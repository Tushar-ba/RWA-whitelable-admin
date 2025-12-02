import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Search,
  Eye,
  Play,
  CheckCircle,
  Clock,
  Truck,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { CSVLink } from "react-csv";
import { formatDate } from "@/utils";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { type RedemptionRequest } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

export default function RedemptionRequests() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] =
    useState<RedemptionRequest | null>(null);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [fulfillmentMethod, setFulfillmentMethod] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const {
    data: response,
    isLoading,
    error,
  } = useQuery<{
    success: boolean;
    data: { data: RedemptionRequest[]; pagination: any; summary: any };
  }>({
    queryKey: [
      "/api/transactions/redemption-requests",
      {
        search: searchTerm,
        status: statusFilter === "all" ? undefined : statusFilter,
        page: currentPage,
        limit: itemsPerPage,
      },
    ],
    queryFn: () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (statusFilter !== "all") params.append("status", statusFilter);
      params.append("page", currentPage.toString());
      params.append("limit", itemsPerPage.toString());

      return apiRequest.get(
        `/api/transactions/redemption-requests?${params.toString()}`,
      );
    },
  });

  // Debug logging - remove in production
  // console.log('Response from API:', response);
  // console.log('Response.data.data:', response?.data?.data);
  // console.log('Is response.data.data an array:', Array.isArray(response?.data?.data));

  const requests = Array.isArray(response?.data?.data)
    ? response.data.data
    : [];
  console.log(requests, "requestsrequestsrequests");
  const formatDateSafe = (date: Date | string | null | undefined) => {
    if (!date) return "";
    return formatDate(date);
  };

  const updateRequestMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<RedemptionRequest>;
    }) => {
      const response = await apiRequest.put(
        `/api/transactions/redemption-requests/${id}`,
        data,
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/transactions/redemption-requests"],
      });
      toast({
        title: "Success",
        description: "Request updated successfully",
      });
      setIsActionDialogOpen(false);
      setSelectedRequest(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update request",
        variant: "destructive",
      });
    },
  });

  // Since filtering and pagination is now handled by the backend, use the data directly
  const displayedRequests = Array.isArray(requests) ? requests : [];
  const totalPages = response?.data?.pagination?.totalPages || 1;

  // CSV export data
  const csvData = displayedRequests.map((request) => ({
    "Request ID": request.requestId,
    "User Email": request.userEmail,
    "User Name": request.userEmail || "N/A", // Using email as fallback for user name
    Token: request.token,
    Network: request.network || "N/A",
    "Token Quantity": `${request.quantity} tokens`,
    Status: request.status,
    "Created Date": formatDateSafe(request.createdAt),
    "Updated Date": formatDateSafe(request.updatedAt),
  }));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <div className="w-3 h-3 mr-1 rounded-full bg-yellow-500"></div>
            Pending
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            <div className="w-3 h-3 mr-1 rounded-full bg-red-500"></div>
            Cancelled
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            <div className="w-3 h-3 mr-1 rounded-full bg-red-500"></div>
            Failed
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <div className="w-3 h-3 mr-1 rounded-full bg-blue-500"></div>
            Processing
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case "fulfilled":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            fulfilled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTokenBadge = (token: string) => {
    return (
      <Badge
        variant="outline"
        className={
          token === "GLD"
            ? "bg-yellow-50 text-yellow-800"
            : "bg-gray-50 text-gray-800"
        }
      >
        <div
          className={`w-2 h-2 rounded-full mr-2 ${
            token === "GLD" ? "bg-yellow-500" : "bg-gray-400"
          }`}
        ></div>
        {token}
      </Badge>
    );
  };

  const handleStartRedemption = (request: RedemptionRequest) => {
    setSelectedRequest(request);
    setIsActionDialogOpen(true);
  };

  const handleApproveRedemption = () => {
    if (!selectedRequest || !fulfillmentMethod) return;

    updateRequestMutation.mutate({
      id: selectedRequest.id,
      data: {
        status: "processing",
      },
    });
  };

  const handleCompleteRedemption = (request: RedemptionRequest) => {
    updateRequestMutation.mutate({
      id: request.id,
      data: {
        status: "completed",
      },
    });
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

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            Redemption Request Management
          </h1>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-500">
              Error loading redemption requests: {error.message}
            </p>
            <p className="text-gray-500 mt-2">
              Please try refreshing the page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">
          Redemption Request Management
        </h1>
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
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <CSVLink
              data={csvData}
              filename={`redemption-requests-${new Date().toISOString().split("T")[0]}.csv`}
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
                <TableHead>Request ID</TableHead>
                <TableHead>User Email</TableHead>
                <TableHead>User Name</TableHead>
                <TableHead>Token</TableHead>
                <TableHead>Network</TableHead>
                <TableHead>Token Quantity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">
                    {request.requestId}
                  </TableCell>
                  <TableCell>{request.userId?.email || "N/A"}</TableCell>
                  <TableCell>
                    {request?.userId?.first_name +
                      " " +
                      request?.userId?.last_name || "N/A"}
                  </TableCell>
                  <TableCell>{getTokenBadge(request.token)}</TableCell>
                  <TableCell>{request.network || "N/A"}</TableCell>
                  <TableCell>{request.quantity} tokens</TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-900"
                        onClick={() =>
                          navigate(`/redemption-requests/${request.requestId}`)
                        }
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {displayedRequests.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No redemption requests found matching your criteria
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-gray-700">
                Showing{" "}
                <span className="font-medium">
                  {(currentPage - 1) * itemsPerPage + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium">
                  {Math.min(
                    currentPage * itemsPerPage,
                    response?.data?.pagination?.totalItems || 0,
                  )}
                </span>{" "}
                of{" "}
                <span className="font-medium">
                  {response?.data?.pagination?.totalItems || 0}
                </span>{" "}
                results
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
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className={
                          currentPage === page
                            ? "bg-brand-brown text-white"
                            : ""
                        }
                      >
                        {page}
                      </Button>
                    ),
                  )}
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

      {/* Start Redemption Dialog */}
      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Redemption Process</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">
                Request Details
              </h4>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="font-medium">Request ID:</span>{" "}
                  {selectedRequest?.requestId}
                </p>
                <p>
                  <span className="font-medium">User:</span>{" "}
                  {selectedRequest?.userEmail}
                </p>
                <p>
                  <span className="font-medium">Token:</span>{" "}
                  {selectedRequest?.token}
                </p>
                <p>
                  <span className="font-medium">Quantity:</span>{" "}
                  {selectedRequest?.quantity}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fulfillment">Fulfillment Method</Label>
              <Select
                value={fulfillmentMethod}
                onValueChange={setFulfillmentMethod}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select fulfillment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ship">Ship to Address</SelectItem>
                  <SelectItem value="store">Store for Pickup</SelectItem>
                  <SelectItem value="pickup">Direct Pickup</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Delivery Timeline:</strong> 5-7 working days from
                approval
              </p>
              <p className="text-sm text-blue-600 mt-1">
                Starting redemption will trigger token burning and update stock
                levels.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleApproveRedemption}
                className="flex-1 bg-brand-brown hover:bg-brand-brown/90"
                disabled={!fulfillmentMethod || updateRequestMutation.isPending}
              >
                Start Redemption
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsActionDialogOpen(false);
                  setSelectedRequest(null);
                  setFulfillmentMethod("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
