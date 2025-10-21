const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { logger } = require('./logger.cjs');

class DatabaseBackupService {
  constructor(config = {}) {
    this.dbPath = config.dbPath || process.env.DB_PATH || './backend/classicpos.db';
    this.backupDir = config.backupDir || './backups';
    this.retentionDays = config.retentionDays || parseInt(process.env.BACKUP_RETENTION_DAYS) || 14;
    this.maxBackups = config.maxBackups || this.retentionDays;
    this.cronSchedule = config.cronSchedule || process.env.BACKUP_SCHEDULE || '0 2 * * *';
    this.enabled = config.enabled !== undefined ? config.enabled : (process.env.BACKUP_ENABLED !== 'false');
  }

  async initialize() {
    if (!this.enabled) {
      logger.info('Database backup service is disabled');
      return;
    }

    try {
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
        logger.info(`Created backup directory: ${this.backupDir}`);
      }

      await this.performBackup();
      
      this.scheduleCronJob();
      
      logger.info(`Database backup service initialized successfully`);
      logger.info(`Backup schedule: ${this.cronSchedule} (${this.getCronDescription()})`);
      logger.info(`Backup directory: ${path.resolve(this.backupDir)}`);
      logger.info(`Backup retention: ${this.retentionDays} days (max ${this.maxBackups} backups)`);
    } catch (error) {
      logger.error('Failed to initialize database backup service:', error);
      throw error;
    }
  }

  getCronDescription() {
    const scheduleMap = {
      '0 2 * * *': 'Daily at 2:00 AM',
      '0 */12 * * *': 'Every 12 hours',
      '0 */6 * * *': 'Every 6 hours',
      '*/30 * * * *': 'Every 30 minutes'
    };
    return scheduleMap[this.cronSchedule] || 'Custom schedule';
  }

  async performBackup() {
    try {
      if (!fs.existsSync(this.dbPath)) {
        logger.warn(`Database file not found at ${this.dbPath}, skipping backup`);
        return null;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const timeOfDay = new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].substring(0, 8);
      const backupFileName = `classicpos_backup_${timestamp}_${timeOfDay}.db`;
      const backupPath = path.join(this.backupDir, backupFileName);

      const Database = require('better-sqlite3');
      const db = new Database(this.dbPath, { readonly: true });
      
      try {
        const stmt = db.prepare(`VACUUM INTO ?`);
        stmt.run(backupPath);
        logger.info(`Database backup created successfully using VACUUM INTO: ${backupFileName}`);
      } finally {
        db.close();
      }

      const stats = fs.statSync(backupPath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      logger.info(`Backup size: ${fileSizeMB} MB`);

      await this.rotateBackups();

      return backupPath;
    } catch (error) {
      logger.error('Failed to create database backup:', error);
      throw error;
    }
  }

  async rotateBackups() {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith('classicpos_backup_') && file.endsWith('.db'))
        .map(file => ({
          name: file,
          path: path.join(this.backupDir, file),
          time: fs.statSync(path.join(this.backupDir, file)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);

      if (files.length > this.maxBackups) {
        const filesToDelete = files.slice(this.maxBackups);
        
        for (const file of filesToDelete) {
          fs.unlinkSync(file.path);
          logger.info(`Deleted old backup: ${file.name}`);
        }

        logger.info(`Backup rotation completed: ${filesToDelete.length} old backups removed`);
      }
    } catch (error) {
      logger.error('Failed to rotate backups:', error);
    }
  }

  scheduleCronJob() {
    this.cronJob = cron.schedule(this.cronSchedule, async () => {
      logger.info('Starting scheduled database backup...');
      await this.performBackup();
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    logger.info('Backup cron job scheduled successfully');
  }

  async manualBackup() {
    logger.info('Manual backup requested');
    return await this.performBackup();
  }

  getBackupList() {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith('classicpos_backup_') && file.endsWith('.db'))
        .map(file => {
          const stats = fs.statSync(path.join(this.backupDir, file));
          return {
            name: file,
            path: path.join(this.backupDir, file),
            size: stats.size,
            sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
            created: stats.mtime
          };
        })
        .sort((a, b) => b.created - a.created);

      return files;
    } catch (error) {
      logger.error('Failed to list backups:', error);
      return [];
    }
  }

  async restoreBackup(backupFileName) {
    try {
      const backupPath = path.join(this.backupDir, backupFileName);
      
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupFileName}`);
      }

      const restoreConfirmPath = `${this.dbPath}.pre-restore-${Date.now()}`;
      fs.copyFileSync(this.dbPath, restoreConfirmPath);
      logger.info(`Current database backed up to: ${restoreConfirmPath}`);

      fs.copyFileSync(backupPath, this.dbPath);
      
      logger.info(`Database restored successfully from backup: ${backupFileName}`);
      
      return true;
    } catch (error) {
      logger.error('Failed to restore database backup:', error);
      throw error;
    }
  }

  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      logger.info('Backup cron job stopped');
    }
  }
}

const backupService = new DatabaseBackupService();

module.exports = {
  DatabaseBackupService,
  backupService
};
