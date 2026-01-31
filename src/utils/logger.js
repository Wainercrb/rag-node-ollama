import { config } from '../config/index.js';

const LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

const currentLevel = config.isProd() ? LogLevel.INFO : LogLevel.DEBUG;

const formatMessage = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
  return `[${timestamp}] [${level}] ${message} ${metaStr}`.trim();
};

export const logger = {
  error: (message, meta = {}) => {
    if (currentLevel >= LogLevel.ERROR) {
      console.error(formatMessage('ERROR', message, meta));
    }
  },
  
  warn: (message, meta = {}) => {
    if (currentLevel >= LogLevel.WARN) {
      console.warn(formatMessage('WARN', message, meta));
    }
  },
  
  info: (message, meta = {}) => {
    if (currentLevel >= LogLevel.INFO) {
      console.log(formatMessage('INFO', message, meta));
    }
  },
  
  debug: (message, meta = {}) => {
    if (currentLevel >= LogLevel.DEBUG) {
      console.log(formatMessage('DEBUG', message, meta));
    }
  },
};
