import { Router } from 'express';
import { VoteController } from '../controllers/vote-controller';

export const voteRoutes = (controller: VoteController) => {
  const router = Router({ mergeParams: true });
  router.post('/', controller.castVote);
  return router;
};
