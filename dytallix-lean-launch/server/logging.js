import pino from 'pino';
import { existsSync, mkdirSync } from 'fs';
import { createStream } from 'rotating-file-stream';

const logDir = process.env.LOG_DIR || './logs';
if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });

const rotateStream = createStream('app.log', {
  path: logDir,
  size: '10M',
  interval: '1d',
  maxFiles: parseInt(process.env.LOG_ROTATE_DAYS || '7', 10),
  compress: 'gzip'
});

const isDev = process.env.NODE_ENV !== 'production';

const destination = isDev ? pino.transport({ target: 'pino-pretty', options: { colorize: true } }) : pino.multistream([{ stream: rotateStream }]);

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: ['req.headers.authorization', 'mnemonic', 'FAUCET_MNEMONIC'],
  formatters: { level(label) { return { level: label }; } },
  timestamp: pino.stdTimeFunctions.isoTime
}, destination);

export function logRequest(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      msg: 'http_request',
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration_ms: Date.now() - start,
      ip: req.ip
    });
  });
  next();
}