import { Router } from 'express';

import type { UserController } from '@/controllers/user.controller';
import { validate } from '@/middlewares';
import {
  createUserBodySchema,
  listUsersQuerySchema,
  updateUserBodySchema,
  userIdParamsSchema,
} from '@/types/user.dto';

export function createUserRouter(controller: UserController): Router {
  const router = Router();

  router.post('/', validate({ body: createUserBodySchema }), controller.create);
  router.get('/', validate({ query: listUsersQuerySchema }), controller.list);
  router.get('/:id', validate({ params: userIdParamsSchema }), controller.getById);
  router.patch(
    '/:id',
    validate({ params: userIdParamsSchema, body: updateUserBodySchema }),
    controller.update,
  );
  router.delete('/:id', validate({ params: userIdParamsSchema }), controller.remove);

  return router;
}
