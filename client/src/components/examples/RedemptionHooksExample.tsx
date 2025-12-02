/**
 * Example demonstrating how to use the redemption hooks
 * This shows the complete flow from processing to burning tokens
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProcessRedemption } from "@/hooks/useProcessRedemption";
import { useBurnTokens } from "@/hooks/useBurnTokens";
import { useCancelRedemption } from "@/hooks/useCancelRedemption";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export function RedemptionHooksExample() {
  // Example redemption data
  const [currentStatus, setCurrentStatus] = useState<string>("pending");
  const exampleRedemption = {
    requestId: "REQ-2025-001", // Human-readable request ID for blockchain
    amount: "1000", // USD amount
    metal: "gold" as "gold" | "silver",
  };

  // Initialize all hooks
  const { 
    processRedemption, 
    isProcessing, 
    currentStep: processStep 
  } = useProcessRedemption();
  
  const { 
    burnTokens, 
    isBurning, 
    currentStep: burnStep 
  } = useBurnTokens();
  
  const { 
    cancelRedemption, 
    isCancelling, 
    currentStep: cancelStep 
  } = useCancelRedemption();

  // Step 1: Process redemption (calls setRedemptionProcessing)
  const handleStartProcessing = async () => {
    try {
      console.log("🔄 Starting redemption processing...");
      
      await processRedemption({
        requestId: exampleRedemption.requestId,
        metal: exampleRedemption.metal,
      });
      
      setCurrentStatus("processing");
      
      toast({
        title: "Processing Started",
        description: "Redemption processing has been initiated on blockchain",
      });
    } catch (error) {
      console.error("Failed to start processing:", error);
      toast({
        title: "Processing Failed",
        description: "Failed to start redemption processing",
        variant: "destructive",
      });
    }
  };

  // Step 2: Burn tokens (calls fulfillRedemptionRequest)
  const handleBurnTokens = async () => {
    try {
      console.log("🔥 Burning tokens...");
      
      await burnTokens({
        requestId: exampleRedemption.requestId,
        metal: exampleRedemption.metal,
      });
      
      setCurrentStatus("fulfilled");
      
      toast({
        title: "Tokens Burned",
        description: "Redemption fulfilled - tokens have been burned",
      });
    } catch (error) {
      console.error("Failed to burn tokens:", error);
      toast({
        title: "Burn Failed",
        description: "Failed to burn tokens",
        variant: "destructive",
      });
    }
  };

  // Step 3: Cancel redemption (calls cancelRedemptionRequest)
  const handleCancelRedemption = async () => {
    try {
      console.log("❌ Cancelling redemption...");
      
      await cancelRedemption({
        requestId: exampleRedemption.requestId,
        metal: exampleRedemption.metal,
      });
      
      setCurrentStatus("cancelled");
      
      toast({
        title: "Redemption Cancelled",
        description: "Redemption has been cancelled successfully",
      });
    } catch (error) {
      console.error("Failed to cancel redemption:", error);
      toast({
        title: "Cancellation Failed",
        description: "Failed to cancel redemption",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Redemption Hooks Example</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Status */}
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-2">Current Status</div>
            <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
              currentStatus === "pending" ? "bg-yellow-100 text-yellow-800" :
              currentStatus === "processing" ? "bg-blue-100 text-blue-800" :
              currentStatus === "fulfilled" ? "bg-green-100 text-green-800" :
              currentStatus === "cancelled" ? "bg-red-100 text-red-800" :
              "bg-gray-100 text-gray-800"
            }`}>
              {currentStatus.toUpperCase()}
            </div>
          </div>

          {/* Example Data */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Example Redemption Data:</h4>
            <div className="text-sm space-y-1">
              <div><strong>Request ID:</strong> {exampleRedemption.requestId}</div>
              <div><strong>Amount:</strong> ${exampleRedemption.amount} USD</div>
              <div><strong>Metal:</strong> {exampleRedemption.metal.toUpperCase()}</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Step 1: Start Processing */}
            {(currentStatus === "pending" || currentStatus === "approved") && (
              <Button
                onClick={handleStartProcessing}
                disabled={isProcessing}
                className="w-full"
                data-testid="example-start-processing"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {processStep === "processing" ? "Processing..." : "Updating Database..."}
                  </>
                ) : (
                  "Step 1: Start Processing (setRedemptionProcessing)"
                )}
              </Button>
            )}

            {/* Step 2: Burn Tokens */}
            {currentStatus === "processing" && (
              <Button
                onClick={handleBurnTokens}
                disabled={isBurning}
                variant="destructive"
                className="w-full"
                data-testid="example-burn-tokens"
              >
                {isBurning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {burnStep === "burning" ? "Burning..." : "Updating Database..."}
                  </>
                ) : (
                  "Step 2: Burn Tokens (fulfillRedemptionRequest)"
                )}
              </Button>
            )}

            {/* Cancel Option */}
            {(currentStatus === "pending" || currentStatus === "approved" || currentStatus === "processing") && (
              <Button
                onClick={handleCancelRedemption}
                disabled={isCancelling}
                variant="outline"
                className="w-full"
                data-testid="example-cancel-redemption"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {cancelStep === "cancelling" ? "Cancelling..." : "Updating Database..."}
                  </>
                ) : (
                  "Cancel Redemption (cancelRedemptionRequest)"
                )}
              </Button>
            )}

            {/* Status Messages */}
            {currentStatus === "fulfilled" && (
              <div className="text-center text-green-600 font-medium">
                ✅ Redemption Fulfilled - Process Complete!
              </div>
            )}

            {currentStatus === "cancelled" && (
              <div className="text-center text-red-600 font-medium">
                ❌ Redemption Cancelled
              </div>
            )}
          </div>

          {/* Reset Button for Demo */}
          <Button
            onClick={() => setCurrentStatus("pending")}
            variant="ghost"
            className="w-full text-xs"
          >
            Reset Demo
          </Button>
        </CardContent>
      </Card>

      {/* Code Usage Example */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Usage Example</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-auto">
{`// Import the hooks
import { useProcessRedemption } from "@/hooks/useProcessRedemption";
import { useBurnTokens } from "@/hooks/useBurnTokens";
import { useCancelRedemption } from "@/hooks/useCancelRedemption";

// Initialize hooks
const { processRedemption, isProcessing } = useProcessRedemption();
const { burnTokens, isBurning } = useBurnTokens();
const { cancelRedemption, isCancelling } = useCancelRedemption();

// Step 1: Start processing
await processRedemption({
  amount: "1000",        // USD amount
  requestId: "mongoId",  // MongoDB document ID
  metal: "gold"          // "gold" or "silver"
});

// Step 2: Burn tokens (after processing)
await burnTokens({
  requestId: "mongoId",  // MongoDB document ID
  metal: "gold"          // "gold" or "silver"
});

// Alternative: Cancel redemption
await cancelRedemption({
  requestId: "mongoId",  // MongoDB document ID
  metal: "gold"          // "gold" or "silver"
});`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}