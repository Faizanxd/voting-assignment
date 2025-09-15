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
    return this.prisma.$transaction(async (tx) => {
      // 1. Ensure poll exists and is published (using tx)
      const poll = await tx.poll.findUnique({
        where: { id: data.pollId },
        include: { options: true },
      });

      if (!poll || !poll.isPublished) {
        const e = new Error('Poll not found or not published');
        (e as any).status = 404;
        throw e;
      }

      // 2. Ensure option belongs to poll
      const optionExists = poll.options.some(
        (o: any) => o.id === data.pollOptionId,
      );
      if (!optionExists) {
        const e = new Error('Option does not belong to poll');
        (e as any).status = 400;
        throw e;
      }

      // 3. Try to insert vote
      try {
        const vote = await tx.vote.create({
          data: {
            userId: data.userId,
            pollId: data.pollId,
            pollOptionId: data.pollOptionId,
          },
        });

        // 4. Compute tallies inside the transaction
        const grouped = await tx.vote.groupBy({
          by: ['pollOptionId'],
          where: { pollId: data.pollId },
          _count: { pollOptionId: true },
        });

        const tallies = grouped.map((g) => ({
          optionId: g.pollOptionId,
          count: g._count.pollOptionId,
        }));

        // 5. Publish domain event
        this.eventBus.publish(new VoteCastEvent(data.pollId, tallies));

        return vote;
      } catch (err: any) {
        // Prisma unique constraint violation -> map to 409
        if (err && err.code === 'P2002') {
          const conflict = new Error('User already voted');
          (conflict as any).status = 409;
          throw conflict;
        }
        throw err;
      }
    });
  }
}
