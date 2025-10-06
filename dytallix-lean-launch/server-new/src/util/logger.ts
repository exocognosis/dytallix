import pino from 'pino';
import { getConfig } from '../config.js';

let loggerInstance: pino.Logger | null = null;

export function createLogger(): pino.Logger {
  if (loggerInstance) return loggerInstance;
  
  let level = 'info';
  let isDev = false;
  
  try {
    const config = getConfig();
    level = config.LOG_LEVEL;
    isDev = process.env.NODE_ENV === 'development';
  } catch {
    // Config not loaded yet, use defaults
    isDev = process.env.NODE_ENV === 'development';
  }
  
  loggerInstance = pino({
    level,
    transport: isDev ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      }
    } : undefined,
  });
  
  return loggerInstance;
}

export const logger = createLogger();
