import { createContext, useContext, ReactNode, useCallback, useState, useEffect } from "react";
import { TaxRate } from "@/types/tax";
import { toast } from "sonner";
import { getAll, insert, update as dbUpdate, remove } from "@/services/dbService";
import { taxRateToDb, dbToTaxRate } from "@/db/helpers";
import { createAsyncResourceContext } from "@/utils/createAsyncResourceContext";

interface TaxContextType {
  taxRates: TaxRate[];
  defaultTaxRate: TaxRate;
  asyncState: {
    isLoading: boolean;
    error: Error | null;
    operationInProgress: string | null;
  };
  addTaxRate: (newRate: Omit<TaxRate, "id">) => Promise<void>;
  updateTaxRate: (updatedRate: TaxRate) => Promise<void>;
  deleteTaxRate: (id: string) => Promise<void>;
  setDefaultTaxRate: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const DEFAULT_TAX_RATE: TaxRate = {
  id: "tax-1",
  name: "Standard Tax",
  rate: 0.08,
  isDefault: true,
};

const NO_TAX_RATE: TaxRate = {
  id: "no-tax",
  name: "No Tax",
  rate: 0,
  isDefault: true,
};

const { Context: BaseContext, Provider: BaseProvider } = createAsyncResourceContext<TaxRate>({
  name: "Tax Rate",
  loadAll: async () => {
    const dbTaxRates = await getAll<any>('tax_rates');
    let loadedRates = dbTaxRates.map(dbToTaxRate);

    if (loadedRates.length === 0) {
      loadedRates = [DEFAULT_TAX_RATE];
      await insert('tax_rates', taxRateToDb(DEFAULT_TAX_RATE));
    } else {
      const currentDefault = loadedRates.find(rate => rate.isDefault);
      if (!currentDefault && loadedRates.length > 0) {
        loadedRates = loadedRates.map((rate, index) => ({
          ...rate,
          isDefault: index === 0,
        }));
        for (const rate of loadedRates) {
          await dbUpdate('tax_rates', rate.id, taxRateToDb(rate));
        }
      }
    }

    return loadedRates;
  },
  create: async (item: TaxRate) => {
    await insert('tax_rates', taxRateToDb(item));
    return item;
  },
  update: async (id: string, updates: Partial<TaxRate>) => {
    const fullUpdate = { id, ...updates } as TaxRate;
    await dbUpdate('tax_rates', id, taxRateToDb(fullUpdate));
    return fullUpdate;
  },
  remove: async (id: string) => {
    await remove('tax_rates', id);
  },
});

const TaxContext = createContext<TaxContextType | undefined>(undefined);

export const TaxProvider = ({ children }: { children: ReactNode }) => {
  return (
    <BaseProvider>
      <TaxProviderWrapper>{children}</TaxProviderWrapper>
    </BaseProvider>
  );
};

const TaxProviderWrapper = ({ children }: { children: ReactNode }) => {
  const baseContext = useContext(BaseContext);
  
  if (!baseContext) {
    throw new Error("TaxProviderWrapper must be used within BaseProvider");
  }

  const { items: taxRates, asyncState, create, update, remove: baseRemove, refresh } = baseContext;

  const [defaultTaxRate, setDefaultTaxRateState] = useState<TaxRate>(NO_TAX_RATE);

  useEffect(() => {
    const currentDefault = taxRates.find(rate => rate.isDefault);
    if (currentDefault) {
      setDefaultTaxRateState(currentDefault);
    } else if (taxRates.length > 0) {
      setDefaultTaxRateState(taxRates[0]);
    } else {
      setDefaultTaxRateState(NO_TAX_RATE);
    }
  }, [taxRates]);

  const addTaxRate = useCallback(async (newRate: Omit<TaxRate, "id">) => {
    const rateWithId: TaxRate = { ...newRate, id: crypto.randomUUID() };
    
    if (rateWithId.isDefault) {
      for (const rate of taxRates) {
        if (rate.isDefault) {
          await update(rate.id, { isDefault: false });
        }
      }
    }
    
    await create(rateWithId);
  }, [taxRates, create, update]);

  const updateTaxRate = useCallback(async (updatedRate: TaxRate) => {
    if (updatedRate.isDefault) {
      for (const rate of taxRates) {
        if (rate.id !== updatedRate.id && rate.isDefault) {
          await update(rate.id, { isDefault: false });
        }
      }
    }
    
    await update(updatedRate.id, updatedRate);
  }, [taxRates, update]);

  const deleteTaxRate = useCallback(async (id: string) => {
    const rateToDelete = taxRates.find(rate => rate.id === id);
    if (!rateToDelete) return;

    const remainingRates = taxRates.filter(rate => rate.id !== id);
    
    if (remainingRates.length === 0) {
      toast.info("All tax rates deleted. Defaulting to 0% tax.");
      await baseRemove(id);
      return;
    }

    if (rateToDelete.isDefault) {
      await update(remainingRates[0].id, { isDefault: true });
    }

    await baseRemove(id);
  }, [taxRates, baseRemove, update]);

  const setDefaultTaxRateMethod = useCallback(async (id: string) => {
    for (const rate of taxRates) {
      if (rate.isDefault && rate.id !== id) {
        await update(rate.id, { isDefault: false });
      }
    }
    await update(id, { isDefault: true });
  }, [taxRates, update]);

  const value: TaxContextType = {
    taxRates,
    defaultTaxRate,
    asyncState,
    addTaxRate,
    updateTaxRate,
    deleteTaxRate,
    setDefaultTaxRate: setDefaultTaxRateMethod,
    refresh,
  };

  return (
    <TaxContext.Provider value={value}>
      {children}
    </TaxContext.Provider>
  );
};

export const useTax = () => {
  const context = useContext(TaxContext);
  if (context === undefined) {
    throw new Error("useTax must be used within a TaxProvider");
  }
  return context;
};
