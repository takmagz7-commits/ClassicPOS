"use client";

import React from "react";
import { Supplier } from "@/types/supplier";
import { getAll, insert, update as dbUpdate, remove } from "@/services/dbService";
import { supplierToDb, dbToSupplier } from "@/db/helpers";
import { createAsyncResourceContext } from "@/utils/createAsyncResourceContext";

const { Provider: SupplierProviderBase, useResource } = createAsyncResourceContext<Supplier>({
  name: "Supplier",
  lazyLoad: true,
  loadAll: async () => {
    const dbSuppliers = await getAll<any>('suppliers');
    return dbSuppliers.map(dbToSupplier);
  },
  create: async (supplier: Supplier) => {
    const newSupplier = supplier.id ? supplier : { ...supplier, id: crypto.randomUUID() };
    await insert('suppliers', supplierToDb(newSupplier));
    return newSupplier;
  },
  update: async (id: string, updates: Partial<Supplier>) => {
    await dbUpdate('suppliers', id, supplierToDb(updates as Supplier));
    return { id, ...updates } as Supplier;
  },
  remove: async (id: string) => {
    await remove('suppliers', id);
  },
});

export const SupplierProvider = ({ children }: { children: React.ReactNode }) => {
  return <SupplierProviderBase>{children}</SupplierProviderBase>;
};

export const useSuppliers = () => {
  const context = useResource();
  
  return {
    suppliers: context.items,
    addSupplier: (newSupplier: Omit<Supplier, "id">) => 
      context.create({ ...newSupplier, id: crypto.randomUUID() } as Supplier),
    updateSupplier: (updatedSupplier: Supplier) => 
      context.update(updatedSupplier.id, updatedSupplier),
    deleteSupplier: context.remove,
    asyncState: context.asyncState,
    refresh: context.refresh,
  };
};
