import { Request, Response, NextFunction } from 'express';
import { UserService } from '../../../application/services/user-service';
import { createUserSchema } from '../../../application/dto/user-dto';

export class UserController {
  constructor(private readonly userService: UserService) {}

  createUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = createUserSchema.parse(req.body);
      const user = await this.userService.register(dto);
      const { passwordHash, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (err) {
      next(err);
    }
  };

  getUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await this.userService.getById(req.params.id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      const { passwordHash, ...safeUser } = user;
      res.json(safeUser);
    } catch (err) {
      next(err);
    }
  };
}
