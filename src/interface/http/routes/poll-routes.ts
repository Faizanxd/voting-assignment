import { Router } from 'express';
import { PollController } from '../controllers/poll-controller';

export const pollRoutes = (controller: PollController) => {
  const router = Router();
  router.post('/', controller.createPoll);

  router.get('/', controller.listPublished); // list published polls for UI
  router.get('/:id', controller.getPoll);
  router.get('/user/:userId', controller.listByCreator);

  router.patch('/:id/publish', controller.publishPoll);
  router.get('/:id/tallies', controller.getTallies);
  router.delete('/:id', controller.deletePoll);

  return router;
};
