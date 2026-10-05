import { count, desc, eq } from 'drizzle-orm';

import type { Database } from '@/db';
import { users } from '@/db/schema';
import type {
  FindAllOptions,
  IUserRepository,
  NewUser,
  UpdateUser,
  User,
} from '@/repositories/interfaces/user.repository.interface';

export class UserRepository implements IUserRepository {
  constructor(private readonly db: Database) {}

  async findAll({ limit, offset }: FindAllOptions): Promise<User[]> {
    return this.db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt), desc(users.id))
      .limit(limit)
      .offset(offset);
  }

  async count(): Promise<number> {
    const [row] = await this.db.select({ value: count() }).from(users);
    return row?.value ?? 0;
  }

  async findById(id: string): Promise<User | null> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return user ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const [user] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return user ?? null;
  }

  async create(data: NewUser): Promise<User> {
    const [user] = await this.db.insert(users).values(data).returning();
    if (!user) throw new Error('Insert into "users" returned no row');
    return user;
  }

  async update(id: string, data: UpdateUser): Promise<User | null> {
    const [user] = await this.db.update(users).set(data).where(eq(users.id, id)).returning();
    return user ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
    return deleted.length > 0;
  }
}
