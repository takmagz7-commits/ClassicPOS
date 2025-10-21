import { createContext, useContext, ReactNode, useCallback } from "react";
import { PaymentMethod } from "@/types/payment";
import { toast } from "sonner";
import { getAll, insert, update as dbUpdate, remove } from "@/services/dbService";
import { paymentMethodToDb, dbToPaymentMethod } from "@/db/helpers";
import { createAsyncResourceContext } from "@/utils/createAsyncResourceContext";

interface PaymentMethodContextType {
  paymentMethods: PaymentMethod[];
  asyncState: {
    isLoading: boolean;
    error: Error | null;
    operationInProgress: string | null;
  };
  addPaymentMethod: (newMethod: Omit<PaymentMethod, "id">) => Promise<void>;
  updatePaymentMethod: (updatedMethod: PaymentMethod) => Promise<void>;
  deletePaymentMethod: (id: string) => Promise<void>;
  getPaymentMethodName: (id: string) => string;
  refresh: () => Promise<void>;
}

const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  { id: "pm-1", name: "Cash", isCashEquivalent: true, isCredit: false, isBNPL: false },
  { id: "pm-2", name: "Credit Card", isCashEquivalent: false, isCredit: false, isBNPL: false },
  { id: "pm-3", name: "Debit Card", isCashEquivalent: true, isCredit: false, isBNPL: false },
];

const { Context: BaseContext, Provider: BaseProvider } = createAsyncResourceContext<PaymentMethod>({
  name: "Payment Method",
  loadAll: async () => {
    const dbMethods = await getAll<any>('payment_methods');
    let loadedMethods = dbMethods.map(dbToPaymentMethod);

    if (loadedMethods.length === 0) {
      loadedMethods = DEFAULT_PAYMENT_METHODS;
      for (const method of DEFAULT_PAYMENT_METHODS) {
        await insert('payment_methods', paymentMethodToDb(method));
      }
    }

    return loadedMethods;
  },
  create: async (item: PaymentMethod) => {
    await insert('payment_methods', paymentMethodToDb(item));
    return item;
  },
  update: async (id: string, updates: Partial<PaymentMethod>) => {
    const fullUpdate = { id, ...updates } as PaymentMethod;
    await dbUpdate('payment_methods', id, paymentMethodToDb(fullUpdate));
    return fullUpdate;
  },
  remove: async (id: string) => {
    await remove('payment_methods', id);
  },
});

const PaymentMethodContext = createContext<PaymentMethodContextType | undefined>(undefined);

export const PaymentMethodProvider = ({ children }: { children: ReactNode }) => {
  return (
    <BaseProvider>
      <PaymentMethodProviderWrapper>{children}</PaymentMethodProviderWrapper>
    </BaseProvider>
  );
};

const PaymentMethodProviderWrapper = ({ children }: { children: ReactNode }) => {
  const baseContext = useContext(BaseContext);
  
  if (!baseContext) {
    throw new Error("PaymentMethodProviderWrapper must be used within BaseProvider");
  }

  const { items: paymentMethods, asyncState, create, update, remove: baseRemove, refresh } = baseContext;

  const getPaymentMethodName = useCallback((id: string) => {
    return paymentMethods.find(pm => pm.id === id)?.name || "Unknown";
  }, [paymentMethods]);

  const addPaymentMethod = useCallback(async (newMethod: Omit<PaymentMethod, "id">) => {
    if (paymentMethods.some(pm => pm.name.toLowerCase() === newMethod.name.toLowerCase())) {
      toast.error(`Payment method "${newMethod.name}" already exists.`);
      return;
    }

    const methodWithId: PaymentMethod = { ...newMethod, id: crypto.randomUUID() };
    await create(methodWithId);
  }, [paymentMethods, create]);

  const updatePaymentMethod = useCallback(async (updatedMethod: PaymentMethod) => {
    if (paymentMethods.some(pm => pm.id !== updatedMethod.id && pm.name.toLowerCase() === updatedMethod.name.toLowerCase())) {
      toast.error(`Payment method "${updatedMethod.name}" already exists.`);
      return;
    }

    await update(updatedMethod.id, updatedMethod);
  }, [paymentMethods, update]);

  const deletePaymentMethod = useCallback(async (id: string) => {
    const methodToDelete = paymentMethods.find(pm => pm.id === id);
    if (!methodToDelete) return;

    await baseRemove(id);
  }, [paymentMethods, baseRemove]);

  const value: PaymentMethodContextType = {
    paymentMethods,
    asyncState,
    addPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    getPaymentMethodName,
    refresh,
  };

  return (
    <PaymentMethodContext.Provider value={value}>
      {children}
    </PaymentMethodContext.Provider>
  );
};

export const usePaymentMethods = () => {
  const context = useContext(PaymentMethodContext);
  if (context === undefined) {
    throw new Error("usePaymentMethods must be used within a PaymentMethodProvider");
  }
  return context;
};
