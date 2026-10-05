import { Router } from 'express';

import type { Container } from '@/container';
import { createUserRouter } from '@/routes/user.routes';

/** Aggregates all resource routers under `/api/v1`. Register new resources here. */
export function createApiRouter(container: Container): Router {
  const router = Router();

  router.use('/users', createUserRouter(container.controllers.user));

  return router;
}

export { createHealthRouter } from '@/routes/health.routes';
