import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, RefreshCw, TrendingUp, TrendingDown, Edit3, Save, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { type Stock, type StockHistory } from "@shared/schema";

// MongoDB-based types
interface AssetStorage {
  _id: string;
  asset: 'gold' | 'silver';
  storedValue: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

interface AssetLiquidityHistory {
  _id: string;
  asset: 'gold' | 'silver';
  previousValue: string;
  newValue: string;
  changeAmount: string;
  description?: string;
  updatedBy: string;
  updatedByName?: string;
  createdAt: string;
}
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/providers/AuthProvider";

export default function StockManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [goldLiquidity, setGoldLiquidity] = useState(0);
  const [silverLiquidity, setSilverLiquidity] = useState(0);
  const [isEditingGold, setIsEditingGold] = useState(false);
  const [isEditingSilver, setIsEditingSilver] = useState(false);

  const { data: stock = [], isLoading: stockLoading } = useQuery<Stock[]>({
    queryKey: ["/api/stock"],
  });

  // Asset storage API calls
  const { data: assetStorageResponse, isLoading: assetStorageLoading } = useQuery<{success: boolean, data: AssetStorage[]}>({
    queryKey: ["/api/asset-storage"],
  });

  const { data: liquidityHistoryResponse, isLoading: historyLoading } = useQuery<{success: boolean, data: AssetLiquidityHistory[]}>({
    queryKey: ["/api/asset-storage/history"],
  });

