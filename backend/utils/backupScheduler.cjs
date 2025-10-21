const cron = require('node-cron');
const { backupService } = require('./databaseBackup.cjs');
const { logger } = require('./logger.cjs');

class BackupScheduler {
  constructor() {
    this.scheduledTask = null;
    this.schedule = process.env.BACKUP_SCHEDULE || '0 2 * * *';
    this.enabled = process.env.BACKUP_ENABLED !== 'false';
  }

  async start() {
    if (!this.enabled) {
      logger.info('⏭️  Automated database backups are disabled');
      return;
    }

    try {
      await backupService.initialize();
      logger.info(`📅 Backup scheduler initialized successfully`);
      logger.info(`💾 Backup retention: ${backupService.maxBackups} backups`);
    } catch (error) {
      logger.error(`❌ Failed to initialize backup service: ${error.message}`);
    }
  }

  stop() {
    if (this.scheduledTask) {
      this.scheduledTask.stop();
      logger.info('⏹️  Backup scheduler stopped');
    }
  }

  async triggerManualBackup() {
    logger.info('🖱️  Manual backup triggered');
    try {
      const result = await backupService.performBackup();
      return result;
    } catch (error) {
      logger.error(`❌ Manual backup failed: ${error.message}`);
      throw error;
    }
  }

  getScheduleDescription() {
    const schedule = this.schedule;
    
    if (schedule === '0 2 * * *') return 'Daily at 2:00 AM';
    if (schedule === '0 */6 * * *') return 'Every 6 hours';
    if (schedule === '0 0 * * 0') return 'Weekly on Sunday at midnight';
    if (schedule === '*/30 * * * *') return 'Every 30 minutes';
    
    return schedule;
  }

  getStatus() {
    return {
      enabled: this.enabled,
      schedule: this.schedule,
      scheduleDescription: this.getScheduleDescription(),
      isRunning: this.scheduledTask !== null,
      backups: backupService.getBackupList()
    };
  }
}

module.exports = new BackupScheduler();
