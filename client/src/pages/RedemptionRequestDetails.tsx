import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { RedemptionActionButtons } from "@/components/redemption/RedemptionActionButtons";

interface RedemptionRequestDetails {
  id: string;
  requestId: string;
  userId: any;
  userName: string;
  userEmail: string;
  token: string;
  quantity: string;
  walletAddress: string;
  gramsAmount: string;
  tokenValueUSD: string;
  network: string;
  deliveryAddress: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  status: string;
  transactionHash: string;
  deliveryFee: string;
  totalCostUSD: string;
  currentTokenPrice: number;
  trackingNumber: string;
  transactionDate: string;
  createdAt: string;
  updatedAt: string;
  notes: string;
  redemptionMethod: string;
}

export default function RedemptionRequestDetails() {
  const [, params] = useRoute("/redemption-requests/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: response, isLoading } = useQuery<{
    success: boolean;
    data: RedemptionRequestDetails;
    message: string;
  }>({
    queryKey: ["/api/transactions/redemption-requests", params?.id || ""],
    enabled: !!params?.id,
  });

  const request = response?.data;

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const response = await fetch(
        `/api/transactions/redemption-requests/${params?.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
          credentials: "include",
        },
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/transactions/redemption-requests"],
      });
      toast({
        title: "Success",
        description: "Request status updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update request status",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "fulfilled":
        return "bg-emerald-100 text-emerald-800";
      case "completed":
        return "bg-emerald-100 text-emerald-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "failed":
        return "bg-red-100 text-red-800";
      // Legacy statuses for backward compatibility
      case "shipped":
        return "bg-purple-100 text-purple-800";
      case "delivered":
        return "bg-emerald-100 text-emerald-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="h-6 bg-gray-200 rounded animate-pulse"
                ></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="space-y-6">
        <Button
          variant="outline"
          onClick={() => navigate("/redemption-requests")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Requests
        </Button>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">Redemption request not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  console.log(request, "rrrrrrrrr");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => navigate("/redemption-requests")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Requests
        </Button>
        <div className="flex items-center space-x-2">
          <Badge className={getStatusColor(request.status)}>
            {request.status?.toUpperCase() || "UNKNOWN"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Request Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Request Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Request ID
                  </label>
                  <div className="flex items-center space-x-2">
                    <p className="font-mono">{request?.requestId || "N/A"}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(request?.requestId || "", "Request ID")
                      }
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Status
                  </label>
                  <div>
                    <Badge className={getStatusColor(request.status)}>
                      {request.status?.toUpperCase() || "UNKNOWN"}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    User Email
                  </label>
                  <p>{request?.userId?.email || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    User Name
                  </label>
                  <p>
                    {request?.userId?.first_name +
                      " " +
                      request?.userId?.last_name || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Token Type
                  </label>
                  <div>
                    <Badge variant="outline" className="uppercase">
                      {request.token}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Network
                  </label>
                  <p>{request.network}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Token Quantity
                  </label>
                  <p>{request.quantity} tokens</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Grams Amount
                  </label>
                  <p>{request.gramsAmount}g</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Token Value (USD)
                  </label>
                  <p>${request.tokenValueUSD}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Delivery Fee
                  </label>
                  <p>${request.deliveryFee}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Total Cost (USD)
                  </label>
                  <p className="font-semibold">${request.totalCostUSD}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Created At
                  </label>
                  <p>{new Date(request.createdAt).toLocaleString()}</p>
                </div>
              </div>

              {request.transactionHash && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Transaction Hash
                  </label>
                  <div className="flex items-center space-x-2">
                    <p className="font-mono text-sm break-all">
                      {request.transactionHash}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(
                          request.transactionHash,
                          "Transaction Hash",
                        )
                      }
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        window.open(
                          `https://etherscan.io/tx/${request.transactionHash}`,
                          "_blank",
                        )
                      }
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delivery Information */}
          <Card>
            <CardHeader>
              <CardTitle>Delivery Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Delivery Address
                </label>
                <p>{request.deliveryAddress || "Not provided"}</p>
              </div>

              {(request.streetAddress ||
                request.city ||
                request.state ||
                request.zipCode ||
                request.country) && (
                <div className="grid grid-cols-2 gap-4">
                  {request.streetAddress && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Street Address
                      </label>
                      <p>{request.streetAddress}</p>
                    </div>
                  )}
                  {request.city && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        City
                      </label>
                      <p>{request.city}</p>
                    </div>
                  )}
                  {request.state && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        State
                      </label>
                      <p>{request.state}</p>
                    </div>
                  )}
                  {request.zipCode && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        ZIP Code
                      </label>
                      <p>{request.zipCode}</p>
                    </div>
                  )}
                  {request.country && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Country
                      </label>
                      <p>{request.country}</p>
                    </div>
                  )}
                </div>
              )}

              {request.trackingNumber && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Tracking Number
                  </label>
                  <div className="flex items-center space-x-2">
                    <p className="font-mono">{request.trackingNumber}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(
                          request.trackingNumber,
                          "Tracking Number",
                        )
                      }
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Actions Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <RedemptionActionButtons
                requestId={request.requestId}
                amount={request.tokenValueUSD}
                metal={request.token as "gold" | "silver"}
                currentStatus={request.status}
                network={request.network}
                walletAddress={request.walletAddress}
                onStatusUpdate={() => {
                  queryClient.invalidateQueries({
                    queryKey: [
                      "/api/transactions/redemption-requests",
                      params?.id,
                    ],
                  });
                }}
              />
            </CardContent>
          </Card>

          {request.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{request.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
