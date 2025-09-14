import { User } from '../entities/user';

export interface UserRepository {
  create(data: {
    name: string;
    email: string;
    passwordHash: string;
  }): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
}
