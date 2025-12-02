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

interface CancelRedemptionParams {
  requestId: string; // Request ID (will be converted to uint256)
  metal: "gold" | "silver"; // Which token
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

export const useCancelRedemption = () => {
  const { isConnected, address: connectedAddress } = useAccount();
  const [isCancelling, setIsCancelling] = useState(false);
  const [currentStep, setCurrentStep] = useState<
    "idle" | "cancelling" | "updating" | "complete"
  >("idle");
  
  const [cancelParams, setCancelParams] = useState<CancelRedemptionParams | null>(null);

  // Contract interaction hooks
  const {
    writeContract,
    data: txHash,
    error: cancelError,
    isPending: cancelPending,
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
    if (txConfirmed && txHash && currentStep === "cancelling" && cancelParams) {
      console.log("✅ Cancel redemption transaction confirmed:", txHash);
      setCurrentStep("updating");

      toast({
        title: "Redemption Cancelled Successfully",
        description: `Redemption cancelled! Transaction: ${txHash.slice(0, 10)}...`,
        duration: 3000,
      });

      // Update database status to cancelled
      updateRedemptionStatus(cancelParams.requestId, "cancelled");
    }
  }, [txConfirmed, txHash, currentStep, cancelParams]);

  // Handle cancel transaction error
  useEffect(() => {
    if (cancelError && currentStep === "cancelling") {
      console.error("❌ Cancel redemption transaction error:", cancelError);
      setIsCancelling(false);
      setCurrentStep("idle");
      setCancelParams(null);

      toast({
        title: "Redemption Cancellation Failed",
        description: cancelError.message || "Cancel transaction failed",
        variant: "destructive",
        duration: 8000,
      });
    }
  }, [cancelError, currentStep]);

  // Update redemption status in database
  const updateRedemptionStatus = async (requestId: string, status: string) => {
    try {
      console.log(`🔄 Updating redemption status to ${status}...`);
      
      const response = await apiRequest.patch(`/api/transactions/redemption-requests/${requestId}`, {
        status: status,
        cancelledAt: new Date().toISOString()
      });

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
        setIsCancelling(false);
        setCancelParams(null);

        toast({
          title: "Cancellation Complete",
          description: "Redemption cancelled successfully!",
          duration: 5000,
        });
      } else {
        throw new Error(response.message || "Failed to update redemption status");
      }
    } catch (error) {
      console.error("❌ Error updating redemption status:", error);
      setIsCancelling(false);
      setCurrentStep("idle");
      setCancelParams(null);

      toast({
        title: "Database Update Failed",
        description: "Redemption was cancelled but failed to update status",
        variant: "destructive",
        duration: 8000,
      });
    }
  };

  const cancelRedemption = useCallback(
    async ({
      requestId,
      metal,
    }: CancelRedemptionParams): Promise<string> => {
      if (!isConnected || !connectedAddress) {
        toast({
          title: "Wallet Not Connected",
          description:
            "Please connect your wallet before performing blockchain operations",
          variant: "destructive",
        });
        throw new Error("Wallet not connected");
      }

      const tokenConfig = TOKEN_CONFIGS[metal.toUpperCase() as keyof typeof TOKEN_CONFIGS];

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

      console.log(`❌ Cancelling ${metal.toUpperCase()} redemption:`);
      console.log("Contract:", tokenConfig.contractAddress);
      console.log("Request ID (string):", requestId);
      console.log("Request ID (uint256):", numericRequestId);

      // Store parameters for tracking
      setCancelParams({ requestId, metal });
      setIsCancelling(true);
      setCurrentStep("cancelling");

      try {
        // Execute cancelRedemptionRequest transaction
        writeContract({
          address: tokenConfig.contractAddress as `0x${string}`,
          abi: tokenConfig.abi,
          functionName: "cancelRedemptionRequest",
          args: [numericRequestId],
        });

        toast({
          title: "Redemption Cancellation Initiated",
          description: `Cancelling ${metal.toUpperCase()} token redemption request`,
        });

        // Return a promise that resolves when the process is complete
        return new Promise((resolve, reject) => {
          const checkCompletion = () => {
            if (currentStep === "complete" && txHash) {
              resolve(txHash);
              return;
            }

            // Check for errors
            if (cancelError) {
              reject(cancelError);
              return;
            }

            // Continue checking
            setTimeout(checkCompletion, 1000);
          };

          checkCompletion();
        });
      } catch (error) {
        console.error("💥 Error in cancelRedemption:", error);
        setIsCancelling(false);
        setCurrentStep("idle");
        setCancelParams(null);

        toast({
          title: "Redemption Cancellation Failed",
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
      cancelError,
    ],
  );

  return {
    cancelRedemption,
    isCancelling,
    currentStep,
    cancelStatus: {
      isPending: cancelPending,
      isConfirming: txConfirming,
      isConfirmed: txConfirmed,
      hash: txHash,
      error: cancelError,
    },
    isLoading: cancelPending || txConfirming,
  };
};