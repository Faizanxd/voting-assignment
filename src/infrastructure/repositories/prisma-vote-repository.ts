import { PrismaClient } from '@prisma/client';
import { VoteRepository } from '../../domain/repositories/vote-repository';
import { Vote } from '../../domain/entities/vote';

export class PrismaVoteRepository implements VoteRepository {
  constructor(private prisma: PrismaClient) {}

  async createUnique(data: {
    userId: string;
    pollId: string;
    pollOptionId: string;
  }): Promise<Vote> {
    return this.prisma.vote.create({ data });
  }

  async countByPoll(
    pollId: string,
  ): Promise<Array<{ optionId: string; count: number }>> {
    const rows = await this.prisma.vote.groupBy({
      by: ['pollOptionId'],
      where: { pollId },
      _count: { pollOptionId: true },
    });
    return rows.map((r) => ({
      optionId: r.pollOptionId,
      count: r._count.pollOptionId,
    }));
  }

  async findByUserAndPoll(
    userId: string,
    pollId: string,
  ): Promise<Vote | null> {
    return this.prisma.vote.findUnique({
      where: { userId_pollId: { userId, pollId } },
    });
  }
}
