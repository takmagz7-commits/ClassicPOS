import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { getSyncManager, SyncManager, EntityType, SyncOperation, SyncStatusResponse } from '@/utils/syncManager';
import { toast } from 'sonner';

interface SyncContextType {
  syncManager: SyncManager;
  isOnline: boolean;
  pendingCount: number;
  failedCount: number;
  queueOperation: (entityType: EntityType, operation: SyncOperation, entityId: string, data?: any) => Promise<void>;
  processQueue: () => Promise<void>;
  retryFailed: () => Promise<void>;
  getStatus: () => Promise<SyncStatusResponse | null>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider = ({ children }: { children: ReactNode }) => {
  const [syncManager] = useState(() => getSyncManager());
  const [isOnline, setIsOnline] = useState(syncManager.isOnlineStatus());
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);

  useEffect(() => {
    const updateStatus = () => {
      const status = syncManager.getLocalStatus();
      setIsOnline(status.isOnline);
      setPendingCount(status.pending);
      setFailedCount(status.failed);
    };

    updateStatus();

    const unsubscribe = syncManager.subscribe(updateStatus);

    return () => {
      unsubscribe();
    };
  }, [syncManager]);

  const queueOperation = async (
    entityType: EntityType,
    operation: SyncOperation,
    entityId: string,
    data?: any
  ) => {
    try {
      await syncManager.queueOperation(entityType, operation, entityId, data);
      
      if (!isOnline) {
        toast.info('Operation queued for sync when online', {
          description: `${entityType} ${operation} will be synced when connection is restored`
        });
      }
    } catch (error) {
      toast.error('Failed to queue operation', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const processQueue = async () => {
    try {
      toast.loading('Processing sync queue...', { id: 'sync-process' });
      const result = await syncManager.processQueue();
      
      if (result.processed > 0) {
        toast.success(`Sync complete: ${result.succeeded} succeeded, ${result.failed} failed`, {
          id: 'sync-process'
        });
      } else {
        toast.info('No items to sync', { id: 'sync-process' });
      }
    } catch (error) {
      toast.error('Sync failed', {
        id: 'sync-process',
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const retryFailed = async () => {
    try {
      await syncManager.retryFailed();
      toast.success('Retrying failed sync items');
    } catch (error) {
      toast.error('Failed to retry', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const getStatus = async () => {
    return await syncManager.getStatus();
  };

  return (
    <SyncContext.Provider
      value={{
        syncManager,
        isOnline,
        pendingCount,
        failedCount,
        queueOperation,
        processQueue,
        retryFailed,
        getStatus
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};
