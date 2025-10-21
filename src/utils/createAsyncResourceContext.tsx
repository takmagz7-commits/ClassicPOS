import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

export interface AsyncOperation<T, Args extends any[] = []> {
  (...args: Args): Promise<T>;
}

export interface DerivedSelector<T, R> {
  (items: T[], ...args: any[]): R;
}

export interface CustomOperationContext<T> {
  items: T[];
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  executeAsync: <R>(
    operation: string,
    asyncFn: () => Promise<R>,
    options?: {
      successMessage?: string;
      errorMessage?: string;
      silent?: boolean;
      skipLoading?: boolean;
    }
  ) => Promise<R | undefined>;
  baseCreate: (item: T) => Promise<void>;
  baseUpdate: (id: string, updates: Partial<T>) => Promise<void>;
  baseRemove: (id: string) => Promise<void>;
}

export interface ResourceConfig<T> {
  name: string;
  loadAll: () => Promise<T[]>;
  create?: (item: T) => Promise<T | void>;
  update?: (id: string, item: Partial<T>) => Promise<T | void>;
  remove?: (id: string) => Promise<void>;
  customOperations?: Record<string, (ctx: CustomOperationContext<T>, ...args: any[]) => Promise<any>>;
  derivedSelectors?: Record<string, DerivedSelector<T, any>>;
  enableOptimistic?: boolean;
  retryOnError?: boolean;
  maxRetries?: number;
  onError?: (operation: string, error: Error) => void;
  onSuccess?: (operation: string, data?: any) => void;
  operationMessages?: Record<string, { success?: string; error?: string }>;
  lazyLoad?: boolean;
}

export interface AsyncState {
  isLoading: boolean;
  error: Error | null;
  operationInProgress: string | null;
}

export interface ResourceContextValue<T> {
  items: T[];
  asyncState: AsyncState;
  loadAll: () => Promise<void>;
  create: (item: T) => Promise<void>;
  update: (id: string, item: Partial<T>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  [key: string]: any;
}

async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)));
      }
    }
  }
  
  throw lastError!;
}

