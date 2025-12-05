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

interface MintTokensParams {
  to: string; // User's wallet address
  amount: string; // USD amount in string format
  metal: "gold" | "silver"; // Which token to mint
  purchaseRequestId: string; // For database update
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

export const useMintTokens = () => {
  const { isConnected, address: connectedAddress } = useAccount();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<
    "idle" | "minting" | "updating" | "complete"
  >("idle");
  
  const [mintParams, setMintParams] = useState<MintTokensParams | null>(null);

  // Contract interaction hooks
  const {
    writeContract,
    data: txHash,
    error: mintError,
    isPending: mintPending,
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
    if (txConfirmed && txHash && currentStep === "minting" && mintParams) {
      console.log("✅ Mint transaction confirmed:", txHash);
      setCurrentStep("updating");

      toast({
        title: "Tokens Minted Successfully",
        description: `Tokens minted! Transaction: ${txHash.slice(0, 10)}...`,
        duration: 3000,
      });

      // Update database status to completed
      updatePurchaseRequestStatus(mintParams.purchaseRequestId);
    }
  }, [txConfirmed, txHash, currentStep, mintParams]);

  // Handle mint transaction error
  useEffect(() => {
    if (mintError && currentStep === "minting") {
      console.error("❌ Mint transaction error:", mintError);
      setIsProcessing(false);
      setCurrentStep("idle");
      setMintParams(null);

      toast({
        title: "Token Minting Failed",
        description: mintError.message || "Mint transaction failed",
        variant: "destructive",
        duration: 8000,
      });
    }
  }, [mintError, currentStep]);

  // Update purchase request status in database
const updatePurchaseRequestStatus = async (purchaseRequestId: string) => {
    try {
      console.log("🔄 Updating purchase request status to completed...");
      
      const response = await apiRequest.post(`/api/purchase-requests/${purchaseRequestId}/mint-tokens`, {
        transactionHash: txHash,
        tokensMinted: true,
        status: "completed"
      });

      if (response.success) {
        console.log("✅ Purchase request status updated successfully");
        setCurrentStep("complete");
        setIsProcessing(false);
        setMintParams(null);

        toast({
          title: "Process Complete",
          description: "Tokens minted and purchase request completed!",
          duration: 5000,
        });
      } else {
        throw new Error(response.message || "Failed to update purchase request");
      }
    } catch (error) {
      console.error("❌ Error updating purchase request:", error);
      setIsProcessing(false);
      setCurrentStep("idle");
      setMintParams(null);

      toast({
        title: "Database Update Failed",
        description: "Tokens were minted but failed to update purchase status",
        variant: "destructive",
        duration: 8000,
      });
    }
  };

  const mintTokens = useCallback(
    async ({
      to,
      amount,
      metal,
      purchaseRequestId,
    }: MintTokensParams): Promise<string> => {
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

      // Validate recipient address
      if (!to || !to.startsWith("0x") || to.length !== 42) {
        throw new Error("Invalid recipient address");
      }

      // Validate amount and convert to wei format (amount * 1e18)
      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        throw new Error("Invalid amount - must be a positive number");
      }

      // Convert USD amount to token amount with 18 decimals
      // For example: 1000 USD becomes 1000 * 1e18
      const tokenAmount = BigInt(Math.floor(numericAmount * Math.pow(10, 18)));

      console.log(`🪙 Minting ${metal.toUpperCase()} tokens:`);
      console.log("Contract:", tokenConfig.contractAddress);
      console.log("To:", to);
      console.log("USD Amount:", amount);
      console.log("Token Amount (wei):", tokenAmount.toString());

      // Store parameters for tracking
      setMintParams({ to, amount, metal, purchaseRequestId });
      setIsProcessing(true);
      setCurrentStep("minting");

      try {
        // Execute mint transaction
        writeContract({
          address: tokenConfig.contractAddress as `0x${string}`,
          abi: tokenConfig.abi,
          functionName: "mint",
          args: [to as `0x${string}`, tokenAmount],
        });

        toast({
          title: "Token Minting Initiated",
          description: `Minting ${numericAmount} ${metal.toUpperCase()} tokens to ${to.slice(0, 6)}...${to.slice(-4)}`,
        });

        // Return a promise that resolves when the process is complete
        return new Promise((resolve, reject) => {
          const checkCompletion = () => {
            if (currentStep === "complete" && txHash) {
              resolve(txHash);
              return;
            }

            // Check for errors
            if (mintError) {
              reject(mintError);
              return;
            }

            // Continue checking
            setTimeout(checkCompletion, 1000);
          };

          checkCompletion();
        });
      } catch (error) {
        console.error("💥 Error in mintTokens:", error);
        setIsProcessing(false);
        setCurrentStep("idle");
        setMintParams(null);

        toast({
          title: "Token Minting Failed",
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
      mintError,
    ],
  );

  return {
    mintTokens,
    isProcessing,
    currentStep,
    mintStatus: {
      isPending: mintPending,
      isConfirming: txConfirming,
      isConfirmed: txConfirmed,
      hash: txHash,
      error: mintError,
    },
    isLoading: mintPending || txConfirming,
  };
};