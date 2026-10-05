import { z } from 'zod';

import { config } from '@/config';

// ---------------------------------------------------------------------------
// Zod schemas — single source of truth for validation AND DTO types.
// ---------------------------------------------------------------------------

export const userIdParamsSchema = z.object({
  id: z.uuid({ error: 'id must be a valid UUID' }),
});

export const createUserBodySchema = z.strictObject({
  name: z.string().trim().min(1, 'name is required').max(255),
  email: z
    .email({ error: 'email must be a valid email address' })
    .max(320)
    .transform((value) => value.toLowerCase()),
});

export const updateUserBodySchema = createUserBodySchema
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    error: 'At least one field must be provided',
  });

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(config.pagination.maxLimit)
    .default(config.pagination.defaultLimit),
});

// ---------------------------------------------------------------------------
// DTO types inferred from the schemas (post-parse output types).
// ---------------------------------------------------------------------------

export type UserIdParams = z.infer<typeof userIdParamsSchema>;
export type CreateUserDto = z.infer<typeof createUserBodySchema>;
export type UpdateUserDto = z.infer<typeof updateUserBodySchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
