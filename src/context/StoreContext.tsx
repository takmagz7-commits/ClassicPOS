"use client";

import React from "react";
import { Store } from "@/types/store";
import { getAll, insert, update as dbUpdate, remove } from "@/services/dbService";
import { storeToDb, dbToStore } from "@/db/helpers";
import { createAsyncResourceContext } from "@/utils/createAsyncResourceContext";

const { Provider: StoreProviderBase, useResource } = createAsyncResourceContext<Store>({
  name: "Store",
  loadAll: async () => {
    const dbStores = await getAll<any>('stores');
    return dbStores.map(dbToStore);
  },
  create: async (store: Store) => {
    const newStore = store.id ? store : { ...store, id: crypto.randomUUID() };
    await insert('stores', storeToDb(newStore));
    return newStore;
  },
  update: async (id: string, updates: Partial<Store>) => {
    await dbUpdate('stores', id, storeToDb(updates as Store));
    return { id, ...updates } as Store;
  },
  remove: async (id: string) => {
    await remove('stores', id);
  },
});

export const StoreProvider = ({ children }: { children: React.ReactNode }) => {
  return <StoreProviderBase>{children}</StoreProviderBase>;
};

export const useStores = () => {
  const context = useResource();
  
  return {
    stores: context.items,
    addStore: (newStore: Omit<Store, "id">) => 
      context.create({ ...newStore, id: crypto.randomUUID() } as Store),
    updateStore: (updatedStore: Store) => 
      context.update(updatedStore.id, updatedStore),
    deleteStore: context.remove,
    asyncState: context.asyncState,
    refresh: context.refresh,
  };
};
