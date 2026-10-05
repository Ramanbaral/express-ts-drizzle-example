/** A single field-level error (e.g. from request validation). */
export interface ErrorDetail {
  /** Where the error occurred: `body`, `params` or `query`. */
  location?: string;
  /** Dot-separated path to the offending field, e.g. `address.city`. */
  path: string;
  message: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: ErrorDetail[];
  stack?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}
