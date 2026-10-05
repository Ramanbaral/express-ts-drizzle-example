import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';

import { ValidationError } from '@/errors';
import type { ErrorDetail } from '@/types/api';

export interface ValidationSchemas {
  params?: ZodType;
  query?: ZodType;
  body?: ZodType;
}

const LOCATIONS = ['params', 'query', 'body'] as const;
type Location = (typeof LOCATIONS)[number];

/**
 * Overwrites a request property with its parsed value.
 * In Express 5 `req.query` is a getter, so it must be redefined rather than assigned.
 */
function assign(req: Request, location: Location, value: unknown): void {
  if (location === 'query') {
    Object.defineProperty(req, 'query', {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    });
    return;
  }
  (req as unknown as Record<Location, unknown>)[location] = value;
}

/**
 * Validates `req.params`, `req.query` and `req.body` against Zod schemas.
 * On success, replaces each with the parsed (coerced / transformed / stripped) value.
 * On failure, throws a `ValidationError` aggregating issues from every location.
 */
export function validate(schemas: ValidationSchemas): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const errors: ErrorDetail[] = [];

    for (const location of LOCATIONS) {
      const schema = schemas[location];
      if (!schema) continue;

      const result = await schema.safeParseAsync(req[location] ?? {});
      if (result.success) {
        assign(req, location, result.data);
        continue;
      }

      for (const issue of result.error.issues) {
        errors.push({
          location,
          path: issue.path.map(String).join('.'),
          message: issue.message,
        });
      }
    }

    if (errors.length > 0) throw new ValidationError(errors);
    next();
  };
}
