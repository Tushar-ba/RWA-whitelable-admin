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

interface ProcessRedemptionParams {
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

export const useProcessRedemption = () => {
  const { isConnected, address: connectedAddress } = useAccount();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<
    "idle" | "processing" | "updating" | "complete"
  >("idle");
  
  const [processParams, setProcessParams] = useState<ProcessRedemptionParams | null>(null);

  // Contract interaction hooks
  const {
    writeContract,
    data: txHash,
    error: processError,
    isPending: processPending,
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
    if (txConfirmed && txHash && currentStep === "processing" && processParams) {
      console.log("✅ Process redemption transaction confirmed:", txHash);
      setCurrentStep("updating");

      toast({
        title: "Redemption Processing Started",
        description: `Processing initiated! Transaction: ${txHash.slice(0, 10)}...`,
        duration: 3000,
      });

      // Update database status to processing
      updateRedemptionStatus(processParams.requestId, "processing");
    }
  }, [txConfirmed, txHash, currentStep, processParams]);

  // Handle process transaction error
  useEffect(() => {
    if (processError && currentStep === "processing") {
      console.error("❌ Process redemption transaction error:", processError);
      setIsProcessing(false);
      setCurrentStep("idle");
      setProcessParams(null);

      toast({
        title: "Redemption Processing Failed",
        description: processError.message || "Process transaction failed",
        variant: "destructive",
        duration: 8000,
      });
    }
  }, [processError, currentStep]);

  // Update redemption status in database
  const updateRedemptionStatus = async (requestId: string, status: string) => {
    try {
      console.log(`🔄 Updating redemption status to ${status}...`);
      
      const response = await apiRequest.put(`/api/transactions/redemption-requests/${requestId}`, {
        status: status
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
        setIsProcessing(false);
        setProcessParams(null);

        toast({
          title: "Process Complete",
          description: "Redemption processing started successfully!",
          duration: 5000,
        });
      } else {
        throw new Error(response.message || "Failed to update redemption status");
      }
    } catch (error) {
      console.error("❌ Error updating redemption status:", error);
      setIsProcessing(false);
      setCurrentStep("idle");
      setProcessParams(null);

      toast({
        title: "Database Update Failed",
        description: "Processing started but failed to update redemption status",
        variant: "destructive",
        duration: 8000,
      });
    }
  };

  const processRedemption = useCallback(
    async ({
      requestId,
      metal,
    }: ProcessRedemptionParams): Promise<string> => {
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

      console.log(`🔄 Processing ${metal.toUpperCase()} redemption:`);
      console.log("Contract:", tokenConfig.contractAddress);
      console.log("Request ID (string):", requestId);
      console.log("Request ID (uint256):", numericRequestId);

      // Store parameters for tracking
      setProcessParams({ requestId, metal });
      setIsProcessing(true);
      setCurrentStep("processing");

      try {
        // Execute setRedemptionProcessing transaction
        writeContract({
          address: tokenConfig.contractAddress as `0x${string}`,
          abi: tokenConfig.abi,
          functionName: "setRedemptionProcessing",
          args: [numericRequestId],
          chainId: 17000, // Holesky testnet
        });

        toast({
          title: "Redemption Processing Initiated",
          description: `Processing ${metal.toUpperCase()} redemption request ${requestId}`,
        });

        // Return a promise that resolves when the process is complete
        return new Promise((resolve, reject) => {
          const checkCompletion = () => {
            if (currentStep === "complete" && txHash) {
              resolve(txHash);
              return;
            }

            // Check for errors
            if (processError) {
              reject(processError);
              return;
            }

            // Continue checking
            setTimeout(checkCompletion, 1000);
          };

          checkCompletion();
        });
      } catch (error) {
        console.error("💥 Error in processRedemption:", error);
        setIsProcessing(false);
        setCurrentStep("idle");
        setProcessParams(null);

        toast({
          title: "Redemption Processing Failed",
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
      processError,
    ],
  );

  return {
    processRedemption,
    isProcessing,
    currentStep,
    processStatus: {
      isPending: processPending,
      isConfirming: txConfirming,
      isConfirmed: txConfirmed,
      hash: txHash,
      error: processError,
    },
    isLoading: processPending || txConfirming,
  };
};