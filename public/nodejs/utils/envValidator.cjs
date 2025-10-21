const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { logger } = require('./logger.cjs');

function generateSecureSecret(bytes = 64) {
  return crypto.randomBytes(bytes).toString('hex');
}

function validateEnvVariables() {
  const required = ['PORT', 'DB_PATH', 'JWT_SECRET', 'CORS_ORIGIN'];
  const missing = [];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please create a .env file based on .env.example`
    );
  }

  if (process.env.JWT_SECRET === 'your-secret-key-change-this-in-production') {
    throw new Error(
      'JWT_SECRET must be changed from the default value.\n' +
      'Generate a secure secret using: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'));"'
    );
  }

  if (process.env.JWT_SECRET.length < 32) {
    logger.warn('⚠️  WARNING: JWT_SECRET should be at least 32 characters long for production use');
  }
}

function ensureEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  const envExamplePath = path.join(process.cwd(), '.env.example');

  if (!fs.existsSync(envPath)) {
    logger.info('📝 .env file not found. Creating from .env.example...');

    if (!fs.existsSync(envExamplePath)) {
      throw new Error('.env.example file not found. Cannot create .env file.');
    }

    let envContent = fs.readFileSync(envExamplePath, 'utf8');
    
    const jwtSecret = generateSecureSecret(64);
    envContent = envContent.replace(
      'JWT_SECRET=your-secret-key-change-this-in-production',
      `JWT_SECRET=${jwtSecret}`
    );

    fs.writeFileSync(envPath, envContent);
    logger.info('✅ .env file created with secure JWT_SECRET');
    logger.info('⚠️  Please review and update other values as needed');

    require('dotenv').config();
  }
}

function loadAndValidateEnv() {
  ensureEnvFile();
  
  require('dotenv').config();

  const defaults = {
    PORT: '3001',
    DB_PATH: './backend/classicpos.db',
    CORS_ORIGIN: 'http://localhost:5000',
    JWT_EXPIRES_IN: '1h',
    MFA_RATE_LIMIT_WINDOW_MS: '60000',
    MFA_MAX_ATTEMPTS: '5',
    NODE_ENV: 'development',
    BACKUP_ENABLED: 'true',
    BACKUP_RETENTION_DAYS: '14',
    BACKUP_SCHEDULE: '0 2 * * *'
  };

  for (const [key, value] of Object.entries(defaults)) {
    if (!process.env[key]) {
      process.env[key] = value;
      logger.info(`ℹ️  Using default value for ${key}: ${value}`);
    }
  }

  validateEnvVariables();

  logger.info('✅ Environment variables validated successfully');
}

module.exports = {
  generateSecureSecret,
  validateEnvVariables,
  ensureEnvFile,
  loadAndValidateEnv
};
