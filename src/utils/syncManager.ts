import { fetchWithAuth } from './fetchWithAuth';
import { getApiBaseUrl } from './platformConfig';
import { logger } from './logger';

const API_BASE_URL = getApiBaseUrl();

export type SyncOperation = 'create' | 'update' | 'delete';
export type SyncStatus = 'pending' | 'syncing' | 'completed' | 'failed';
export type EntityType = 'sale' | 'product' | 'customer' | 'inventory';

export interface SyncQueueItem {
  id: string;
  entityType: EntityType;
  entityId: string;
  operation: SyncOperation;
  data?: any;
  status: SyncStatus;
  createdAt: string;
  retryCount?: number;
  errorMessage?: string;
}

export interface SyncStatusResponse {
  deviceId: string;
  pending: number;
  syncing: number;
  failed: number;
  completed: number;
  lastSync: string | null;
  syncVersion: number;
  recentFailures: Array<{
    id: string;
    entityType: string;
    operation: string;
    errorMessage: string;
    retryCount: number;
  }>;
}

export class SyncManager {
  private deviceId: string;
  private localQueue: SyncQueueItem[] = [];
  private isOnline: boolean = navigator.onLine;
  private listeners: Set<() => void> = new Set();
  private syncInterval: number | null = null;

  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
    this.loadLocalQueue();
    this.setupNetworkListeners();
    this.startAutoSync();
  }

  private getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  }

  getDeviceId(): string {
    return this.deviceId;
  }

  private loadLocalQueue(): void {
    try {
      const stored = localStorage.getItem('sync_queue');
      if (stored) {
        this.localQueue = JSON.parse(stored);
      }
    } catch (error) {
      logger.error('Failed to load local sync queue:', error);
      this.localQueue = [];
    }
  }

  private saveLocalQueue(): void {
    try {
      localStorage.setItem('sync_queue', JSON.stringify(this.localQueue));
    } catch (error) {
      logger.error('Failed to save local sync queue:', error);
    }
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners();
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners();
    });

    setInterval(() => {
      const wasOnline = this.isOnline;
      this.isOnline = navigator.onLine;
      if (wasOnline !== this.isOnline) {
        this.notifyListeners();
        if (this.isOnline) {
          this.processQueue();
        }
      }
    }, 5000);
  }

  private startAutoSync(): void {
    this.syncInterval = window.setInterval(() => {
      if (this.isOnline && this.localQueue.some(item => item.status === 'pending' || item.status === 'failed')) {
        this.processQueue();
      }
    }, 15000);
  }

  stopAutoSync(): void {
    if (this.syncInterval !== null) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  async queueOperation(
    entityType: EntityType,
    operation: SyncOperation,
    entityId: string,
    data?: any
  ): Promise<void> {
    const queueItem: SyncQueueItem = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      entityType,
      entityId,
      operation,
      data,
      status: 'pending',
      createdAt: new Date().toISOString(),
      retryCount: 0
    };

    this.localQueue.push(queueItem);
    this.saveLocalQueue();
    this.notifyListeners();

    if (this.isOnline) {
      await this.sendToServer(queueItem);
    }
  }

  private async sendToServer(item: SyncQueueItem): Promise<boolean> {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/sync/queue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entityType: item.entityType,
          entityId: item.entityId,
          operation: item.operation,
          data: item.data,
          deviceId: this.deviceId
        }),
        credentials: 'include'
      });

      if (response.ok) {
        item.status = 'completed';
        this.saveLocalQueue();
        this.notifyListeners();
        return true;
      } else {
        const errorData = await response.json();
        item.status = 'failed';
        item.errorMessage = errorData.error || 'Unknown error';
        item.retryCount = (item.retryCount || 0) + 1;
        this.saveLocalQueue();
        this.notifyListeners();
        return false;
      }
    } catch (error) {
      item.status = 'failed';
      item.errorMessage = error instanceof Error ? error.message : 'Network error';
      item.retryCount = (item.retryCount || 0) + 1;
      this.saveLocalQueue();
      this.notifyListeners();
      return false;
    }
  }

  async processQueue(): Promise<{ processed: number; succeeded: number; failed: number }> {
    if (!this.isOnline) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    const pendingItems = this.localQueue.filter(
      item => (item.status === 'pending' || item.status === 'failed') && (item.retryCount || 0) < 5
    );

    if (pendingItems.length === 0) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    let succeeded = 0;
    let failed = 0;

    for (const item of pendingItems) {
      const success = await this.sendToServer(item);
      if (success) {
        succeeded++;
      } else {
        failed++;
      }
    }

    this.cleanupCompletedItems();

    return { processed: pendingItems.length, succeeded, failed };
  }

  private cleanupCompletedItems(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.localQueue = this.localQueue.filter(item => {
      if (item.status === 'completed') {
        const itemTime = new Date(item.createdAt).getTime();
        return itemTime > oneHourAgo;
      }
      return true;
    });
    this.saveLocalQueue();
  }

  async retryFailed(): Promise<void> {
    const failedItems = this.localQueue.filter(item => item.status === 'failed');
    
    for (const item of failedItems) {
      item.status = 'pending';
      item.retryCount = 0;
      item.errorMessage = undefined;
    }
    
    this.saveLocalQueue();
    this.notifyListeners();

    if (this.isOnline) {
      await this.processQueue();
    }
  }

  async getStatus(): Promise<SyncStatusResponse | null> {
    if (!this.isOnline) {
      return {
        deviceId: this.deviceId,
        pending: this.localQueue.filter(item => item.status === 'pending').length,
        syncing: this.localQueue.filter(item => item.status === 'syncing').length,
        failed: this.localQueue.filter(item => item.status === 'failed').length,
        completed: this.localQueue.filter(item => item.status === 'completed').length,
        lastSync: null,
        syncVersion: 0,
        recentFailures: []
      };
    }

    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/sync/status?deviceId=${this.deviceId}`, {
        credentials: 'include'
      });

      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      logger.error('Failed to get sync status:', error);
      return null;
    }
  }

  getLocalStatus() {
    return {
      isOnline: this.isOnline,
      pending: this.localQueue.filter(item => item.status === 'pending').length,
      syncing: this.localQueue.filter(item => item.status === 'syncing').length,
      failed: this.localQueue.filter(item => item.status === 'failed').length,
      completed: this.localQueue.filter(item => item.status === 'completed').length,
      totalQueued: this.localQueue.length
    };
  }

  isOnlineStatus(): boolean {
    return this.isOnline;
  }

  clearCompleted(): void {
    this.localQueue = this.localQueue.filter(item => item.status !== 'completed');
    this.saveLocalQueue();
    this.notifyListeners();
  }
}

let syncManagerInstance: SyncManager | null = null;

export function getSyncManager(): SyncManager {
  if (!syncManagerInstance) {
    syncManagerInstance = new SyncManager();
  }
  return syncManagerInstance;
}
