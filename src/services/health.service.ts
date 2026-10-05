import { ServiceUnavailableError } from '@/errors';
import type { IHealthRepository } from '@/repositories/interfaces/health.repository.interface';

export interface HealthStatus {
  status: 'ok';
  timestamp: string;
  uptimeSeconds: number;
  checks: {
    database: 'up';
  };
}

export class HealthService {
  constructor(private readonly healthRepository: IHealthRepository) {}

  async check(): Promise<HealthStatus> {
    try {
      await this.healthRepository.ping();
    } catch {
      throw new ServiceUnavailableError('Database is unreachable');
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      checks: { database: 'up' },
    };
  }
}
