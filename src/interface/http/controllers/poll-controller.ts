import { Request, Response, NextFunction } from 'express';
import { PollService } from '../../../application/services/poll-service';
import { createPollSchema } from '../../../application/dto/poll-dto';
import { VoteRepository } from '../../../domain/repositories/vote-repository';

export class PollController {
  constructor(
    private readonly pollService: PollService,
    private readonly voteRepo: VoteRepository,
  ) {}

  createPoll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = createPollSchema.parse(req.body);
      const poll = await this.pollService.createPoll(dto);
      res.status(201).json(poll);
    } catch (err) {
      next(err);
    }
  };

  getPoll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const poll = await this.pollService.getPoll(req.params.id);
      if (!poll) return res.status(404).json({ error: 'Poll not found' });
      const tallies = await this.voteRepo.countByPoll(poll.id);
      res.json({ ...poll, tallies });
    } catch (err) {
      next(err);
    }
  };

  listByCreator = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const polls = await this.pollService.listByCreator(req.params.userId);
      res.json(polls);
    } catch (err) {
      next(err);
    }
  };

  publishPoll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.pollService.publishPoll(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}
