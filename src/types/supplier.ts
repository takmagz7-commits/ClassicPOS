export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  vatNumber?: string; // New: VAT number for the supplier
  tinNumber?: string; // New: TIN number for the supplier
}