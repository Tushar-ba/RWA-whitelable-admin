import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ArrowLeft, CheckCircle, XCircle, Vault, Coins } from "lucide-react";
import { useAppKitAccount } from "@reown/appkit/react";
import { BN } from "@coral-xyz/anchor";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {ethers} from "ethers"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useMintTokens } from "@/hooks/useMintTokens";
import { useMemeTokenProgram } from "@/hooks/useSolanaToken";

// Define the proper interface for purchase request details
interface PurchaseRequestDetailsResponse {
  id: string;
  requestId: string;
  userId: string | { email?: string; first_name?: string; last_name?: string };
  userName: string;
  userEmail: string;
  asset: string;
  metal: string;
  tokenAmount: string;
  usdAmount: string;
  feeAmount: string;
  date: string;
  time: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  networkType: "private" | "public";
  paymentMethod: string;
  transactionHash: string;
  walletAddress: string;
  errorMessage?: string;
  vaultAllocated?: boolean;
  tokensMinted?: boolean;
  vaultNumber?: string;
  vaultLocation?: string;
  allocationNotes?: string;
  notes?: string;
  rejectionReason?: string;
  kycStatus?: string;
  usdcAmount?: string; // Add for backward compatibility
  platformFee?: string; // Add for backward compatibility
  createdAt: string;
  updatedAt: string;
  vaultAllocation?: {
    _id: string;
    purchaseRequestId: string;
    requestId: string;
    userId: string;
    vaultNumber: string;
    vaultLocation: string;
    ownedPortion: string;
    barSerialNumber: string;
    brandInfo: string;
    grossWeight: string;
    fineness: string;
    fineWeight: string;
    allocationDate: string;
    notes?: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  } | null;
}

