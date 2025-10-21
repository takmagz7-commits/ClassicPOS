import { createContext, useContext, ReactNode, useCallback } from "react";
import { logger } from "@/utils/logger";
import { StockAdjustment, AdjustmentType, InventoryHistoryType } from "@/types/inventory";
import { toast } from "sonner";
import { useStores } from "./StoreContext";
import { useAuth } from "@/components/auth/AuthContext";
import { useProducts } from "./ProductContext";
import { getAll, insert, update as dbUpdate, remove } from "@/services/dbService";
import { stockAdjustmentToDb, dbToStockAdjustment } from "@/db/helpers";
import { createAsyncResourceContext } from "@/utils/createAsyncResourceContext";

interface StockAdjustmentContextType {
  stockAdjustments: StockAdjustment[];
  asyncState: {
    isLoading: boolean;
    error: Error | null;
    operationInProgress: string | null;
  };
  addStockAdjustment: (newAdjustment: Omit<StockAdjustment, "id" | "storeName" | "approvedByUserName" | "approvalDate">) => Promise<void>;
  updateStockAdjustment: (updatedAdjustment: StockAdjustment) => Promise<void>;
  approveStockAdjustment: (adjustmentId: string) => Promise<void>;
  deleteStockAdjustment: (adjustmentId: string) => Promise<void>;
  getStockAdjustmentById: (adjustmentId: string) => StockAdjustment | undefined;
  refresh: () => Promise<void>;
}

const { Context: BaseContext, Provider: BaseProvider } = createAsyncResourceContext<StockAdjustment>({
  name: "Stock Adjustment",
  lazyLoad: true,
  loadAll: async () => {
    const dbAdjustments = await getAll<any>('stock_adjustments');
    return dbAdjustments.map(dbToStockAdjustment);
  },
  create: async (item: StockAdjustment) => {
    await insert('stock_adjustments', stockAdjustmentToDb(item));
    return item;
  },
  update: async (id: string, updates: Partial<StockAdjustment>) => {
    const fullUpdate = { id, ...updates } as StockAdjustment;
    await dbUpdate('stock_adjustments', id, stockAdjustmentToDb(fullUpdate));
    return fullUpdate;
  },
  remove: async (id: string) => {
    await remove('stock_adjustments', id);
  },
  customOperations: {
    approveStockAdjustment: async (ctx, adjustmentId: string) => {
      const adjustment = ctx.items.find(sa => sa.id === adjustmentId);
      if (adjustment) {
        toast.info(`Stock Adjustment "${adjustment.id.substring(0,8)}" is already applied.`);
      }
    }
  },
  derivedSelectors: {
    getStockAdjustmentById: (items: StockAdjustment[], adjustmentId: string) => {
      return items.find(sa => sa.id === adjustmentId);
    }
  },
  operationMessages: {
    approveStockAdjustment: {
      success: "",
      error: "Failed to approve Stock Adjustment"
    }
  }
});

const StockAdjustmentContext = createContext<StockAdjustmentContextType | undefined>(undefined);

export const StockAdjustmentProvider = ({ children }: { children: ReactNode }) => {
  return (
    <BaseProvider>
      <StockAdjustmentProviderWrapper>{children}</StockAdjustmentProviderWrapper>
    </BaseProvider>
  );
};

const StockAdjustmentProviderWrapper = ({ children }: { children: ReactNode }) => {
  const baseContext = useContext(BaseContext);
  const { stores } = useStores();
  const { user } = useAuth();
  const { updateProductStock, getEffectiveProductStock } = useProducts();

  if (!baseContext) {
    throw new Error("StockAdjustmentProviderWrapper must be used within BaseProvider");
  }

  const { 
    items: stockAdjustments, 
    asyncState, 
    create, 
    update, 
    remove: baseRemove, 
    refresh,
    getStockAdjustmentById,
    approveStockAdjustment
  } = baseContext;

  const addStockAdjustment = useCallback(async (newAdjustmentData: Omit<StockAdjustment, "id" | "storeName" | "approvedByUserName" | "approvalDate">) => {
    try {
      const store = stores.find(s => s.id === newAdjustmentData.storeId);

      if (!store) {
        toast.error("Invalid store selected for adjustment.");
        return;
      }

      const newAdjustment: StockAdjustment = {
        ...newAdjustmentData,
        id: crypto.randomUUID(),
        storeName: store.name,
        approvedByUserId: user?.id,
        approvedByUserName: user?.email,
        approvalDate: new Date().toISOString(),
      };

      // Apply stock changes immediately upon creation
      for (const item of newAdjustment.items) {
        const currentStockInStore = getEffectiveProductStock(item.productId, newAdjustment.storeId);
        
        const newStock = item.adjustmentType === AdjustmentType.Increase
          ? currentStockInStore + item.quantity
          : currentStockInStore - item.quantity;

        await updateProductStock(
          item.productId,
          newStock,
          item.adjustmentType === AdjustmentType.Increase ? InventoryHistoryType.SA_INCREASE : InventoryHistoryType.SA_DECREASE,
          newAdjustment.id,
          `Stock adjusted: ${item.adjustmentType === AdjustmentType.Increase ? "Increased" : "Decreased"} by ${item.quantity} due to: ${item.reason}`,
          newAdjustment.storeId,
          user?.id,
          item.productName
        );
      }

      // Save to database and update state using base create
      await create(newAdjustment);
    } catch (error) {
      logger.error('Error adding stock adjustment:', error);
      throw error;
    }
  }, [stores, user, getEffectiveProductStock, updateProductStock, create]);

  const updateStockAdjustment = useCallback(async (updatedAdjustment: StockAdjustment) => {
    const store = stores.find(s => s.id === updatedAdjustment.storeId);
    if (!store) {
      toast.error("Invalid store selected for update.");
      return;
    }

    const adjustmentWithStoreName = { ...updatedAdjustment, storeName: store.name };
    await update(updatedAdjustment.id, adjustmentWithStoreName);
  }, [stores, update]);

  const deleteStockAdjustment = useCallback(async (adjustmentId: string) => {
    await baseRemove(adjustmentId);
  }, [baseRemove]);

  const value: StockAdjustmentContextType = {
    stockAdjustments,
    asyncState,
    addStockAdjustment,
    updateStockAdjustment,
    approveStockAdjustment,
    deleteStockAdjustment,
    getStockAdjustmentById,
    refresh,
  };

  return (
    <StockAdjustmentContext.Provider value={value}>
      {children}
    </StockAdjustmentContext.Provider>
  );
};

export const useStockAdjustments = () => {
  const context = useContext(StockAdjustmentContext);
  if (context === undefined) {
    throw new Error("useStockAdjustments must be used within a StockAdjustmentProvider");
  }
  return context;
};
