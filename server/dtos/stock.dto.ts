export interface StockUpdateDto {
  metal: string;
  operationType: 'add' | 'remove';
  quantity: string;
  notes?: string;
  updatedBy: string;
}

export interface StockResponseDto {
  id: string;
  asset: string;
  totalQuantity: string;
  reservedQuantity: string;
  availableQuantity: string;
  lastUpdated: Date;
  updatedBy: string;
  createdAt: Date;
}

export interface StockHistoryResponseDto {
  id: string;
  asset: string;
  operationType: string;
  quantity: string;
  notes?: string;
  updatedBy: string;
  createdAt: Date;
}