import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { type Role } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

const AVAILABLE_MODULES = [
  { id: "stock", name: "Stock Management", description: "Manage gold and silver inventory" },
  { id: "purchase", name: "Purchase Requests", description: "Handle purchase requests" },
  { id: "redemption", name: "Redemption Requests", description: "Process redemption requests" },
  { id: "users", name: "User Management", description: "Manage user accounts and KYC" },
  { id: "wallets", name: "Wallet Management", description: "Oversee Fireblocks wallets" },
  { id: "analytics", name: "Analytics", description: "View reports and analytics" },
  { id: "master", name: "Master Management", description: "Configure system settings" },
  { id: "notifications", name: "Notifications", description: "Manage system notifications" },
  { id: "roles", name: "Role Management", description: "Manage roles and permissions" },
];

export default function PermissionManagement() {
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const { toast } = useToast();

  const { data: roles = [], isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
  });

  const selectedRole = roles.find(role => role.id === selectedRoleId);

  // Helper function to format role names by removing underscores and capitalizing
  const formatRoleName = (roleName: string) => {
    return roleName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ roleId, permissions }: { roleId: string; permissions: string[] }) => {
      const response = await apiRequest("PUT", `/api/roles/${roleId}`, { permissions });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({
        title: "Success",
        description: "Permissions updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update permissions",
        variant: "destructive",
      });
    },
  });

  const handlePermissionChange = (moduleId: string, checked: boolean) => {
    if (!selectedRole) return;

    const currentPermissions = selectedRole.permissions || [];
    let newPermissions: string[];

    if (checked) {
      newPermissions = [...currentPermissions, moduleId];
    } else {
      newPermissions = currentPermissions.filter(p => p !== moduleId);
    }

    updatePermissionsMutation.mutate({
      roleId: selectedRole.id,
      permissions: newPermissions,
    });
  };

  const hasPermission = (moduleId: string) => {
    if (!selectedRole) return false;
    return selectedRole.permissions?.includes(moduleId) || selectedRole.permissions?.includes("all") || false;
  };

  if (rolesLoading) {
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
        <h1 className="text-3xl font-bold text-gray-900">Permission Management</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assign Module Permissions</CardTitle>
          <div className="pt-4">
            <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {formatRoleName(role.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {selectedRole ? (
            <div className="space-y-6">
              {/* Current Role Info */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">{formatRoleName(selectedRole.name)}</h3>
                <p className="text-sm text-gray-600 mb-3">{selectedRole.description}</p>
                <div className="flex flex-wrap gap-2">
                  {selectedRole.permissions && selectedRole.permissions.length > 0 ? (
                    selectedRole.permissions.map((permission, index) => (
                      <Badge key={index} variant="secondary">
                        {permission === "all" ? "All Modules" : permission}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">No permissions assigned</span>
                  )}
                </div>
              </div>

              {/* Module Permissions */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Available Modules</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {AVAILABLE_MODULES.map((module) => (
                    <div
                      key={module.id}
                      className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <Checkbox
                        id={module.id}
                        checked={hasPermission(module.id)}
                        onCheckedChange={(checked) => handlePermissionChange(module.id, checked as boolean)}
                        disabled={selectedRole.permissions?.includes("all") || updatePermissionsMutation.isPending}
                      />
                      <div className="flex-1">
                        <label
                          htmlFor={module.id}
                          className="text-sm font-medium text-gray-900 cursor-pointer"
                        >
                          {module.name}
                        </label>
                        <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedRole.permissions?.includes("all") && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    This role has "All Modules" permission, which grants access to all system features.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Please select a role to manage its permissions
            </div>
          )}
        </CardContent>
      </Card>

      {/* Roles Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Roles Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {roles.map((role) => (
              <div
                key={role.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedRoleId === role.id
                    ? "border-brand-gold bg-brand-light-gold bg-opacity-10"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
                onClick={() => setSelectedRoleId(role.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{role.name}</h4>
                    <p className="text-sm text-gray-600">{role.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-1 max-w-md">
                    {role.permissions && role.permissions.length > 0 ? (
                      role.permissions.slice(0, 3).map((permission, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {permission === "all" ? "All Modules" : permission}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500">No permissions</span>
                    )}
                    {role.permissions && role.permissions.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{role.permissions.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
