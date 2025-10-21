export interface Product {
  id: string;
  name: string;
  categoryId: string;
  price: number;
  cost: number;
  wholesalePrice: number; // New: Wholesale price of the product
  stock: number; // Represents total stock if stockByStore is used, or single-store stock otherwise
  stockByStore?: { [storeId: string]: number }; // New: Per-store stock levels
  trackStock: boolean; // New: Whether to track stock for this product
  availableForSale: boolean; // New: Whether the product is available for sale
  sku: string;
  imageUrl?: string;
}