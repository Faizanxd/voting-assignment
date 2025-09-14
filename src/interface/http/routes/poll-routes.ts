import { Router } from 'express';
import { PollController } from '../controllers/poll-controller';

export const pollRoutes = (controller: PollController) => {
  const router = Router();
  router.post('/', controller.createPoll);
  router.get('/:id', controller.getPoll);
  router.get('/user/:userId', controller.listByCreator);
  router.patch('/:id/publish', controller.publishPoll);
  return router;
};
