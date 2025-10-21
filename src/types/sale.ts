export interface SaleItem {
  productId: string;
  name: string;
  price: number;
  cost: number;
  quantity: number;
}

export interface Sale {
  id: string;
  date: string; // ISO date string
  items: SaleItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: "pending" | "completed" | "cancelled" | "on-hold"; // Added 'on-hold' status
  type: "sale" | "refund"; // New: Type of transaction
  giftCardAmountUsed?: number; // Added for gift card functionality
  customerId?: string; // New: Optional customer ID
  customerName?: string; // New: Optional customer name
  discountPercentage?: number; // New: Optional discount percentage applied
  discountAmount?: number; // New: Optional calculated discount amount
  loyaltyPointsUsed?: number; // New: Optional loyalty points used in the sale
  loyaltyPointsDiscountAmount?: number; // New: Optional loyalty points discount amount
  originalSaleId?: string; // New: Link to the original sale for refunds
  taxRateApplied?: number; // New: The tax rate applied to this sale
  paymentMethodId?: string; // Changed from paymentMethod: string to paymentMethodId: string
  employeeId?: string; // New: ID of the employee who made the sale
  employeeName?: string; // New: Name of the employee who made the sale
  heldByEmployeeId?: string; // New: ID of the employee who put the sale on hold
  heldByEmployeeName?: string; // New: Name of the employee who put the sale on hold
  storeId?: string; // New: ID of the store where the sale was made
  storeName?: string; // New: Name of the store where the sale was made
}