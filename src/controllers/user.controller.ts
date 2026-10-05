import type { Request, Response } from 'express';

import type { UserService } from '@/services/user.service';
import type { CreateUserDto, ListUsersQuery, UpdateUserDto, UserIdParams } from '@/types/user.dto';
import { sendNoContent, sendSuccess } from '@/utils/http-response';
import { HttpStatus } from '@/utils/http-status';

/**
 * HTTP adapter for users. Extracts validated input, delegates to the service,
 * and maps results to HTTP responses. Async errors are forwarded to the global
 * error handler by Express 5, so no try/catch is needed.
 *
 * Handlers are arrow-function properties so `this` stays bound when passed to the router.
 */
export class UserController {
  constructor(private readonly userService: UserService) {}

  list = async (req: Request, res: Response) => {
    const query = req.query as unknown as ListUsersQuery;
    const { items, meta } = await this.userService.listUsers(query);
    sendSuccess(res, items, HttpStatus.OK, meta);
  };

  getById = async (req: Request, res: Response) => {
    const { id } = req.params as unknown as UserIdParams;
    const user = await this.userService.getUserById(id);
    sendSuccess(res, user);
  };

  create = async (req: Request, res: Response) => {
    const body = req.body as CreateUserDto;
    const user = await this.userService.createUser(body);
    sendSuccess(res, user, HttpStatus.CREATED);
  };

  update = async (req: Request, res: Response) => {
    const { id } = req.params as unknown as UserIdParams;
    const body = req.body as UpdateUserDto;
    const user = await this.userService.updateUser(id, body);
    sendSuccess(res, user);
  };

  remove = async (req: Request, res: Response) => {
    const { id } = req.params as unknown as UserIdParams;
    await this.userService.deleteUser(id);
    sendNoContent(res);
  };
}
