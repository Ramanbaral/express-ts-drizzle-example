import type { Request, Response } from 'express';

import type { HealthService } from '@/services/health.service';
import { sendSuccess } from '@/utils/http-response';

export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  check = async (_req: Request, res: Response) => {
    const health = await this.healthService.check();
    sendSuccess(res, health);
  };
}
