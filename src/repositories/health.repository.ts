import { sql } from 'drizzle-orm';

import type { Database } from '@/db';
import type { IHealthRepository } from '@/repositories/interfaces/health.repository.interface';

export class HealthRepository implements IHealthRepository {
  constructor(private readonly db: Database) {}

  async ping(): Promise<void> {
    await this.db.execute(sql`select 1`);
  }
}
