import { createContext, useContext, ReactNode, useCallback } from "react";
import { Category } from "@/types/category";
import { toast } from "sonner";
import { getAll, insert, update as dbUpdate, remove } from "@/services/dbService";
import { categoryToDb, dbToCategory } from "@/db/helpers";
import { createAsyncResourceContext } from "@/utils/createAsyncResourceContext";

interface CategoryContextType {
  categories: Category[];
  asyncState: {
    isLoading: boolean;
    error: Error | null;
    operationInProgress: string | null;
  };
  addCategory: (name: string) => Promise<void>;
  updateCategory: (updatedCategory: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<string | null>;
  getCategoryName: (id: string) => string;
  getUncategorizedCategoryId: () => string;
  refresh: () => Promise<void>;
}

const UNCATEGORIZED_ID = "cat-uncategorized";
const UNCATEGORIZED_CATEGORY: Category = {
  id: UNCATEGORIZED_ID,
  name: "Uncategorized",
  isUncategorized: true,
};

const { Context: BaseContext, Provider: BaseProvider } = createAsyncResourceContext<Category>({
  name: "Category",
  loadAll: async () => {
    const dbCategories = await getAll<any>('categories');
    let loadedCategories = dbCategories.map(dbToCategory);

    const uncategorizedIndex = loadedCategories.findIndex(cat => cat.isUncategorized);
    if (uncategorizedIndex === -1) {
      loadedCategories = [...loadedCategories, UNCATEGORIZED_CATEGORY];
      await insert('categories', categoryToDb(UNCATEGORIZED_CATEGORY));
    } else {
      loadedCategories[uncategorizedIndex] = UNCATEGORIZED_CATEGORY;
    }

    return loadedCategories;
  },
  create: async (item: Category) => {
    await insert('categories', categoryToDb(item));
    return item;
  },
  update: async (id: string, updates: Partial<Category>) => {
    const fullUpdate = { id, ...updates } as Category;
    await dbUpdate('categories', id, categoryToDb(fullUpdate));
    return fullUpdate;
  },
  remove: async (id: string) => {
    await remove('categories', id);
  },
  retryOnError: true,
  maxRetries: 3,
});

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export const CategoryProvider = ({ children }: { children: ReactNode }) => {
  return (
    <BaseProvider>
      <CategoryProviderWrapper>{children}</CategoryProviderWrapper>
    </BaseProvider>
  );
};

const CategoryProviderWrapper = ({ children }: { children: ReactNode }) => {
  const baseContext = useContext(BaseContext);
  
  if (!baseContext) {
    throw new Error("CategoryProviderWrapper must be used within BaseProvider");
  }

  const { items: categories, asyncState, create, update, remove: baseRemove, refresh } = baseContext;

  const getUncategorizedCategoryId = useCallback(() => {
    const uncategorized = categories.find(cat => cat.isUncategorized);
    return uncategorized ? uncategorized.id : UNCATEGORIZED_ID;
  }, [categories]);

  const getCategoryName = useCallback((id: string) => {
    return categories.find(cat => cat.id === id)?.name || "Uncategorized";
  }, [categories]);

  const addCategory = useCallback(async (name: string) => {
    if (categories.some(cat => cat.name.toLowerCase() === name.toLowerCase())) {
      toast.error(`Category "${name}" already exists.`);
      return;
    }

    const newCategory: Category = { id: crypto.randomUUID(), name };
    await create(newCategory);
  }, [categories, create]);

  const updateCategory = useCallback(async (updatedCategory: Category) => {
    if (updatedCategory.isUncategorized) {
      toast.error("The 'Uncategorized' category cannot be edited.");
      return;
    }

    if (categories.some(cat => cat.id !== updatedCategory.id && cat.name.toLowerCase() === updatedCategory.name.toLowerCase())) {
      toast.error(`Category "${updatedCategory.name}" already exists.`);
      return;
    }

    await update(updatedCategory.id, updatedCategory);
  }, [categories, update]);

  const deleteCategory = useCallback(async (id: string): Promise<string | null> => {
    const categoryToDelete = categories.find(cat => cat.id === id);
    if (!categoryToDelete) return null;

    if (categoryToDelete.isUncategorized) {
      toast.error("The 'Uncategorized' category cannot be deleted.");
      return null;
    }

    const uncategorizedId = getUncategorizedCategoryId();
    await baseRemove(id);
    return uncategorizedId;
  }, [categories, getUncategorizedCategoryId, baseRemove]);

  const value: CategoryContextType = {
    categories,
    asyncState,
    addCategory,
    updateCategory,
    deleteCategory,
    getCategoryName,
    getUncategorizedCategoryId,
    refresh,
  };

  return (
    <CategoryContext.Provider value={value}>
      {children}
    </CategoryContext.Provider>
  );
};

export const useCategories = () => {
  const context = useContext(CategoryContext);
  if (context === undefined) {
    throw new Error("useCategories must be used within a CategoryProvider");
  }
  return context;
};