export function createAsyncResourceContext<T extends { id: string }>(
  config: ResourceConfig<T>
) {
  const {
    name,
    loadAll,
    create: createFn,
    update: updateFn,
    remove: removeFn,
    customOperations = {},
    derivedSelectors = {},
    enableOptimistic = false,
    retryOnError = false,
    maxRetries = 3,
    onError,
    onSuccess,
    operationMessages = {},
    lazyLoad = false,
  } = config;

  const Context = createContext<ResourceContextValue<T> | undefined>(undefined);

  const Provider = ({ children }: { children: ReactNode }) => {
    const [items, setItems] = useState<T[]>([]);
    const [asyncState, setAsyncState] = useState<AsyncState>({
      isLoading: false,
      error: null,
      operationInProgress: null,
    });

    // Reference counter for concurrent operations
    const operationCountRef = useRef(0);
    // Track errors per operation
    const operationErrorsRef = useRef<Map<string, Error>>(new Map());
    // Track if data has been loaded (for lazy loading)
    const hasLoadedRef = useRef(false);

    const executeAsync = useCallback(
      async <R,>(
        operation: string,
        asyncFn: () => Promise<R>,
        options?: {
          successMessage?: string;
          errorMessage?: string;
          silent?: boolean;
          skipLoading?: boolean;
        }
      ): Promise<R | undefined> => {
        const { successMessage, errorMessage, silent = false, skipLoading = false } = options || {};

        if (!skipLoading) {
          // Increment operation counter
          operationCountRef.current += 1;
          
          // If this is the first operation, clear the error map
          if (operationCountRef.current === 1) {
            operationErrorsRef.current.clear();
          }
          
          setAsyncState(prev => ({
            ...prev,
            isLoading: true,
            operationInProgress: operation,
            // Only clear error if this is the first operation
            error: operationCountRef.current === 1 ? null : prev.error,
          }));
        }

        try {
          const executeFn = retryOnError
            ? () => retryOperation(asyncFn, maxRetries)
            : asyncFn;

          const result = await executeFn();

          if (!skipLoading) {
            // Decrement operation counter
            operationCountRef.current -= 1;
            
            // Clear this operation's error if it existed
            operationErrorsRef.current.delete(operation);
            
            setAsyncState(prev => ({
              ...prev,
              // Only set isLoading to false when all operations complete
              isLoading: operationCountRef.current > 0,
              operationInProgress: operationCountRef.current > 0 ? prev.operationInProgress : null,
              // Show first error from map, or null if no errors
              error: operationErrorsRef.current.size > 0 
                ? Array.from(operationErrorsRef.current.values())[0]
                : null,
            }));
          }

          if (!silent && successMessage) {
            toast.success(successMessage);
          }

          onSuccess?.(operation, result);
          return result;
        } catch (error) {
          const err = error as Error;
          
          if (!skipLoading) {
            // Decrement operation counter
            operationCountRef.current -= 1;
            
            // Store this operation's error
            operationErrorsRef.current.set(operation, err);
            
            setAsyncState(prev => ({
              ...prev,
              // Only set isLoading to false when all operations complete
              isLoading: operationCountRef.current > 0,
              operationInProgress: operationCountRef.current > 0 ? prev.operationInProgress : null,
              // Show the current error
              error: err,
            }));
          }

          const finalErrorMessage = errorMessage || `Failed to ${operation} ${name.toLowerCase()}`;
          
          if (!silent) {
            toast.error(finalErrorMessage);
          }

          onError?.(operation, err);
          logger.error(`Error in ${operation}:`, err);
          
          throw error;
        }
      },
      [name, retryOnError, maxRetries, onSuccess, onError]
    );

    const loadAllItems = useCallback(async () => {
      await executeAsync('load', async () => {
        const data = await loadAll();
        setItems(data);
        hasLoadedRef.current = true;
        return data;
      }, { silent: true });
    }, [executeAsync, loadAll]);

    const refresh = useCallback(async () => {
      await loadAllItems();
    }, [loadAllItems]);

    useEffect(() => {
      if (!lazyLoad) {
        loadAllItems();
      }
    }, [loadAllItems, lazyLoad]);

    const create = useCallback(
      async (item: T) => {
        if (!createFn) {
          throw new Error(`Create operation not supported for ${name}`);
        }

        if (enableOptimistic) {
          setItems(prev => [...prev, item]);
        }

        try {
          await executeAsync(
            'create',
            async () => {
              const result = await createFn(item);
              
              setItems(prev => {
                if (enableOptimistic) {
                  return prev.map(i => (i.id === item.id ? (result as T) || item : i));
                }
                return [...prev, (result as T) || item];
              });
              
              return result;
            },
            {
              successMessage: `${name} created successfully`,
              errorMessage: `Failed to create ${name.toLowerCase()}`,
            }
          );
        } catch (error) {
          if (enableOptimistic) {
            setItems(prev => prev.filter(i => i.id !== item.id));
          }
          throw error;
        }
      },
      [createFn, enableOptimistic, executeAsync, name]
    );

    const update = useCallback(
      async (id: string, updates: Partial<T>) => {
        if (!updateFn) {
          throw new Error(`Update operation not supported for ${name}`);
        }

        let previousItem: T | undefined;

        if (enableOptimistic) {
          setItems(prev => {
            previousItem = prev.find(i => i.id === id);
            return prev.map(i => (i.id === id ? { ...i, ...updates } : i));
          });
        }

        try {
          await executeAsync(
            'update',
            async () => {
              const result = await updateFn(id, updates);
              
              setItems(prev =>
                prev.map(i => {
                  if (i.id === id) {
                    return result ? (result as T) : { ...i, ...updates };
                  }
                  return i;
                })
              );
              
              return result;
            },
            {
              successMessage: `${name} updated successfully`,
              errorMessage: `Failed to update ${name.toLowerCase()}`,
            }
          );
        } catch (error) {
          if (enableOptimistic && previousItem) {
            setItems(prev => prev.map(i => (i.id === id ? previousItem! : i)));
          }
          throw error;
        }
      },
      [updateFn, enableOptimistic, executeAsync, name]
    );

    const remove = useCallback(
      async (id: string) => {
        if (!removeFn) {
          throw new Error(`Remove operation not supported for ${name}`);
        }

        let previousItem: T | undefined;

        if (enableOptimistic) {
          setItems(prev => {
            previousItem = prev.find(i => i.id === id);
            return prev.filter(i => i.id !== id);
          });
        }

        try {
          await executeAsync(
            'delete',
            async () => {
              await removeFn(id);
              setItems(prev => prev.filter(i => i.id !== id));
            },
            {
              successMessage: `${name} deleted successfully`,
              errorMessage: `Failed to delete ${name.toLowerCase()}`,
            }
          );
        } catch (error) {
          if (enableOptimistic && previousItem) {
            setItems(prev => [...prev, previousItem!]);
          }
          throw error;
        }
      },
      [removeFn, enableOptimistic, executeAsync, name]
    );

    const customOps = Object.keys(customOperations).reduce((acc, key) => {
      acc[key] = useCallback(
        async (...args: any[]) => {
          const operationContext: CustomOperationContext<T> = {
            items,
            setItems,
            executeAsync,
            baseCreate: create,
            baseUpdate: update,
            baseRemove: remove,
          };

          const messages = operationMessages[key] || {};
          const successMessage = messages.success || `${key} completed successfully`;
          const errorMessage = messages.error || `Failed to ${key}`;

          return executeAsync(
            key,
            async () => {
              const result = await customOperations[key](operationContext, ...args);
              return result;
            },
            {
              successMessage,
              errorMessage,
            }
          );
        },
        [executeAsync, items, create, update, remove]
      );
      return acc;
    }, {} as Record<string, any>);

    const selectors = Object.keys(derivedSelectors).reduce((acc, key) => {
      acc[key] = useCallback(
        (...args: any[]) => {
          return derivedSelectors[key](items, ...args);
        },
        [items]
      );
      return acc;
    }, {} as Record<string, any>);

    const value: ResourceContextValue<T> = {
      items,
      asyncState,
      loadAll: loadAllItems,
      create,
      update,
      remove,
      refresh,
      setItems,
      ...customOps,
      ...selectors,
    };

    return <Context.Provider value={value}>{children}</Context.Provider>;
  };

  const useResource = () => {
    const context = useContext(Context);
    if (context === undefined) {
      throw new Error(`use${name} must be used within a ${name}Provider`);
    }
    return context;
  };

  return {
    Provider,
    useResource,
    Context,
  };
}
