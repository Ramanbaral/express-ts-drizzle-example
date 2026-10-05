// Validates env and fails fast before anything else is loaded.
import { env } from '@/config/env';

import { createApp } from '@/app';
import { config } from '@/config';
import { createContainer } from '@/container';
import { closeDatabase, db } from '@/db';
import { logger } from '@/utils/logger';

const container = createContainer(db);
const app = createApp(container);

const server = app.listen(config.server.port, () => {
  logger.info(`Server listening on http://localhost:${config.server.port}`, {
    env: env.NODE_ENV,
  });
});

server.on('error', (err: NodeJS.ErrnoException) => {
  logger.error('HTTP server failed to start', { code: err.code, error: err.message });
  process.exit(1);
});

let isShuttingDown = false;

async function shutdown(reason: string, exitCode = 0): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info(`${reason} received — shutting down gracefully...`);

  // Force exit if graceful shutdown hangs (e.g. long-lived keep-alive connections).
  const forceExitTimer = setTimeout(() => {
    logger.error('Graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, config.server.shutdownTimeoutMs);
  forceExitTimer.unref();

  try {
    // Stop accepting new connections and wait for in-flight requests to complete.
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
      server.closeIdleConnections();
    });
    logger.info('HTTP server closed');

    await closeDatabase();
    logger.info('Database pool closed');

    process.exit(exitCode);
  } catch (err) {
    logger.error('Error during shutdown', {
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', {
    error: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  void shutdown('unhandledRejection', 1);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  void shutdown('uncaughtException', 1);
});
