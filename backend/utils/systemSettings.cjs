const { getDatabase } = require('../db/sqlite.cjs');
const crypto = require('crypto');
const { logger } = require('./logger.cjs');

const getSystemSetting = (key) => {
  try {
    const db = getDatabase();
    const setting = db.prepare('SELECT value FROM system_settings WHERE key = ?').get(key);
    return setting ? JSON.parse(setting.value) : null;
  } catch (error) {
    logger.error(`Error getting system setting ${key}:`, error);
    return null;
  }
};

const setSystemSetting = (key, value) => {
  try {
    const db = getDatabase();
    const jsonValue = JSON.stringify(value);
    const existing = db.prepare('SELECT id FROM system_settings WHERE key = ?').get(key);
    
    if (existing) {
      db.prepare('UPDATE system_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?')
        .run(jsonValue, key);
    } else {
      db.prepare('INSERT INTO system_settings (id, key, value) VALUES (?, ?, ?)')
        .run(crypto.randomUUID(), key, jsonValue);
    }
    
    return true;
  } catch (error) {
    logger.error(`Error setting system setting ${key}:`, error);
    return false;
  }
};

const isSystemInitialized = () => {
  return getSystemSetting('system_initialized') === true;
};

const getSystemState = () => {
  return {
    initialized: getSystemSetting('system_initialized') || false,
    adminEmail: getSystemSetting('admin_email') || null,
    pinSetup: getSystemSetting('pin_setup') || false,
    registrationLocked: getSystemSetting('registration_locked') || false,
  };
};

const initializeSystem = (adminEmail) => {
  setSystemSetting('system_initialized', true);
  setSystemSetting('admin_email', adminEmail);
  setSystemSetting('registration_locked', true);
  setSystemSetting('pin_setup', false);
  logger.info(`System initialized with admin: ${adminEmail}`);
};

const markPinSetupComplete = () => {
  setSystemSetting('pin_setup', true);
  logger.info('PIN setup marked as complete');
};

const resetSystem = () => {
  const db = getDatabase();
  db.prepare('DELETE FROM system_settings').run();
  logger.info('System settings reset - registration re-enabled');
};

module.exports = {
  getSystemSetting,
  setSystemSetting,
  isSystemInitialized,
  getSystemState,
  initializeSystem,
  markPinSetupComplete,
  resetSystem,
};
