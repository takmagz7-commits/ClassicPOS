"use client";

import { createContext, useContext, ReactNode, useCallback } from "react";
import { PurchaseOrder } from "@/types/inventory";
import { toast } from "sonner";
import { useSuppliers } from "./SupplierContext";
import { getAll, insert, update as dbUpdate, remove } from "@/services/dbService";
import { purchaseOrderToDb, dbToPurchaseOrder } from "@/db/helpers";
import { createAsyncResourceContext } from "@/utils/createAsyncResourceContext";

interface PurchaseOrderContextType {
  purchaseOrders: PurchaseOrder[];
  asyncState: {
    isLoading: boolean;
    error: Error | null;
    operationInProgress: string | null;
  };
  addPurchaseOrder: (newOrder: Omit<PurchaseOrder, "id" | "supplierName">) => Promise<void>;
  updatePurchaseOrder: (updatedOrder: PurchaseOrder) => Promise<void>;
  deletePurchaseOrder: (orderId: string) => Promise<void>;
  getPurchaseOrderById: (orderId: string) => PurchaseOrder | undefined;
  refresh: () => Promise<void>;
}

const { Context: BaseContext, Provider: BaseProvider } = createAsyncResourceContext<PurchaseOrder>({
  name: "Purchase Order",
  lazyLoad: true,
  loadAll: async () => {
    const dbOrders = await getAll<any>('purchase_orders');
    return dbOrders.map(dbToPurchaseOrder);
  },
  create: async (item: PurchaseOrder) => {
    await insert('purchase_orders', purchaseOrderToDb(item));
    return item;
  },
  update: async (id: string, updates: Partial<PurchaseOrder>) => {
    const fullUpdate = { id, ...updates } as PurchaseOrder;
    await dbUpdate('purchase_orders', id, purchaseOrderToDb(fullUpdate));
    return fullUpdate;
  },
  remove: async (id: string) => {
    await remove('purchase_orders', id);
  },
  derivedSelectors: {
    getPurchaseOrderById: (items: PurchaseOrder[], orderId: string) => {
      return items.find(po => po.id === orderId);
    },
  },
});

const PurchaseOrderContext = createContext<PurchaseOrderContextType | undefined>(undefined);

export const PurchaseOrderProvider = ({ children }: { children: ReactNode }) => {
  return (
    <BaseProvider>
      <PurchaseOrderProviderWrapper>{children}</PurchaseOrderProviderWrapper>
    </BaseProvider>
  );
};

const PurchaseOrderProviderWrapper = ({ children }: { children: ReactNode }) => {
  const baseContext = useContext(BaseContext);
  const { suppliers } = useSuppliers();
  
  if (!baseContext) {
    throw new Error("PurchaseOrderProviderWrapper must be used within BaseProvider");
  }

  const { items: purchaseOrders, asyncState, create, update, remove: baseRemove, refresh, getPurchaseOrderById } = baseContext;

  const addPurchaseOrder = useCallback(async (newOrderData: Omit<PurchaseOrder, "id" | "supplierName">) => {
    const supplier = suppliers.find(s => s.id === newOrderData.supplierId);
    if (!supplier) {
      toast.error("Invalid supplier selected.");
      return;
    }

    const newOrder: PurchaseOrder = {
      ...newOrderData,
      id: crypto.randomUUID(),
      supplierName: supplier.name,
    };

    await create(newOrder);
  }, [suppliers, create]);

  const updatePurchaseOrder = useCallback(async (updatedOrder: PurchaseOrder) => {
    const supplier = suppliers.find(s => s.id === updatedOrder.supplierId);
    if (!supplier) {
      toast.error("Invalid supplier selected for update.");
      return;
    }

    const orderWithSupplierName = { ...updatedOrder, supplierName: supplier.name };
    await update(updatedOrder.id, orderWithSupplierName);
  }, [suppliers, update]);

  const deletePurchaseOrder = useCallback(async (orderId: string) => {
    await baseRemove(orderId);
  }, [baseRemove]);

  const value: PurchaseOrderContextType = {
    purchaseOrders,
    asyncState,
    addPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder,
    getPurchaseOrderById: (orderId: string) => getPurchaseOrderById(orderId),
    refresh,
  };

  return (
    <PurchaseOrderContext.Provider value={value}>
      {children}
    </PurchaseOrderContext.Provider>
  );
};

export const usePurchaseOrders = () => {
  const context = useContext(PurchaseOrderContext);
  if (context === undefined) {
    throw new Error("usePurchaseOrders must be used within a PurchaseOrderProvider");
  }
  return context;
};
