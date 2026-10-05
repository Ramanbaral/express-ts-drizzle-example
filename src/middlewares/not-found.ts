import type { Request, Response } from 'express';

import { NotFoundError } from '@/errors';

/** Catch-all for unmatched routes; delegates to the global error handler. */
export function notFoundHandler(req: Request, _res: Response): never {
  throw new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`);
}
