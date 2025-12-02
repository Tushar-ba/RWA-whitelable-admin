import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { apiRequest } from "@/lib/queryClient";
import {
  Shield,
  Plus,
  Delete,
  Copy,
  Filter,
  Search,
  Edit,
  Wallet,
  Trash2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import ConfirmationModal from "@/components/modals/ConfirmationModal";
import { WalletGuard } from "@/components/wallet/WalletGuard";
import { useSequentialGrantRole } from "@/hooks/useSequentialGrantRole";
import { useRevokeRole } from "@/hooks/useRevokeRole";
import { useMemeTokenProgram } from "@/hooks/useSolanaToken";
import { useAppKitAccount } from "@reown/appkit/react";

interface Admin {
  id: string;
  name: string;
  email: string;
  walletAddress: string;
  network: string;
  roles: string[];
  isSuperAdmin: boolean;
  createdAt: Date;
  lastLogin: Date;
  status: string;
}

interface Role {
  _id: string;
  id?: string;
  name: string;
  description: string;
  permissions: string[];
  isActive: boolean;
  blockchainRoleId?: string;
}

export default function AdminManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    walletAddress: "",
    network: "",
    role: "",
    addRole: "",
  });

  // Revoke role modal state (replaces simple delete confirmation)
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [adminToRevoke, setAdminToRevoke] = useState<Admin | null>(null);
  const [revokeRoleProcessing, setRevokeRoleProcessing] = useState<
    string | null
  >(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Wallet connection hooks
  const { isConnected, address: connectedWallet } = useAccount();
  const { isConnected: isSolanaConnected, address: solanaAddress } =
    useAppKitAccount();
  const {
    grantRoleOnBothTokens,
    isProcessing: isGrantingRole,
    goldStatus,
    silverStatus,
  } = useSequentialGrantRole();

  const {
    revokeRoleOnBothTokens,
    isProcessing: isRevokingRole,
    goldStatus: revokeGoldStatus,
    silverStatus: revokeSilverStatus,
  } = useRevokeRole();

  // Solana hooks
  const { addRole } = useMemeTokenProgram("gold"); // Use gold as default for addRole

  const { data: admins = [], isLoading } = useQuery<Admin[]>({
    queryKey: ["/api/admins"],
  });

  const { data: rolesResponse } = useQuery<{ roles: Role[] }>({
    queryKey: ["/api/roles"],
  });

  const roles = rolesResponse?.roles || [];

  // Mutations for creating and updating admins
  const createAdminMutation = useMutation({
    mutationFn: (adminData: any) => apiRequest.post("/api/admins", adminData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admins"] });
      // Success handling is now done in handleSubmit to avoid duplicate toasts
    },
    onError: (error: any) => {
      // Error handling is now done in handleSubmit for better control
      throw error; // Re-throw to be caught in handleSubmit
    },
  });

  const updateAdminMutation = useMutation({
    mutationFn: ({ id, adminData }: { id: string; adminData: any }) =>
      apiRequest.put(`/api/admins/${id}`, adminData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admins"] });
      // Success handling is now done in createAdminOrUpdateRole or in direct calls without blockchain
    },
    onError: (error: any) => {
      // Error handling is done where the mutation is called for better control
      throw error; // Re-throw to be caught where called
    },
  });

  // Delete admin mutation
  const deleteAdminMutation = useMutation({
    mutationFn: (id: string) => apiRequest.delete(`/api/admins/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admins"] });
      toast({
        title: "Success",
        description: "Admin deleted successfully",
      });
      setIsRevokeModalOpen(false);
      setAdminToRevoke(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete admin",
        variant: "destructive",
      });
    },
  });

  // Helper function to format role names by removing underscores and capitalizing
  const formatRoleName = (roleName: string) => {
    return roleName
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const filteredAdmins = Array.isArray(admins)
    ? admins.filter((admin) => {
        const matchesSearch =
          admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          admin.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole =
          roleFilter === "all" || admin.roles.includes(roleFilter);
        return matchesSearch && matchesRole;
      })
    : [];

  // Calculate pagination for filtered results
  const totalPages = Math.ceil(filteredAdmins.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAdmins = filteredAdmins.slice(
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
      case "role":
        setRoleFilter(value);
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

  const handleCopyWallet = (walletAddress: string) => {
    navigator.clipboard.writeText(walletAddress);
    toast({
      title: "Copied!",
      description: "Wallet address copied to clipboard",
    });
  };

  const handleCreateAdmin = () => {
    setIsEditMode(false);
    setEditingAdmin(null);
    setFormData({
      name: "",
      email: "",
      walletAddress: "",
      network: "",
      role: "",
      addRole: "",
    });
    setIsModalOpen(true);
  };

  const handleEditAdmin = (admin: Admin) => {
    setIsEditMode(true);
    setEditingAdmin(admin);
    setFormData({
      name: admin.name,
      email: admin.email,
      walletAddress: admin.walletAddress,
      network: "",
      role: admin.roles[0] || "DEFAULT_ADMIN_ROLE",
      addRole: "",
    });
    setIsModalOpen(true);
  };

  const handleDeleteAdmin = (adminId: string) => {
    const admin = admins.find((a) => a.id === adminId);
    if (admin) {
      setAdminToRevoke(admin);
      setIsRevokeModalOpen(true);
    }
  };

  // Handle individual role revocation
  const handleRevokeRole = async (roleName: string) => {
    if (!adminToRevoke) return;

    try {
      setRevokeRoleProcessing(roleName);

      // Find the role details
      const role = roles.find((r) => r.name === roleName);
      const needsBlockchainRevoke =
        role?.blockchainRoleId &&
        adminToRevoke.walletAddress;

      // Check wallet connection if blockchain operation needed
      if (needsBlockchainRevoke) {
        const isWalletConnected = adminToRevoke.network === "solana" 
          ? (isSolanaConnected && solanaAddress) 
          : (isConnected && connectedWallet);
        
        if (!isWalletConnected) {
          const networkType = adminToRevoke.network === "solana" ? "Solana" : "Ethereum";
          toast({
            title: "Wallet Connection Required",
            description: `Please connect your ${networkType} wallet to revoke blockchain roles`,
            variant: "destructive",
          });
          setRevokeRoleProcessing(null);
          return;
        }
      }

      let goldTxHash = null;
      let silverTxHash = null;

      // Step 1: Revoke blockchain role if needed
      if (needsBlockchainRevoke) {
        try {
          console.log(
            "🔄 Revoking blockchain role:",
            roleName,
            "for",
            adminToRevoke.walletAddress,
          );

          // Use the same roleMap logic as addRole for consistent parameter mapping
          const roleMap = {
            DEFAULT_ADMIN_ROLE: 3,
            FEE_CONTROLLER_ROLE: 2,
            ASSET_PROTECTION_ROLE: 1,
            SUPPLY_CONTROLLER_ROLE: 0,
          };

          const roleAd = roleMap[role.name as keyof typeof roleMap] ?? 0;

          const result = await revokeRoleOnBothTokens({
            role: role.blockchainRoleId!, // Keep original for Ethereum
            account: adminToRevoke.walletAddress,
            network: adminToRevoke.network,
            roleNumber: roleAd, // Add numerical role for Solana
          });

          goldTxHash = result.goldTxHash;
          silverTxHash = result.silverTxHash;

          console.log("✅ Blockchain role revocation successful");
        } catch (blockchainError) {
          console.error(
            "❌ Blockchain role revocation failed:",
            blockchainError,
          );

          toast({
            title: "Blockchain Operation Failed",
            description:
              blockchainError instanceof Error
                ? blockchainError.message
                : "Failed to revoke blockchain role",
            variant: "destructive",
          });
          setRevokeRoleProcessing(null);
          return;
        }
      }

      // Step 2: Update database (remove role or soft delete admin)
      const remainingRoles = adminToRevoke.roles.filter((r) => r !== roleName);

      console.log("🔍 Role removal details:", {
        originalRoles: adminToRevoke.roles,
        roleToRemove: roleName,
        remainingRoles: remainingRoles,
        remainingCount: remainingRoles.length,
      });

      if (remainingRoles.length === 0) {
        // No roles left - soft delete the admin
        console.log("🗑️ No roles remaining, soft deleting admin");
        await deleteAdminMutation.mutateAsync(adminToRevoke.id);

        toast({
          title: "Admin Deleted",
          description: `${adminToRevoke.name} has been removed (no roles remaining)`,
        });

        setIsRevokeModalOpen(false);
        setAdminToRevoke(null);
      } else {
        // Update admin with remaining roles
        console.log("📝 Updating admin with remaining roles:", remainingRoles);

        try {
          await updateAdminMutation.mutateAsync({
            id: adminToRevoke.id,
            adminData: {
              roles: remainingRoles,
            },
          });

          toast({
            title: "Role Revoked",
            description: `${formatRoleName(roleName)} role removed from ${adminToRevoke.name}`,
          });

          // Update the local admin state to reflect the role removal
          setAdminToRevoke({
            ...adminToRevoke,
            roles: remainingRoles,
          });

          console.log(
            "✅ Database updated successfully with remaining roles:",
            remainingRoles,
          );
        } catch (dbError) {
          console.error("❌ Database update failed:", dbError);
          toast({
            title: "Database Update Failed",
            description:
              "Role was revoked on blockchain but database update failed",
            variant: "destructive",
          });
        }
      }

      setRevokeRoleProcessing(null);
    } catch (error) {
      console.error("❌ Role revocation failed:", error);

      toast({
        title: "Role Revocation Failed",
        description:
          error instanceof Error ? error.message : "Failed to revoke role",
        variant: "destructive",
      });

      setRevokeRoleProcessing(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditMode && editingAdmin) {
      // EDIT MODE: Add new role to existing admin
      if (!formData.addRole) {
        toast({
          title: "Error",
          description: "Please select a role to add",
          variant: "destructive",
        });
        return;
      }

      // Pre-validation: Check if admin already has this role to prevent blockchain/database mismatch
      const adminAlreadyHasRole = editingAdmin.roles.includes(formData.addRole);
      if (adminAlreadyHasRole) {
        toast({
          title: "Role Already Exists",
          description: `Admin "${editingAdmin.name}" already has the "${formData.addRole}" role.`,
          variant: "destructive",
          duration: 7000,
        });
        return;
      }

      // Get the admin's network from their stored data
      const adminNetwork = (editingAdmin as any).network;

      // Check if blockchain role granting is needed for the additional role
      const needsBlockchainRole =
        editingAdmin.walletAddress && formData.addRole;

      // Network-specific wallet connection validation
      if (needsBlockchainRole) {
        if (adminNetwork === "ethereum" && !isConnected) {
          toast({
            title: "Ethereum Wallet Connection Required",
            description: "Please connect your Ethereum wallet to grant blockchain roles",
            variant: "destructive",
          });
          return;
        }
        
        if (adminNetwork === "solana" && !isSolanaConnected) {
          toast({
            title: "Solana Wallet Connection Required", 
            description: "Please connect your Solana wallet to grant blockchain roles",
            variant: "destructive",
          });
          return;
        }
        
        if (!adminNetwork) {
          toast({
            title: "Network Not Configured",
            description: "This admin doesn't have a network configured. Blockchain operations are not available.",
            variant: "destructive",
          });
          return;
        }
      }

      if (needsBlockchainRole && (isConnected || isSolanaConnected)) {
        // BLOCKCHAIN-FIRST FLOW FOR EDIT: Grant blockchain role first, then update database
        const selectedRole = roles.find((r) => r.name === formData.addRole);
        if (!selectedRole?.blockchainRoleId) {
          toast({
            title: "Configuration Error",
            description: "Selected role does not have blockchain configuration",
            variant: "destructive",
          });
          return;
        }

        try {
          // Reset flag for edit operation
          setAdminCreated(false);

          toast({
            title: "Blockchain Transaction Required",
            description:
              "Please approve the blockchain transactions to grant the additional role...",
          });

          console.log("🔗 Starting blockchain role grant for edit...");

          const roleMap = {
            DEFAULT_ADMIN_ROLE: 3,
            FEE_CONTROLLER_ROLE: 2,
            ASSET_PROTECTION_ROLE: 1,
            SUPPLY_CONTROLLER_ROLE: 0,
          };

          const roleAd =
            roleMap[selectedRole.name as keyof typeof roleMap] ?? 0;

          // Check if Solana network is configured for this admin and call addRole function
          if (adminNetwork === "solana") {
            console.log(
              "🟣 Using Solana network for edit - calling addRole function",
            );
            // Call the addRole function for Solana
            const result = await addRole(editingAdmin.walletAddress, roleAd);
            console.log("🟣 Solana edit transaction result:", result);
            
            toast({
              title: "Blockchain Success",
              description:
                "Additional role granted on Solana network. Now updating admin record...",
            });
            
            // For Solana, handle database update immediately since we don't use the useEffect hook
            try {
              const adminData = {
                addRole: formData.addRole,
              };
              
              await updateAdminMutation.mutateAsync({
                id: editingAdmin.id,
                adminData,
              });
              
              // Reset form and close modal on success
              setIsModalOpen(false);
              setFormData({
                name: "",
                email: "",
                walletAddress: "",
                network: "",
                role: "",
                addRole: "",
              });
              setIsEditMode(false);
              setEditingAdmin(null);
              
              toast({
                title: "Complete Success",
                description: "Admin role updated and blockchain role granted successfully!",
                duration: 7000,
              });
            } catch (dbError: any) {
              console.error("❌ Database update failed for Solana:", dbError);
              
              // Check if it's a role already exists error
              if (dbError.message && dbError.message.includes('already has role')) {
                toast({
                  title: "Role Already Exists",
                  description: `Blockchain role granted successfully, but admin already has the "${formData.addRole}" role in the database.`,
                  variant: "destructive",
                  duration: 10000,
                });
              } else {
                toast({
                  title: "Database Error",
                  description: `Blockchain role granted but admin update failed: ${dbError.message}`,
                  variant: "destructive",
                  duration: 7000,
                });
              }
              
              // Reset form fields but keep the modal open for correction
              setFormData({
                ...formData,
                addRole: "", // Clear the problematic role
              });
            }
          } else if (adminNetwork === "ethereum") {
            console.log(
              "🔵 Using Ethereum network for edit - calling grantRoleOnBothTokens function",
            );
            // Grant blockchain role for the additional role on Ethereum
            const result = await grantRoleOnBothTokens({
              role: selectedRole.blockchainRoleId,
              account: editingAdmin.walletAddress,
            });
            console.log("🔵 Ethereum edit transaction result:", result);
            
            toast({
              title: "Blockchain Success",
              description:
                "Additional role granted on Ethereum network. Now updating admin record...",
            });
          } else {
            throw new Error("Invalid network selected");
          }

          // The useEffect will handle the database update after blockchain success
        } catch (error) {
          console.error("❌ Blockchain role grant failed for edit:", error);

          // Reset flag on error
          setAdminCreated(false);

          const errorMessage =
            error instanceof Error ? error.message : "Unknown error occurred";

          if (
            errorMessage.includes("rejected") ||
            errorMessage.includes("denied") ||
            errorMessage.includes("User denied") ||
            errorMessage.includes("User cancelled") ||
            errorMessage.includes("Transaction was not confirmed") ||
            errorMessage.includes("Transaction cancelled") ||
            errorMessage.toLowerCase().includes("cancelled by user") ||
            errorMessage.toLowerCase().includes("rejected by user")
          ) {
            toast({
              title: "Transaction Cancelled",
              description:
                "Blockchain transaction was cancelled. Admin role was not updated.",
              variant: "destructive",
              duration: 7000,
            });
          } else {
            toast({
              title: "Blockchain Operation Failed",
              description: `Failed to grant blockchain role: ${errorMessage}. Admin role was not updated.`,
              variant: "destructive",
              duration: 7000,
            });
          }
        }
      } else {
        // NO BLOCKCHAIN ROLE NEEDED - Update admin directly
        try {
          const adminData = {
            addRole: formData.addRole,
          };
          await updateAdminMutation.mutateAsync({
            id: editingAdmin.id,
            adminData,
          });

          // Reset form and close modal on success
          setIsModalOpen(false);
          setFormData({
            name: "",
            email: "",
            walletAddress: "",
            network: "",
            role: "",
            addRole: "",
          });
          setIsEditMode(false);
          setEditingAdmin(null);

          toast({
            title: "Success",
            description: "Admin role added successfully!",
            duration: 5000,
          });
        } catch (error: any) {
          toast({
            title: "Error",
            description:
              error.response?.data?.message || "Failed to update admin",
            variant: "destructive",
          });
        }
      }
    } else {
      // Check wallet connection before creating admin with blockchain role
      const needsBlockchainRole =
        formData.walletAddress &&
        formData.role;
      console.log(
        needsBlockchainRole,
        isConnected,
        "isConnectedisConnectedisConnectedisConnected",
      );
      if (needsBlockchainRole && !isConnected && !isSolanaConnected) {
        toast({
          title: "Wallet Connection Required",
          description:
            "Please connect your wallet to grant blockchain roles to admins",
          variant: "destructive",
        });
        return;
      }

      // Pre-validation: Check if email already exists to prevent blockchain/database mismatch
      const existingAdmin = admins.find(admin => admin.email.toLowerCase() === formData.email.toLowerCase());
      if (existingAdmin) {
        toast({
          title: "Email Already Exists",
          description: `An admin with email "${formData.email}" already exists. Please use a different email address.`,
          variant: "destructive",
          duration: 7000,
        });
        return;
      }

      const adminData = {
        name: formData.name,
        email: formData.email,
        walletAddress: formData.walletAddress,
        role: formData.role,
        network: formData.network,
      };

      // BLOCKCHAIN-FIRST FLOW: Grant role first, then create admin
      if (needsBlockchainRole && (isConnected || isSolanaConnected)) {
        const selectedRole = roles.find((r) => r.name === formData.role);
        if (!selectedRole?.blockchainRoleId) {
          toast({
            title: "Configuration Error",
            description: "Selected role does not have blockchain configuration",
            variant: "destructive",
          });
          return;
        }

        try {
          // Reset the adminCreated flag for new invitation process
          setAdminCreated(false);

          toast({
            title: "Blockchain Transaction Required",
            description:
              "Please approve the blockchain transactions to grant the role...",
          });

          console.log("🔗 Starting blockchain role grant process...");
          const roleMap = {
            DEFAULT_ADMIN_ROLE: 3,
            FEE_CONTROLLER_ROLE: 2,
            ASSET_PROTECTION_ROLE: 1,
            SUPPLY_CONTROLLER_ROLE: 0,
          };

          const roleAd =
            roleMap[selectedRole.name as keyof typeof roleMap] ?? 0;

          // Check if Solana network is selected and call addRole function
          if (formData.network === "solana") {
            console.log("🟣 Using Solana network - calling addRole function");
            // Call the addRole function for Solana
            const result = await addRole(
              formData.walletAddress,
              roleAd
            );

            console.log("🟣 Solana transaction result:", result);
            
            toast({
              title: "Blockchain Success", 
              description: "Role granted on Solana network. Now creating admin record...",
            });
            
            // For Solana, handle database creation immediately since we don't use the useEffect hook
            try {
              const adminData = {
                name: formData.name,
                email: formData.email,
                walletAddress: formData.walletAddress,
                role: formData.role,
                network: formData.network,
              };
              
              await createAdminMutation.mutateAsync(adminData);
              
              // Reset form and close modal on success
              setIsModalOpen(false);
              setFormData({
                name: "",
                email: "",
                walletAddress: "",
                network: "",
                role: "",
                addRole: "",
              });
              
              toast({
                title: "Complete Success",
                description: "Admin created and blockchain role granted successfully!",
                duration: 7000,
              });
            } catch (dbError: any) {
              console.error("❌ Database creation failed for Solana:", dbError);
              
              // Check if it's a duplicate email error
              if (dbError.message && dbError.message.includes('email already exists')) {
                toast({
                  title: "Duplicate Email Error",
                  description: `Blockchain role granted successfully, but admin with email "${formData.email}" already exists. Please use a different email address.`,
                  variant: "destructive",
                  duration: 10000,
                });
              } else {
                toast({
                  title: "Database Error",
                  description: `Blockchain role granted but admin creation failed: ${dbError.message}`,
                  variant: "destructive",
                  duration: 7000,
                });
              }
              
              // Reset form fields but keep the modal open for correction
              setFormData({
                ...formData,
                email: "", // Clear the problematic email
              });
            }
          } else {
            // Grant blockchain role first - this must succeed before admin creation
            await grantRoleOnBothTokens({
              role: selectedRole.blockchainRoleId,
              account: formData.walletAddress,
            });
            
            toast({
              title: "Blockchain Success",
              description:
                "Role granted on blockchain. Now creating admin record...",
            });
          }
        } catch (error) {
          console.error("❌ Blockchain or admin creation failed:", error);

          // Reset the adminCreated flag on error
          setAdminCreated(false);

          const errorMessage =
            error instanceof Error ? error.message : "Unknown error occurred";

          // Check for user cancellation (including Phantom wallet cancellations)
          if (
            errorMessage.includes("User rejected") ||
            errorMessage.includes("user rejected") ||
            errorMessage.includes("cancelled") ||
            errorMessage.includes("User denied") ||
            errorMessage.includes("User cancelled") ||
            errorMessage.includes("Transaction was not confirmed") ||
            errorMessage.includes("Transaction cancelled") ||
            errorMessage.toLowerCase().includes("cancelled by user") ||
            errorMessage.toLowerCase().includes("rejected by user")
          ) {
            toast({
              title: "Transaction Cancelled",
              description:
                "Blockchain transaction was cancelled. No admin was created.",
              variant: "destructive",
              duration: 7000,
            });
          } else {
            toast({
              title: "Process Failed",
              description: `Failed to complete admin invitation: ${errorMessage}. No admin was created.`,
              variant: "destructive",
              duration: 7000,
            });
          }
        }
      } else {
        // NO BLOCKCHAIN ROLE NEEDED - Create admin directly
        try {
          await createAdminMutation.mutateAsync(adminData);

          // Reset form and close modal on success
          setIsModalOpen(false);
          setFormData({
            name: "",
            email: "",
            walletAddress: "",
            network: "",
            role: "",
            addRole: "",
          });

          toast({
            title: "Admin Invited",
            description: "Admin invitation sent successfully!",
            duration: 5000,
          });
        } catch (error) {
          console.error("❌ Admin creation failed:", error);
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error occurred";
          toast({
            title: "Admin Creation Failed",
            description: errorMessage,
            variant: "destructive",
            duration: 7000,
          });
        }
      }
    }
  };

  const createAdminOrUpdateRole = async () => {
    if (isEditMode && editingAdmin) {
      // EDIT MODE: Add role to existing admin
      console.log("👤 Updating admin role in database...");
      const adminData = {
        addRole: formData.addRole,
      };

      try {
        await updateAdminMutation.mutateAsync({
          id: editingAdmin.id,
          adminData,
        });
        console.log("✅ Admin role updated successfully");

        // Reset form and close modal on success
        setIsModalOpen(false);
        setFormData({
          name: "",
          email: "",
          walletAddress: "",
          network: "",
          role: "",
          addRole: "",
        });
        setIsEditMode(false);
        setEditingAdmin(null);
        setAdminSuccessfullyCreated(true);

        toast({
          title: "Complete Success",
          description:
            "Additional role granted and admin updated successfully!",
          duration: 5000,
        });
      } catch (error) {
        console.error(
          "❌ Admin role update failed after blockchain success:",
          error,
        );

        // Extract error message from the nested error structure
        const errorMessage =
          (error as any)?.message ||
          (error as any)?.originalError?.message ||
          (error instanceof Error ? error.message : "Unknown error occurred");

        // Check if the error is due to admin not found or other non-retryable issues
        const isNonRetryableError =
          errorMessage.includes("not found") ||
          errorMessage.includes("already exists");

        if (isNonRetryableError) {
          // For non-retryable errors, don't retry
          console.log("🔄 Non-retryable error, stopping retry loop");
          toast({
            title: "Admin Update Issue",
            description: `${errorMessage}. Blockchain roles were granted successfully.`,
            variant: "destructive",
            duration: 7000,
          });

          // Reset form and close modal
          setIsModalOpen(false);
          setFormData({
            name: "",
            email: "",
            walletAddress: "",
            network: "",
            role: "",
            addRole: "",
          });
          setIsEditMode(false);
          setEditingAdmin(null);
          setAdminSuccessfullyCreated(true);
        } else {
          // For other errors, throw to let useEffect handle retry logic
          throw new Error(errorMessage);
        }
      }
    } else {
      // CREATE MODE: Create new admin
      console.log("👤 Creating admin record...");
      const adminData = {
        name: formData.name,
        email: formData.email,
        walletAddress: formData.walletAddress,
        role: formData.role,
      };

      try {
        await createAdminMutation.mutateAsync(adminData);
        console.log("✅ Admin created successfully");

        // Mark as successfully created to prevent useEffect from running again
        setAdminSuccessfullyCreated(true);

        // Reset form and close modal on success
        setIsModalOpen(false);
        setFormData({
          name: "",
          email: "",
          walletAddress: "",
          network: "",
          role: "",
          addRole: "",
        });

        toast({
          title: "Complete Success",
          description:
            "Admin created and blockchain role granted successfully!",
          duration: 5000,
        });
      } catch (error) {
        console.error(
          "❌ Admin creation failed after blockchain success:",
          error,
        );

        // Extract error message from the nested error structure
        const errorMessage =
          (error as any)?.message ||
          (error as any)?.originalError?.message ||
          (error instanceof Error ? error.message : "Unknown error occurred");

        // Check if the error is due to duplicate admin
        const isDuplicateError = errorMessage.includes("already exists");

        if (isDuplicateError) {
          // For duplicate admin, don't retry - the admin already exists
          console.log("🔄 Admin already exists, stopping retry loop");
          toast({
            title: "Admin Already Exists",
            description:
              "An admin with this email already exists. Blockchain roles were granted successfully.",
            variant: "destructive",
            duration: 7000,
          });

          // Reset form and close modal
          setIsModalOpen(false);
          setFormData({
            name: "",
            email: "",
            walletAddress: "",
            network: "",
            role: "",
            addRole: "",
          });
          setAdminSuccessfullyCreated(true);
        } else {
          // For other errors, throw to let useEffect handle retry logic
          throw new Error(errorMessage);
        }
      }
    }
  };

  // Track if admin has been created to prevent infinite loops
  const [adminCreated, setAdminCreated] = useState(false);
  const [adminSuccessfullyCreated, setAdminSuccessfullyCreated] =
    useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    // Only create/update admin AFTER blockchain success and if not already processed or successful
    if (
      goldStatus.isConfirmed &&
      silverStatus.isConfirmed &&
      !adminCreated &&
      !adminSuccessfullyCreated &&
      retryCount < MAX_RETRIES
    ) {
      const processAdminCreation = async () => {
        try {
          setAdminCreated(true); // Mark as processed IMMEDIATELY to prevent re-runs
          await createAdminOrUpdateRole();
          setRetryCount(0); // Reset retry count on success
        } catch (error: any) {
          console.error("❌ Error in admin creation process:", error);
          // Reset only on non-duplicate errors to allow retry
          const errorMessage =
            error?.message || error?.toString() || "Unknown error";
          const isDuplicateError =
            errorMessage.toLowerCase().includes("already exists") ||
            errorMessage.toLowerCase().includes("duplicate");

          if (!isDuplicateError && retryCount < MAX_RETRIES - 1) {
            setRetryCount((prev) => prev + 1);
            setAdminCreated(false); // Allow retry for non-duplicate errors
            console.log(
              `🔄 Retrying admin creation (${retryCount + 1}/${MAX_RETRIES})`,
            );
          } else if (retryCount >= MAX_RETRIES - 1) {
            console.log(`❌ Max retries reached (${MAX_RETRIES}), stopping`);
            // toast({
            //   title: "Admin Creation Failed",
            //   description: `Failed to create admin after ${MAX_RETRIES} attempts. Please try again manually.`,
            //   variant: "destructive",
            //   duration: 10000,
            // });
          }
        }
      };

      processAdminCreation();
    }
  }, [
    goldStatus.isConfirmed,
    silverStatus.isConfirmed,
    adminCreated,
    adminSuccessfullyCreated,
    retryCount,
  ]);

  // Reset adminCreated flag and retry count when modal closes to prepare for next operation
  useEffect(() => {
    if (!isModalOpen) {
      setAdminCreated(false);
      setAdminSuccessfullyCreated(false);
      setRetryCount(0);
    }
  }, [isModalOpen]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold"></div>
      </div>
    );
  }

  console.log(isConnected.valueOf, "ccccccccccccccc");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Shield className="h-8 w-8 text-brand-gold" />
          <h1 className="text-3xl font-bold text-gray-900">Admin Management</h1>
        </div>
        <div className="flex items-center gap-4">
          {/* Wallet Connection Status */}
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Wallet
              size={16}
              className={
                isConnected || isSolanaConnected
                  ? "text-green-600"
                  : "text-gray-400"
              }
            />
            <span
              className={`text-sm font-medium ${isConnected || isSolanaConnected ? "text-green-600" : "text-gray-500"}`}
            >
              {isConnected
                ? `Connected (ETH): ${connectedWallet?.slice(0, 6)}...${connectedWallet?.slice(-4)}`
                : isSolanaConnected
                  ? `Connected (SOL): ${solanaAddress?.slice(0, 6)}...${solanaAddress?.slice(-4)}`
                  : "Not Connected"}
            </span>
          </div>
          <Button
            onClick={handleCreateAdmin}
            className="bg-gradient-to-r from-brand-brown to-brand-dark-gold hover:from-brand-dark-gold hover:to-brand-brown text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
            data-testid="invite-admin-button"
          >
            <Plus className="mr-2 h-5 w-5" />
            Invite Admin
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by admin name or email..."
                value={searchTerm}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="w-48">
            <Select value={roleFilter} onValueChange={(value) => handleFilterChange("role", value)}>
              <SelectTrigger>
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {Array.isArray(roles)
                  ? roles.map((role) => (
                      <SelectItem key={role._id || role.id} value={role.name}>
                        {formatRoleName(role.name)}
                      </SelectItem>
                    ))
                  : null}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Admin Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Admin Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Wallet Address</TableHead>
              <TableHead>Network</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedAdmins.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-8 text-gray-500"
                >
                  No admins found
                </TableCell>
              </TableRow>
            ) : (
              paginatedAdmins.map((admin) => (
                <TableRow key={admin.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{admin.name}</TableCell>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-sm text-gray-600">
                        {`${admin.walletAddress.slice(0, 6)}...${admin.walletAddress.slice(-4)}`}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyWallet(admin.walletAddress)}
                        className="h-6 w-6 p-0 hover:bg-gray-100"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                        admin.network === "ethereum" 
                          ? "bg-blue-100 text-blue-800"
                          : admin.network === "solana"
                          ? "bg-purple-100 text-purple-800"
                          : admin.network === "canton"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {admin.network || "Not specified"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {admin.roles.map((role, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-light text-brand-dark-gold"
                        >
                          {formatRoleName(role)}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        admin.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {admin.status}
                    </span>
                  </TableCell>
                  <TableCell>-</TableCell>
                  {/* <TableCell className="text-gray-600">
                    {admin?.lastLogin?.toLocaleDateString()}
                  </TableCell> */}
                  {!admin.isSuperAdmin && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditAdmin(admin)}
                          className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAdmin(admin.id)}
                          className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                        >
                          <Delete className="h-6 w-6" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination Controls */}
        {filteredAdmins.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <div className="flex items-center space-x-2 text-sm text-gray-700">
              <span>Showing</span>
              <span className="font-medium">{startIndex + 1}</span>
              <span>to</span>
              <span className="font-medium">
                {Math.min(startIndex + itemsPerPage, filteredAdmins.length)}
              </span>
              <span>of</span>
              <span className="font-medium">{filteredAdmins.length}</span>
              <span>results</span>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-20" data-testid="select-items-per-page">
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
          </div>
        )}
      </div>

      {/* Create/Edit Admin Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit Admin Role" : "Invite New Admin"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isEditMode && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Admin Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Enter admin name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="Enter email address"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="walletAddress">Wallet Address</Label>
                  <Input
                    id="walletAddress"
                    value={formData.walletAddress}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        walletAddress: e.target.value,
                      })
                    }
                    placeholder="Enter wallet address"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="network">Network</Label>
                  <Select
                    value={formData.network}
                    onValueChange={(value) =>
                      setFormData({ ...formData, network: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a network" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ethereum">Ethereum</SelectItem>
                      <SelectItem value="solana">Solana</SelectItem>
                      <SelectItem value="canton">Canton</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) =>
                      setFormData({ ...formData, role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(roles)
                        ? roles.map((role) => (
                            <SelectItem
                              key={role._id || role.id}
                              value={role.name}
                            >
                              {formatRoleName(role.name)}
                            </SelectItem>
                          ))
                        : null}
                    </SelectContent>
                  </Select>

                  {/* Wallet connection warning for blockchain roles */}
                  {formData.walletAddress &&
                    formData.role &&
                    formData.role !== "DEFAULT_ADMIN_ROLE" && (
                      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <Wallet
                            size={16}
                            className="text-orange-600 dark:text-orange-400"
                          />
                          <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
                            Blockchain Role Assignment
                          </span>
                        </div>
                        <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                          {isConnected
                            ? `✅ Ready to grant blockchain role with connected wallet (ETH): ${connectedWallet?.slice(0, 6)}...${connectedWallet?.slice(-4)}`
                            : isSolanaConnected
                              ? `✅ Ready to grant blockchain role with connected wallet (SOL): ${solanaAddress?.slice(0, 6)}...${solanaAddress?.slice(-4)}`
                              : `⚠️ Wallet connection required to grant blockchain roles. Please connect your wallet first.`}
                        </p>
                      </div>
                    )}
                </div>
              </>
            )}

            {isEditMode && editingAdmin && (
              <>
                <div className="space-y-2">
                  <Label>Admin Details</Label>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <p>
                      <strong>Name:</strong> {editingAdmin.name}
                    </p>
                    <p>
                      <strong>Email:</strong> {editingAdmin.email}
                    </p>
                    <p>
                      <strong>Wallet:</strong>{" "}
                      {editingAdmin.walletAddress || "Not provided"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Current Roles</Label>
                  <div className="flex flex-wrap gap-2">
                    {editingAdmin.roles &&
                      editingAdmin.roles.map((role, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-light text-brand-dark-gold"
                        >
                          {formatRoleName(role)}
                        </span>
                      ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Admin Network</Label>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                        editingAdmin.network === "ethereum" 
                          ? "bg-blue-100 text-blue-800"
                          : editingAdmin.network === "solana"
                          ? "bg-purple-100 text-purple-800"
                          : editingAdmin.network === "canton"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {editingAdmin.network || "Not specified"}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      Blockchain operations will be performed on this network
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="addRole">Add New Role</Label>
                  <Select
                    value={formData.addRole}
                    onValueChange={(value) =>
                      setFormData({ ...formData, addRole: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role to add" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(roles)
                        ? roles
                            .filter(
                              (role) =>
                                !editingAdmin.roles?.includes(role.name),
                            )
                            .map((role) => (
                              <SelectItem
                                key={role._id || role.id}
                                value={role.name}
                              >
                                {formatRoleName(role.name)}
                              </SelectItem>
                            ))
                        : null}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-brand-brown to-brand-dark-gold hover:from-brand-dark-gold hover:to-brand-brown text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                disabled={
                  createAdminMutation.isPending ||
                  updateAdminMutation.isPending ||
                  isGrantingRole
                }
                data-testid={
                  isEditMode ? "update-admin-button" : "send-invitation-button"
                }
              >
                {createAdminMutation.isPending ||
                updateAdminMutation.isPending ||
                isGrantingRole
                  ? "Processing..."
                  : isEditMode
                    ? "Update Admin"
                    : "Send Invitation"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Revoke Role Modal */}
      <Dialog open={isRevokeModalOpen} onOpenChange={setIsRevokeModalOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-brand-gold" />
              <span>Manage Admin Roles</span>
            </DialogTitle>
            <DialogDescription>
              Revoke roles from {adminToRevoke?.name}. Admin will be deleted if
              no roles remain.
            </DialogDescription>
          </DialogHeader>

          {adminToRevoke && (
            <div className="space-y-6">
              {/* Admin Info Display */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Name
                  </Label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {adminToRevoke.name}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email
                  </Label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {adminToRevoke.email}
                  </p>
                </div>
                {adminToRevoke.walletAddress && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Wallet Address
                    </Label>
                    <p className="text-sm text-gray-900 dark:text-gray-100 font-mono">
                      {adminToRevoke.walletAddress}
                    </p>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Admin Network
                  </Label>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                        adminToRevoke.network === "ethereum" 
                          ? "bg-blue-100 text-blue-800"
                          : adminToRevoke.network === "solana"
                          ? "bg-purple-100 text-purple-800"
                          : adminToRevoke.network === "canton"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {adminToRevoke.network || "Not specified"}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      Blockchain operations will be performed on this network
                    </p>
                  </div>
                </div>
              </div>

              {/* Current Roles */}
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">
                  Current Roles ({adminToRevoke.roles.length})
                </Label>
                <div className="space-y-3">
                  {adminToRevoke.roles.map((roleName) => {
                    const role = roles.find((r) => r.name === roleName);
                    const hasBlockchainRole =
                      role?.blockchainRoleId && adminToRevoke.walletAddress;
                    const isProcessing = revokeRoleProcessing === roleName;

                    return (
                      <div
                        key={roleName}
                        className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <Shield className="h-4 w-4 text-brand-gold" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {formatRoleName(roleName)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {hasBlockchainRole
                                ? "Blockchain Role"
                                : "Database Only"}
                            </p>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRevokeRole(roleName)}
                          disabled={isProcessing || isRevokingRole}
                          className="flex items-center space-x-1"
                        >
                          {isProcessing ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                              <span>Revoking...</span>
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-3 w-3" />
                              <span>Revoke</span>
                            </>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Warning if wallet connection needed */}
              {adminToRevoke.walletAddress && !isConnected && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      Wallet connection required to revoke blockchain roles
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsRevokeModalOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