export default function PurchaseRequestDetails() {
  const [, params] = useRoute("/purchase-requests/:id");
  const requestId = params?.id;
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isVaultDialogOpen, setIsVaultDialogOpen] = useState(false);
  const { address } = useAppKitAccount();
  // Updated state variables based on the screenshot
  const [ownedPortion, setOwnedPortion] = useState("");
  const [barSerialNumber, setBarSerialNumber] = useState("");
  const [brandInfo, setBrandInfo] = useState("");
  const [grossWeight, setGrossWeight] = useState("");
  const [fineness, setFineness] = useState("0.9999");
  const [fineWeight, setFineWeight] = useState("");
  const [allocationNotes, setAllocationNotes] = useState("");
  const {
    data: response,
    isLoading,
    error,
  } = useQuery<{
    success: boolean;
    data: PurchaseRequestDetailsResponse;
    message: string;
  }>({
    queryKey: ["/api/purchase-requests", requestId],
    enabled: !!requestId,
  });

  const request = response?.data;
  const { mintTokens: solanaMintToken,updatePurchaseRequestStatus } = useMemeTokenProgram(request?.metal as string || 'gold');

  const vaultAllocation = request?.vaultAllocation;

  // Refetch data whenever the page loads to get latest status
  useEffect(() => {
    if (requestId) {
      queryClient.invalidateQueries({
        queryKey: ["/api/purchase-requests", requestId],
      });
    }
  }, [requestId]);

  const vaultAllocationMutation = useMutation({
    mutationFn: async (data: {
      ownedPortion: string;
      barSerialNumber: string;
      brandInfo: string;
      grossWeight: string;
      fineness: string;
      fineWeight: string;
      notes: string;
    }) => {
      const response = await fetch(
        `/api/purchase-requests/${requestId}/allocate-vault`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        },
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Vault allocated successfully",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/purchase-requests", requestId],
      });
      setIsVaultDialogOpen(false);
      resetFormFields();
    },
    onError: (response) => {
      toast({
        title: "Error",
        description: response?.message || "Failed to allocate vault",
        variant: "destructive",
      });
    },
  });

  // Use the useMintTokens hook
  const {
    mintTokens,
    isProcessing: isMintingTokens,
    currentStep,
    mintStatus,
  } = useMintTokens();

  const mintTokensMutation = useMutation({
    mutationFn: async () => {
      if (!request) throw new Error("Purchase request not found");

      const convertedAmount = ethers.parseEther(request.tokenAmount);
      console.log(convertedAmount);
      return await mintTokens({
        to: request.walletAddress,
        amount: request.tokenAmount,
        metal: request.metal as "gold" | "silver",
        purchaseRequestId: request.id,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Tokens minted and request completed successfully",
      });
      // Force refetch of current request data to show updated status
      queryClient.invalidateQueries({
        queryKey: ["/api/purchase-requests", requestId],
      });
      // Add a small delay to ensure database is updated before refetching
      setTimeout(() => {
        queryClient.refetchQueries({
          queryKey: ["/api/purchase-requests", requestId],
        });
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mint tokens",
        variant: "destructive",
      });
    },
  });

  const resetFormFields = () => {
    setOwnedPortion("");
    setBarSerialNumber("");
    setBrandInfo("");
    setGrossWeight("");
    setFineness("0.9999");
    setFineWeight("");
    setAllocationNotes("");
  };

  const handleMintTokens =async (network: string) => {
    if (!request) return;

    if (network === "solana") {
      const amount = parseFloat(request.tokenAmount);
     const res:any = await solanaMintToken(amount, request.walletAddress);
      console.log("res",res);
      if(res?.signature){
        updatePurchaseRequestStatus(request.id,res.signature,navigate)
      }
    } else {
      mintTokensMutation.mutate();
    }
  };

  const handleVaultAllocation = () => {
    if (!ownedPortion.trim() || !barSerialNumber.trim()) {
      toast({
        title: "Error",
        description: "Owned portion and bar serial number are required",
        variant: "destructive",
      });
      return;
    }

    vaultAllocationMutation.mutate({
      ownedPortion: ownedPortion.trim(),
      barSerialNumber: barSerialNumber.trim(),
      brandInfo: brandInfo.trim(),
      grossWeight: grossWeight.trim(),
      fineness: fineness.trim(),
      fineWeight: fineWeight.trim(),
      notes: allocationNotes.trim(),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-32 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Purchase Request Not Found
        </h2>
        <p className="text-gray-600 mb-6">
          The requested purchase request could not be found.
        </p>
        <Link href="/purchase-requests">
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Purchase Requests
          </Button>
        </Link>
      </div>
    );
  }

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString();
  };

  const formatCurrency = (amount: string | number) => {
    return `$${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="w-4 h-4 mr-1" />
            Completed
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <div className="w-4 h-4 mr-1 rounded-full bg-blue-500"></div>
            Processing
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <div className="w-4 h-4 mr-1 rounded-full bg-yellow-500"></div>
            Pending
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getAssetBadge = (asset: string | null | undefined) => {
    if (!asset) {
      return (
        <Badge variant="outline" className="text-sm">
          N/A
        </Badge>
      );
    }

    return (
      <Badge
        variant={asset === "gold" ? "secondary" : "outline"}
        className="text-sm"
      >
        {asset === "gold" ? "🥇" : "🥈"} {asset.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/purchase-requests">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Purchase Request Details
            </h1>
            <p className="text-gray-600">Request ID: {request.requestId}</p>
          </div>
        </div>
        {getStatusBadge(request.status)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">User Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Email
                </Label>
                <p className="text-gray-900">
                  {request.userEmail ||
                    (request.userId &&
                    typeof request.userId === "object" &&
                    "email" in request.userId
                      ? request.userId.email
                      : undefined) ||
                    "N/A"}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  KYC Status
                </Label>
                <div className="mt-1">
                  <Badge
                    variant={
                      request.kycStatus === "verified" ? "default" : "secondary"
                    }
                  >
                    {request.kycStatus === "verified" ? "Verified" : "Pending"}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Request Date
                </Label>
                <p className="text-gray-900">{formatDate(request.createdAt)}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Last Updated
                </Label>
                <p className="text-gray-900">{formatDate(request.updatedAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Transaction Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Asset Type
                </Label>
                <div className="mt-1">{getAssetBadge(request.metal)}</div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  USD Amount
                </Label>
                <p className="text-gray-900 font-semibold">
                  {formatCurrency(request.usdAmount || "0")}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Platform Fee
                </Label>
                <p className="text-gray-900">
                  {formatCurrency(request.feeAmount || "0")}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Total Amount
                </Label>
                <p className="text-gray-900 font-semibold text-lg">
                  {formatCurrency(
                    Number(request.usdAmount || 0) +
                      Number(request.feeAmount || 0),
                  )}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Metal Weight
                </Label>
                <p className="text-gray-900">
                  {(
                    Number(request.usdAmount || 0) /
                    (request.metal === "gold" ? 2800 : 35)
                  ).toFixed(3)}{" "}
                  oz
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Current Status
                </Label>
                <div className="mt-1">{getStatusBadge(request.status)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Payment Method
                </Label>
                <p className="text-gray-900">USDC (Crypto)</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Transaction ID
                </Label>
                <p className="text-gray-900 font-mono text-sm break-all">
                  {request.requestId}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Payment Status
                </Label>
                <div className="mt-1">
                  <Badge
                    variant={
                      request.status === "completed"
                        ? "default"
                        : request.status === "processing"
                          ? "secondary"
                          : "secondary"
                    }
                  >
                    {request.status === "completed"
                      ? "Confirmed"
                      : request.status === "processing"
                        ? "Processing"
                        : "Pending"}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Processing Fee
                </Label>
                <p className="text-gray-900">
                  {formatCurrency(request.feeAmount || "0")} (
                  {(
                    (Number(request.feeAmount || 0) /
                      Number(request.usdAmount || 1)) *
                    100
                  ).toFixed(1)}
                  %)
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Net Amount
                </Label>
                <p className="text-gray-900 font-semibold">
                  {formatCurrency(request.usdAmount || "0")}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Processed Date
                </Label>
                <p className="text-gray-900">{formatDate(request.updatedAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vault Allocation & Token Minting */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Vault & Token Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <Label className="text-sm font-medium text-gray-600">
                    Vault Allocation
                  </Label>
                  <p className="text-gray-900 mb-2">
                    {request.vaultAllocated ? (
                      <span className="text-green-600">✓ Allocated</span>
                    ) : (
                      <span className="text-gray-500">Not allocated</span>
                    )}
                  </p>

                  {request.vaultAllocated && (
                    <div className="space-y-3">
                      {vaultAllocation ? (
                        <div
                          className="bg-gray-50 p-4 rounded-lg space-y-3"
                          data-testid="vault-allocation-details"
                        >
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-xs font-medium text-gray-500">
                                Vault Number
                              </Label>
                              <p
                                className="text-sm font-medium text-gray-900"
                                data-testid="text-vault-number"
                              >
                                {vaultAllocation.vaultNumber}
                              </p>
                            </div>
                            <div>
                              <Label className="text-xs font-medium text-gray-500">
                                Location
                              </Label>
                              <p
                                className="text-sm font-medium text-gray-900"
                                data-testid="text-vault-location"
                              >
                                {vaultAllocation.vaultLocation}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-xs font-medium text-gray-500">
                                Owned Portion
                              </Label>
                              <p
                                className="text-sm font-medium text-gray-900"
                                data-testid="text-owned-portion"
                              >
                                {vaultAllocation.ownedPortion} oz
                              </p>
                            </div>
                            <div>
                              <Label className="text-xs font-medium text-gray-500">
                                Bar Serial Number
                              </Label>
                              <p
                                className="text-sm font-medium text-gray-900"
                                data-testid="text-bar-serial"
                              >
                                {vaultAllocation.barSerialNumber}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <Label className="text-xs font-medium text-gray-500">
                                Gross Weight
                              </Label>
                              <p
                                className="text-sm text-gray-900"
                                data-testid="text-gross-weight"
                              >
                                {vaultAllocation.grossWeight} oz
                              </p>
                            </div>
                            <div>
                              <Label className="text-xs font-medium text-gray-500">
                                Fineness
                              </Label>
                              <p
                                className="text-sm text-gray-900"
                                data-testid="text-fineness"
                              >
                                {vaultAllocation.fineness}
                              </p>
                            </div>
                            <div>
                              <Label className="text-xs font-medium text-gray-500">
                                Fine Weight
                              </Label>
                              <p
                                className="text-sm text-gray-900"
                                data-testid="text-fine-weight"
                              >
                                {vaultAllocation.fineWeight} oz
                              </p>
                            </div>
                          </div>

                          <div>
                            <Label className="text-xs font-medium text-gray-500">
                              Brand/Refinery
                            </Label>
                            <p
                              className="text-sm text-gray-900"
                              data-testid="text-brand-info"
                            >
                              {vaultAllocation.brandInfo}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-xs font-medium text-gray-500">
                                Allocation Date
                              </Label>
                              <p
                                className="text-sm text-gray-900"
                                data-testid="text-allocation-date"
                              >
                                {formatDate(vaultAllocation.allocationDate)}
                              </p>
                            </div>
                            <div>
                              <Label className="text-xs font-medium text-gray-500">
                                Status
                              </Label>
                              <p
                                className="text-sm text-gray-900"
                                data-testid="text-vault-status"
                              >
                                <span
                                  className={`capitalize ${vaultAllocation.status === "allocated" ? "text-green-600" : "text-gray-600"}`}
                                >
                                  {vaultAllocation.status}
                                </span>
                              </p>
                            </div>
                          </div>

                          {vaultAllocation.notes && (
                            <div>
                              <Label className="text-xs font-medium text-gray-500">
                                Allocation Notes
                              </Label>
                              <p
                                className="text-sm text-gray-900"
                                data-testid="text-allocation-notes"
                              >
                                {vaultAllocation.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-600">
                          {request.vaultNumber && (
                            <p>
                              <span className="font-medium">Vault Number:</span>{" "}
                              {request.vaultNumber}
                            </p>
                          )}
                          {request.vaultLocation && (
                            <p>
                              <span className="font-medium">Location:</span>{" "}
                              {request.vaultLocation}
                            </p>
                          )}
                          {request.allocationNotes && (
                            <p>
                              <span className="font-medium">Notes:</span>{" "}
                              {request.allocationNotes}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {request.status === "pending" && !request.vaultAllocated && (
                  <Dialog
                    open={isVaultDialogOpen}
                    onOpenChange={setIsVaultDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Vault className="mr-2 h-4 w-4" />
                        Allocate Vault
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle className="text-xl">
                          Gold Allocation Report
                        </DialogTitle>
                        <p className="text-sm text-gray-600 mt-2">
                          Every Pax Gold token is backed by an ounce of
                          allocated gold. Use this tool to allocate the serial
                          number and information about your gold.
                        </p>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="ownedPortion">
                              Owned Portion (oz) *
                            </Label>
                            <Input
                              id="ownedPortion"
                              value={ownedPortion}
                              onChange={(e) => setOwnedPortion(e.target.value)}
                              placeholder="e.g., 8.24132211"
                              data-testid="input-owned-portion"
                            />
                          </div>
                          <div>
                            <Label htmlFor="barSerialNumber">
                              Bar Serial Number *
                            </Label>
                            <Input
                              id="barSerialNumber"
                              value={barSerialNumber}
                              onChange={(e) =>
                                setBarSerialNumber(e.target.value)
                              }
                              placeholder="e.g., BD46009"
                              data-testid="input-bar-serial"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="brandInfo">
                            Brand/Refinery Information
                          </Label>
                          <Textarea
                            id="brandInfo"
                            value={brandInfo}
                            onChange={(e) => setBrandInfo(e.target.value)}
                            placeholder="e.g., The Open Joint Stock Company The Gulidov Krasnoyarsk NonFerrous Metals Plant OJSC Krastsvetmet Krasnoyarsk Russia"
                            className="min-h-[60px]"
                            data-testid="input-brand-info"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="grossWeight">
                              Gross Weight (oz)
                            </Label>
                            <Input
                              id="grossWeight"
                              value={grossWeight}
                              onChange={(e) => setGrossWeight(e.target.value)}
                              placeholder="e.g., 407.675"
                              data-testid="input-gross-weight"
                            />
                          </div>
                          <div>
                            <Label htmlFor="fineness">Fineness</Label>
                            <Input
                              id="fineness"
                              value={fineness}
                              onChange={(e) => setFineness(e.target.value)}
                              placeholder="0.9999"
                              data-testid="input-fineness"
                            />
                          </div>
                          <div>
                            <Label htmlFor="fineWeight">Fine Weight (oz)</Label>
                            <Input
                              id="fineWeight"
                              value={fineWeight}
                              onChange={(e) => setFineWeight(e.target.value)}
                              placeholder="e.g., 407.6342"
                              data-testid="input-fine-weight"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="allocationNotes">
                            Additional Notes
                          </Label>
                          <Textarea
                            id="allocationNotes"
                            value={allocationNotes}
                            onChange={(e) => setAllocationNotes(e.target.value)}
                            placeholder="Any additional allocation notes..."
                            className="min-h-[80px]"
                            data-testid="input-allocation-notes"
                          />
                        </div>

                        <div className="text-xs text-gray-500 space-y-1">
                          <p>* All gold weight is listed in troy ounces</p>
                          <p>
                            ** Allocation report is accurate as of current date
                          </p>
                          <p>*** Block number confirmed at allocation</p>
                          <p>
                            **** Allocation and associated reporting may lag by
                            up to two weeks. If you are a new customer, your
                            balance will show as 0.00 until allocation is
                            complete and the next allocation report is run and
                            published.
                          </p>
                        </div>

                        <div className="flex gap-3">
                          <Button
                            onClick={handleVaultAllocation}
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                            disabled={vaultAllocationMutation.isPending}
                            data-testid="button-allocate-vault"
                          >
                            {vaultAllocationMutation.isPending
                              ? "Allocating..."
                              : "Allocate Vault"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setIsVaultDialogOpen(false)}
                            className="flex-1"
                            data-testid="button-cancel-allocation"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <div>
                  <Label className="text-sm font-medium text-gray-600">
                    Token Minting
                  </Label>
                  <p className="text-gray-900">
                    {request.tokensMinted ? (
                      <span className="text-green-600">✓ Minted</span>
                    ) : (
                      <span className="text-gray-500">Not minted</span>
                    )}
                  </p>
                  {request.tokensMinted && (
                    <p className="text-sm text-gray-600">Tokens minted</p>
                  )}
                </div>
                {request.status === "processing" &&
                  request.vaultAllocated &&
                  !request.tokensMinted && (
                    <Button
                      onClick={() => handleMintTokens(request?.networkType)}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      disabled={mintTokensMutation.isPending || isMintingTokens}
                    >
                      <Coins className="mr-2 h-4 w-4" />
                      {isMintingTokens
                        ? currentStep === "minting"
                          ? "Minting..."
                          : currentStep === "updating"
                            ? "Updating..."
                            : "Processing..."
                        : "Mint Tokens"}
                    </Button>
                  )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Information */}
      {(request.notes || request.rejectionReason) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Additional Information</CardTitle>
          </CardHeader>
          <CardContent>
            {request.notes && (
              <div className="mb-4">
                <Label className="text-sm font-medium text-gray-600">
                  Notes
                </Label>
                <p className="text-gray-900 mt-1">{request.notes}</p>
              </div>
            )}
            {request.rejectionReason && (
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Rejection Reason
                </Label>
                <p className="text-red-700 mt-1">{request.rejectionReason}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
