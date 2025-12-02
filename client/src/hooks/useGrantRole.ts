import { useEffect } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from "wagmi";
import { toast } from "@/hooks/use-toast";
import GoldTokenABI from "../../../blockchain/abis/GoldToken.json";
import SilverTokenABI from "../../../blockchain/abis/SilverToken.json";

export type TokenType = "GOLD" | "SILVER";

interface GrantRoleParams {
  role: string; // bytes32 role (hex string)
  account: string; // address to grant role to
}

interface TokenConfig {
  contractAddress: string;
  abi: any[];
  name: string;
  symbol: string;
}

// Token configurations
const TOKEN_CONFIGS: Record<TokenType, TokenConfig> = {
  GOLD: {
    contractAddress: import.meta.env.VITE_GOLD_TOKEN_CONTRACT || "",
    abi: GoldTokenABI.abi,
    name: "Gold Reserve Token",
    symbol: "GRT",
  },
  SILVER: {
    contractAddress: import.meta.env.VITE_SILVER_TOKEN_CONTRACT || "",
    abi: SilverTokenABI.abi,
    name: "Silver Reserve Token",
    symbol: "SRT",
  },
};

export const useGrantRole = (tokenType: TokenType) => {
  const { address: connectedAddress, isConnected } = useAccount();
  const { writeContract, data: hash, error, isPending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  const grantRole = async ({
    role,
    account,
  }: GrantRoleParams): Promise<string> => {
    // Check wallet connection first
    if (!isConnected || !connectedAddress) {
      toast({
        title: "Wallet Not Connected",
        description:
          "Please connect your wallet before performing blockchain operations",
        variant: "destructive",
      });
      throw new Error("Wallet not connected");
    }

    const tokenConfig = TOKEN_CONFIGS[tokenType];

    if (!tokenConfig.contractAddress) {
      throw new Error(
        `${tokenType} contract address not found in environment variables`,
      );
    }

    // Validate role (bytes32 format)
    if (!role || !role.startsWith("0x") || role.length !== 66) {
      throw new Error("Invalid role format - must be 32-byte hex string");
    }

    // Validate account address
    if (!account || !account.startsWith("0x") || account.length !== 42) {
      throw new Error("Invalid account address");
    }

    console.log(`🔗 Granting ${tokenType} role ${role} to ${account}`);

    try {
      // Initiate the transaction
      writeContract({
        address: tokenConfig.contractAddress as `0x${string}`,
        abi: tokenConfig.abi,
        functionName: "grantRole",
        args: [role as `0x${string}`, account as `0x${string}`],
      });

      toast({
        title: `${tokenType} Role Grant Initiated`,
        description: `Granting role to ${account.slice(0, 6)}...${account.slice(-4)}`,
      });

      console.log(`🔗 ${tokenType} Role Grant Initiated:`, hash);
      console.log({
        title: `${tokenType} Role Grant Initiated`,
        description: `Granting role to ${account.slice(0, 6)}...${account.slice(-4)}`,
      });

      // Wait for transaction hash to be available
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (error) {
            clearInterval(checkInterval);
            reject(error);
          } else if (hash && isConfirmed) {
            clearInterval(checkInterval);
            resolve(hash);
          }
        }, 500);

        // Timeout after 60 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error(`${tokenType} transaction timeout`));
        }, 60000);
      });
    } catch (err: any) {
      console.error(`${tokenType} Grant Role Error:`, err);

      toast({
        title: `${tokenType} Role Grant Failed`,
        description: err.message || `Failed to grant ${tokenType} role`,
        variant: "destructive",
      });

      throw err;
    }
  };

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed && hash) {
      console.log(`✅ ${tokenType} transaction confirmed:`, hash);

      toast({
        title: `${tokenType} Role Granted Successfully`,
        description: `Role granted successfully! Transaction: ${hash.slice(0, 10)}...`,
        duration: 5000,
      });

      // Resolve the promise if it exists
      const resolveKey = (window as any)[`${tokenType}_current_resolve_key`];
      const rejectKey = (window as any)[`${tokenType}_current_reject_key`];

      if (resolveKey && (window as any)[resolveKey]) {
        (window as any)[resolveKey](hash);
        delete (window as any)[resolveKey];
        delete (window as any)[rejectKey];
        delete (window as any)[`${tokenType}_current_resolve_key`];
        delete (window as any)[`${tokenType}_current_reject_key`];
      }
    }
  }, [isConfirmed, hash, tokenType]);

  // Handle transaction error
  useEffect(() => {
    if (error) {
      console.error(`❌ ${tokenType} transaction error:`, error);

      toast({
        title: `${tokenType} Transaction Error`,
        description: error.message || "Transaction failed",
        variant: "destructive",
      });

      // Reject the promise if it exists
      const resolveKey = (window as any)[`${tokenType}_current_resolve_key`];
      const rejectKey = (window as any)[`${tokenType}_current_reject_key`];

      if (rejectKey && (window as any)[rejectKey]) {
        (window as any)[rejectKey](error);
        delete (window as any)[resolveKey];
        delete (window as any)[rejectKey];
        delete (window as any)[`${tokenType}_current_resolve_key`];
        delete (window as any)[`${tokenType}_current_reject_key`];
      }
    }
  }, [error, tokenType]);

  return {
    grantRole,
    isPending,
    isConfirming,
    isConfirmed,
    transactionHash: hash,
    error,
    isLoading: isPending || isConfirming,
    isConnected,
    connectedAddress,
  };
};

