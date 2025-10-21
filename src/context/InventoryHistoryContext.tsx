"use client";

import { createContext, useContext, ReactNode, useCallback } from "react";
import { InventoryHistoryEntry } from "@/types/inventory";
import { useAuth } from "@/components/auth/AuthContext";
import { useStores } from "./StoreContext";
import { getAll, insert } from "@/services/dbService";
import { inventoryHistoryToDb, dbToInventoryHistory } from "@/db/helpers";
import { createAsyncResourceContext } from "@/utils/createAsyncResourceContext";

interface InventoryHistoryContextType {
  history: InventoryHistoryEntry[];
  asyncState: {
    isLoading: boolean;
    error: Error | null;
    operationInProgress: string | null;
  };
  addHistoryEntry: (
    entry: Omit<InventoryHistoryEntry, "id" | "date" | "userName" | "storeName"> &
           ({ productId: string; productName: string } | { productId?: never; productName?: never })
  ) => void;
  refresh: () => Promise<void>;
}

const { Context: BaseContext, Provider: BaseProvider } = createAsyncResourceContext<InventoryHistoryEntry>({
  name: "Inventory History",
  lazyLoad: true,
  loadAll: async () => {
    const dbHistory = await getAll<any>('inventory_history');
    return dbHistory.map(dbToInventoryHistory);
  },
  create: async (item: InventoryHistoryEntry) => {
    await insert('inventory_history', inventoryHistoryToDb(item));
    return item;
  },
});

const InventoryHistoryContext = createContext<InventoryHistoryContextType | undefined>(undefined);

export const InventoryHistoryProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { stores } = useStores();
  
  return (
    <BaseProvider>
      <InventoryHistoryProviderWrapper user={user} stores={stores}>
        {children}
      </InventoryHistoryProviderWrapper>
    </BaseProvider>
  );
};

const InventoryHistoryProviderWrapper = ({ 
  children,
  user,
  stores 
}: { 
  children: ReactNode;
  user: any;
  stores: any[];
}) => {
  const baseContext = useContext(BaseContext);
  
  if (!baseContext) {
    throw new Error("InventoryHistoryProviderWrapper must be used within BaseProvider");
  }

  const { items: history, asyncState, refresh, create } = baseContext;

  const addHistoryEntry = useCallback((
    entry: Omit<InventoryHistoryEntry, "id" | "date" | "userName" | "storeName"> &
           ({ productId: string; productName: string } | { productId?: never; productName?: never })
  ) => {
    const storeName = entry.storeId ? stores.find(s => s.id === entry.storeId)?.name : undefined;

    const newEntry: InventoryHistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      userName: user?.email || "System",
      storeName: storeName,
      productName: entry.productName,
    };
    
    create(newEntry);
  }, [create, user, stores]);

  const value: InventoryHistoryContextType = {
    history,
    asyncState,
    addHistoryEntry,
    refresh,
  };

  return (
    <InventoryHistoryContext.Provider value={value}>
      {children}
    </InventoryHistoryContext.Provider>
  );
};

export const useInventoryHistory = () => {
  const context = useContext(InventoryHistoryContext);
  if (context === undefined) {
    throw new Error("useInventoryHistory must be used within an InventoryHistoryProvider");
  }
  return context;
};
