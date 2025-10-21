const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const cron = require('node-cron');
const { query, queryOne, insert, update } = require('../db/dbService.cjs');
const { logger } = require('../utils/logger.cjs');
const authMiddleware = require('../middleware/authMiddleware.cjs');

router.post('/queue', authMiddleware, async (req, res) => {
  try {
    const { entityType, entityId, operation, data, deviceId } = req.body;

    if (!entityType || !entityId || !operation || !deviceId) {
      return res.status(400).json({ error: 'Missing required fields: entityType, entityId, operation, deviceId' });
    }

    if (!['create', 'update', 'delete'].includes(operation)) {
      return res.status(400).json({ error: 'Invalid operation. Must be create, update, or delete' });
    }

    const queueItem = {
      id: crypto.randomUUID(),
      entity_type: entityType,
      entity_id: entityId,
      operation,
      data: data ? JSON.stringify(data) : null,
      device_id: deviceId,
      created_at: new Date().toISOString(),
      synced_at: null,
      status: 'pending',
      retry_count: 0,
      error_message: null
    };

    insert('sync_queue', queueItem);

    logger.info(`Sync item queued: ${entityType} ${operation} for device ${deviceId}`);

    res.status(201).json({
      message: 'Operation queued for sync',
      queueItem: {
        id: queueItem.id,
        entityType,
        entityId,
        operation,
        status: 'pending'
      }
    });
  } catch (error) {
    logger.error('Error queuing sync operation:', error);
    res.status(500).json({ error: 'Failed to queue sync operation' });
  }
});

router.get('/status', authMiddleware, async (req, res) => {
  try {
    const { deviceId } = req.query;

    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId query parameter is required' });
    }

    const pendingItems = query(
      'SELECT COUNT(*) as count FROM sync_queue WHERE device_id = ? AND status = ?',
      [deviceId, 'pending']
    );

    const syncingItems = query(
      'SELECT COUNT(*) as count FROM sync_queue WHERE device_id = ? AND status = ?',
      [deviceId, 'syncing']
    );

    const failedItems = query(
      'SELECT COUNT(*) as count FROM sync_queue WHERE device_id = ? AND status = ?',
      [deviceId, 'failed']
    );

    const completedItems = query(
      'SELECT COUNT(*) as count FROM sync_queue WHERE device_id = ? AND status = ?',
      [deviceId, 'completed']
    );

    const syncState = queryOne(
      'SELECT * FROM sync_state WHERE device_id = ?',
      [deviceId]
    );

    const recentFailures = query(
      'SELECT id, entity_type, operation, error_message, retry_count FROM sync_queue WHERE device_id = ? AND status = ? ORDER BY created_at DESC LIMIT 5',
      [deviceId, 'failed']
    );

    res.json({
      deviceId,
      pending: pendingItems[0]?.count || 0,
      syncing: syncingItems[0]?.count || 0,
      failed: failedItems[0]?.count || 0,
      completed: completedItems[0]?.count || 0,
      lastSync: syncState?.last_sync_timestamp || null,
      syncVersion: syncState?.sync_version || 0,
      recentFailures: recentFailures.map(item => ({
        id: item.id,
        entityType: item.entity_type,
        operation: item.operation,
        errorMessage: item.error_message,
        retryCount: item.retry_count
      }))
    });
  } catch (error) {
    logger.error('Error getting sync status:', error);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
});

