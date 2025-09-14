import { Poll, PollWithOptions, PollSummary } from '../entities/poll';

export interface PollRepository {
  create(data: {
    question: string;
    creatorId: string;
    options: string[];
  }): Promise<Poll>;
  findById(id: string): Promise<PollWithOptions | null>;
  listByCreator(creatorId: string): Promise<PollSummary[]>;
  publish(id: string): Promise<void>;
}
