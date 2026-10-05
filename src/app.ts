import express, { type Express } from 'express';
import helmet from 'helmet';

import { config } from '@/config';
import type { Container } from '@/container';
import { errorHandler, notFoundHandler, requestLogger } from '@/middlewares';
import { createApiRouter, createHealthRouter } from '@/routes';

/** Builds the Express application. Kept free of side effects (no `listen`) for testability. */
export function createApp(container: Container): Express {
  const app = express();

  // Security & infrastructure
  app.disable('x-powered-by');
  app.set('trust proxy', config.isProduction ? 1 : false);
  app.use(helmet());

  // Body parsing
  app.use(express.json({ limit: config.server.bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: config.server.bodyLimit }));

  // Logging
  app.use(requestLogger);

  // Routes
  app.use('/health', createHealthRouter(container.controllers.health));
  app.use('/api/v1', createApiRouter(container));

  // 404 + centralized error handling (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
