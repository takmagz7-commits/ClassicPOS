import { createContext, useContext, ReactNode, useCallback } from "react";
import { logger } from "@/utils/logger";
import { TransferOfGoods, TransferStatus, InventoryHistoryType } from "@/types/inventory";
import { toast } from "sonner";
import { useStores } from "./StoreContext";
import { useAuth } from "@/components/auth/AuthContext";
import { useProducts } from "./ProductContext";
import { getAll, insert, update as dbUpdate, remove } from "@/services/dbService";
import { transferToDb, dbToTransfer } from "@/db/helpers";
import { createAsyncResourceContext } from "@/utils/createAsyncResourceContext";

interface TransferOfGoodsContextType {
  transfers: TransferOfGoods[];
  asyncState: {
    isLoading: boolean;
    error: Error | null;
    operationInProgress: string | null;
  };
  addTransfer: (newTransfer: Omit<TransferOfGoods, "id" | "status" | "transferFromStoreName" | "transferToStoreName" | "approvedByUserName" | "approvalDate" | "receivedByUserName" | "receivedDate">) => Promise<void>;
  updateTransferStatus: (transferId: string, newStatus: TransferStatus, userId?: string) => Promise<void>;
  deleteTransfer: (transferId: string) => Promise<void>;
  getTransferById: (transferId: string) => TransferOfGoods | undefined;
  refresh: () => Promise<void>;
}

const { Context: BaseContext, Provider: BaseProvider } = createAsyncResourceContext<TransferOfGoods>({
  name: "Transfer of Goods",
  lazyLoad: true,
  loadAll: async () => {
    const dbTransfers = await getAll<any>('transfers');
    return dbTransfers.map(dbToTransfer);
  },
  create: async (item: TransferOfGoods) => {
    await insert('transfers', transferToDb(item));
    return item;
  },
  update: async (id: string, updates: Partial<TransferOfGoods>) => {
    const fullUpdate = { id, ...updates } as TransferOfGoods;
    await dbUpdate('transfers', id, transferToDb(fullUpdate));
    return fullUpdate;
  },
  remove: async (id: string) => {
    await remove('transfers', id);
  },
  derivedSelectors: {
    getTransferById: (items: TransferOfGoods[], transferId: string) => {
      return items.find(transfer => transfer.id === transferId);
    }
  },
});

const TransferOfGoodsContext = createContext<TransferOfGoodsContextType | undefined>(undefined);

export const TransferOfGoodsProvider = ({ children }: { children: ReactNode }) => {
  return (
    <BaseProvider>
      <TransferOfGoodsProviderWrapper>{children}</TransferOfGoodsProviderWrapper>
    </BaseProvider>
  );
};

