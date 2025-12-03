import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useProcessRedemption } from "@/hooks/useProcessRedemption";
import { useBurnTokens } from "@/hooks/useBurnTokens";
import { useCancelRedemption } from "@/hooks/useCancelRedemption";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useMemeTokenProgram } from "@/hooks/useSolanaToken";
import { useLocation } from "wouter";

interface RedemptionActionButtonsProps {
  requestId: string;
  amount: string;
  network: string;
  walletAddress:string;
  metal: "gold" | "silver";
  currentStatus: string;
  onStatusUpdate?: () => void;
}

export function RedemptionActionButtons({
  requestId,
  amount,
  walletAddress,
  network,
  metal,
  currentStatus,
  onStatusUpdate,
}: RedemptionActionButtonsProps) {
  const [, navigate] = useLocation();
  const normalizedNetwork = network?.toLowerCase() || "";
  const isSolanaNetwork = normalizedNetwork === "solana";
  // Hook instances
  const {
    processRedemption,
    isProcessing,
    currentStep: processStep,
  } = useProcessRedemption();
  const { burnTokens, isBurning, currentStep: burnStep } = useBurnTokens();
  const {
    cancelRedemption,
    isCancelling,
    currentStep: cancelStep,
  } = useCancelRedemption();
console.log("metal",metal)
  const {
    cancelRedemption: cancelRedemptionSolana,
    fulfillRedemption,
    setRedemptionProcessing,
    updateRedemptionStatus,
    getRedemptionRequest,
    setTransferFee,
  } = useMemeTokenProgram(metal.toLowerCase());
  // Handle process redemption (Start Processing)
  const handleProcessRedemption = async () => {
    try {
      if (isSolanaNetwork) {
       const res:any= await setRedemptionProcessing(requestId,walletAddress);
        if(res?.signature){
          updateRedemptionStatus(requestId,'processing',navigate)
        }
        // await fulfillRedemption('8',walletAddress);
      } else {
        await processRedemption({
          requestId,
          metal,
        });
      }

      toast({
        title: "Processing Started",
        description: `${metal.toUpperCase()} redemption processing has been initiated`,
      });

      onStatusUpdate?.();
    } catch (error) {
      console.error("Failed to process redemption:", error);
    }
  };

  // Handle burn tokens (Burn Tokens / Fulfill)
  const handleBurnTokens = async () => {
    try {
      if (isSolanaNetwork) {
       const res:any = await fulfillRedemption(requestId,walletAddress);
        if(res?.signature){
          updateRedemptionStatus(requestId,'completed',navigate)
        }
      } else {
        await burnTokens({
          requestId,
          metal,
        });
      }

      toast({
        title: "Tokens Burned",
        description: `${metal.toUpperCase()} tokens have been burned successfully`,
      });

      onStatusUpdate?.();
    } catch (error) {
      console.error("Failed to burn tokens:", error);
    }
  };

  // Handle cancel redemption
  const handleCancelRedemption = async () => {
    try {
      if (isSolanaNetwork) {
       const res:any= await cancelRedemptionSolana(requestId,walletAddress);
        if(res?.signature){
          updateRedemptionStatus(requestId,'cancelled',navigate)
        }
      } else {
        await cancelRedemption({
          requestId,
          metal,
        });
      }
      toast({
        title: "Redemption Cancelled",
        description: `${metal.toUpperCase()} redemption has been cancelled`,
      });

      onStatusUpdate?.();
    } catch (error) {
      console.error("Failed to cancel redemption:", error);
    }
  };

  // Determine which buttons to show based on current status
  const showProcessButton =
    currentStatus === "pending" || currentStatus === "approved";
  const showBurnButton = currentStatus === "processing";
  const showCancelButton = currentStatus === "pending";

  return (
    <div
      className="flex gap-2 flex-wrap"
      data-testid="redemption-action-buttons"
    >
      {/* Start Processing Button */}
      {showProcessButton && (
        <Button
          onClick={handleProcessRedemption}
          disabled={isProcessing}
          variant="default"
          size="sm"
          data-testid="button-start-processing"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {processStep === "processing" ? "Processing..." : "Updating..."}
            </>
          ) : (
            "Start Processing"
          )}
        </Button>
      )}

      {/* Burn Tokens Button */}
      {showBurnButton && (
        <Button
          onClick={handleBurnTokens}
          disabled={isBurning}
          variant="destructive"
          size="sm"
          data-testid="button-burn-tokens"
        >
          {isBurning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {burnStep === "burning" ? "Burning..." : "Updating..."}
            </>
          ) : (
            "Burn Tokens"
          )}
        </Button>
      )}

      {/* Cancel Redemption Button */}
      {showCancelButton && (
        <Button
          onClick={handleCancelRedemption}
          disabled={isCancelling}
          variant="outline"
          size="sm"
          data-testid="button-cancel-redemption"
        >
          {isCancelling ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {cancelStep === "cancelling" ? "Cancelling..." : "Updating..."}
            </>
          ) : (
            "Cancel"
          )}
        </Button>
      )}

      {/* Status indicator for completed/fulfilled states */}
      {(currentStatus === "fulfilled" || currentStatus === "completed") && (
        <div
          className="text-green-600 text-sm font-medium"
          data-testid="status-completed"
        >
          ✅ {currentStatus === "fulfilled" ? "Fulfilled" : "Completed"}
        </div>
      )}

      {/* Status indicator for cancelled state */}
      {currentStatus === "cancelled" && (
        <div
          className="text-red-600 text-sm font-medium"
          data-testid="status-cancelled"
        >
          ❌ Cancelled
        </div>
      )}
    </div>
  );
}
