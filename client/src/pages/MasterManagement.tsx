import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Save, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { type SystemSettings } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/providers/AuthProvider";
import { useUpdateFeeRate } from "@/hooks/useUpdateFeeRate";
import { useMemeTokenProgram } from "@/hooks/useSolanaToken";

const feeUpdateSchema = z.object({
  platformPercentage: z.number().min(0, "Percentage must be positive"),
  redemptionPercentage: z.number().min(0, "Percentage must be positive"),
  tokenTransferEthereumPercentage: z
    .number()
    .min(0, "Percentage must be positive"),
  tokenTransferSolanaPercentage: z
    .number()
    .min(0, "Percentage must be positive"),
  tokenTransferCantonPercentage: z
    .number()
    .min(0, "Percentage must be positive"),
});

type FeeUpdateForm = z.infer<typeof feeUpdateSchema>;

export default function MasterManagement() {
  const [editingFee, setEditingFee] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Blockchain fee rate update hook
  const { updateFeeRate, isProcessing: isUpdatingFeeRate } = useUpdateFeeRate();
  
  // Solana token program hook  
  const { setTransferFee } = useMemeTokenProgram("gold");

  const { data: systemSettings = [], isLoading: settingsLoading } = useQuery<
    SystemSettings[]
  >({
    queryKey: ["/api/system-settings"],
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      return await apiRequest.put(`/api/system-settings/${key}`, {
        value,
        updatedBy: user?.id || "admin",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-settings"] });
      toast({
        title: "Success",
        description: "Settings updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  // Get current fee settings
  const platformFee = systemSettings.find((s) => s.key === "platform_fee")
    ?.value as any;
  const redemptionFee = systemSettings.find((s) => s.key === "redemption_fee")
    ?.value as any;
  const tokenTransferFee = systemSettings.find(
    (s) => s.key === "token_transfer_fee",
  )?.value as any;

  const {
    register: feeRegister,
    handleSubmit: handleFeeSubmit,
    formState: { errors: feeErrors },
    reset: feeReset,
    watch,
    setValue,
  } = useForm<FeeUpdateForm>({
    resolver: zodResolver(feeUpdateSchema),
    defaultValues: {
      platformPercentage: platformFee?.percentage || 1.5,
      redemptionPercentage: redemptionFee?.percentage || 2.0,
      tokenTransferEthereumPercentage:
        tokenTransferFee?.ethereum?.percentage || 0.5,
      tokenTransferSolanaPercentage:
        tokenTransferFee?.solana?.percentage || 0.3,
      tokenTransferCantonPercentage:
        tokenTransferFee?.canton?.percentage || 0.4,
    },
  });

  const onPlatformFeeSubmit = async (data: FeeUpdateForm) => {
    await updateSettingMutation.mutateAsync({
      key: "platform_fee",
      value: {
        percentage: data.platformPercentage,
      },
    });
    setEditingFee(null);
  };

  const onRedemptionFeeSubmit = async (data: FeeUpdateForm) => {
    await updateSettingMutation.mutateAsync({
      key: "redemption_fee",
      value: {
        percentage: data.redemptionPercentage,
      },
    });
    setEditingFee(null);
  };

  const onTokenTransferFeeSubmit = async (
    data: FeeUpdateForm,
    network: "ethereum" | "solana" | "canton",
  ) => {
    try {
      // Get the percentage based on network
      let percentage: number;
      switch (network) {
        case "ethereum":
          percentage = data.tokenTransferEthereumPercentage;
          break;
        case "solana":
          percentage = data.tokenTransferSolanaPercentage;
          break;
        case "canton":
          percentage = data.tokenTransferCantonPercentage;
          break;
        default:
          throw new Error("Unknown network");
      }

      // Update blockchain fee rate based on network
      if (network === "ethereum") {
        console.log(`🔄 Updating ${network} fee rate on blockchain...`);
        
        // Fee precision constants (1/100th of a basis point)
        // MAX_FEE_RATE = 2000; // 0.02% = 20 basis points = 2000 (1/100th bp)
        // FEE_PRECISION = 1000000; // 1,000,000 for 1/100th basis point precision

        // Update Gold token fee rate for Ethereum
        const goldTxHash = await updateFeeRate({
          newFeeRate: percentage,
          metal: "gold",
        });
        console.log(`✅ Gold token fee rate updated on Ethereum. TX Hash: ${goldTxHash}`);

        // Update Silver token fee rate for Ethereum
        const silverTxHash = await updateFeeRate({
          newFeeRate: percentage,
          metal: "silver",
        });
        console.log(`✅ Silver token fee rate updated on Ethereum. TX Hash: ${silverTxHash}`);
        
      } else if (network === "solana") {
        console.log(`🔄 Updating ${network} fee rate on blockchain...`);
        
        // Convert percentage to basis points (percentage * 100)
        const transferFeeBasisPoints = Math.floor(percentage * 100);
        
        // Set maximum fee (you may want to make this configurable)
        const maximumFee = 10000; // Example maximum fee in smallest unit
        
        // Update Solana token transfer fee
        const solanaTxHash = await setTransferFee(transferFeeBasisPoints, maximumFee);
        console.log(`✅ Solana token fee rate updated on blockchain. TX Hash: ${solanaTxHash}`);
        
      } else {
        console.log(`🔄 Updating ${network} fee rate in database only (blockchain integration pending)...`);
      }

      // Only update database after successful blockchain operations
      console.log(`✅ ${network} blockchain operations completed successfully. Updating MongoDB...`);
      
      await updateSettingMutation.mutateAsync({
        key: "token_transfer_fee",
        value: {
          ...tokenTransferFee,
          [network]: {
            percentage: percentage,
          },
        },
      });

      console.log(`✅ ${network} fee rate updated in MongoDB successfully!`);

      // Show success notification to user
      toast({
        title: "Update Successful",
        description: `${network.charAt(0).toUpperCase() + network.slice(1)} token transfer fee updated successfully to ${percentage}%`,
      });

      setEditingFee(null);
    } catch (error) {
      console.error(`❌ ${network} token transfer fee update failed:`, error);
      toast({
        title: "Update Failed",
        description: `Failed to update ${network} token transfer fee`,
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingFee(null);
    feeReset();
  };

  if (settingsLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="max-w-2xl">
          <Card className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-64 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Get current values for display
  const currentValues = {
    platformPercentage:
      watch("platformPercentage") ?? (platformFee?.percentage || 1.5),
    redemptionPercentage:
      watch("redemptionPercentage") ?? (redemptionFee?.percentage || 2.0),
    tokenTransferEthereumPercentage:
      watch("tokenTransferEthereumPercentage") ??
      (tokenTransferFee?.ethereum?.percentage || 0.5),
    tokenTransferSolanaPercentage:
      watch("tokenTransferSolanaPercentage") ??
      (tokenTransferFee?.solana?.percentage || 0.3),
    tokenTransferCantonPercentage:
      watch("tokenTransferCantonPercentage") ??
      (tokenTransferFee?.canton?.percentage || 0.4),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">
          Platform Fee Management
        </h1>
      </div>

      <div className="max-w-6xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              Fee Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Row 1: Platform Fee & Redemption Fee in separate boxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Platform Fee */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-900">Platform Fee</h4>
                  {editingFee === "platform" ? (
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleFeeSubmit(onPlatformFeeSubmit)}
                        disabled={updateSettingMutation.isPending}
                      >
                        <Save className="mr-1 h-3 w-3" />
                        Save
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingFee("platform")}
                      disabled={editingFee !== null}
                    >
                      Edit
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Percentage Rate
                    </Label>
                    {editingFee === "platform" ? (
                      <div className="relative mt-1">
                        <Input
                          type="number"
                          step="0.1"
                          className="pr-8"
                          {...feeRegister("platformPercentage", {
                            valueAsNumber: true,
                          })}
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                          %
                        </span>
                      </div>
                    ) : (
                      <div className="mt-1 p-2 bg-gray-50 rounded border">
                        <span className="text-gray-900 font-medium">
                          {currentValues.platformPercentage}%
                        </span>
                      </div>
                    )}
                    {feeErrors.platformPercentage && (
                      <p className="text-sm text-red-600 mt-1">
                        {feeErrors.platformPercentage.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Redemption Fee */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-900">Redemption Fee</h4>
                  {editingFee === "redemption" ? (
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleFeeSubmit(onRedemptionFeeSubmit)}
                        disabled={updateSettingMutation.isPending}
                      >
                        <Save className="mr-1 h-3 w-3" />
                        Save
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingFee("redemption")}
                      disabled={editingFee !== null}
                    >
                      Edit
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Percentage Rate
                    </Label>
                    {editingFee === "redemption" ? (
                      <div className="relative mt-1">
                        <Input
                          type="number"
                          step="0.1"
                          className="pr-8"
                          {...feeRegister("redemptionPercentage", {
                            valueAsNumber: true,
                          })}
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                          %
                        </span>
                      </div>
                    ) : (
                      <div className="mt-1 p-2 bg-gray-50 rounded border">
                        <span className="text-gray-900 font-medium">
                          {currentValues.redemptionPercentage}%
                        </span>
                      </div>
                    )}
                    {feeErrors.redemptionPercentage && (
                      <p className="text-sm text-red-600 mt-1">
                        {feeErrors.redemptionPercentage.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Token Transfer Fee for all networks */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 text-lg">
                Token Transfer Fee
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Ethereum Network */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="font-medium text-gray-900 flex items-center">
                      <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                      Ethereum
                    </h5>
                    {editingFee === "token_transfer_ethereum" ? (
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleFeeSubmit((data) =>
                            onTokenTransferFeeSubmit(data, "ethereum"),
                          )}
                          disabled={
                            updateSettingMutation.isPending || isUpdatingFeeRate
                          }
                        >
                          <Save className="mr-1 h-3 w-3" />
                          {isUpdatingFeeRate ? "Updating..." : "Save"}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingFee("token_transfer_ethereum")}
                        disabled={editingFee !== null}
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        Percentage Rate
                      </Label>
                      {editingFee === "token_transfer_ethereum" ? (
                        <div className="relative mt-1">
                          <Input
                            type="number"
                            step="0.1"
                            className="pr-8"
                            {...feeRegister("tokenTransferEthereumPercentage", {
                              valueAsNumber: true,
                            })}
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                            %
                          </span>
                        </div>
                      ) : (
                        <div className="mt-1 p-2 bg-gray-50 rounded border">
                          <span className="text-gray-900 font-medium">
                            {currentValues.tokenTransferEthereumPercentage}%
                          </span>
                        </div>
                      )}
                      {feeErrors.tokenTransferEthereumPercentage && (
                        <p className="text-sm text-red-600 mt-1">
                          {feeErrors.tokenTransferEthereumPercentage.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Solana Network */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="font-medium text-gray-900 flex items-center">
                      <span className="inline-block w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
                      Solana
                    </h5>
                    {editingFee === "token_transfer_solana" ? (
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleFeeSubmit((data) =>
                            onTokenTransferFeeSubmit(data, "solana"),
                          )}
                          disabled={
                            updateSettingMutation.isPending || isUpdatingFeeRate
                          }
                        >
                          <Save className="mr-1 h-3 w-3" />
                          {isUpdatingFeeRate ? "Updating..." : "Save"}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingFee("token_transfer_solana")}
                        disabled={editingFee !== null}
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        Percentage Rate
                      </Label>
                      {editingFee === "token_transfer_solana" ? (
                        <div className="relative mt-1">
                          <Input
                            type="number"
                            step="0.1"
                            className="pr-8"
                            {...feeRegister("tokenTransferSolanaPercentage", {
                              valueAsNumber: true,
                            })}
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                            %
                          </span>
                        </div>
                      ) : (
                        <div className="mt-1 p-2 bg-gray-50 rounded border">
                          <span className="text-gray-900 font-medium">
                            {currentValues.tokenTransferSolanaPercentage}%
                          </span>
                        </div>
                      )}
                      {feeErrors.tokenTransferSolanaPercentage && (
                        <p className="text-sm text-red-600 mt-1">
                          {feeErrors.tokenTransferSolanaPercentage.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Canton Network */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="font-medium text-gray-900 flex items-center">
                      <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                      Canton
                    </h5>
                    {editingFee === "token_transfer_canton" ? (
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleFeeSubmit((data) =>
                            onTokenTransferFeeSubmit(data, "canton"),
                          )}
                          disabled={
                            updateSettingMutation.isPending || isUpdatingFeeRate
                          }
                        >
                          <Save className="mr-1 h-3 w-3" />
                          {isUpdatingFeeRate ? "Updating..." : "Save"}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingFee("token_transfer_canton")}
                        disabled={editingFee !== null}
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        Percentage Rate
                      </Label>
                      {editingFee === "token_transfer_canton" ? (
                        <div className="relative mt-1">
                          <Input
                            type="number"
                            step="0.1"
                            className="pr-8"
                            {...feeRegister("tokenTransferCantonPercentage", {
                              valueAsNumber: true,
                            })}
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                            %
                          </span>
                        </div>
                      ) : (
                        <div className="mt-1 p-2 bg-gray-50 rounded border">
                          <span className="text-gray-900 font-medium">
                            {currentValues.tokenTransferCantonPercentage}%
                          </span>
                        </div>
                      )}
                      {feeErrors.tokenTransferCantonPercentage && (
                        <p className="text-sm text-red-600 mt-1">
                          {feeErrors.tokenTransferCantonPercentage.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