const TransferOfGoodsProviderWrapper = ({ children }: { children: ReactNode }) => {
  const baseContext = useContext(BaseContext);
  const { stores } = useStores();
  const { user } = useAuth();
  const { updateProductStock, products, getEffectiveProductStock } = useProducts();

  if (!baseContext) {
    throw new Error("TransferOfGoodsProviderWrapper must be used within BaseProvider");
  }

  const { 
    items: transfers, 
    asyncState, 
    create, 
    update, 
    remove: baseRemove, 
    refresh,
    getTransferById
  } = baseContext;

  const addTransfer = useCallback(async (newTransferData: Omit<TransferOfGoods, "id" | "status" | "transferFromStoreName" | "transferToStoreName" | "approvedByUserName" | "approvalDate" | "receivedByUserName" | "receivedDate">) => {
    try {
      const fromStore = stores.find(s => s.id === newTransferData.transferFromStoreId);
      const toStore = stores.find(s => s.id === newTransferData.transferToStoreId);

      if (!fromStore || !toStore) {
        toast.error("Invalid 'From' or 'To' store selected.");
        return;
      }
      if (fromStore.id === toStore.id) {
        toast.error("Cannot transfer to the same store.");
        return;
      }

      for (const item of newTransferData.items) {
        const stockInFromStore = getEffectiveProductStock(item.productId, fromStore.id);
        const product = products.find(p => p.id === item.productId);
        if (!product || (product.trackStock && stockInFromStore < item.quantity)) {
          toast.error(`Insufficient stock for ${item.productName} in ${fromStore.name}. Available: ${stockInFromStore}`);
          return;
        }
      }

      const newTransfer: TransferOfGoods = {
        ...newTransferData,
        id: crypto.randomUUID(),
        status: "pending",
        transferFromStoreName: fromStore.name,
        transferToStoreName: toStore.name,
        approvedByUserId: user?.id,
        approvedByUserName: user?.email,
        approvalDate: new Date().toISOString(),
      };

      await create(newTransfer);
    } catch (error) {
      logger.error('Error adding transfer:', error);
      throw error;
    }
  }, [stores, user, products, getEffectiveProductStock, create]);

  const updateTransferStatus = useCallback(async (transferId: string, newStatus: TransferStatus, actingUserId?: string) => {
    try {
      const transfer = transfers.find(t => t.id === transferId);

      if (!transfer) {
        toast.error("Transfer not found.");
        return;
      }

      const actingUser = user || { id: actingUserId, email: "System" };
      const fromStore = stores.find(s => s.id === transfer.transferFromStoreId);
      const toStore = stores.find(s => s.id === transfer.transferToStoreId);

      if (!fromStore || !toStore) {
        toast.error("Error: Origin or destination store not found for transfer update.");
        return;
      }

      let updatedTransfer = transfer;

      if (newStatus === "in-transit" && transfer.status === "pending") {
        for (const item of transfer.items) {
          const currentStockInFromStore = getEffectiveProductStock(item.productId, transfer.transferFromStoreId);
          await updateProductStock(
            item.productId,
            currentStockInFromStore - item.quantity,
            InventoryHistoryType.TOG_OUT,
            transfer.id,
            `Transferred ${item.quantity}x ${item.productName} out to ${transfer.transferToStoreName}`,
            transfer.transferFromStoreId,
            actingUser?.id,
            item.productName
          );
        }
        toast.success(`Transfer "${transfer.id.substring(0,8)}" is now In Transit.`);
        updatedTransfer = { ...transfer, status: newStatus, transferFromStoreName: fromStore.name, transferToStoreName: toStore.name };
      } else if (newStatus === "received" && transfer.status === "in-transit") {
        for (const item of transfer.items) {
          const currentStockInToStore = getEffectiveProductStock(item.productId, transfer.transferToStoreId);
          await updateProductStock(
            item.productId,
            currentStockInToStore + item.quantity,
            InventoryHistoryType.TOG_IN,
            transfer.id,
            `Received ${item.quantity}x ${item.productName} from ${transfer.transferFromStoreName}`,
            transfer.transferToStoreId,
            actingUser?.id,
            item.productName
          );
        }
        toast.success(`Transfer "${transfer.id.substring(0,8)}" received at ${transfer.transferToStoreName}.`);
        updatedTransfer = {
          ...transfer,
          status: newStatus,
          receivedByUserId: actingUser?.id,
          receivedByUserName: actingUser?.email,
          receivedDate: new Date().toISOString(),
          transferFromStoreName: fromStore.name,
          transferToStoreName: toStore.name,
        };
      } else if (newStatus === "rejected" && (transfer.status === "pending" || transfer.status === "in-transit")) {
        if (transfer.status === "in-transit") {
          for (const item of transfer.items) {
            const currentStockInFromStore = getEffectiveProductStock(item.productId, transfer.transferFromStoreId);
            await updateProductStock(
              item.productId,
              currentStockInFromStore + item.quantity,
              InventoryHistoryType.TOG_OUT,
              transfer.id,
              `Rejected transfer: ${item.quantity}x ${item.productName} returned to ${transfer.transferFromStoreName}`,
              transfer.transferFromStoreId,
              actingUser?.id,
              item.productName
            );
          }
        }
        toast.info(`Transfer "${transfer.id.substring(0,8)}" rejected.`);
        updatedTransfer = { ...transfer, status: newStatus, transferFromStoreName: fromStore.name, transferToStoreName: toStore.name };
      } else {
        toast.error(`Invalid status transition for Transfer "${transfer.id.substring(0,8)}".`);
        return;
      }

      if (updatedTransfer !== transfer) {
        await update(transferId, updatedTransfer);
      }
    } catch (error) {
      logger.error('Error updating transfer status:', error);
      toast.error('Failed to update Transfer status');
      throw error;
    }
  }, [transfers, user, stores, updateProductStock, getEffectiveProductStock, update]);

  const deleteTransfer = useCallback(async (transferId: string) => {
    await baseRemove(transferId);
  }, [baseRemove]);

  const value: TransferOfGoodsContextType = {
    transfers,
    asyncState,
    addTransfer,
    updateTransferStatus,
    deleteTransfer,
    getTransferById,
    refresh,
  };

  return (
    <TransferOfGoodsContext.Provider value={value}>
      {children}
    </TransferOfGoodsContext.Provider>
  );
};

export const useTransferOfGoods = () => {
  const context = useContext(TransferOfGoodsContext);
  if (context === undefined) {
    throw new Error("useTransferOfGoods must be used within a TransferOfGoodsProvider");
  }
  return context;
};
