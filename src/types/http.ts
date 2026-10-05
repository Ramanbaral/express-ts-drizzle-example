import type { Request, Response } from 'express';

/**
 * Convenience helper to cast an Express `Request` with typed params, body, and query.
 * Useful inside route handlers after the `validate` middleware has run.
 */
export type TypedRequest<
  TParams = Record<string, string>,
  TBody = unknown,
  TQuery = Record<string, unknown>,
> = Omit<Request, 'params' | 'body' | 'query'> & {
  params: TParams;
  body: TBody;
  query: TQuery;
};

export type AsyncRequestHandler = (req: Request, res: Response) => Promise<void>;
