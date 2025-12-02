import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface GoldApiPrice {
  price: number;
  change: number;
  timestamp: number;
  metal: string;
  currency: string;
}

interface LivePricesResponse {
  success: boolean;
  data: {
    gold: GoldApiPrice;
    silver: GoldApiPrice;
  };
}

export function LivePricesDisplay() {
  const { data: pricesData, isLoading, error } = useQuery<LivePricesResponse>({
    queryKey: ['/api/gold-prices/live-prices'],
    refetchInterval: 60000, // Refetch every minute
    retry: 3,
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(price);
  };

  const formatChange = (change: number) => {
    const isPositive = change >= 0;
    const percentage = Math.abs(change).toFixed(2);
    
    return (
      <div className={`flex items-center text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? (
          <TrendingUp className="w-4 h-4 mr-1" />
        ) : (
          <TrendingDown className="w-4 h-4 mr-1" />
        )}
        {isPositive ? '+' : '-'}{percentage}%
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-white rounded-lg border border-amber-100 animate-pulse">
          <div className="h-6 bg-amber-200 rounded mb-2"></div>
          <div className="h-8 bg-amber-300 rounded mb-2"></div>
          <div className="h-4 bg-amber-200 rounded"></div>
        </div>
        <div className="p-4 bg-white rounded-lg border border-gray-100 animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-2"></div>
          <div className="h-8 bg-gray-300 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800 text-sm">
          Unable to load live prices. Please check your connection or try again later.
        </p>
      </div>
    );
  }

  const goldPrice = pricesData?.data?.gold;
  const silverPrice = pricesData?.data?.silver;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Gold Price Card */}
        <div className="p-4 bg-white rounded-lg border border-amber-100" data-testid="card-gold-price">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
            <span className="text-sm font-medium text-amber-700">Gold</span>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600" data-testid="text-gold-price">
              {goldPrice ? formatPrice(goldPrice.price) : '--'}
            </div>
            {/* <div className="mt-1" data-testid="text-gold-change">
              {goldPrice ? formatChange(goldPrice.change) : <div className="h-5"></div>}
            </div> */}
          </div>
          <div className="text-xs text-gray-500 text-center mt-2">
            per troy ounce
          </div>
        </div>

        {/* Silver Price Card */}
        <div className="p-4 bg-white rounded-lg border border-gray-100" data-testid="card-silver-price">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
            <span className="text-sm font-medium text-gray-700">Silver</span>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600" data-testid="text-silver-price">
              {silverPrice ? formatPrice(silverPrice.price) : '--'}
            </div>
            {/* <div className="mt-1" data-testid="text-silver-change">
              {silverPrice ? formatChange(silverPrice.change) : <div className="h-5"></div>}
            </div> */}
          </div>
          <div className="text-xs text-gray-500 text-center mt-2">
            per troy ounce
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-xs text-gray-500 text-center">
        {goldPrice && (
          <>
            Last updated: {new Date(goldPrice.timestamp * 1000).toLocaleTimeString()}
          </>
        )}
      </div>
    </div>
  );
}