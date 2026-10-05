import { config } from '@/config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogMeta = Record<string, unknown>;

const LEVEL_PRIORITY: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const minLevel: LogLevel = config.isProduction ? 'info' : 'debug';

function write(level: LogLevel, message: string, meta?: LogMeta): void {
  if (config.isTest || LEVEL_PRIORITY[level] < LEVEL_PRIORITY[minLevel]) return;

  const timestamp = new Date().toISOString();
  const stream = level === 'error' || level === 'warn' ? process.stderr : process.stdout;

  if (config.isProduction) {
    // Structured JSON logs are easy to ingest by log aggregators.
    stream.write(`${JSON.stringify({ timestamp, level, message, ...meta })}\n`);
    return;
  }

  const metaStr = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  stream.write(`[${timestamp}] ${level.toUpperCase().padEnd(5)} ${message}${metaStr}\n`);
}

export const logger = {
  debug: (message: string, meta?: LogMeta) => write('debug', message, meta),
  info: (message: string, meta?: LogMeta) => write('info', message, meta),
  warn: (message: string, meta?: LogMeta) => write('warn', message, meta),
  error: (message: string, meta?: LogMeta) => write('error', message, meta),
};

export type Logger = typeof logger;
