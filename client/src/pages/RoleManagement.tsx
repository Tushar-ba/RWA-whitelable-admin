import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Shield,
  Search,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Plus,
  Edit,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { type Role } from "@shared/schema";
import { apiRequest } from "@/lib/apiClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PaginatedRolesResponse {
  roles: Role[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRoles: number;
    limit: number;
  };
}

export default function RoleManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { toast } = useToast();

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sortBy, sortOrder]);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", currentPage.toString());
    params.set("limit", pageSize.toString());

    if (searchTerm) params.set("search", searchTerm);
    if (statusFilter !== "all") params.set("isActive", statusFilter);
    params.set("sortBy", sortBy);
    params.set("sortOrder", sortOrder);

    return params.toString();
  }, [currentPage, pageSize, searchTerm, statusFilter, sortBy, sortOrder]);

  const { data: rolesResponse, isLoading } = useQuery<PaginatedRolesResponse>({
    queryKey: ["/api/roles", queryParams],
    queryFn: async () => {
      const response = await apiRequest.get<PaginatedRolesResponse>(
        `/api/roles?${queryParams}`,
      );
      return response;
    },
  });

  const roles = rolesResponse?.roles || [];
  const pagination = rolesResponse?.pagination;

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortOrder === "asc" ? (
      <ChevronUp className="h-4 w-4 text-blue-600" />
    ) : (
      <ChevronDown className="h-4 w-4 text-blue-600" />
    );
  };

  // Helper function to format role names by removing underscores and capitalizing
  const formatRoleName = (roleName: string) => {
    return roleName
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
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
        <h1 className="text-3xl font-bold text-gray-900">Role Management</h1>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer select-none hover:bg-gray-50"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center space-x-1">
                    <span>Role Name</span>
                    {getSortIcon("name")}
                  </div>
                </TableHead>

                <TableHead>Permissions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col space-x-2">
                      <div className="flex space-x-2">
                        <Shield className="h-4 w-4 text-brand-gold" />
                        <span>{formatRoleName(role.name)}</span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed max-w-xs">
                        {role.description}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions
                        ?.map((permission, index) => (
                          <Badge
                            key={`${role.id}-${permission}-${index}`}
                            variant="outline"
                            className="text-xs whitespace-nowrap"
                          >
                            {permission}
                          </Badge>
                        )) || (
                        <span className="text-sm text-gray-500">
                          No permissions
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {roles.length === 0 && !isLoading && (
            <div className="text-center py-8 text-gray-500">No roles found</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
