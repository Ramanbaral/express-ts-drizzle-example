import type { NextFunction, Request, Response } from 'express';

import { config } from '@/config';
import { AppError } from '@/errors';
import type { ApiErrorResponse } from '@/types/api';
import { HttpStatus } from '@/utils/http-status';
import { logger } from '@/utils/logger';

/** PostgreSQL error codes we translate into client errors. */
const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';
const PG_INVALID_TEXT_REPRESENTATION = '22P02';

interface NormalizedError {
  statusCode: number;
  message: string;
  errors?: ApiErrorResponse['errors'];
  expose: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Drizzle wraps driver errors (`DrizzleQueryError.cause`), so check both levels. */
function getPgErrorCode(err: unknown): string | undefined {
  if (!isRecord(err)) return undefined;
  if (typeof err.code === 'string' && /^[0-9A-Z]{5}$/.test(err.code)) return err.code;
  return isRecord(err.cause) ? getPgErrorCode(err.cause) : undefined;
}

function normalizeError(err: unknown): NormalizedError {
  if (err instanceof AppError) {
    return {
      statusCode: err.statusCode,
      message: err.message,
      ...(err.errors ? { errors: err.errors } : {}),
      expose: err.isOperational,
    };
  }

  // Errors raised by Express' body parsers (malformed JSON, payload too large, ...).
  if (isRecord(err) && typeof err.type === 'string' && typeof err.status === 'number') {
    if (err.type === 'entity.parse.failed') {
      return { statusCode: HttpStatus.BAD_REQUEST, message: 'Malformed JSON body', expose: true };
    }
    if (err.status >= 400 && err.status < 500) {
      return {
        statusCode: err.status,
        message: typeof err.message === 'string' ? err.message : 'Bad request',
        expose: true,
      };
    }
  }

  // Safety net for DB constraint races not caught by service-level checks.
  switch (getPgErrorCode(err)) {
    case PG_UNIQUE_VIOLATION:
      return { statusCode: HttpStatus.CONFLICT, message: 'Resource already exists', expose: true };
    case PG_FOREIGN_KEY_VIOLATION:
      return {
        statusCode: HttpStatus.CONFLICT,
        message: 'Operation violates a relational constraint',
        expose: true,
      };
    case PG_INVALID_TEXT_REPRESENTATION:
      return { statusCode: HttpStatus.BAD_REQUEST, message: 'Invalid input syntax', expose: true };
    default:
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        expose: false,
      };
  }
}

/**
 * Global error handler — must be registered last. Converts any thrown error into
 * `{ success: false, message, errors? }`. Unexpected errors are logged and their
 * details hidden from clients in production.
 */
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(err);
    return;
  }

  const normalized = normalizeError(err);
  const isServerError = normalized.statusCode >= 500;

  if (isServerError) {
    logger.error('Unhandled error', {
      requestId: res.locals.requestId,
      method: req.method,
      path: req.originalUrl,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
  }

  const body: ApiErrorResponse = {
    success: false,
    message:
      normalized.expose || !config.isProduction ? normalized.message : 'Internal server error',
  };
  if (normalized.errors) body.errors = normalized.errors;
  if (!config.isProduction && isServerError && err instanceof Error && err.stack) {
    body.stack = err.stack;
  }

  res.status(normalized.statusCode).json(body);
}
