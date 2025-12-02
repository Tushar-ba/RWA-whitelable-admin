import { useState, useCallback, useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { toast } from "@/hooks/use-toast";
// @ts-ignore
import GoldTokenABI from "@assets/GoldToken_1754929372834.json";
// @ts-ignore
import SilverTokenABI from "@assets/SilverToken_1754929372833.json";

interface GrantRoleParams {
  role: string;
  account: string;
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

type TokenType = keyof typeof TOKEN_CONFIGS;

export const useSequentialGrantRole = () => {
  const { isConnected, address: connectedAddress } = useAccount();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<
    "idle" | "gold" | "silver" | "complete"
  >("idle");

  // Store the parameters for sequential execution
  const [grantParams, setGrantParams] = useState<GrantRoleParams | null>(null);
  const [goldTxHash, setGoldTxHash] = useState<string | null>(null);
  const [silverTxHash, setSilverTxHash] = useState<string | null>(null);

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
    if (goldConfirmed && goldHash && currentStep === "gold" && grantParams) {
      console.log("✅ Gold transaction confirmed:", goldHash);
      setGoldTxHash(goldHash);
      setCurrentStep("silver");

      toast({
        title: "Gold Token Role Granted",
        description: `Role granted successfully! Transaction: ${goldHash.slice(0, 10)}...`,
        duration: 3000,
      });

      // Start Silver token transaction
      console.log("🥈 Starting Silver token role grant...");
      const tokenConfig = TOKEN_CONFIGS.SILVER;

      writeSilverContract({
        address: tokenConfig.contractAddress as `0x${string}`,
        abi: tokenConfig.abi,
        functionName: "grantRole",
        args: [
          grantParams.role as `0x${string}`,
          grantParams.account as `0x${string}`,
        ],
      });
    }
  }, [goldConfirmed, goldHash, currentStep, grantParams, writeSilverContract]);

  // Handle Silver transaction confirmation
  useEffect(() => {
    if (silverConfirmed && silverHash && currentStep === "silver") {
      console.log("✅ Silver transaction confirmed:", silverHash);
      setSilverTxHash(silverHash);
      setCurrentStep("complete");
      setIsProcessing(false);

      toast({
        title: "Sequential Role Grant Complete",
        description: "Both Gold and Silver token roles granted successfully!",
        duration: 5000,
      });

      // Clear the stored parameters
      setGrantParams(null);
    }
  }, [silverConfirmed, silverHash, currentStep]);

  // Handle Gold transaction error
  useEffect(() => {
    if (goldError && currentStep === "gold") {
      console.error("❌ Gold transaction error:", goldError);
      setIsProcessing(false);
      setCurrentStep("idle");
      setGrantParams(null);

      toast({
        title: "Gold Token Role Grant Failed",
        description: goldError.message || "Gold transaction failed",
        variant: "destructive",
        duration: 8000,
      });
    }
  }, [goldError, currentStep]);

  // Handle Silver transaction error
  useEffect(() => {
    if (silverError && currentStep === "silver") {
      console.error("❌ Silver transaction error:", silverError);
      setIsProcessing(false);
      setCurrentStep("idle");
      setGrantParams(null);

      toast({
        title: "Silver Token Role Grant Failed",
        description: silverError.message || "Silver transaction failed",
        variant: "destructive",
        duration: 8000,
      });
    }
  }, [silverError, currentStep]);

  const grantRoleOnBothTokens = useCallback(
    async ({
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

      const goldConfig = TOKEN_CONFIGS.GOLD;
      const silverConfig = TOKEN_CONFIGS.SILVER;

      if (!goldConfig.contractAddress || !silverConfig.contractAddress) {
        throw new Error(
          "Contract addresses not found in environment variables",
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

      // Store parameters for sequential execution
      setGrantParams({ role, account });
      setIsProcessing(true);
      setCurrentStep("gold");

      // Clear previous transaction hashes
      setGoldTxHash(null);
      setSilverTxHash(null);

      try {
        console.log("🥇 Starting Gold token role grant...");
        console.log("Gold contract:", goldConfig.contractAddress);
        console.log("Role:", role);
        console.log("Account:", account);

        // Start Gold token transaction
        writeGoldContract({
          address: goldConfig.contractAddress as `0x${string}`,
          abi: goldConfig.abi,
          functionName: "grantRole",
          args: [role as `0x${string}`, account as `0x${string}`],
        });

        toast({
          title: "Gold Token Role Grant Initiated",
          description: `Granting role to ${account.slice(0, 6)}...${account.slice(-4)}`,
        });

        // Return a promise that resolves when both transactions are complete
        return new Promise((resolve, reject) => {
          const checkCompletion = () => {
            if (currentStep === "complete" && goldTxHash && silverTxHash) {
              resolve({
                goldTxHash: goldTxHash,
                silverTxHash: silverTxHash,
              });
              return;
            }

            // Check for errors
            if (goldError || silverError) {
              reject(goldError || silverError);
              return;
            }

            // Continue checking
            setTimeout(checkCompletion, 1000);
          };

          checkCompletion();
        });
      } catch (error) {
        console.error("💥 Error in grantRoleOnBothTokens:", error);
        setIsProcessing(false);
        setCurrentStep("idle");
        setGrantParams(null);

        toast({
          title: "Role Grant Failed",
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
      writeGoldContract,
      currentStep,
      goldTxHash,
      silverTxHash,
      goldError,
      silverError,
    ],
  );

  return {
    grantRoleOnBothTokens,
    isProcessing,
    currentStep,
    goldStatus: {
      isPending: goldPending,
      isConfirming: goldConfirming,
      isConfirmed: goldConfirmed,
      hash: goldHash,
      error: goldError,
    },
    silverStatus: {
      isPending: silverPending,
      isConfirming: silverConfirming,
      isConfirmed: silverConfirmed,
      hash: silverHash,
      error: silverError,
    },
    isLoading:
      goldPending || goldConfirming || silverPending || silverConfirming,
  };
};
