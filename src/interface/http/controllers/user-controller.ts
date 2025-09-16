// src/interface/http/controllers/user-controller.ts
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserRepository } from '../../../domain/repositories/user-repository';

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

export class UserController {
  constructor(private readonly userRepo: UserRepository) {}

  createUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = createUserSchema.parse(req.body);
      const user = await this.userRepo.create(dto as any);
      res.status(201).json(user);
    } catch (err) {
      next(err);
    }
  };

  getUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await this.userRepo.findById(req.params.id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json(user);
    } catch (err) {
      next(err);
    }
  };
}
