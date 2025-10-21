"use client";
import { logger } from "@/utils/logger";

import { createContext, useContext, ReactNode, useCallback } from "react";
import { Sale } from "@/types/sale";
import { toast } from "sonner";
import { insert, update as dbUpdate, remove } from "@/services/dbService";
import { saleToDb } from "@/db/helpers";
import { createAsyncResourceContext, CustomOperationContext } from "@/utils/createAsyncResourceContext";
import { getApiBaseUrl } from "@/utils/platformConfig";

const API_BASE_URL = getApiBaseUrl();

interface SaleContextType {
  salesHistory: Sale[];
  heldSales: Sale[];
  addSale: (sale: Sale) => Promise<void>;
  refundSale: (refundTransaction: Sale) => Promise<void>;
  settleSale: (saleId: string) => Promise<void>;
  holdSale: (sale: Sale) => Promise<void>;
  resumeSale: (saleId: string) => Promise<Sale | undefined>;
  removeHeldSale: (saleId: string) => Promise<void>;
}

// Create context for completed sales (salesHistory)
const { 
  Provider: CompletedSalesProvider, 
  Context: CompletedSalesContext 
} = createAsyncResourceContext<Sale>({
  name: "CompletedSale",
  lazyLoad: true,
  loadAll: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/sales/completed`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      logger.error('Error loading completed sales:', error);
      return [];
    }
  },
  create: async (item: Sale) => {
    await insert('sales', saleToDb(item));
    return item;
  },
  update: async (id: string, updates: Partial<Sale>) => {
    const fullUpdate = { id, ...updates } as Sale;
    await dbUpdate('sales', id, saleToDb(fullUpdate));
    return fullUpdate;
  },
  customOperations: {
    addSale: async (ctx: CustomOperationContext<Sale>, sale: Sale) => {
      await ctx.baseCreate(sale);
    },
    refundSale: async (ctx: CustomOperationContext<Sale>, refundTransaction: Sale) => {
      await ctx.baseCreate(refundTransaction);
    },
    settleSale: async (ctx: CustomOperationContext<Sale>, saleId: string) => {
      const sale = ctx.items.find(s => s.id === saleId);
      if (!sale) {
        throw new Error('Sale not found');
      }
      await ctx.baseUpdate(saleId, { status: "completed" as const });
    },
  },
  operationMessages: {
    addSale: { error: "Failed to save sale" },
    refundSale: { error: "Failed to process refund" },
    settleSale: { success: "Sale settled successfully", error: "Failed to settle sale" },
  },
});

// Create context for held sales
const { 
  Provider: HeldSalesProvider, 
  Context: HeldSalesContext 
} = createAsyncResourceContext<Sale>({
  name: "HeldSale",
  lazyLoad: true,
  loadAll: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/sales/held`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      logger.error('Error loading held sales:', error);
      return [];
    }
  },
  create: async (item: Sale) => {
    await insert('sales', saleToDb(item));
    return item;
  },
  update: async (id: string, updates: Partial<Sale>) => {
    const fullUpdate = { id, ...updates } as Sale;
    await dbUpdate('sales', id, saleToDb(fullUpdate));
    return fullUpdate;
  },
  remove: async (id: string) => {
    await remove('sales', id);
  },
  customOperations: {
    holdSale: async (ctx: CustomOperationContext<Sale>, sale: Sale) => {
      const heldSale = { ...sale, status: "on-hold" as const };
      const existingIndex = ctx.items.findIndex(s => s.id === sale.id);
      
      if (existingIndex > -1) {
        await ctx.baseUpdate(sale.id, heldSale);
        toast.success(`Held sale "${sale.id.substring(0, 8)}" updated.`);
      } else {
        await ctx.baseCreate(heldSale);
        toast.success(`Sale "${sale.id.substring(0, 8)}" put on hold.`);
      }
    },
    resumeSale: async (ctx: CustomOperationContext<Sale>, saleId: string): Promise<Sale | undefined> => {
      const sale = ctx.items.find(s => s.id === saleId);
      if (!sale) {
        throw new Error('Held sale not found');
      }
      
      const resumedSale = { ...sale, status: "pending" as const };
      await ctx.baseUpdate(saleId, resumedSale);
      ctx.setItems(prev => prev.filter(s => s.id !== saleId));
      toast.info(`Sale "${saleId.substring(0, 8)}" resumed.`);
      return resumedSale;
    },
    removeHeldSale: async (ctx: CustomOperationContext<Sale>, saleId: string) => {
      await ctx.baseRemove(saleId);
      toast.info(`Held sale "${saleId.substring(0, 8)}" removed.`);
    },
  },
  operationMessages: {
    holdSale: { error: "Failed to hold sale" },
    resumeSale: { error: "Failed to resume sale" },
    removeHeldSale: { error: "Failed to remove held sale" },
  },
});

// Create unified context
const SaleContext = createContext<SaleContextType | undefined>(undefined);

// Main provider that wraps both contexts
export const SaleProvider = ({ children }: { children: ReactNode }) => {
  return (
    <CompletedSalesProvider>
      <HeldSalesProvider>
        <SaleProviderWrapper>{children}</SaleProviderWrapper>
      </HeldSalesProvider>
    </CompletedSalesProvider>
  );
};

// Wrapper that combines both contexts
const SaleProviderWrapper = ({ children }: { children: ReactNode }) => {
  const completedSalesContext = useContext(CompletedSalesContext);
  const heldSalesContext = useContext(HeldSalesContext);
  
  if (!completedSalesContext || !heldSalesContext) {
    throw new Error("SaleProviderWrapper must be used within both CompletedSalesProvider and HeldSalesProvider");
  }

  const { 
    items: salesHistory, 
    addSale, 
    refundSale, 
    settleSale 
  } = completedSalesContext as any;
  
  const { 
    items: heldSales, 
    holdSale, 
    resumeSale, 
    removeHeldSale 
  } = heldSalesContext as any;

  const value: SaleContextType = {
    salesHistory,
    heldSales,
    addSale: useCallback(async (sale: Sale) => {
      await addSale(sale);
    }, [addSale]),
    refundSale: useCallback(async (refundTransaction: Sale) => {
      await refundSale(refundTransaction);
    }, [refundSale]),
    settleSale: useCallback(async (saleId: string) => {
      await settleSale(saleId);
    }, [settleSale]),
    holdSale: useCallback(async (sale: Sale) => {
      await holdSale(sale);
    }, [holdSale]),
    resumeSale: useCallback(async (saleId: string): Promise<Sale | undefined> => {
      return await resumeSale(saleId);
    }, [resumeSale]),
    removeHeldSale: useCallback(async (saleId: string) => {
      await removeHeldSale(saleId);
    }, [removeHeldSale]),
  };

  return <SaleContext.Provider value={value}>{children}</SaleContext.Provider>;
};

export const useSales = () => {
  const context = useContext(SaleContext);
  if (context === undefined) {
    throw new Error("useSales must be used within a SaleProvider");
  }
  return context;
};
