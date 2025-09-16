// src/application/services/vote-service.ts
import { PrismaClient } from '@prisma/client';
import { VoteRepository } from '../../domain/repositories/vote-repository';
import { PollRepository } from '../../domain/repositories/poll-repository';
import { VoteCastEvent } from '../events/vote-cast-event';

export class VoteService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly votes: VoteRepository,
    private readonly polls: PollRepository,
    private readonly eventBus: { publish: (event: VoteCastEvent) => void },
  ) {}

  async castVote(data: {
    userId: string;
    pollId: string;
    pollOptionId: string;
  }) {
    console.debug('[VoteService] castVote called with:', data);

    return this.prisma.$transaction(async (tx) => {
      const poll = await tx.poll.findUnique({
        where: { id: data.pollId },
        include: { options: true },
      });

      console.debug('[VoteService] poll fetched inside transaction:', {
        pollId: data.pollId,
        found: !!poll,
        isPublished: poll ? poll.isPublished : null,
        optionIds: poll ? poll.options.map((o: any) => o.id) : null,
      });

      if (!poll || !poll.isPublished) {
        const e = new Error('Poll not found or not published');
        (e as any).status = 404;
        throw e;
      }

      // Primary membership check (case: option list available)
      const optionExists = poll.options.some(
        (o: any) => o.id === data.pollOptionId,
      );

      // Fallback: direct check on PollOption table (handles weird isolation or stale include)
      if (!optionExists) {
        console.debug(
          '[VoteService] option not found in poll.options; falling back to direct lookup',
        );
        const direct = await tx.pollOption.findUnique({
          where: { id: data.pollOptionId },
        });
        console.debug('[VoteService] direct pollOption lookup:', {
          found: !!direct,
          pollId: direct ? direct.pollId : null,
        });
        if (!direct || direct.pollId !== data.pollId) {
          const e = new Error('Option does not belong to poll');
          (e as any).status = 400;
          throw e;
        }
      }

      try {
        const vote = await tx.vote.create({
          data: {
            userId: data.userId,
            pollId: data.pollId,
            pollOptionId: data.pollOptionId,
          },
        });

        const grouped = await tx.vote.groupBy({
          by: ['pollOptionId'],
          where: { pollId: data.pollId },
          _count: { pollOptionId: true },
        });

        const tallies = grouped.map((g) => ({
          optionId: g.pollOptionId,
          count: g._count.pollOptionId,
        }));

        this.eventBus.publish(new VoteCastEvent(data.pollId, tallies));

        return vote;
      } catch (err: any) {
        if (err && err.code === 'P2002') {
          const conflict = new Error('User already voted');
          (conflict as any).status = 409;
          throw conflict;
        }
        throw err;
      }
    });
  }

  // Helper to return tallies outside transactions
  async getTallies(pollId: string) {
    const grouped = await this.prisma.vote.groupBy({
      by: ['pollOptionId'],
      where: { pollId },
      _count: { pollOptionId: true },
    });
    return grouped.map((g) => ({
      optionId: g.pollOptionId,
      count: g._count.pollOptionId,
    }));
  }
}
