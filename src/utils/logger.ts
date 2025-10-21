type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogConfig {
  enabled: boolean;
  level: LogLevel;
  isDevelopment: boolean;
}

const config: LogConfig = {
  enabled: import.meta.env.MODE !== 'production',
  level: (import.meta.env.VITE_LOG_LEVEL as LogLevel) || 'info',
  isDevelopment: import.meta.env.MODE === 'development'
};

const logLevels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const shouldLog = (level: LogLevel): boolean => {
  if (!config.enabled) return level === 'error';
  return logLevels[level] >= logLevels[config.level];
};

export const logger = {
  debug: (...args: unknown[]): void => {
    if (shouldLog('debug')) {
      console.log('[DEBUG]', ...args);
    }
  },

  info: (...args: unknown[]): void => {
    if (shouldLog('info')) {
      console.info('[INFO]', ...args);
    }
  },

  warn: (...args: unknown[]): void => {
    if (shouldLog('warn')) {
      console.warn('[WARN]', ...args);
    }
  },

  error: (...args: unknown[]): void => {
    if (shouldLog('error')) {
      console.error('[ERROR]', ...args);
    }
  }
};
