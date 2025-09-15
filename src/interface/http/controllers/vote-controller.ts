import { Request, Response, NextFunction } from 'express';
import { VoteService } from '../../../application/services/vote-service';
import { castVoteSchema } from '../../../application/dto/vote-dto';

export class VoteController {
  constructor(private readonly voteService: VoteService) {}

  castVote = async (req, res, next) => {
    try {
      const dto = castVoteSchema.parse({
        userId: req.body.userId,
        pollId: req.params.pollId,
        pollOptionId: req.body.pollOptionId,
      });
      await this.voteService.castVote(dto);
      res.status(201).json({ status: 'ok' });
    } catch (err: any) {
      if (err.status === 409) {
        return res.status(409).json({ error: err.message });
      }
      next(err);
    }
  };
}
