"use client";

import React from "react";
import { Customer } from "@/types/customer";
import { getAll, insert, update as dbUpdate, remove } from "@/services/dbService";
import { customerToDb, dbToCustomer, type DbCustomer } from "@/db/helpers";
import { createAsyncResourceContext } from "@/utils/createAsyncResourceContext";

const { Provider: CustomerProviderBase, useResource } = createAsyncResourceContext<Customer>({
  name: "Customer",
  lazyLoad: true,
  loadAll: async () => {
    const dbCustomers = await getAll<DbCustomer>('customers');
    return dbCustomers.map(dbToCustomer);
  },
  create: async (customer: Customer) => {
    await insert('customers', customerToDb(customer));
    return customer;
  },
  update: async (id: string, updates: Partial<Customer>) => {
    await dbUpdate('customers', id, customerToDb(updates as Customer));
    return { id, ...updates } as Customer;
  },
  remove: async (id: string) => {
    await remove('customers', id);
  },
  customOperations: {},
});

export const CustomerProvider = ({ children }: { children: React.ReactNode }) => {
  return <CustomerProviderBase>{children}</CustomerProviderBase>;
};

export const useCustomers = () => {
  const context = useResource();
  
  // Enhance the context with the loyalty points updater
  const updateCustomerLoyaltyPoints = async (customerId: string, pointsChange: number) => {
    const customer = context.items.find(c => c.id === customerId);
    if (!customer) return;
    
    const updatedCustomer = {
      ...customer,
      loyaltyPoints: Math.max(0, customer.loyaltyPoints + pointsChange),
    };
    
    await context.update(customerId, updatedCustomer);
  };

  return {
    customers: context.items,
    addCustomer: context.create,
    updateCustomer: context.update,
    deleteCustomer: context.remove,
    updateCustomerLoyaltyPoints,
    asyncState: context.asyncState,
    refresh: context.refresh,
  };
};