// Combined hook to grant role on both tokens
export const useGrantRoleBothTokens = () => {
  const { isConnected, address: connectedAddress } = useAccount();
  const goldGrantRole = useGrantRole("GOLD");
  const silverGrantRole = useGrantRole("SILVER");

  const grantRoleOnBothTokens = async ({
    role,
    account,
  }: GrantRoleParams): Promise<{
    goldTxHash: string;
    silverTxHash: string;
  }> => {
    if (!isConnected || !connectedAddress) {
      toast({
        title: "Wallet Not Connected",
        description:
          "Please connect your wallet before performing blockchain operations",
        variant: "destructive",
      });
      throw new Error("Wallet not connected");
    }

    try {
      console.log(
        `🔗 Starting sequential role grant on both tokens: ${role} to ${account}`,
      );

      // Step 1: Grant role on Gold token and wait for confirmation
      console.log("🥇 Starting Gold token role grant...");
      const goldTxHash = await goldGrantRole.grantRole({ role, account });
      console.log("✅ Gold token role granted successfully:", goldTxHash);

      // Step 2: Grant role on Silver token and wait for confirmation
      console.log("🥈 Starting Silver token role grant...");
      const silverTxHash = await silverGrantRole.grantRole({ role, account });
      console.log("✅ Silver token role granted successfully:", silverTxHash);

      console.log("✅ Both tokens role granted successfully");

      return {
        goldTxHash,
        silverTxHash,
      };
    } catch (error) {
      console.error("❌ Failed to grant role on both tokens:", error);
      throw error;
    }
  };

  const isLoading = goldGrantRole.isLoading || silverGrantRole.isLoading;
  const isPending = goldGrantRole.isPending || silverGrantRole.isPending;
  const isConfirming =
    goldGrantRole.isConfirming || silverGrantRole.isConfirming;
  const bothConfirmed =
    goldGrantRole.isConfirmed && silverGrantRole.isConfirmed;

  return {
    grantRoleOnBothTokens,
    goldResult: {
      isPending: goldGrantRole.isPending,
      isConfirming: goldGrantRole.isConfirming,
      isConfirmed: goldGrantRole.isConfirmed,
      transactionHash: goldGrantRole.transactionHash,
      error: goldGrantRole.error,
    },
    silverResult: {
      isPending: silverGrantRole.isPending,
      isConfirming: silverGrantRole.isConfirming,
      isConfirmed: silverGrantRole.isConfirmed,
      transactionHash: silverGrantRole.transactionHash,
      error: silverGrantRole.error,
    },
    isLoading,
    isPending,
    isConfirming,
    bothConfirmed,
    isConnected,
    connectedAddress,
  };
};