router.post('/process', authMiddleware, async (req, res) => {
  try {
    const { deviceId, limit = 50 } = req.body;

    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    const pendingItems = query(
      'SELECT * FROM sync_queue WHERE device_id = ? AND status IN (?, ?) ORDER BY created_at ASC LIMIT ?',
      [deviceId, 'pending', 'failed', limit]
    );

    if (pendingItems.length === 0) {
      return res.json({
        message: 'No pending items to process',
        processed: 0,
        succeeded: 0,
        failed: 0
      });
    }

    let succeeded = 0;
    let failed = 0;

    for (const item of pendingItems) {
      try {
        update('sync_queue', item.id, { status: 'syncing' });

        const parsedData = item.data ? JSON.parse(item.data) : null;

        const result = await processSyncItem(item.entity_type, item.operation, item.entity_id, parsedData);

        if (result.success) {
          update('sync_queue', item.id, {
            status: 'completed',
            synced_at: new Date().toISOString(),
            error_message: null
          });
          succeeded++;
        } else {
          const retryCount = (item.retry_count || 0) + 1;
          update('sync_queue', item.id, {
            status: 'failed',
            retry_count: retryCount,
            error_message: result.error || 'Unknown error'
          });
          failed++;
        }
      } catch (error) {
        const retryCount = (item.retry_count || 0) + 1;
        update('sync_queue', item.id, {
          status: 'failed',
          retry_count: retryCount,
          error_message: error.message
        });
        failed++;
        logger.error(`Error processing sync item ${item.id}:`, error);
      }
    }

    const existingState = queryOne('SELECT * FROM sync_state WHERE device_id = ?', [deviceId]);
    
    if (existingState) {
      update('sync_state', deviceId, {
        last_sync_timestamp: new Date().toISOString(),
        sync_version: (existingState.sync_version || 0) + 1,
        updated_at: new Date().toISOString()
      });
    } else {
      insert('sync_state', {
        device_id: deviceId,
        last_sync_timestamp: new Date().toISOString(),
        sync_version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    res.json({
      message: 'Sync processing completed',
      processed: pendingItems.length,
      succeeded,
      failed
    });
  } catch (error) {
    logger.error('Error processing sync queue:', error);
    res.status(500).json({ error: 'Failed to process sync queue' });
  }
});

router.get('/conflicts', authMiddleware, async (req, res) => {
  try {
    const { deviceId } = req.query;

    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId query parameter is required' });
    }

    const conflicts = query(
      `SELECT id, entity_type, entity_id, operation, data, error_message, retry_count, created_at
       FROM sync_queue 
       WHERE device_id = ? AND status = ? AND retry_count >= 3
       ORDER BY created_at DESC`,
      [deviceId, 'failed']
    );

    const formattedConflicts = conflicts.map(conflict => ({
      id: conflict.id,
      entityType: conflict.entity_type,
      entityId: conflict.entity_id,
      operation: conflict.operation,
      data: conflict.data ? JSON.parse(conflict.data) : null,
      errorMessage: conflict.error_message,
      retryCount: conflict.retry_count,
      createdAt: conflict.created_at
    }));

    res.json({
      conflicts: formattedConflicts,
      count: formattedConflicts.length
    });
  } catch (error) {
    logger.error('Error getting sync conflicts:', error);
    res.status(500).json({ error: 'Failed to get sync conflicts' });
  }
});

router.post('/retry-failed', authMiddleware, async (req, res) => {
  try {
    const { deviceId, itemId } = req.body;

    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    if (itemId) {
      const item = queryOne('SELECT * FROM sync_queue WHERE id = ? AND device_id = ?', [itemId, deviceId]);
      
      if (!item) {
        return res.status(404).json({ error: 'Sync item not found' });
      }

      if (item.status !== 'failed') {
        return res.status(400).json({ error: 'Item is not in failed state' });
      }

      update('sync_queue', itemId, {
        status: 'pending',
        error_message: null
      });

      return res.json({ message: 'Sync item reset to pending', itemId });
    }

    const failedItems = query(
      'SELECT id FROM sync_queue WHERE device_id = ? AND status = ?',
      [deviceId, 'failed']
    );

    for (const item of failedItems) {
      update('sync_queue', item.id, {
        status: 'pending',
        error_message: null
      });
    }

    res.json({
      message: 'All failed items reset to pending',
      count: failedItems.length
    });
  } catch (error) {
    logger.error('Error retrying failed sync items:', error);
    res.status(500).json({ error: 'Failed to retry sync items' });
  }
});

async function processSyncItem(entityType, operation, entityId, data) {
  try {
    switch (entityType) {
      case 'sale':
        return await processSaleSyncItem(operation, entityId, data);
      case 'product':
        return await processProductSyncItem(operation, entityId, data);
      case 'customer':
        return await processCustomerSyncItem(operation, entityId, data);
      case 'inventory':
        return await processInventorySyncItem(operation, entityId, data);
      default:
        logger.warn(`Unknown entity type for sync: ${entityType}`);
        return { success: false, error: `Unknown entity type: ${entityType}` };
    }
  } catch (error) {
    logger.error(`Error processing sync item for ${entityType}:`, error);
    return { success: false, error: error.message };
  }
}

async function processSaleSyncItem(operation, entityId, data) {
  try {
    switch (operation) {
      case 'create':
        insert('sales', data);
        return { success: true };
      case 'update':
        update('sales', entityId, data);
        return { success: true };
      case 'delete':
        const { remove } = require('../db/dbService.cjs');
        remove('sales', entityId);
        return { success: true };
      default:
        return { success: false, error: `Unknown operation: ${operation}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function processProductSyncItem(operation, entityId, data) {
  try {
    switch (operation) {
      case 'create':
        insert('products', data);
        return { success: true };
      case 'update':
        update('products', entityId, data);
        return { success: true };
      case 'delete':
        const { remove } = require('../db/dbService.cjs');
        remove('products', entityId);
        return { success: true };
      default:
        return { success: false, error: `Unknown operation: ${operation}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function processCustomerSyncItem(operation, entityId, data) {
  try {
    switch (operation) {
      case 'create':
        insert('customers', data);
        return { success: true };
      case 'update':
        update('customers', entityId, data);
        return { success: true };
      case 'delete':
        const { remove } = require('../db/dbService.cjs');
        remove('customers', entityId);
        return { success: true };
      default:
        return { success: false, error: `Unknown operation: ${operation}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function processInventorySyncItem(operation, entityId, data) {
  try {
    switch (operation) {
      case 'update':
        update('products', entityId, { stock: data.stock, stock_by_store: data.stock_by_store });
        return { success: true };
      default:
        return { success: false, error: `Invalid inventory operation: ${operation}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

let syncScheduler = null;

function startSyncScheduler() {
  if (syncScheduler) {
    return;
  }

  syncScheduler = cron.schedule('*/10 * * * * *', async () => {
    try {
      const devicesWithPending = query(
        'SELECT DISTINCT device_id FROM sync_queue WHERE status IN (?, ?) LIMIT 10',
        ['pending', 'failed']
      );

      for (const device of devicesWithPending) {
        const pendingItems = query(
          'SELECT * FROM sync_queue WHERE device_id = ? AND status IN (?, ?) AND retry_count < 5 ORDER BY created_at ASC LIMIT 20',
          [device.device_id, 'pending', 'failed']
        );

        for (const item of pendingItems) {
          try {
            update('sync_queue', item.id, { status: 'syncing' });

            const parsedData = item.data ? JSON.parse(item.data) : null;
            const result = await processSyncItem(item.entity_type, item.operation, item.entity_id, parsedData);

            if (result.success) {
              update('sync_queue', item.id, {
                status: 'completed',
                synced_at: new Date().toISOString(),
                error_message: null
              });
            } else {
              const retryCount = (item.retry_count || 0) + 1;
              const backoffSeconds = Math.min(Math.pow(2, retryCount), 10);
              
              update('sync_queue', item.id, {
                status: 'failed',
                retry_count: retryCount,
                error_message: result.error || 'Unknown error'
              });
            }
          } catch (error) {
            const retryCount = (item.retry_count || 0) + 1;
            update('sync_queue', item.id, {
              status: 'failed',
              retry_count: retryCount,
              error_message: error.message
            });
          }
        }
      }
    } catch (error) {
      logger.error('Background sync scheduler error:', error);
    }
  });

  logger.info('✅ Background sync scheduler started (runs every 10 seconds)');
}

startSyncScheduler();

module.exports = router;
