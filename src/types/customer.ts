export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string; // Made optional
  address?: string; // Made optional
  loyaltyPoints: number; // New: Loyalty points for the customer
  vatNumber?: string; // New: VAT number for the customer
  tinNumber?: string; // New: TIN number for the customer
}