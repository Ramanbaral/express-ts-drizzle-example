import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { config } from '@/config';
import * as schema from '@/db/schema';
import { logger } from '@/utils/logger';

export const pool = new Pool({
  connectionString: config.db.url,
  max: config.db.poolMax,
  idleTimeoutMillis: config.db.idleTimeoutMs,
  connectionTimeoutMillis: config.db.connectionTimeoutMs,
});

// An idle client erroring (e.g. DB restart) must not crash the process.
pool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL pool error', { error: err.message });
});

export const db = drizzle(pool, { schema, logger: config.isDevelopment });

export type Database = NodePgDatabase<typeof schema>;

export async function closeDatabase(): Promise<void> {
  await pool.end();
}
