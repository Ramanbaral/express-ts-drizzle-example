import { HealthController } from '@/controllers/health.controller';
import { UserController } from '@/controllers/user.controller';
import type { Database } from '@/db';
import { HealthRepository } from '@/repositories/health.repository';
import { UserRepository } from '@/repositories/user.repository';
import { HealthService } from '@/services/health.service';
import { UserService } from '@/services/user.service';

/**
 * Composition root — the ONLY place where concrete classes are instantiated
 * and wired together (repositories -> services -> controllers).
 * Swap implementations here (e.g. in-memory repositories for tests).
 */
export function createContainer(db: Database) {
  // Repositories
  const userRepository = new UserRepository(db);
  const healthRepository = new HealthRepository(db);

  // Services
  const userService = new UserService(userRepository);
  const healthService = new HealthService(healthRepository);

  // Controllers
  const userController = new UserController(userService);
  const healthController = new HealthController(healthService);

  return {
    repositories: { user: userRepository, health: healthRepository },
    services: { user: userService, health: healthService },
    controllers: { user: userController, health: healthController },
  } as const;
}

export type Container = ReturnType<typeof createContainer>;
