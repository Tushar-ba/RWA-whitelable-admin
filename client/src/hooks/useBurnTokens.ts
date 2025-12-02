import { useState, useCallback, useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { toast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
// @ts-ignore
import GoldTokenABI from "@assets/GoldToken_1754929372834.json";
// @ts-ignore
import SilverTokenABI from "@assets/SilverToken_1754929372833.json";

interface BurnTokensParams {
  requestId: string; // Request ID (will be converted to uint256)
  metal: "gold" | "silver"; // Which token to burn
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

export const useBurnTokens = () => {
  const { isConnected, address: connectedAddress } = useAccount();
  const [isBurning, setIsBurning] = useState(false);
  const [currentStep, setCurrentStep] = useState<
    "idle" | "burning" | "updating" | "complete"
  >("idle");

  const [burnParams, setBurnParams] = useState<BurnTokensParams | null>(null);

  // Contract interaction hooks
  const {
    writeContract,
    data: txHash,
    error: burnError,
    isPending: burnPending,
  } = useWriteContract();

  const { isLoading: txConfirming, isSuccess: txConfirmed } =
    useWaitForTransactionReceipt({
      hash: txHash,
      query: {
        enabled: !!txHash,
      },
    });

  // Handle transaction confirmation and update database
  useEffect(() => {
    if (txConfirmed && txHash && currentStep === "burning" && burnParams) {
      console.log("✅ Burn tokens transaction confirmed:", txHash);
      setCurrentStep("updating");

      toast({
        title: "Tokens Burned Successfully",
        description: `Tokens burned! Transaction: ${txHash.slice(0, 10)}...`,
        duration: 3000,
      });

      // Update database status to fulfilled
      updateRedemptionStatus(burnParams.requestId, "fulfilled");
    }
  }, [txConfirmed, txHash, currentStep, burnParams]);

  // Handle burn transaction error
  useEffect(() => {
    if (burnError && currentStep === "burning") {
      console.error("❌ Burn tokens transaction error:", burnError);
      setIsBurning(false);
      setCurrentStep("idle");
      setBurnParams(null);

      toast({
        title: "Token Burning Failed",
        description: burnError.message || "Burn transaction failed",
        variant: "destructive",
        duration: 8000,
      });
    }
  }, [burnError, currentStep]);

  // Update redemption status in database
  const updateRedemptionStatus = async (requestId: string, status: string) => {
    try {
      console.log(`🔄 Updating redemption status to ${status}...`);

      const response = await apiRequest.patch(
        `/api/transactions/redemption-requests/${requestId}`,
        {
          status: status,
          burnedAt: new Date().toISOString(),
        },
      );

      if (response.success) {
        console.log("✅ Redemption status updated successfully");
        
        // Invalidate queries to refresh the UI with latest data
        queryClient.invalidateQueries({
          queryKey: ["/api/transactions/redemption-requests"],
        });
        queryClient.invalidateQueries({
          queryKey: ["/api/transactions/redemption-requests", requestId],
        });
        
        setCurrentStep("complete");
        setIsBurning(false);
        setBurnParams(null);

        toast({
          title: "Redemption Complete",
          description: "Tokens burned and redemption fulfilled successfully!",
          duration: 5000,
        });
      } else {
        throw new Error(
          response.message || "Failed to update redemption status",
        );
      }
    } catch (error) {
      console.error("❌ Error updating redemption status:", error);
      setIsBurning(false);
      setCurrentStep("idle");
      setBurnParams(null);

      toast({
        title: "Database Update Failed",
        description:
          "Tokens were burned but failed to update redemption status",
        variant: "destructive",
        duration: 8000,
      });
    }
  };

  const burnTokens = useCallback(
    async ({ requestId, metal }: BurnTokensParams): Promise<string> => {
      if (!isConnected || !connectedAddress) {
        toast({
          title: "Wallet Not Connected",
          description:
            "Please connect your wallet before performing blockchain operations",
          variant: "destructive",
        });
        throw new Error("Wallet not connected");
      }

      const tokenConfig =
        TOKEN_CONFIGS[metal.toUpperCase() as keyof typeof TOKEN_CONFIGS];

      if (!tokenConfig.contractAddress) {
        throw new Error(
          `${metal.toUpperCase()} token contract address not found in environment variables`,
        );
      }

      // Convert request ID to number for blockchain (uint256 type)
      const numericRequestId = parseInt(requestId);
      if (isNaN(numericRequestId) || numericRequestId <= 0) {
        throw new Error("Invalid request ID - must be a positive number");
      }

      console.log(`🔥 Burning ${metal.toUpperCase()} tokens:`);
      console.log("Contract:", tokenConfig.contractAddress);
      console.log("Request ID (string):", requestId);
      console.log("Request ID (uint256):", numericRequestId);

      // Store parameters for tracking
      setBurnParams({ requestId, metal });
      setIsBurning(true);
      setCurrentStep("burning");

      try {
        // Execute fulfillRedemptionRequest transaction
        writeContract({
          address: tokenConfig.contractAddress as `0x${string}`,
          abi: tokenConfig.abi,
          functionName: "fulfillRedemptionRequest",
          args: [numericRequestId],
        });

        toast({
          title: "Token Burning Initiated",
          description: `Burning ${metal.toUpperCase()} tokens for redemption request`,
        });

        // Return a promise that resolves when the process is complete
        return new Promise((resolve, reject) => {
          const checkCompletion = () => {
            if (currentStep === "complete" && txHash) {
              resolve(txHash);
              return;
            }

            // Check for errors
            if (burnError) {
              reject(burnError);
              return;
            }

            // Continue checking
            setTimeout(checkCompletion, 1000);
          };

          checkCompletion();
        });
      } catch (error) {
        console.error("💥 Error in burnTokens:", error);
        setIsBurning(false);
        setCurrentStep("idle");
        setBurnParams(null);

        toast({
          title: "Token Burning Failed",
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
      writeContract,
      currentStep,
      txHash,
      burnError,
    ],
  );

  return {
    burnTokens,
    isBurning,
    currentStep,
    burnStatus: {
      isPending: burnPending,
      isConfirming: txConfirming,
      isConfirmed: txConfirmed,
      hash: txHash,
      error: burnError,
    },
    isLoading: burnPending || txConfirming,
  };
};
