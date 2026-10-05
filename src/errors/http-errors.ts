import { AppError } from '@/errors/app-error';
import type { ErrorDetail } from '@/types/api';
import { HttpStatus } from '@/utils/http-status';

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', errors?: ErrorDetail[]) {
    super(message, HttpStatus.BAD_REQUEST, errors);
  }
}

export class ValidationError extends AppError {
  constructor(errors: ErrorDetail[], message = 'Validation failed') {
    super(message, HttpStatus.BAD_REQUEST, errors);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, HttpStatus.UNAUTHORIZED);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, HttpStatus.FORBIDDEN);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, HttpStatus.NOT_FOUND);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists', errors?: ErrorDetail[]) {
    super(message, HttpStatus.CONFLICT, errors);
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(message = 'Unprocessable entity', errors?: ErrorDetail[]) {
    super(message, HttpStatus.UNPROCESSABLE_ENTITY, errors);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service unavailable') {
    super(message, HttpStatus.SERVICE_UNAVAILABLE);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, undefined, false);
  }
}
