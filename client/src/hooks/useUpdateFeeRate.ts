import { useState, useCallback, useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
// @ts-ignore
import GoldTokenABI from "@assets/GoldToken_1754929372834.json";
// @ts-ignore
import SilverTokenABI from "@assets/SilverToken_1754929372833.json";

interface UpdateFeeRateParams {
  newFeeRate: number; // Fee rate as percentage (e.g., 0.5 for 0.5%)
  metal: "gold" | "silver"; // Which token contract to update
}

interface TokenConfig {
  contractAddress: string;
  abi: any[];
  name: string;
}

// Blockchain contract constants
const FEE_PRECISION = 1000000; // 1,000,000 for 1/100th basis point precision
const MAX_FEE_RATE = 2000; // 0.02% = 20 basis points = 2000 (1/100th bp)

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

export const useUpdateFeeRate = () => {
  const { isConnected, address: connectedAddress } = useAccount();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<
    "idle" | "updating_blockchain" | "updating_database" | "complete"
  >("idle");

  const [feeRateParams, setFeeRateParams] =
    useState<UpdateFeeRateParams | null>(null);

  // Contract interaction hooks
  const {
    writeContract,
    data: txHash,
    error: updateError,
    isPending: updatePending,
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
    if (
      txConfirmed &&
      txHash &&
      currentStep === "updating_blockchain" &&
      feeRateParams
    ) {
      console.log("✅ Fee rate update transaction confirmed:", txHash);
      setCurrentStep("updating_database");

      toast({
        title: "Blockchain Fee Rate Updated",
        description: `Fee rate updated on blockchain! Transaction: ${txHash.slice(0, 10)}...`,
        duration: 3000,
      });

      // Update database with new fee rate
      updateDatabaseFeeRate(feeRateParams.newFeeRate);
    }
  }, [txConfirmed, txHash, currentStep, feeRateParams]);

  // Handle update transaction error
  useEffect(() => {
    if (updateError && currentStep === "updating_blockchain") {
      console.error("❌ Fee rate update transaction error:", updateError);
      setIsProcessing(false);
      setCurrentStep("idle");
      setFeeRateParams(null);

      toast({
        title: "Fee Rate Update Failed",
        description: updateError.message || "Blockchain transaction failed",
        variant: "destructive",
        duration: 8000,
      });
    }
  }, [updateError, currentStep]);

  // Update fee rate in database
  const updateDatabaseFeeRate = async (newFeeRate: number) => {
    try {
      console.log("🔄 Updating token transfer fee in database...");

      const response = await apiRequest.put(
        `/api/system-settings/token_transfer_fee`,
        {
          value: { percentage: newFeeRate },
          updatedBy: "blockchain_sync",
        },
      );

      if (response.success) {
        console.log("✅ Database fee rate updated successfully");
        setCurrentStep("complete");
        setIsProcessing(false);
        setFeeRateParams(null);

        toast({
          title: "Fee Rate Update Complete",
          description: "Token transfer fee updated on blockchain and database!",
          duration: 5000,
        });
      } else {
        throw new Error(response.message || "Failed to update database");
      }
    } catch (error) {
      console.error("❌ Error updating database fee rate:", error);
      setIsProcessing(false);
      setCurrentStep("idle");
      setFeeRateParams(null);

      toast({
        title: "Database Update Failed",
        description: "Blockchain was updated but database sync failed",
        variant: "destructive",
        duration: 8000,
      });
    }
  };

  const updateFeeRate = useCallback(
    async ({ newFeeRate, metal }: UpdateFeeRateParams): Promise<string> => {
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

      // Get fee limits from environment
      const minFeeRate = parseFloat(import.meta.env.VITE_ETHEREUM_TRANSFER_FEE_MIN || "0");
      const maxFeeRate = parseFloat(import.meta.env.VITE_ETHEREUM_TRANSFER_FEE_MAX || "0.02");

      // Validate fee rate with proper limits
      if (isNaN(newFeeRate)) {
        throw new Error("Invalid fee rate - please enter a valid number");
      }
      
      if (newFeeRate < minFeeRate) {
        throw new Error(`Fee rate too low - minimum allowed is ${minFeeRate}%`);
      }
      
      if (newFeeRate > maxFeeRate) {
        throw new Error(`Fee rate exceeds maximum limit - maximum allowed is ${maxFeeRate}%`);
      }

      // Convert percentage to contract format
      // Contract expects: percentage * (FEE_PRECISION / 100)
      // For example: 0.02% becomes 2000 (MAX_FEE_RATE)
      const feeRateForContract = BigInt(Math.floor(newFeeRate * (FEE_PRECISION / 100)));

      console.log(`💰 Updating ${metal.toUpperCase()} token fee rate:`);
      console.log("Contract:", tokenConfig.contractAddress);
      console.log("New Fee Rate (%):", newFeeRate);
      console.log("Fee Rate (contract format):", feeRateForContract.toString());
      console.log("Max allowed rate:", MAX_FEE_RATE);

      // Store parameters for tracking
      setFeeRateParams({ newFeeRate, metal });
      setIsProcessing(true);
      setCurrentStep("updating_blockchain");

      try {
        // Execute setFeeRate transaction
        writeContract({
          address: tokenConfig.contractAddress as `0x${string}`,
          abi: tokenConfig.abi,
          functionName: "setFeeRate",
          args: [feeRateForContract],
        });

        toast({
          title: "Fee Rate Update Initiated",
          description: `Updating ${metal.toUpperCase()} token transfer fee to ${newFeeRate}%`,
        });

        // Return a promise that resolves when the process is complete
        return new Promise((resolve, reject) => {
          const checkCompletion = () => {
            if (currentStep === "complete" && txHash) {
              resolve(txHash);
              return;
            }

            // Check for errors
            if (updateError) {
              reject(updateError);
              return;
            }

            // Continue checking
            setTimeout(checkCompletion, 1000);
          };

          checkCompletion();
        });
      } catch (error) {
        console.error("💥 Error in updateFeeRate:", error);
        setIsProcessing(false);
        setCurrentStep("idle");
        setFeeRateParams(null);

        toast({
          title: "Fee Rate Update Failed",
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
      updateError,
    ],
  );

  return {
    updateFeeRate,
    isProcessing,
    currentStep,
    updateStatus: {
      isPending: updatePending,
      isConfirming: txConfirming,
      isConfirmed: txConfirmed,
      hash: txHash,
      error: updateError,
    },
    isLoading: updatePending || txConfirming,
  };
};
