import type { ErrorDetail } from '@/types/api';
import { HttpStatus, type HttpStatusCode } from '@/utils/http-status';

/**
 * Base class for all expected (operational) application errors.
 * Services throw subclasses of this; the global error handler converts
 * them into `{ success: false, message, errors? }` responses.
 */
export class AppError extends Error {
  public readonly statusCode: HttpStatusCode;
  public readonly errors?: ErrorDetail[];
  /** Operational errors are expected and safe to expose to clients. */
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: HttpStatusCode = HttpStatus.INTERNAL_SERVER_ERROR,
    errors?: ErrorDetail[],
    isOperational = true,
  ) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    if (errors && errors.length > 0) this.errors = errors;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace?.(this, new.target);
  }
}
