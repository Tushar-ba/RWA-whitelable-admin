import React from "react";
import { Button } from "@/components/ui/button";
import { Wallet, ExternalLink, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAppKitAccount, useAppKit } from "@reown/appkit/react";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface WalletButtonProps {
  className?: string;
}

export function WalletButton({ className }: WalletButtonProps) {
  const { address, isConnected } = useAppKitAccount();
  const { open } = useAppKit();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutation to update wallet address in profile
  const updateWalletMutation = useMutation({
    mutationFn: (walletAddress: string) =>
      apiRequest.put(`/api/profile/${user?.id}`, { walletAddress }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile", user?.id] });
      toast({
        title: "Wallet Updated",
        description: "Your wallet address has been saved to your profile.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description:
          error.response?.data?.message || "Failed to update wallet address",
        variant: "destructive",
      });
    },
  });

  const handleConnect = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in first before connecting your wallet.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Open Reown AppKit modal with wallet selection
      await open();
    } catch (error) {
      console.error("Failed to open wallet modal:", error);
      toast({
        title: "Connection Failed",
        description: "Failed to open wallet selection modal.",
        variant: "destructive",
      });
    }
  };

  // Update wallet address in profile when connected
  // Note: Automatic wallet address updating is disabled to ensure 
  // wallet validation happens first via useWalletValidation hook
  // React.useEffect(() => {
  //   if (isConnected && address && user?.id) {
  //     updateWalletMutation.mutate(address);
  //   }
  // }, [isConnected, address, user?.id]);

  const formatAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleDisconnect = async () => {
    try {
      await open({ view: "Account" });
    } catch (error) {
      console.error("Failed to open account modal:", error);
    }
  };

  if (isConnected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className={className}>
            <Wallet className="h-4 w-4 mr-2" />
            <span className="font-mono text-xs">{formatAddress(address)}</span>
            <Badge variant="secondary" className="ml-2 h-4 px-2 text-xs">
              Connected
            </Badge>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem className="flex items-center justify-between">
            <span className="text-sm font-medium">Wallet Address</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="font-mono text-xs text-gray-600">
            {formatAddress(address)}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => navigator.clipboard.writeText(address)}
            className="cursor-pointer"
          >
            Copy Address
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              window.open(`https://etherscan.io/address/${address}`, "_blank")
            }
            className="cursor-pointer"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View on Explorer
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleDisconnect}
            className="cursor-pointer text-red-600"
          >
            Manage Wallet
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button
      onClick={handleConnect}
      variant="outline"
      size="sm"
      className={className}
      disabled={updateWalletMutation.isPending}
    >
      {updateWalletMutation.isPending ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Wallet className="h-4 w-4 mr-2" />
      )}
      {updateWalletMutation.isPending ? "Connecting..." : "Connect Wallet"}
    </Button>
  );
}

// Extend Window interface for TypeScript
// Global window.ethereum declaration is handled by wagmi/ethers
