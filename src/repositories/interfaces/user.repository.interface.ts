import type { NewUser, User } from '@/db/schema';

export type { NewUser, User };

/** Fields that may be changed on an existing user. */
export type UpdateUser = Partial<Pick<NewUser, 'name' | 'email'>>;

export interface FindAllOptions {
  limit: number;
  offset: number;
}

/**
 * Persistence contract for users. Services depend on this abstraction,
 * never on the Drizzle-backed implementation directly.
 */
export interface IUserRepository {
  findAll(options: FindAllOptions): Promise<User[]>;
  count(): Promise<number>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: NewUser): Promise<User>;
  update(id: string, data: UpdateUser): Promise<User | null>;
  delete(id: string): Promise<boolean>;
}
