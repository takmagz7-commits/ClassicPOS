const express = require('express');
const router = express.Router();
const { backupService } = require('../utils/databaseBackup.cjs');
const authMiddleware = require('../middleware/authMiddleware.cjs');
const roleMiddleware = require('../middleware/roleMiddleware.cjs');
const { logger } = require('../utils/logger.cjs');

router.post('/manual', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    logger.info(`Manual backup requested by user: ${req.user?.username || 'unknown'}`);
    const backupPath = await backupService.manualBackup();
    
    res.json({ 
      success: true, 
      message: 'Database backup created successfully',
      backupPath 
    });
  } catch (error) {
    logger.error('Manual backup failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create backup: ' + error.message 
    });
  }
});

router.get('/list', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const backups = backupService.getBackupList();
    res.json({ success: true, backups });
  } catch (error) {
    logger.error('Failed to list backups:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to list backups: ' + error.message 
    });
  }
});

router.post('/restore/:filename', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const { filename } = req.params;
    logger.warn(`Database restore requested by user: ${req.user?.username || 'unknown'} for file: ${filename}`);
    
    await backupService.restoreBackup(filename);
    
    res.json({ 
      success: true, 
      message: 'Database restored successfully. Server restart recommended.' 
    });
  } catch (error) {
    logger.error('Database restore failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to restore backup: ' + error.message 
    });
  }
});

module.exports = router;
