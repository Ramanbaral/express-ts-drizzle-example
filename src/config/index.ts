import { env } from '@/config/env';

export const config = Object.freeze({
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  isDevelopment: env.NODE_ENV === 'development',
  isTest: env.NODE_ENV === 'test',
  server: {
    port: env.PORT,
    /** Max time (ms) to wait for in-flight requests before forcing shutdown. */
    shutdownTimeoutMs: 10_000,
    /** Max accepted JSON / urlencoded body size. */
    bodyLimit: '1mb',
  },
  db: {
    url: env.DATABASE_URL,
    poolMax: 10,
    idleTimeoutMs: 30_000,
    connectionTimeoutMs: 5_000,
  },
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },
});

export type AppConfig = typeof config;
