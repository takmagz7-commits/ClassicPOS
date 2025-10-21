export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';

export type AccountCategory =
  | 'current_asset'
  | 'fixed_asset'
  | 'current_liability'
  | 'long_term_liability'
  | 'equity'
  | 'revenue'
  | 'cost_of_goods_sold'
  | 'operating_expense'
  | 'other_income'
  | 'other_expense';

export interface ChartOfAccount {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  accountCategory: AccountCategory;
  parentAccountId?: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface JournalEntryLine {
  id: string;
  journalEntryId: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description?: string;
  createdAt?: string;
}

export interface JournalEntry {
  id: string;
  entryDate: string;
  entryNumber: string;
  referenceType?: string;
  referenceId?: string;
  description: string;
  postedByUserId?: string;
  postedByUserName?: string;
  isPosted: boolean;
  lines: JournalEntryLine[];
  createdAt?: string;
}

export interface BankAccount {
  id: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  accountType: 'checking' | 'savings' | 'credit';
  openingBalance: number;
  currentBalance: number;
  currencyCode: string;
  isActive: boolean;
  notes?: string;
  createdAt?: string;
}

export interface LedgerEntry {
  date: string;
  entryNumber: string;
  description: string;
  referenceType?: string;
  referenceId?: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface TrialBalanceEntry {
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  debit: number;
  credit: number;
  balance: number;
}

export interface IncomeStatementEntry {
  accountCode: string;
  accountName: string;
  accountCategory: string;
  amount: number;
}

export interface BalanceSheetEntry {
  accountCode: string;
  accountName: string;
  accountCategory: string;
  amount: number;
}

export interface CashFlowEntry {
  description: string;
  category: 'operating' | 'investing' | 'financing';
  amount: number;
  date: string;
}

export interface ARAPEntry {
  customerId?: string;
  supplierId?: string;
  name: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  agingDays: number;
}
