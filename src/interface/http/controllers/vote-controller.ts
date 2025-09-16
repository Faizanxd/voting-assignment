// src/interface/http/controllers/vote-controller.ts
import { Request, Response, NextFunction } from 'express';
import { VoteService } from '../../../application/services/vote-service';
import { z } from 'zod';
import { UserService } from '../../../application/services/user-service';

const castVoteInput = z.object({
  userId: z.string().optional(),
  pollId: z.string().min(1),
  pollOptionId: z.string().min(1),
});

export class VoteController {
  constructor(
    private readonly voteService: VoteService,
    private readonly userService: UserService, // ensure wired in index.ts
  ) {}

  // VoteController.castVote (replace method)
  castVote = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parse inputs deterministically: body.pollOptionId is expected
      const pollId = req.params.pollId;
      const pollOptionId = req.body && req.body.pollOptionId;
      const userIdIn = req.body && req.body.userId;

      if (!pollId || typeof pollOptionId !== 'string' || !pollOptionId.trim()) {
        return res
          .status(400)
          .json({ error: 'Missing pollId or pollOptionId in request' });
      }

      // Ensure/assign userId
      let userId = userIdIn;
      if (!userId) {
        const anon = await this.userService.register({
          name: 'anon',
          email: `anon+${Date.now()}@example.com`,
          password: `p_${Math.random().toString(36).slice(2, 10)}`,
        } as any);
        userId = anon.id;
      }

      try {
        await this.voteService.castVote({
          userId,
          pollId,
          pollOptionId,
        });

        // On success return tallies so client can render immediately
        const tallies = await this.voteService.getTallies(pollId);
        return res.status(201).json({ ok: true, tallies, userId });
      } catch (err: any) {
        // Duplicate vote
        if (err.status === 409) {
          const tallies = await this.voteService.getTallies(pollId);
          return res
            .status(409)
            .json({ error: 'User already voted', tallies, userId });
        }
        // Option not belonging to poll
        if (err.status === 400) {
          const tallies = await this.voteService
            .getTallies(pollId)
            .catch(() => []);
          return res.status(400).json({ error: err.message, tallies });
        }
        if (err.status === 404) {
          return res.status(404).json({ error: err.message });
        }
        throw err;
      }
    } catch (err) {
      next(err);
    }
  };
}
