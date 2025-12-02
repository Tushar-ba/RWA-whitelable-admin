import mongoose, { Schema, Document } from 'mongoose';

export interface IStock extends Document {
  _id: string;
  asset: string;
  totalQuantity: string;
  reservedQuantity: string;
  availableQuantity: string;
  lastUpdated: Date;
  updatedBy: string;
  createdAt: Date;
}

export interface IStockHistory extends Document {
  _id: string;
  metal: string;
  operationType: string;
  quantity: string;
  notes?: string;
  updatedBy: string;
  createdAt: Date;
}

const StockSchema = new Schema<IStock>({
  asset: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  totalQuantity: {
    type: String,
    required: true
  },
  reservedQuantity: {
    type: String,
    required: true,
    default: '0'
  },
  availableQuantity: {
    type: String,
    required: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

const StockHistorySchema = new Schema<IStockHistory>({
  metal: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  operationType: {
    type: String,
    required: true,
    enum: ['add', 'remove']
  },
  quantity: {
    type: String,
    required: true
  },
  notes: {
    type: String,
    trim: true
  },
  updatedBy: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

export const Stock = mongoose.model<IStock>('Stock', StockSchema);
export const StockHistory = mongoose.model<IStockHistory>('StockHistory', StockHistorySchema);