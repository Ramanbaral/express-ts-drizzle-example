import { ConflictError, NotFoundError } from '@/errors';
import type {
  IUserRepository,
  UpdateUser,
  User,
} from '@/repositories/interfaces/user.repository.interface';
import type { PaginatedResult, PaginationParams } from '@/types/api';
import type { CreateUserDto, UpdateUserDto } from '@/types/user.dto';

/**
 * User business logic. Depends only on the `IUserRepository` abstraction —
 * no Express, no Drizzle.
 */
export class UserService {
  constructor(private readonly userRepository: IUserRepository) {}

  async listUsers({ page, limit }: PaginationParams): Promise<PaginatedResult<User>> {
    const offset = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.userRepository.findAll({ limit, offset }),
      this.userRepository.count(),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundError(`User with id '${id}' not found`);
    return user;
  }

  async createUser(dto: CreateUserDto): Promise<User> {
    await this.assertEmailAvailable(dto.email);
    return this.userRepository.create({ name: dto.name, email: dto.email });
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<User> {
    const existing = await this.getUserById(id);

    const changes: UpdateUser = {};
    if (dto.name !== undefined) changes.name = dto.name;
    if (dto.email !== undefined && dto.email !== existing.email) {
      await this.assertEmailAvailable(dto.email);
      changes.email = dto.email;
    }

    // Nothing actually changed — avoid a pointless write (and updatedAt bump).
    if (Object.keys(changes).length === 0) return existing;

    const updated = await this.userRepository.update(id, changes);
    // The row may have been deleted concurrently between the read and the write.
    if (!updated) throw new NotFoundError(`User with id '${id}' not found`);
    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    const deleted = await this.userRepository.delete(id);
    if (!deleted) throw new NotFoundError(`User with id '${id}' not found`);
  }

  private async assertEmailAvailable(email: string): Promise<void> {
    const owner = await this.userRepository.findByEmail(email);
    if (owner) {
      throw new ConflictError('Email is already in use', [
        { location: 'body', path: 'email', message: `'${email}' is already registered` },
      ]);
    }
  }
}
