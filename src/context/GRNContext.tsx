"use client";

import { createContext, useContext, ReactNode, useCallback } from "react";
import { GoodsReceivedNote, GRNStatus, InventoryHistoryType } from "@/types/inventory";
import { toast } from "sonner";
import { useSuppliers } from "./SupplierContext";
import { useStores } from "./StoreContext";
import { useAuth } from "@/components/auth/AuthContext";
import { useProducts } from "./ProductContext";
import { usePurchaseOrders } from "./PurchaseOrderContext";
import { getAll, insert, update as dbUpdate, remove } from "@/services/dbService";
import { grnToDb, dbToGrn } from "@/db/helpers";
import { createAsyncResourceContext } from "@/utils/createAsyncResourceContext";

interface GRNContextType {
  grns: GoodsReceivedNote[];
  asyncState: {
    isLoading: boolean;
    error: Error | null;
    operationInProgress: string | null;
  };
  addGRN: (newGRN: Omit<GoodsReceivedNote, "id" | "status" | "supplierName" | "receivingStoreName" | "approvedByUserName" | "approvalDate">) => Promise<void>;
  updateGRN: (updatedGRN: GoodsReceivedNote) => Promise<void>;
  approveGRN: (grnId: string) => Promise<void>;
  deleteGRN: (grnId: string) => Promise<void>;
  getGRNById: (grnId: string) => GoodsReceivedNote | undefined;
  refresh: () => Promise<void>;
}

const { Context: BaseContext, Provider: BaseProvider } = createAsyncResourceContext<GoodsReceivedNote>({
  name: "Goods Received Note",
  lazyLoad: true,
  loadAll: async () => {
    const dbGRNs = await getAll<any>('grns');
    return dbGRNs.map(dbToGrn);
  },
  create: async (item: GoodsReceivedNote) => {
    await insert('grns', grnToDb(item));
    return item;
  },
  update: async (id: string, updates: Partial<GoodsReceivedNote>) => {
    const fullUpdate = { id, ...updates } as GoodsReceivedNote;
    await dbUpdate('grns', id, grnToDb(fullUpdate));
    return fullUpdate;
  },
  remove: async (id: string) => {
    await remove('grns', id);
  },
  customOperations: {
    approveGRN: async (ctx, grnId: string, dependencies: {
      updateProductStock: any;
      getEffectiveProductStock: any;
      user: any;
      getPurchaseOrderById: any;
      updatePurchaseOrder: any;
    }) => {
      const grnToApprove = ctx.items.find(grn => grn.id === grnId);
      
      if (!grnToApprove) {
        toast.error("GRN not found.");
        throw new Error("GRN not found");
      }

      if (grnToApprove.status !== "pending") {
        toast.error("Only pending GRNs can be approved.");
        throw new Error("Only pending GRNs can be approved");
      }

      const { updateProductStock, getEffectiveProductStock, user, getPurchaseOrderById, updatePurchaseOrder } = dependencies;

      // Update stock for each item
      for (const item of grnToApprove.items) {
        const currentStockInStore = getEffectiveProductStock(item.productId, grnToApprove.receivingStoreId);
        await updateProductStock(
          item.productId,
          currentStockInStore + item.quantityReceived,
          InventoryHistoryType.GRN,
          grnToApprove.id,
          `Received ${item.quantityReceived}x ${item.productName} from ${grnToApprove.supplierName}`,
          grnToApprove.receivingStoreId,
          user?.id,
          item.productName
        );
      }

      // If linked to a PO, update PO status to "completed"
      if (grnToApprove.purchaseOrderId) {
        const po = getPurchaseOrderById(grnToApprove.purchaseOrderId);
        if (po) {
          await updatePurchaseOrder({ ...po, status: "completed" });
        }
      }

      // Create approved GRN with user info and approval date
      const approvedGRN: GoodsReceivedNote = {
        ...grnToApprove,
        status: "approved" as GRNStatus,
        approvedByUserId: user?.id,
        approvedByUserName: user?.email,
        approvalDate: new Date().toISOString(),
      };

      // Update in database and state
      await ctx.baseUpdate(grnId, approvedGRN);

      // Show success message with GRN reference
      toast.success(`Goods Received Note "${grnToApprove.referenceNo}" approved and stock updated.`);

      return approvedGRN;
    }
  },
  derivedSelectors: {
    getGRNById: (items: GoodsReceivedNote[], grnId: string) => {
      return items.find(grn => grn.id === grnId);
    }
  },
  operationMessages: {
    approveGRN: {
      success: "",
      error: "Failed to approve Goods Received Note"
    }
  }
});

