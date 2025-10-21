import { SaleItem } from "./sale";

// --- Base Item for all inventory-related lists ---
export interface BaseInventoryItem {
  id: string;
}

// --- Purchase Order (Basic for GRN linking) ---
export type PurchaseOrderStatus = "pending" | "completed" | "cancelled";
export const PURCHASE_ORDER_STATUSES = ["pending", "completed", "cancelled"] as const; // Runtime array for Zod

export interface PurchaseOrderItem extends BaseInventoryItem {
  productId: string;
  productName?: string; // Made optional
  quantity: number;
  unitCost: number;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string; // Added for denormalized display
  referenceNo: string;
  orderDate: string; // ISO date string
  expectedDeliveryDate?: string; // ISO date string
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  totalValue: number;
  notes?: string;
}

// --- Goods Received Note (GRN) ---
export type GRNStatus = "pending" | "approved" | "rejected";

export interface GRNItem extends BaseInventoryItem {
  productId: string;
  productName?: string; // Made optional
  quantityReceived: number;
  unitCost: number;
  totalCost: number;
}

export interface GoodsReceivedNote {
  id: string;
  purchaseOrderId?: string; // Optional link to a Purchase Order
  supplierId: string;
  supplierName: string; // Denormalized
  referenceNo: string; // GRN specific reference
  receivedDate: string; // ISO date string
  receivingStoreId: string;
  receivingStoreName: string; // Denormalized
  status: GRNStatus;
  items: GRNItem[];
  totalValue: number;
  notes?: string;
  approvedByUserId?: string;
  approvedByUserName?: string; // Denormalized
  approvalDate?: string; // ISO date string
}

// --- Stock Adjustment (SA) ---
export enum AdjustmentType {
  Increase = "increase",
  Decrease = "decrease",
}

export interface StockAdjustmentItem extends BaseInventoryItem {
  productId: string;
  productName?: string; // Made optional
  adjustmentType: AdjustmentType;
  quantity: number; // Absolute quantity to adjust by
  reason: string;
}

export interface StockAdjustment {
  id: string;
  adjustmentDate: string; // ISO date string
  storeId: string; // Store where adjustment happened
  storeName: string; // Denormalized
  items: StockAdjustmentItem[];
  notes?: string;
  approvedByUserId?: string;
  approvedByUserName?: string; // Denormalized
  approvalDate?: string; // ISO date string
}

// --- Transfer of Goods (TOG) ---
export type TransferStatus = "pending" | "in-transit" | "received" | "rejected";

export interface TransferOfGoodsItem extends BaseInventoryItem {
  productId: string;
  productName?: string; // Made optional
  quantity: number;
}

export interface TransferOfGoods {
  id: string;
  transferDate: string; // ISO date string
  transferFromStoreId: string;
  transferFromStoreName: string; // Denormalized
  transferToStoreId: string;
  transferToStoreName: string; // Denormalized
  status: TransferStatus;
  items: TransferOfGoodsItem[];
  notes?: string;
  approvedByUserId?: string;
  approvedByUserName?: string; // Denormalized
  approvalDate?: string; // ISO date string
  receivedByUserId?: string;
  receivedByUserName?: string; // Denormalized
  receivedDate?: string; // ISO date string
}

// --- Inventory History ---
export enum InventoryHistoryType {
  GRN = "Goods Received Note",
  SA_INCREASE = "Stock Adjustment (Increase)",
  SA_DECREASE = "Stock Adjustment (Decrease)",
  TOG_OUT = "Transfer Out",
  TOG_IN = "Transfer In",
  SALE = "Sale",
  REFUND = "Refund",
  INITIAL_STOCK = "Initial Stock",
  PRODUCT_EDIT = "Product Edit", // For manual stock changes via product edit
  PRODUCT_DELETED = "Product Deleted", // New: For when a product is removed from the system
}

export interface InventoryHistoryEntry {
  id: string;
  date: string; // ISO date string
  type: InventoryHistoryType;
  referenceId: string; // ID of the GRN, SA, TOG, Sale, Refund, etc.
  description: string; // A human-readable summary of the action
  productId?: string; // Optional: if the action relates to a specific product
  productName?: string; // Denormalized
  quantityChange?: number; // How much stock changed (+/-)
  currentStock?: number; // Stock level after this action
  storeId?: string; // Which store this action affected
  storeName?: string; // Denormalized
  userId?: string; // Who performed/approved the action
  userName?: string; // Denormalized
}