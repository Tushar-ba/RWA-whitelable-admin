import { useApiQuery, useApiMutation } from './useApiQuery';
import { Stock, StockHistory } from '@shared/schema';
import { StockUpdateData } from '@/types';

// Get stock data
export function useStock() {
  return useApiQuery<Stock[]>(['stock'], '/stock');
}

// Get stock history
export function useStockHistory() {
  return useApiQuery<StockHistory[]>(['stock', 'history'], '/stock/history');
}

// Update stock mutation
export function useUpdateStockMutation() {
  return useApiMutation<Stock, StockUpdateData>('/stock/update');
}