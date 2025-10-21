import { createContext, useContext, ReactNode } from "react";
import { logger } from "@/utils/logger";
import { ChartOfAccount, JournalEntry, BankAccount } from "@/types/accounting";
import { createAsyncResourceContext } from "@/utils/createAsyncResourceContext";
import { getApiBaseUrl } from "@/utils/platformConfig";

const API_BASE_URL = getApiBaseUrl();

interface AccountingContextType {
  accounts: ChartOfAccount[];
  journalEntries: JournalEntry[];
  bankAccounts: BankAccount[];
  addAccount: (account: ChartOfAccount) => Promise<void>;
  updateAccount: (id: string, updates: Partial<ChartOfAccount>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  addJournalEntry: (entry: JournalEntry) => Promise<void>;
  addBankAccount: (account: BankAccount) => Promise<void>;
  updateBankAccount: (id: string, updates: Partial<BankAccount>) => Promise<void>;
}

const {
  Provider: AccountsProvider,
  Context: AccountsContext
} = createAsyncResourceContext<ChartOfAccount>({
  name: "ChartOfAccount",
  loadAll: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/accounting/accounts`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      logger.error('Error loading accounts:', error);
      return [];
    }
  },
  create: async (account: ChartOfAccount) => {
    const response = await fetch(`${API_BASE_URL}/accounting/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(account)
    });
    if (!response.ok) throw new Error('Failed to create account');
    return await response.json();
  },
  update: async (id: string, updates: Partial<ChartOfAccount>) => {
    const response = await fetch(`${API_BASE_URL}/accounting/accounts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updates, id })
    });
    if (!response.ok) throw new Error('Failed to update account');
    return await response.json();
  },
  remove: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/accounting/accounts/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete account');
  },
  operationMessages: {
    create: { success: "Account created successfully", error: "Failed to create account" },
    update: { success: "Account updated successfully", error: "Failed to update account" },
    remove: { success: "Account deleted successfully", error: "Failed to delete account" }
  }
});

const {
  Provider: JournalEntriesProvider,
  Context: JournalEntriesContext
} = createAsyncResourceContext<JournalEntry>({
  name: "JournalEntry",
  loadAll: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/accounting/journal-entries`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      logger.error('Error loading journal entries:', error);
      return [];
    }
  },
  create: async (entry: JournalEntry) => {
    const response = await fetch(`${API_BASE_URL}/accounting/journal-entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create journal entry');
    }
    return await response.json();
  },
  operationMessages: {
    create: { success: "Journal entry created successfully", error: "Failed to create journal entry" }
  }
});

const {
  Provider: BankAccountsProvider,
  Context: BankAccountsContext
} = createAsyncResourceContext<BankAccount>({
  name: "BankAccount",
  loadAll: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/accounting/bank-accounts`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      logger.error('Error loading bank accounts:', error);
      return [];
    }
  },
  create: async (account: BankAccount) => {
    const response = await fetch(`${API_BASE_URL}/accounting/bank-accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(account)
    });
    if (!response.ok) throw new Error('Failed to create bank account');
    return await response.json();
  },
  update: async (id: string, updates: Partial<BankAccount>) => {
    const response = await fetch(`${API_BASE_URL}/accounting/bank-accounts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updates, id })
    });
    if (!response.ok) throw new Error('Failed to update bank account');
    return await response.json();
  },
  operationMessages: {
    create: { success: "Bank account created successfully", error: "Failed to create bank account" },
    update: { success: "Bank account updated successfully", error: "Failed to update bank account" }
  }
});

const AccountingContext = createContext<AccountingContextType | undefined>(undefined);

export const AccountingProvider = ({ children }: { children: ReactNode }) => {
  return (
    <AccountsProvider>
      <JournalEntriesProvider>
        <BankAccountsProvider>
          <AccountingContextInner>{children}</AccountingContextInner>
        </BankAccountsProvider>
      </JournalEntriesProvider>
    </AccountsProvider>
  );
};

const AccountingContextInner = ({ children }: { children: ReactNode }) => {
  const accountsCtx = useContext(AccountsContext);
  const journalEntriesCtx = useContext(JournalEntriesContext);
  const bankAccountsCtx = useContext(BankAccountsContext);

  if (!accountsCtx || !journalEntriesCtx || !bankAccountsCtx) {
    throw new Error("AccountingContextInner must be used within AccountingProvider");
  }

  const value: AccountingContextType = {
    accounts: accountsCtx.items,
    journalEntries: journalEntriesCtx.items,
    bankAccounts: bankAccountsCtx.items,
    addAccount: accountsCtx.create,
    updateAccount: accountsCtx.update,
    deleteAccount: accountsCtx.remove,
    addJournalEntry: journalEntriesCtx.create,
    addBankAccount: bankAccountsCtx.create,
    updateBankAccount: bankAccountsCtx.update,
  };

  return (
    <AccountingContext.Provider value={value}>
      {children}
    </AccountingContext.Provider>
  );
};

export const useAccounting = () => {
  const context = useContext(AccountingContext);
  if (context === undefined) {
    throw new Error("useAccounting must be used within an AccountingProvider");
  }
  return context;
};
