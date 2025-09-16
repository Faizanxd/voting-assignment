import { PrismaClient } from '@prisma/client';
import { PollRepository } from '../../domain/repositories/poll-repository';
import { Poll, PollWithOptions, PollSummary } from '../../domain/entities/poll';

export class PrismaPollRepository implements PollRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: {
    question: string;
    creatorId: string;
    options: string[];
  }): Promise<Poll> {
    return this.prisma.poll.create({
      data: {
        question: data.question,
        creatorId: data.creatorId,
        options: {
          create: data.options.map((text) => ({ text })),
        },
      },
    });
  }

  async findById(id: string): Promise<PollWithOptions | null> {
    const poll = await this.prisma.poll.findUnique({
      where: { id },
      include: { options: true },
    });
    return poll;
  }

  async listByCreator(creatorId: string): Promise<PollSummary[]> {
    return this.prisma.poll.findMany({
      where: { creatorId },
      select: { id: true, question: true, isPublished: true },
    });
  }

  async publish(id: string): Promise<void> {
    await this.prisma.poll.update({
      where: { id },
      data: { isPublished: true },
    });
  }
  async listPublished(): Promise<PollSummary[]> {
    return this.prisma.poll.findMany({
      where: { isPublished: true },
      select: { id: true, question: true, isPublished: true },
      orderBy: { createdAt: 'desc' },
    });
  }
  async listAll(): Promise<PollSummary[]> {
    return this.prisma.poll.findMany({
      select: { id: true, question: true, isPublished: true },
      orderBy: { createdAt: 'desc' },
    });
  }
  async deletePoll(id: string) {
    // Delete votes for this poll first
    await this.prisma.vote.deleteMany({
      where: { pollId: id },
    });

    // Delete poll options for this poll
    await this.prisma.pollOption.deleteMany({
      where: { pollId: id },
    });

    // Now delete the poll itself
    return this.prisma.poll.delete({
      where: { id },
    });
  }
}
