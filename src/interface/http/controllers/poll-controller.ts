// src/interface/http/controllers/poll-controller.ts
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PollService } from '../../../application/services/poll-service';
import { VoteRepository } from '../../../domain/repositories/vote-repository';
import { UserService } from '../../../application/services/user-service';

const createPollInput = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  creatorId: z.string().optional(),
});

// tiny helper to generate a simple password and email for anonymous users
function genAnonEmail() {
  return `anon+${Date.now()}@example.com`;
}
function genAnonPassword() {
  return `p_${Math.random().toString(36).slice(2, 10)}`;
}

export class PollController {
  constructor(
    private readonly pollService: PollService,
    private readonly voteRepo: VoteRepository,
    private readonly userService: UserService,
  ) {}

  createPoll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // defensive: ensure body exists
      if (!req.body)
        return res.status(400).json({ error: 'Missing request body' });

      // Normalize and dedupe options before validation
      const rawOptions = Array.isArray(req.body.options)
        ? req.body.options
        : [];
      const normalizedOptions = rawOptions
        .map((o: any) => (typeof o === 'string' ? o.trim() : ''))
        .filter(Boolean);

      // dedupe by case-insensitive text
      const seen = new Set<string>();
      const uniqueOptions = normalizedOptions.filter((t: string) => {
        const k = t.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });

      // Build a sanitized body for Zod validation
      const sanitized = {
        question:
          typeof req.body.question === 'string'
            ? req.body.question.trim()
            : undefined,
        options: uniqueOptions,
        creatorId: req.body.creatorId,
      };

      const parsed = createPollInput.parse(sanitized);

      // Determine creatorId: use provided id or create/verify via UserService
      let creatorId = parsed.creatorId;

      if (!creatorId) {
        // Create anonymous user via the real UserService API (register)
        const anon = await this.userService.register({
          name: 'anon',
          email: genAnonEmail(),
          password: genAnonPassword(),
        } as any);
        creatorId = anon.id;
      } else {
        // If creatorId provided, ensure the user exists using UserService.getById
        const existing = await this.userService.getById(creatorId);
        if (!existing) {
          // fallback: create anon user and use its id
          const anon = await this.userService.register({
            name: 'anon',
            email: genAnonEmail(),
            password: genAnonPassword(),
          } as any);
          creatorId = anon.id;
        }
      }

      // Create poll (unique option texts guaranteed)
      try {
        const poll = await this.pollService.createPoll({
          question: parsed.question,
          options: parsed.options,
          creatorId,
        });

        // DEV: auto-publish newly created polls so UI can show them and votes/tallies work.
        if (process.env.NODE_ENV !== 'production') {
          await this.pollService.publishPoll(poll.id);
          const published = await this.pollService.getPoll(poll.id);
          return res.status(201).json(published);
        }

        return res.status(201).json(poll);
      } catch (err: any) {
        // Prisma unique constraint violation -> map to 400 with friendly message
        if (err?.code === 'P2002') {
          return res
            .status(400)
            .json({ error: 'Duplicate option text in poll' });
        }
        throw err;
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors });
      }
      next(err);
    }
  };

  listPublished = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const all = req.query.all === 'true';
      const polls = all
        ? await this.pollService.listAll()
        : await this.pollService.listPublished();
      res.json(polls);
    } catch (err) {
      next(err);
    }
  };

  getPoll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const poll = await this.pollService.getPoll(req.params.id);
      if (!poll) return res.status(404).json({ error: 'Poll not found' });

      const tallies = await this.voteRepo.countByPoll(poll.id).catch(() => []);
      res.json({ ...poll, tallies: Array.isArray(tallies) ? tallies : [] });
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
  getTallies = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const poll = await this.pollService.getPoll(req.params.id);
      if (!poll) return res.status(404).json({ error: 'Poll not found' });

      const tallies = await this.voteRepo.countByPoll(poll.id);
      res.json(Array.isArray(tallies) ? tallies : []);
    } catch (err) {
      next(err);
    }
  };
  deletePoll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const poll = await this.pollService.getPoll(req.params.id);
      if (!poll) return res.status(404).json({ error: 'Poll not found' });

      await this.pollService.deletePoll(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}
