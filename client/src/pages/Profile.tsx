import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/providers/AuthProvider";
import {
  User,
  Shield,
  Mail,
  Calendar,
  UserCheck,
  Edit2,
  Save,
  X,
  Wallet,
  Key,
  Lock,
} from "lucide-react";
import { formatDate } from "@/utils/index";

interface AdminProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  walletAddress?: string;
  network?: string;
  roles: string[];
  permissions: string[];
  isSuperAdmin?: boolean;
  isActive?: boolean;
  createdAt?: string;
  lastLogin?: string;
}

interface ProfileResponse {
  admin: AdminProfile;
}

export default function Profile() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: "" });
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    otp: "",
    step: 1, // 1: request OTP, 2: change password with OTP
  });

  // Get admin ID from logged-in user
  const adminId = user?.id;

  const {
    data: profileData,
    isLoading,
    error,
  } = useQuery<ProfileResponse>({
    queryKey: ["/api/auth/me"],
    enabled: !!adminId,
  });

  const updateProfileMutation = useMutation({
    mutationFn: (updateData: { name: string }) =>
      apiRequest.put(`/api/admins/${adminId}`, updateData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const requestPasswordChangeMutation = useMutation({
    mutationFn: (data: { currentPassword: string }) =>
      apiRequest.post("/api/auth/request-change-password", data),
    onSuccess: () => {
      setPasswordData((prev) => ({ ...prev, step: 2 }));
      toast({
        title: "Success",
        description: "OTP sent to your email",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to send OTP",
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: {
      currentPassword: string;
      newPassword: string;
      otp: string;
    }) => apiRequest.post("/api/auth/change-password", data),
    onSuccess: () => {
      setShowChangePassword(false);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        otp: "",
        step: 1,
      });
      toast({
        title: "Success",
        description: "Password changed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to change password",
        variant: "destructive",
      });
    },
  });

  const handleEdit = () => {
    if (profileData?.admin) {
      setEditData({
        name: profileData.admin.full_name,
      });
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    updateProfileMutation.mutate(editData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({ name: "" });
  };

  const handleRequestPasswordChange = () => {
    if (!passwordData.currentPassword) {
      toast({
        title: "Error",
        description: "Please enter your current password",
        variant: "destructive",
      });
      return;
    }
    requestPasswordChangeMutation.mutate({
      currentPassword: passwordData.currentPassword,
    });
  };

  const handleChangePassword = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords don't match",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
      otp: passwordData.otp,
    });
  };

  const resetPasswordModal = () => {
    setShowChangePassword(false);
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
      otp: "",
      step: 1,
    });
  };

  const formatRoleName = (roleName: string) => {
    return roleName
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profileData?.admin) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              Failed to load profile data. Please try again.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const profile = profileData.admin;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <div className="flex space-x-2">
          {!isEditing && (
            <Button
              onClick={handleEdit}
              className="flex items-center space-x-2"
              data-testid="button-edit-profile"
            >
              <Edit2 className="h-4 w-4" />
              <span>Edit Profile</span>
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setShowChangePassword(!showChangePassword)}
            className="flex items-center space-x-2"
            data-testid="button-change-password"
          >
            <Key className="h-4 w-4" />
            <span>Change Password</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5 text-brand-gold" />
              <span>Personal Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={editData.name}
                    onChange={(e) =>
                      setEditData({ ...editData, name: e.target.value })
                    }
                    placeholder="Enter your full name"
                    data-testid="input-name"
                  />
                </div>
                <div className="flex space-x-2 pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={updateProfileMutation.isPending}
                    className="flex items-center space-x-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>
                      {updateProfileMutation.isPending
                        ? "Saving..."
                        : "Save Changes"}
                    </span>
                  </Button>
                  <Button variant="outline" onClick={handleCancel}>
                    <X className="h-4 w-4" />
                    <span>Cancel</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-600">
                    Email:
                  </span>
                  <span>{profile.email}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-600">
                    Name:
                  </span>
                  <span>{profile.full_name}</span>
                </div>
                {profile.network && (
                  <div className="flex items-center space-x-3">
                    <Shield className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-600">
                      Network:
                    </span>
                    <span>{profile.network}</span>
                  </div>
                )}
                {profile.walletAddress && (
                  <div className="flex items-center space-x-3">
                    <Wallet className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-600">
                      Wallet Address:
                    </span>
                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                      {profile.walletAddress}
                    </span>
                  </div>
                )}
                <div className="flex items-center space-x-3">
                  <UserCheck className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-600">
                    Status:
                  </span>
                  <Badge variant={profile.isActive ? "default" : "destructive"}>
                    {profile.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {profile.createdAt && (
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-600">
                      Member Since:
                    </span>
                    <span>{formatDate(new Date(profile.createdAt))}</span>
                  </div>
                )}
                {profile.lastLogin && (
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-600">
                      Last Login:
                    </span>
                    <span>{formatDate(new Date(profile.lastLogin))}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Role & Permissions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-brand-gold" />
              <span>Role & Permissions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profile.roles && profile.roles.length > 0 ? (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">
                    Roles
                  </Label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {profile.roles.map((role: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-sm">
                        {formatRoleName(role)}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-sm font-medium text-gray-600">
                    Permissions
                  </Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {profile.permissions &&
                      profile.permissions.map(
                        (permission: string, index: number) => (
                          <Badge
                            key={`permission-${index}`}
                            variant="secondary"
                            className="text-xs"
                          >
                            {permission}
                          </Badge>
                        ),
                      )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                No roles assigned
              </div>
            )}
          </CardContent>
        </Card>

        {/* Change Password Section */}
        {showChangePassword && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lock className="h-5 w-5 text-brand-gold" />
                <span>Change Password</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                {passwordData.step === 1
                  ? "Enter your current password to request an OTP."
                  : "Enter the OTP sent to your email and your new password."}
              </p>

              {passwordData.step === 1 ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          currentPassword: e.target.value,
                        })
                      }
                      placeholder="Enter your current password"
                      data-testid="input-current-password"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={resetPasswordModal}
                      data-testid="button-cancel-change-password"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleRequestPasswordChange}
                      disabled={
                        !passwordData.currentPassword ||
                        requestPasswordChangeMutation.isPending
                      }
                      data-testid="button-request-otp"
                    >
                      {requestPasswordChangeMutation.isPending
                        ? "Sending OTP..."
                        : "Send OTP"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="otp">OTP Code</Label>
                    <Input
                      id="otp"
                      value={passwordData.otp}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          otp: e.target.value,
                        })
                      }
                      placeholder="Enter 6-digit OTP"
                      maxLength={6}
                      data-testid="input-otp"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          newPassword: e.target.value,
                        })
                      }
                      placeholder="Enter new password"
                      data-testid="input-new-password"
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          confirmPassword: e.target.value,
                        })
                      }
                      placeholder="Confirm new password"
                      data-testid="input-confirm-password"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={resetPasswordModal}
                      data-testid="button-cancel-change-password"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleChangePassword}
                      disabled={
                        !passwordData.otp ||
                        !passwordData.newPassword ||
                        !passwordData.confirmPassword ||
                        changePasswordMutation.isPending
                      }
                      data-testid="button-change-password-submit"
                    >
                      {changePasswordMutation.isPending
                        ? "Changing..."
                        : "Change Password"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