  // Extract data from API responses
  const assetStorage = assetStorageResponse?.data || [];
  const liquidityHistory = liquidityHistoryResponse?.data || [];

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "Never";
    return new Date(date).toLocaleString();
  };

  const goldStock = stock.find(s => s.asset === "gold");
  const silverStock = stock.find(s => s.asset === "silver");
  
  // Get asset storage values
  const goldStorage = assetStorage.find(s => s.asset === "gold");
  const silverStorage = assetStorage.find(s => s.asset === "silver");

  // Update local state when data is loaded
  useEffect(() => {
    if (goldStorage && goldLiquidity === 0) {
      setGoldLiquidity(parseFloat(goldStorage.storedValue));
    }
  }, [goldStorage, goldLiquidity]);

  useEffect(() => {
    if (silverStorage && silverLiquidity === 0) {
      setSilverLiquidity(parseFloat(silverStorage.storedValue));
    }
  }, [silverStorage, silverLiquidity]);

  const saveLiquidityMutation = useMutation({
    mutationFn: async ({ asset, value, description }: { asset: string; value: number; description?: string }) => {
      const response = await apiRequest.post("/api/asset-storage/update", { 
        asset: asset.toLowerCase(), 
        storedValue: value.toString(),
        description 
      });
      return response;
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Success",
        description: `${variables.asset} liquidity updated to ${variables.value} grams`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/asset-storage"] });
      queryClient.invalidateQueries({ queryKey: ["/api/asset-storage/history"] });
    },
    onError: (error: any) => {
      console.error('Asset storage update error:', error);
      const errorMessage = error?.response?.data?.message || error.message || "Failed to update liquidity";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleSaveGoldLiquidity = () => {
    saveLiquidityMutation.mutate({ 
      asset: "gold", 
      value: goldLiquidity,
      description: "Manual update via Asset Liquidity Management" 
    });
    setIsEditingGold(false);
  };

  const handleSaveSilverLiquidity = () => {
    saveLiquidityMutation.mutate({ 
      asset: "silver", 
      value: silverLiquidity,
      description: "Manual update via Asset Liquidity Management" 
    });
    setIsEditingSilver(false);
  };

  if (stockLoading || assetStorageLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-32 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Assets Storage</h1>
      </div>

      {/* Reserved Assets Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">Reserved Gold</CardTitle>
            <div className="p-3 bg-yellow-100 rounded-full">
              <div className="w-6 h-6 bg-yellow-500 rounded-full"></div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Reserved for all users:</span>
                <span className="font-semibold text-red-600">
                  {goldStock ? `${goldStock.reservedQuantity} grams` : "0 grams"}
                </span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t">
                <span className="text-gray-500">Last Updated:</span>
                <span className="text-gray-700">
                  {formatDate(goldStock?.lastUpdated)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">Reserved Silver</CardTitle>
            <div className="p-3 bg-gray-100 rounded-full">
              <div className="w-6 h-6 bg-gray-400 rounded-full"></div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Reserved for all users:</span>
                <span className="font-semibold text-red-600">
                  {silverStock ? `${silverStock.reservedQuantity} grams` : "0 grams"}
                </span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t">
                <span className="text-gray-500">Last Updated:</span>
                <span className="text-gray-700">
                  {formatDate(silverStock?.lastUpdated)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Asset Liquidity Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Asset Liquidity Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Gold Liquidity</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="goldLiquidity" className="text-gray-600">Current Liquidity (grams)</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="goldLiquidity"
                      type="number"
                      step="0.1"
                      value={goldLiquidity}
                      onChange={(e) => setGoldLiquidity(Number(e.target.value))}
                      disabled={!isEditingGold}
                      className="w-32 text-right"
                    />
                    {isEditingGold ? (
                      <div className="flex space-x-1">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={handleSaveGoldLiquidity}
                          disabled={saveLiquidityMutation.isPending}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setIsEditingGold(false);
                            setGoldLiquidity(goldStorage ? parseFloat(goldStorage.storedValue) : 0);
                          }}
                        >
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setIsEditingGold(true)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-yellow-500 h-3 rounded-full transition-all duration-300" 
                    style={{ width: `${Math.min((goldLiquidity / 5000) * 100, 100)}%` }}
                  ></div>
                </div>
                <div className="text-sm text-gray-600">
                  Liquidity Status: <span className="font-medium text-green-600">
                    {goldLiquidity >= 3000 ? "Excellent" : goldLiquidity >= 2000 ? "Good" : goldLiquidity >= 1000 ? "Fair" : "Poor"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Silver Liquidity</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="silverLiquidity" className="text-gray-600">Current Liquidity (grams)</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="silverLiquidity"
                      type="number"
                      step="0.1"
                      value={silverLiquidity}
                      onChange={(e) => setSilverLiquidity(Number(e.target.value))}
                      disabled={!isEditingSilver}
                      className="w-32 text-right"
                    />
                    {isEditingSilver ? (
                      <div className="flex space-x-1">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={handleSaveSilverLiquidity}
                          disabled={saveLiquidityMutation.isPending}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setIsEditingSilver(false);
                            setSilverLiquidity(silverStorage ? parseFloat(silverStorage.storedValue) : 0);
                          }}
                        >
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setIsEditingSilver(true)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gray-400 h-3 rounded-full transition-all duration-300" 
                    style={{ width: `${Math.min((silverLiquidity / 3000) * 100, 100)}%` }}
                  ></div>
                </div>
                <div className="text-sm text-gray-600">
                  Liquidity Status: <span className="font-medium text-blue-600">
                    {silverLiquidity >= 2500 ? "Excellent" : silverLiquidity >= 1500 ? "Good" : silverLiquidity >= 800 ? "Fair" : "Poor"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Last liquidity update</span>
              <span className="text-sm font-medium text-gray-900">
                {goldStorage?.updatedAt || silverStorage?.updatedAt 
                  ? formatDate(goldStorage?.updatedAt && silverStorage?.updatedAt 
                    ? (goldStorage.updatedAt > silverStorage.updatedAt ? goldStorage.updatedAt : silverStorage.updatedAt)
                    : goldStorage?.updatedAt || silverStorage?.updatedAt)
                  : "Never"
                }
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Asset Liquidity Management History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Asset Liquidity Management History</CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-12 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>New Value</TableHead>
                  <TableHead>Previous Value</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>Updated By</TableHead>
                  <TableHead>Updated Date</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {liquidityHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No liquidity history available
                    </TableCell>
                  </TableRow>
                ) : (
                  liquidityHistory.map((history, index) => {
                    const change = parseFloat(history.changeAmount);
                    const changePercentage = history.previousValue ? ((change / parseFloat(history.previousValue)) * 100).toFixed(1) : 0;
                    return (
                      <TableRow key={`${history._id}-${index}`}>
                        <TableCell>
                          <Badge variant={history.asset === "gold" ? "secondary" : "outline"}>
                            {history.asset.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold">{parseFloat(history.newValue).toFixed(2)} grams</TableCell>
                        <TableCell className="text-gray-600">{parseFloat(history.previousValue).toFixed(2)} grams</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            {change > 0 ? (
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            ) : change < 0 ? (
                              <TrendingDown className="h-4 w-4 text-red-600" />
                            ) : null}
                            <span className={`font-medium ${
                              change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-500'
                            }`}>
                              {change > 0 ? '+' : ''}{change.toFixed(2)} grams
                            </span>
                            <span className="text-xs text-gray-500">
                              ({change > 0 ? '+' : ''}{changePercentage}%)
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{history.updatedByName || history.updatedBy || "—"}</TableCell>
                        <TableCell>{formatDate(history.createdAt)}</TableCell>
                        <TableCell className="text-sm text-gray-600">{history.description || "—"}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}