import { Vote } from '../entities/vote';

export interface VoteRepository {
  createUnique(data: {
    userId: string;
    pollId: string;
    pollOptionId: string;
  }): Promise<Vote>;
  countByPoll(
    pollId: string,
  ): Promise<Array<{ optionId: string; count: number }>>;
  findByUserAndPoll(userId: string, pollId: string): Promise<Vote | null>;
}
