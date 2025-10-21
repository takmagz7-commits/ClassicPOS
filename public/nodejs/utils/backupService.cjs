const fs = require('fs');
const path = require('path');
const { logger } = require('./logger.cjs');
const dbService = require('../db/dbService.cjs');

class BackupService {
  constructor() {
    this.backupDir = path.join(process.cwd(), 'backend', 'backups');
    this.dbPath = process.env.DB_PATH || './backend/classicpos.db';
    this.retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS || '14', 10);
    this.enabled = process.env.BACKUP_ENABLED !== 'false';
  }

  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      logger.info(`📁 Created backup directory: ${this.backupDir}`);
    }
  }

  async performBackup() {
    if (!this.enabled) {
      logger.info('⏭️  Database backups are disabled');
      return null;
    }

    try {
      this.ensureBackupDirectory();

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const date = new Date().toISOString().split('T')[0];
      const backupFileName = `classicpos_${date}_${timestamp}.sqlite`;
      const backupFilePath = path.join(this.backupDir, backupFileName);

      if (!fs.existsSync(this.dbPath)) {
        logger.error(`❌ Database file not found: ${this.dbPath}`);
        return null;
      }

      logger.info(`🔄 Starting database backup: ${backupFileName}`);

      await this.vacuumDatabase();

      fs.copyFileSync(this.dbPath, backupFilePath);

      const stats = fs.statSync(backupFilePath);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

      logger.info(`✅ Database backup completed: ${backupFileName} (${sizeInMB} MB)`);

      await this.cleanupOldBackups();

      return backupFilePath;
    } catch (error) {
      logger.error(`❌ Database backup failed: ${error.message}`, { error: error.stack });
      throw error;
    }
  }

  async vacuumDatabase() {
    try {
      const db = dbService.getDb();
      db.prepare('VACUUM').run();
      logger.debug('🗜️  Database vacuumed before backup');
    } catch (error) {
      logger.warn(`⚠️  Database vacuum failed (non-critical): ${error.message}`);
    }
  }

  async cleanupOldBackups() {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith('classicpos_') && file.endsWith('.sqlite'))
        .map(file => ({
          name: file,
          path: path.join(this.backupDir, file),
          mtime: fs.statSync(path.join(this.backupDir, file)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

      let deletedCount = 0;

      for (const file of files) {
        if (file.mtime < cutoffDate) {
          fs.unlinkSync(file.path);
          deletedCount++;
          logger.debug(`🗑️  Deleted old backup: ${file.name}`);
        }
      }

      if (deletedCount > 0) {
        logger.info(`🧹 Cleaned up ${deletedCount} old backup(s) older than ${this.retentionDays} days`);
      }

      const remainingCount = files.length - deletedCount;
      logger.info(`📊 Backup retention: ${remainingCount} backup(s) kept`);
    } catch (error) {
      logger.error(`❌ Backup cleanup failed: ${error.message}`, { error: error.stack });
    }
  }

  async listBackups() {
    try {
      this.ensureBackupDirectory();

      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith('classicpos_') && file.endsWith('.sqlite'))
        .map(file => {
          const stats = fs.statSync(path.join(this.backupDir, file));
          return {
            name: file,
            path: path.join(this.backupDir, file),
            size: stats.size,
            sizeInMB: (stats.size / (1024 * 1024)).toFixed(2),
            created: stats.mtime
          };
        })
        .sort((a, b) => b.created - a.created);

      return files;
    } catch (error) {
      logger.error(`❌ Failed to list backups: ${error.message}`);
      return [];
    }
  }

  async restoreBackup(backupFileName) {
    try {
      const backupFilePath = path.join(this.backupDir, backupFileName);

      if (!fs.existsSync(backupFilePath)) {
        throw new Error(`Backup file not found: ${backupFileName}`);
      }

      const currentBackup = `${this.dbPath}.before-restore-${Date.now()}.sqlite`;
      if (fs.existsSync(this.dbPath)) {
        fs.copyFileSync(this.dbPath, currentBackup);
        logger.info(`💾 Created safety backup: ${currentBackup}`);
      }

      fs.copyFileSync(backupFilePath, this.dbPath);
      logger.info(`✅ Database restored from: ${backupFileName}`);

      return true;
    } catch (error) {
      logger.error(`❌ Database restore failed: ${error.message}`, { error: error.stack });
      throw error;
    }
  }

  getBackupStats() {
    try {
      this.ensureBackupDirectory();

      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith('classicpos_') && file.endsWith('.sqlite'));

      const totalSize = files.reduce((sum, file) => {
        const stats = fs.statSync(path.join(this.backupDir, file));
        return sum + stats.size;
      }, 0);

      return {
        count: files.length,
        totalSizeInMB: (totalSize / (1024 * 1024)).toFixed(2),
        retentionDays: this.retentionDays,
        enabled: this.enabled,
        backupDir: this.backupDir
      };
    } catch (error) {
      logger.error(`❌ Failed to get backup stats: ${error.message}`);
      return {
        count: 0,
        totalSizeInMB: '0.00',
        retentionDays: this.retentionDays,
        enabled: this.enabled,
        backupDir: this.backupDir
      };
    }
  }
}

module.exports = new BackupService();
