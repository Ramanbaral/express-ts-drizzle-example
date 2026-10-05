import type { Response } from 'express';

import type { ApiSuccessResponse, PaginationMeta } from '@/types/api';
import { HttpStatus, type HttpStatusCode } from '@/utils/http-status';

/** Sends a consistent `{ success: true, data, meta? }` JSON response. */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: HttpStatusCode = HttpStatus.OK,
  meta?: PaginationMeta,
): void {
  const body: ApiSuccessResponse<T> = meta
    ? { success: true, data, meta }
    : { success: true, data };
  res.status(statusCode).json(body);
}

/** Sends an empty 204 No Content response. */
export function sendNoContent(res: Response): void {
  res.status(HttpStatus.NO_CONTENT).end();
}