const GRNContext = createContext<GRNContextType | undefined>(undefined);

export const GRNProvider = ({ children }: { children: ReactNode }) => {
  return (
    <BaseProvider>
      <GRNProviderWrapper>{children}</GRNProviderWrapper>
    </BaseProvider>
  );
};

const GRNProviderWrapper = ({ children }: { children: ReactNode }) => {
  const baseContext = useContext(BaseContext);
  const { suppliers } = useSuppliers();
  const { stores } = useStores();
  const { user } = useAuth();
  const { updateProductStock, getEffectiveProductStock } = useProducts();
  const { updatePurchaseOrder, getPurchaseOrderById } = usePurchaseOrders();

  if (!baseContext) {
    throw new Error("GRNProviderWrapper must be used within BaseProvider");
  }

  const { 
    items: grns, 
    asyncState, 
    create, 
    update, 
    remove: baseRemove, 
    refresh,
    getGRNById,
    approveGRN: baseApproveGRN
  } = baseContext;

  const addGRN = useCallback(async (newGRNData: Omit<GoodsReceivedNote, "id" | "status" | "supplierName" | "receivingStoreName" | "approvedByUserName" | "approvalDate">) => {
    const supplier = suppliers.find(s => s.id === newGRNData.supplierId);
    const store = stores.find(s => s.id === newGRNData.receivingStoreId);

    if (!supplier || !store) {
      toast.error("Invalid supplier or receiving store selected.");
      return;
    }

    const newGRN: GoodsReceivedNote = {
      ...newGRNData,
      id: crypto.randomUUID(),
      status: "pending",
      supplierName: supplier.name,
      receivingStoreName: store.name,
    };

    await create(newGRN);
  }, [suppliers, stores, create]);

  const updateGRN = useCallback(async (updatedGRN: GoodsReceivedNote) => {
    const supplier = suppliers.find(s => s.id === updatedGRN.supplierId);
    const store = stores.find(s => s.id === updatedGRN.receivingStoreId);

    if (!supplier || !store) {
      toast.error("Invalid supplier or receiving store selected for update.");
      return;
    }

    const grnWithNames = { ...updatedGRN, supplierName: supplier.name, receivingStoreName: store.name };
    await update(updatedGRN.id, grnWithNames);
  }, [suppliers, stores, update]);

  const approveGRN = useCallback(async (grnId: string) => {
    await baseApproveGRN(grnId, {
      updateProductStock,
      getEffectiveProductStock,
      user,
      getPurchaseOrderById,
      updatePurchaseOrder
    });
  }, [baseApproveGRN, updateProductStock, getEffectiveProductStock, user, getPurchaseOrderById, updatePurchaseOrder]);

  const deleteGRN = useCallback(async (grnId: string) => {
    await baseRemove(grnId);
  }, [baseRemove]);

  const value: GRNContextType = {
    grns,
    asyncState,
    addGRN,
    updateGRN,
    approveGRN,
    deleteGRN,
    getGRNById: (grnId: string) => getGRNById(grnId),
    refresh,
  };

  return (
    <GRNContext.Provider value={value}>
      {children}
    </GRNContext.Provider>
  );
};

export const useGRNs = () => {
  const context = useContext(GRNContext);
  if (context === undefined) {
    throw new Error("useGRNs must be used within a GRNProvider");
  }
  return context;
};
