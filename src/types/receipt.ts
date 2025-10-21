export interface ReceiptSettings {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeWebsite: string;
  thankYouMessage: string;
  logoUrl?: string; // Optional logo URL
  showSku: boolean;
  showCategory: boolean;
  showCustomerInfo: boolean;
  showVatTin: boolean; // New: Whether to show VAT/TIN numbers on the receipt
}