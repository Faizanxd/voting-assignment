import { UserRepository } from '../../domain/repositories/user-repository';
import { CreateUserDTO } from '../dto/user-dto';
import { createUserSchema } from '../dto/user-dto';

export class UserService {
  constructor(private readonly users: UserRepository) {}

  async register(dto: CreateUserDTO) {
    const data = createUserSchema.parse(dto);
    return this.users.create({
      name: data.name,
      email: data.email,
      passwordHash: this.hashPassword(data.password),
    });
  }

  async getById(id: string) {
    return this.users.findById(id);
  }

  private hashPassword(password: string) {
    // Placeholder — real implementation in infra layer
    return `hashed_${password}`;
  }
}
