import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Search,
  Eye,
  UserX,
  Shield,
  Download,
  Filter,
  Ban,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/apiClient";
import { queryClient } from "@/lib/queryClient";
import ConfirmationModal from "@/components/modals/ConfirmationModal";
import { User } from "@/types";

interface PaginatedUsersResponse {
  users: User[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalUsers: number;
    limit: number;
  };
}

export default function UserManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [kycFilter, setKycFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isUserDetailOpen, setIsUserDetailOpen] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [userToSuspend, setUserToSuspend] = useState<User | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, kycFilter, accountFilter, sortBy, sortOrder]);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', currentPage.toString());
    params.set('limit', pageSize.toString());
    
    if (searchTerm) params.set('search', searchTerm);
    if (kycFilter !== 'all') params.set('kycStatus', kycFilter);
    if (accountFilter !== 'all') params.set('account_status', accountFilter);
    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);
    
    return params.toString();
  }, [currentPage, pageSize, searchTerm, kycFilter, accountFilter, sortBy, sortOrder]);

  const { data: usersResponse, isLoading } = useQuery<PaginatedUsersResponse>({
    queryKey: ["/api/users", queryParams],
    queryFn: async () => {
      const response = await apiRequest.get<PaginatedUsersResponse>(`/api/users?${queryParams}`);
      return response;
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<User>;
    }) => {
      const response = await apiRequest.put(`/api/users/${id}`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const users = usersResponse?.users || [];
  const pagination = usersResponse?.pagination;

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortOrder === 'asc' ? 
      <ChevronUp className="h-4 w-4 text-blue-600" /> : 
      <ChevronDown className="h-4 w-4 text-blue-600" />;
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString();
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

  const getAccountStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Active
          </Badge>
        );
      case "suspended":
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleSuspendUser = (user: User) => {
    setUserToSuspend(user);
    setShowSuspendModal(true);
  };

  const confirmSuspendUser = () => {
    if (!userToSuspend) return;
    
    const newStatus = userToSuspend.account_status === "active" ? "suspended" : "active";
    updateUserMutation.mutate({
      id: userToSuspend._id,
      data: { account_status: newStatus },
    });
    setShowSuspendModal(false);
    setUserToSuspend(null);
  };

  const handleViewProfile = (user: User) => {
    setLocation(`/user-details/${user._id}`);
  };

  const getTimeAgo = (date: Date | string | null | undefined) => {
    if (!date) return "Never";
    const now = new Date();
    const diffInMs = now.getTime() - new Date(date).getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays > 0) {
      return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
    } else if (diffInHours > 0) {
      return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
    } else {
      return "Less than an hour ago";
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
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <Button className="bg-brand-brown hover:bg-brand-brown/90">
          <Download className="mr-2 h-4 w-4" />
          Export Users
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by email, first name, or last name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
              <Select value={kycFilter} onValueChange={setKycFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All KYC Status</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={accountFilter} onValueChange={setAccountFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Account Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
              <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(parseInt(value))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 per page</SelectItem>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="25">25 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer select-none hover:bg-gray-50"
                  onClick={() => handleSort('_id')}
                >
                  <div className="flex items-center space-x-1">
                    <span>User ID</span>
                    {getSortIcon('_id')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:bg-gray-50"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Email</span>
                    {getSortIcon('email')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:bg-gray-50"
                  onClick={() => handleSort('kycStatus')}
                >
                  <div className="flex items-center space-x-1">
                    <span>KYC Status</span>
                    {getSortIcon('kycStatus')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:bg-gray-50"
                  onClick={() => handleSort('account_status')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Account Status</span>
                    {getSortIcon('account_status')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:bg-gray-50"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Join Date</span>
                    {getSortIcon('created_at')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:bg-gray-50"
                  onClick={() => handleSort('updated_at')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Last Activity</span>
                    {getSortIcon('updated_at')}
                  </div>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow
                  key={user._id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleViewProfile(user)}
                >
                  <TableCell className="font-medium">
                    {user._id.substring(0, 8).toUpperCase()}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{getKYCBadge(user.account_status)}</TableCell>
                  <TableCell>
                    {getAccountStatusBadge(user.account_status)}
                  </TableCell>
                  <TableCell>{formatDate(user.created_at)}</TableCell>
                  <TableCell>{getTimeAgo(user.updated_at)}</TableCell>
                  <TableCell>
                    <div
                      className="flex items-center space-x-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewProfile(user)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {/* <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSuspendUser(user)}
                        className={
                          user.account_status === "active"
                            ? "text-yellow-600 hover:text-yellow-900"
                            : "text-green-600 hover:text-green-900"
                        }
                      >
                        {user.account_status === "active" ? (
                          <Ban className="h-4 w-4" />
                        ) : (
                          <UserX className="h-4 w-4" />
                        )}
                      </Button> */}
                      {/* <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleInitiateKYC(user)}
                        className="text-brand-gold hover:text-brand-brown"
                      >
                        <Shield className="h-4 w-4" />
                      </Button> */}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {users.length === 0 && !isLoading && (
            <div className="text-center py-8 text-gray-500">
              No users found matching your criteria
            </div>
          )}

          {/* Pagination */}
          {pagination && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-gray-700">
                Showing{" "}
                <span className="font-medium">
                  {((pagination.currentPage - 1) * pagination.limit) + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium">
                  {Math.min(pagination.currentPage * pagination.limit, pagination.totalUsers)}
                </span>{" "}
                of{" "}
                <span className="font-medium">{pagination.totalUsers}</span>{" "}
                results
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={pagination.currentPage <= 1}
                  onClick={() => setCurrentPage(pagination.currentPage - 1)}
                >
                  Previous
                </Button>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, pagination.currentPage - 2) + i;
                  if (pageNum > pagination.totalPages) return null;
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === pagination.currentPage ? "default" : "outline"}
                      size="sm"
                      className={pageNum === pagination.currentPage ? "bg-brand-brown text-white" : ""}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={pagination.currentPage >= pagination.totalPages}
                  onClick={() => setCurrentPage(pagination.currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Detail Dialog */}
      <Dialog open={isUserDetailOpen} onOpenChange={setIsUserDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Profile</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              {/* User Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-600">User ID</p>
                  <p className="text-sm text-gray-900">
                    {selectedUser._id?.substring(0, 8)?.toUpperCase() || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Email</p>
                  <p className="text-sm text-gray-900">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    KYC Status
                  </p>
                  <div className="mt-1">
                    {getKYCBadge(selectedUser.account_status)}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Account Status
                  </p>
                  <div className="mt-1">
                    {getAccountStatusBadge(selectedUser.account_status)}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Join Date</p>
                  <p className="text-sm text-gray-900">
                    {formatDate(selectedUser.created_at)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Last Activity
                  </p>
                  <p className="text-sm text-gray-900">
                    {getTimeAgo(selectedUser.updated_at)}
                  </p>
                </div>
              </div>

              {/* Transaction History Placeholder */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  Transaction History
                </h4>
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
                        <TableCell
                          colSpan={4}
                          className="text-center py-8 text-gray-500"
                        >
                          No transaction history available
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={() => handleSuspendUser(selectedUser)}
                  variant={
                    selectedUser.account_status === "active"
                      ? "destructive"
                      : "default"
                  }
                  className="flex-1"
                >
                  {selectedUser.account_status === "active"
                    ? "Suspend Account"
                    : "Reactivate Account"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showSuspendModal}
        onClose={() => setShowSuspendModal(false)}
        onConfirm={confirmSuspendUser}
        title={userToSuspend?.account_status === "active" ? "Suspend User" : "Reactivate User"}
        description={
          userToSuspend?.account_status === "active"
            ? `Are you sure you want to suspend ${userToSuspend?.email}? This action will prevent them from accessing their account and performing any transactions.`
            : `Are you sure you want to reactivate ${userToSuspend?.email}? This will restore their account access and transaction capabilities.`
        }
        confirmText={userToSuspend?.account_status === "active" ? "Suspend User" : "Reactivate User"}
        variant={userToSuspend?.account_status === "active" ? "danger" : "success"}
        isLoading={updateUserMutation.isPending}
      />
    </div>
  );
}
