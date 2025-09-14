import { Router } from 'express';
import { UserController } from '../controllers/user-controller';

export const userRoutes = (controller: UserController) => {
  const router = Router();
  router.post('/', controller.createUser);
  router.get('/:id', controller.getUser);
  return router;
};
