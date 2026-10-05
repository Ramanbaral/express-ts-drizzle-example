import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

import { logger } from '@/utils/logger';

const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Assigns a request id (reusing an incoming `X-Request-Id` if present) and logs
 * method, path, status and duration once the response has finished.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();
  const incomingId = req.header(REQUEST_ID_HEADER);
  const requestId = incomingId && incomingId.length <= 128 ? incomingId : randomUUID();

  res.locals.requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const meta = {
      requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
    };
    const message = `${req.method} ${req.originalUrl} ${res.statusCode} ${meta.durationMs}ms`;

    if (res.statusCode >= 500) logger.error(message, meta);
    else if (res.statusCode >= 400) logger.warn(message, meta);
    else logger.info(message, meta);
  });

  next();
}
