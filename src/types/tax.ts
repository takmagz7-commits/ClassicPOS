export interface TaxRate {
  id: string;
  name: string;
  rate: number; // e.g., 0.08 for 8%
  isDefault: boolean;
}