import { UserRepository } from '../../domain/repositories/user-repository';
import { CreateUserDTO } from '../dto/user-dto';
import { createUserSchema } from '../dto/user-dto';
import argon2 from 'argon2';

export class UserService {
  constructor(private readonly users: UserRepository) {}

  /**
   * Register a new user with full details.
   * Password is hashed using Argon2id before storage.
   */
  async register(dto: CreateUserDTO) {
    const data = createUserSchema.parse(dto);
    const passwordHash = await this.hashPassword(data.password);

    return this.users.create({
      name: data.name,
      email: data.email,
      passwordHash,
    });
  }

  /**
   * Create a lightweight anonymous user for cases like
   * poll creation or voting without login.
   * Returns the created user entity.
   */
  async createAnonymousUser() {
    return this.users.create({
      name: 'anon',
      email: `anon+${Date.now()}@local`,
      passwordHash: '',
    });
  }

  async getById(id: string) {
    return this.users.findById(id);
  }

  private async hashPassword(password: string): Promise<string> {
    // Argon2id is recommended for password hashing
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19456, // ~19 MB
      timeCost: 2,
      parallelism: 1,
    });
  }

  async verifyPassword(hash: string, plain: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }
}
