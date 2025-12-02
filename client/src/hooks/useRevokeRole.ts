import { useState, useCallback, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useToast } from "@/hooks/use-toast";
import { useMemeTokenProgram } from "@/hooks/useSolanaToken";
import { useAppKitAccount } from "@reown/appkit/react";

// Import the contract ABIs
import GoldTokenABI from "../../../blockchain/abis/GoldToken.json";
import SilverTokenABI from "../../../blockchain/abis/SilverToken.json";

interface RevokeRoleParams {
  role: string;
  account: string;
  network?: string; // Optional network parameter for network-based role revocation
  roleNumber?: number; // Optional numerical role for Solana network
}

interface TokenConfig {
  contractAddress: string;
  abi: any[];
  name: string;
}

// Token configurations
const TOKEN_CONFIGS = {
  GOLD: {
    contractAddress: import.meta.env.VITE_GOLD_TOKEN_CONTRACT || "",
    abi: GoldTokenABI.abi,
    name: "Gold Token",
  },
  SILVER: {
    contractAddress: import.meta.env.VITE_SILVER_TOKEN_CONTRACT || "",
    abi: SilverTokenABI.abi,
    name: "Silver Token",
  },
} as const;

export const useRevokeRole = () => {
  const { isConnected, address: connectedAddress } = useAccount(); // Ethereum wallet
  const { address: solanaAddress, isConnected: isSolanaConnected } = useAppKitAccount(); // Solana wallet
  const { removeRole } = useMemeTokenProgram(); // For Solana network role revocation
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<
    "idle" | "gold" | "silver" | "complete"
  >("idle");

  // Store the parameters for sequential execution
  const [revokeParams, setRevokeParams] = useState<RevokeRoleParams | null>(null);
  const [goldTxHash, setGoldTxHash] = useState<string | null>(null);
  const [silverTxHash, setSilverTxHash] = useState<string | null>(null);
  
  // Store the resolve/reject functions for the promise
  const [promiseResolver, setPromiseResolver] = useState<{
    resolve: (value: { goldTxHash: string; silverTxHash: string }) => void;
    reject: (error: any) => void;
  } | null>(null);

  const { toast } = useToast();

  // Gold token hooks
  const {
    writeContract: writeGoldContract,
    data: goldHash,
    error: goldError,
    isPending: goldPending,
  } = useWriteContract();

  const { isLoading: goldConfirming, isSuccess: goldConfirmed } =
    useWaitForTransactionReceipt({
      hash: goldHash,
      query: {
        enabled: !!goldHash,
      },
    });

  // Silver token hooks
  const {
    writeContract: writeSilverContract,
    data: silverHash,
    error: silverError,
    isPending: silverPending,
  } = useWriteContract();

  const { isLoading: silverConfirming, isSuccess: silverConfirmed } =
    useWaitForTransactionReceipt({
      hash: silverHash,
      query: {
        enabled: !!silverHash,
      },
    });

  // Handle Gold transaction confirmation and trigger Silver transaction
  useEffect(() => {
    if (goldConfirmed && goldHash && currentStep === "gold" && revokeParams) {
      console.log("✅ Gold role revocation confirmed:", goldHash);
      setGoldTxHash(goldHash);
      setCurrentStep("silver");

      toast({
        title: "Gold Token Role Revoked",
        description: `Role revoked successfully! Transaction: ${goldHash.slice(0, 10)}...`,
        duration: 3000,
      });

      // Start Silver token transaction
      console.log("🥈 Starting Silver token role revocation...");
      const tokenConfig = TOKEN_CONFIGS.SILVER;

      writeSilverContract({
        address: tokenConfig.contractAddress as `0x${string}`,
        abi: tokenConfig.abi,
        functionName: "revokeRole",
        args: [
          revokeParams.role as `0x${string}`,
          revokeParams.account as `0x${string}`,
        ],
      });
    }
  }, [goldConfirmed, goldHash, currentStep, revokeParams, writeSilverContract]);

  // Handle Silver transaction confirmation
  useEffect(() => {
    if (silverConfirmed && silverHash && currentStep === "silver") {
      console.log("✅ Silver role revocation confirmed:", silverHash);
      setSilverTxHash(silverHash);
      setCurrentStep("complete");
      setIsProcessing(false);

      toast({
        title: "Sequential Role Revocation Complete",
        description: "Role revoked from both Gold and Silver tokens successfully!",
        duration: 5000,
      });

      // Resolve the promise with both transaction hashes
      if (promiseResolver && goldTxHash) {
        console.log("🎯 Resolving promise with transaction hashes:", {
          goldTxHash,
          silverTxHash: silverHash,
        });
        
        promiseResolver.resolve({
          goldTxHash,
          silverTxHash: silverHash,
        });
        setPromiseResolver(null);
      }

      // Clear the stored parameters
      setRevokeParams(null);
    }
  }, [silverConfirmed, silverHash, currentStep, promiseResolver, goldTxHash]);

  // Handle Gold transaction error
  useEffect(() => {
    if (goldError && currentStep === "gold") {
      console.error("❌ Gold role revocation error:", goldError);
      setIsProcessing(false);
      setCurrentStep("idle");
      setRevokeParams(null);

      // Reject the promise
      if (promiseResolver) {
        promiseResolver.reject(goldError);
        setPromiseResolver(null);
      }

      toast({
        title: "Gold Token Role Revocation Failed",
        description: goldError.message || "Gold transaction failed",
        variant: "destructive",
        duration: 8000,
      });
    }
  }, [goldError, currentStep, promiseResolver]);

  // Handle Silver transaction error
  useEffect(() => {
    if (silverError && currentStep === "silver") {
      console.error("❌ Silver role revocation error:", silverError);
      setIsProcessing(false);
      setCurrentStep("idle");
      setRevokeParams(null);

      // Reject the promise
      if (promiseResolver) {
        promiseResolver.reject(silverError);
        setPromiseResolver(null);
      }

      toast({
        title: "Silver Token Role Revocation Failed",
        description: silverError.message || "Silver transaction failed",
        variant: "destructive",
        duration: 8000,
      });
    }
  }, [silverError, currentStep, promiseResolver]);

  const revokeRoleOnBothTokens = useCallback(
    async ({
      role,
      account,
      network = "ethereum", // Default to ethereum for backward compatibility
      roleNumber, // Optional numerical role for Solana network
    }: RevokeRoleParams): Promise<{
      goldTxHash: string;
      silverTxHash: string;
    }> => {
      // For Ethereum networks, check wallet connection here
      // For Solana networks, let the removeRole function handle wallet validation
      if (network !== "solana") {
        if (!isConnected || !connectedAddress) {
          toast({
            title: "Wallet Connection Required",
            description: "Please connect your Ethereum wallet to revoke blockchain roles",
            variant: "destructive",
          });
          throw new Error("Ethereum wallet not connected");
        }
      }

      console.log("🔄 Starting role revocation...");
      console.log("Role to revoke:", role);
      console.log("Account:", account);
      console.log("Network:", network);

      setIsProcessing(true);
      setRevokeParams({ role, account, network });
      setGoldTxHash(null);
      setSilverTxHash(null);

      // Handle Solana network with bundled transaction
      if (network === "solana") {
        try {
          console.log("🟣 Starting Solana bundled role revocation...");
          setCurrentStep("gold"); // Set step for UI purposes
          
          // Use provided roleNumber if available, otherwise map role strings to role numbers
          const roleNumberToUse = roleNumber !== undefined ? roleNumber :
            role === "SUPPLY_CONTROLLER_ROLE" ? 0 :
            role === "ASSET_PROTECTOR_ROLE" ? 1 :
            role === "FEE_CONTROLLER_ROLE" ? 2 :
            3; // DEFAULT_ADMIN_ROLE

          const signature = await removeRole(account, roleNumberToUse);
          
          console.log("✅ Solana bundled role revocation successful:", signature);
          
          setCurrentStep("complete");
          setIsProcessing(false);
          
          // For Solana, use the same signature for both tokens since it's bundled
          return {
            goldTxHash: signature,
            silverTxHash: signature,
          };
        } catch (error) {
          console.error("❌ Solana role revocation failed:", error);
          setIsProcessing(false);
          setCurrentStep("idle");
          
          toast({
            title: "Solana Operation Failed",
            description:
              error instanceof Error ? error.message : "Unknown error occurred",
            variant: "destructive",
          });
          
          throw error;
        }
      }

      // Handle Ethereum network with sequential transactions (existing logic)
      setCurrentStep("gold");
      console.log("🥇 Starting Gold token role revocation...");
      const goldTokenConfig = TOKEN_CONFIGS.GOLD;

      try {
        writeGoldContract({
          address: goldTokenConfig.contractAddress as `0x${string}`,
          abi: goldTokenConfig.abi,
          functionName: "revokeRole",
          args: [role as `0x${string}`, account as `0x${string}`],
        });

        // Return a Promise that resolves when both transactions are complete
        return new Promise((resolve, reject) => {
          // Store the promise resolver to be used in useEffect callbacks
          setPromiseResolver({ resolve, reject });
        });
      } catch (error) {
        console.error("💥 Error in revokeRoleOnBothTokens:", error);
        setIsProcessing(false);
        setCurrentStep("idle");
        setGoldTxHash(null);
        setSilverTxHash(null);
        setRevokeParams(null);
        console.error("❌ Sequential role revocation failed:", error);

        toast({
          title: "Blockchain Operation Failed",
          description:
            error instanceof Error ? error.message : "Unknown error occurred",
          variant: "destructive",
        });

        throw error;
      }
    },
    [
      isConnected,
      connectedAddress,
      isSolanaConnected,
      solanaAddress,
      removeRole,
      writeGoldContract,
      writeSilverContract,
      goldTxHash,
      silverTxHash,
      currentStep,
      goldError,
      silverError,
    ],
  );

  return {
    revokeRoleOnBothTokens,
    isProcessing,
    currentStep,
    goldStatus: {
      isPending: goldPending,
      isConfirming: goldConfirming,
      isConfirmed: goldConfirmed,
      hash: goldTxHash,
    },
    silverStatus: {
      isPending: silverPending,
      isConfirming: silverConfirming,
      isConfirmed: silverConfirmed,
      hash: silverTxHash,
    },
  };
};