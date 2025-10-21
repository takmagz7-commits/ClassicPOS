import { createContext, useContext, ReactNode, useCallback } from "react";
import { logger } from "@/utils/logger";
import { Product } from "@/types/product";
import { useInventoryHistory } from "./InventoryHistoryContext";
import { InventoryHistoryType } from "@/types/inventory";
import { useAuth } from "@/components/auth/AuthContext";
import { getAll, insert, update as dbUpdate, remove } from "@/services/dbService";
import { productToDb, dbToProduct, type DbProduct } from "@/db/helpers";
import { toast } from "sonner";
import { createAsyncResourceContext } from "@/utils/createAsyncResourceContext";

interface ProductContextType {
  products: Product[];
  asyncState: {
    isLoading: boolean;
    error: Error | null;
    operationInProgress: string | null;
  };
  updateProductStock: (
    productId: string,
    newStock: number,
    historyType: InventoryHistoryType,
    referenceId: string,
    reason?: string,
    storeId?: string,
    userId?: string,
    productName?: string
  ) => Promise<void>;
  updateProduct: (updatedProduct: Product) => Promise<void>;
  addProduct: (newProduct: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  reassignProductsToCategory: (oldCategoryId: string, newCategoryId: string) => Promise<void>;
  getEffectiveProductStock: (productId: string, storeId?: string) => number;
  refresh: () => Promise<void>;
}

const { Context: BaseContext, Provider: BaseProvider } = createAsyncResourceContext<Product>({
  name: "Product",
  lazyLoad: true,
  loadAll: async () => {
    const dbProducts = await getAll<DbProduct>('products');
    return dbProducts.map(dbToProduct);
  },
  create: async (item: Product) => {
    await insert('products', productToDb(item));
    return item;
  },
  update: async (id: string, updates: Partial<Product>) => {
    const fullUpdate = { id, ...updates } as Product;
    await dbUpdate('products', id, productToDb(fullUpdate));
    return fullUpdate;
  },
  remove: async (id: string) => {
    await remove('products', id);
  },
  customOperations: {
    reassignProductsToCategory: async (ctx, oldCategoryId: string, newCategoryId: string) => {
      const productsToUpdate = ctx.items.filter(p => p.categoryId === oldCategoryId);
      
      if (productsToUpdate.length === 0) {
        return;
      }

      // Update all products in database (in parallel for efficiency)
      await Promise.all(
        productsToUpdate.map((product) => {
          const updated = { ...product, categoryId: newCategoryId };
          return dbUpdate('products', product.id, productToDb(updated));
        })
      );

      // Update state
      ctx.setItems(prev => 
        prev.map(product => 
          product.categoryId === oldCategoryId 
            ? { ...product, categoryId: newCategoryId }
            : product
        )
      );
    }
  },
  derivedSelectors: {
    getEffectiveProductStock: (items: Product[], productId: string, storeId?: string) => {
      const product = items.find(p => p.id === productId);
      if (!product) return 0;

      if (storeId && product.stockByStore) {
        return product.stockByStore[storeId] || 0;
      }
      return product.stock;
    }
  },
  operationMessages: {
    reassignProductsToCategory: {
      success: "Products reassigned to new category",
      error: "Failed to reassign products to category"
    }
  }
});

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider = ({ children }: { children: ReactNode }) => {
  return (
    <BaseProvider>
      <ProductProviderWrapper>{children}</ProductProviderWrapper>
    </BaseProvider>
  );
};

const ProductProviderWrapper = ({ children }: { children: ReactNode }) => {
  const baseContext = useContext(BaseContext);
  const { addHistoryEntry } = useInventoryHistory();
  const { user: authUser } = useAuth();

  if (!baseContext) {
    throw new Error("ProductProviderWrapper must be used within BaseProvider");
  }

  const { 
    items: products, 
    asyncState, 
    create, 
    update, 
    remove: baseRemove, 
    refresh,
    getEffectiveProductStock,
    reassignProductsToCategory: baseReassignProductsToCategory
  } = baseContext;

  const updateProductStock = useCallback(async (
    productId: string,
    newStockValue: number,
    historyType: InventoryHistoryType,
    referenceId: string,
    reason?: string,
    storeId?: string,
    userId?: string,
    productName?: string
  ) => {
    try {
      // Get current product
      const currentProduct = products.find(p => p.id === productId);
      if (!currentProduct) {
        toast.error('Product not found');
        return;
      }

      const productNameToUse = productName || currentProduct.name;
      let updatedProduct = { ...currentProduct };
      let currentStockForHistory = 0;
      let quantityChange = 0;
      let oldStock = currentProduct.stock;

      if (storeId && updatedProduct.stockByStore) {
        const currentStoreStock = updatedProduct.stockByStore[storeId] || 0;
        quantityChange = newStockValue - currentStoreStock;
        updatedProduct.stockByStore = {
          ...updatedProduct.stockByStore,
          [storeId]: newStockValue,
        };
        updatedProduct.stock = Object.values(updatedProduct.stockByStore).reduce((sum, qty) => sum + qty, 0);
        currentStockForHistory = newStockValue;
      } else {
        quantityChange = newStockValue - currentProduct.stock;
        updatedProduct.stock = newStockValue;
        currentStockForHistory = newStockValue;
      }

      // Update using base update
      await update(productId, updatedProduct);

      // Add history entry if stock changed
      if (quantityChange !== 0) {
        addHistoryEntry({
          type: historyType,
          referenceId: referenceId,
          description: reason || `Stock updated from ${oldStock} to ${newStockValue}`,
          productId: productId,
          productName: productNameToUse,
          quantityChange: quantityChange,
          currentStock: currentStockForHistory,
          storeId: storeId,
          userId: userId || authUser?.id,
        });
      }
    } catch (error) {
      logger.error('Error updating product stock:', error);
      toast.error('Failed to update product stock');
      throw error;
    }
  }, [products, update, addHistoryEntry, authUser]);

  const addProduct = useCallback(async (newProduct: Product) => {
    try {
      const initialTotalStock = newProduct.stockByStore
        ? Object.values(newProduct.stockByStore).reduce((sum, qty) => sum + qty, 0)
        : newProduct.stock;

      // Save to database and update state using base create
      await create(newProduct);

      // Add history entry
      addHistoryEntry({
        type: InventoryHistoryType.INITIAL_STOCK,
        referenceId: newProduct.id,
        description: `New product "${newProduct.name}" added with initial stock of ${initialTotalStock}.`,
        productId: newProduct.id,
        productName: newProduct.name,
        quantityChange: initialTotalStock,
        currentStock: initialTotalStock,
        storeId: undefined,
        userId: authUser?.id,
      });
    } catch (error) {
      logger.error('Error adding product:', error);
      throw error;
    }
  }, [create, addHistoryEntry, authUser]);

  const updateProduct = useCallback(async (updatedProduct: Product) => {
    try {
      // Get old product data
      const oldProduct = products.find(p => p.id === updatedProduct.id);
      if (!oldProduct) {
        toast.error('Product not found');
        throw new Error('Product not found');
      }

      const oldTotalStock = oldProduct.stockByStore
        ? Object.values(oldProduct.stockByStore).reduce((sum, qty) => sum + qty, 0)
        : oldProduct.stock;
      
      const newTotalStock = updatedProduct.stockByStore
        ? Object.values(updatedProduct.stockByStore).reduce((sum, qty) => sum + qty, 0)
        : updatedProduct.stock;

      // Update using base update
      await update(updatedProduct.id, updatedProduct);

      // Add history entry if stock changed
      const quantityChange = newTotalStock - oldTotalStock;
      if (quantityChange !== 0) {
        addHistoryEntry({
          type: InventoryHistoryType.PRODUCT_EDIT,
          referenceId: updatedProduct.id,
          description: `Product "${updatedProduct.name}" stock manually updated from ${oldTotalStock} to ${newTotalStock}.`,
          productId: updatedProduct.id,
          productName: updatedProduct.name,
          quantityChange: quantityChange,
          currentStock: newTotalStock,
          storeId: undefined,
          userId: authUser?.id,
        });
      }
    } catch (error) {
      logger.error('Error updating product:', error);
      throw error;
    }
  }, [products, update, addHistoryEntry, authUser]);

  const deleteProduct = useCallback(async (productId: string) => {
    try {
      const productToDelete = products.find(p => p.id === productId);
      if (!productToDelete) {
        toast.error('Product not found');
        return;
      }

      const totalStockToDelete = productToDelete.stockByStore
        ? Object.values(productToDelete.stockByStore).reduce((sum, qty) => sum + qty, 0)
        : productToDelete.stock;

      // Delete using base remove
      await baseRemove(productId);

      // Add history entry
      addHistoryEntry({
        type: InventoryHistoryType.PRODUCT_DELETED,
        referenceId: productId,
        description: `Product "${productToDelete.name}" deleted. All ${totalStockToDelete} units removed from stock.`,
        productId: productId,
        productName: productToDelete.name,
        quantityChange: -totalStockToDelete,
        currentStock: 0,
        storeId: undefined,
        userId: authUser?.id,
      });
    } catch (error) {
      logger.error('Error deleting product:', error);
      throw error;
    }
  }, [products, baseRemove, addHistoryEntry, authUser]);

  const reassignProductsToCategory = useCallback(async (oldCategoryId: string, newCategoryId: string) => {
    await baseReassignProductsToCategory(oldCategoryId, newCategoryId);
  }, [baseReassignProductsToCategory]);

  const value: ProductContextType = {
    products,
    asyncState,
    updateProductStock,
    updateProduct,
    addProduct,
    deleteProduct,
    reassignProductsToCategory,
    getEffectiveProductStock,
    refresh,
  };

  return (
    <ProductContext.Provider value={value}>{children}</ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error("useProducts must be used within a ProductProvider");
  }
  return context;
};
